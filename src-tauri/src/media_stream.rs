use std::{
    collections::HashMap,
    fs::File,
    io::{BufRead, BufReader, Read, Seek, SeekFrom, Write},
    net::{SocketAddr, TcpListener, TcpStream},
    path::PathBuf,
    sync::{
        Arc, RwLock,
        atomic::{AtomicBool, Ordering},
    },
    thread,
    time::Duration,
};
use uuid::Uuid;

const MAX_REQUEST_BYTES: usize = 8 * 1024;

#[derive(Clone)]
struct VideoFile {
    path: PathBuf,
    mime_type: String,
}

pub struct MediaStreamState {
    address: SocketAddr,
    token: String,
    files: Arc<RwLock<HashMap<String, VideoFile>>>,
    stop: Arc<AtomicBool>,
}

impl MediaStreamState {
    pub fn start() -> Result<Self, String> {
        let listener = TcpListener::bind("127.0.0.1:0")
            .map_err(|error| format!("Could not start local video playback: {error}"))?;
        listener.set_nonblocking(true)
            .map_err(|error| format!("Could not prepare local video playback: {error}"))?;
        let address = listener.local_addr()
            .map_err(|error| format!("Could not read the local video playback address: {error}"))?;
        let token = Uuid::new_v4().simple().to_string();
        let files = Arc::new(RwLock::new(HashMap::new()));
        let stop = Arc::new(AtomicBool::new(false));
        serve(listener, token.clone(), Arc::clone(&files), Arc::clone(&stop));
        Ok(Self { address, token, files, stop })
    }

    pub fn url_for(&self, id: &str, path: PathBuf, mime_type: &str) -> Result<String, String> {
        if id.len() != 64 || !id.bytes().all(|byte| byte.is_ascii_hexdigit()) {
            return Err("The local video has an invalid library identifier.".into());
        }
        if !matches!(mime_type, "video/mp4" | "video/webm") {
            return Err("The local video format is not supported.".into());
        }
        if !path.is_file() {
            return Err("The video file is missing from this device.".into());
        }
        self.files.write().map_err(|_| "Local video playback is unavailable.".to_string())?
            .insert(id.to_ascii_lowercase(), VideoFile { path, mime_type: mime_type.to_string() });
        Ok(format!("http://{}/video/{}/{id}", self.address, self.token))
    }
}

impl Drop for MediaStreamState {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
    }
}

fn serve(listener: TcpListener, token: String, files: Arc<RwLock<HashMap<String, VideoFile>>>, stop: Arc<AtomicBool>) {
    thread::spawn(move || {
        while !stop.load(Ordering::Relaxed) {
            match listener.accept() {
                Ok((stream, _)) => {
                    let token = token.clone();
                    let files = Arc::clone(&files);
                    thread::spawn(move || serve_request(stream, &token, &files));
                }
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => thread::sleep(Duration::from_millis(20)),
                Err(_) => break,
            }
        }
    });
}

fn serve_request(mut stream: TcpStream, token: &str, files: &RwLock<HashMap<String, VideoFile>>) {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(3)));
    let _ = stream.set_write_timeout(Some(Duration::from_secs(20)));
    let mut request = Vec::new();
    {
        let mut reader = BufReader::new(&mut stream);
        loop {
            let remaining = MAX_REQUEST_BYTES.saturating_sub(request.len());
            if remaining == 0 { return; }
            let mut line = Vec::new();
            match (&mut reader).take(remaining as u64).read_until(b'\n', &mut line) {
                Ok(0) => return,
                Ok(_) => {
                    let is_end = line == b"\r\n" || line == b"\n";
                    request.extend_from_slice(&line);
                    if is_end { break; }
                }
                Err(_) => return,
            }
        }
    }
    let Ok(request_text) = std::str::from_utf8(&request) else { respond_empty(&mut stream, 400, "Bad Request"); return; };
    let mut lines = request_text.lines();
    let Some(first_line) = lines.next() else { respond_empty(&mut stream, 400, "Bad Request"); return; };
    let mut request_parts = first_line.split_ascii_whitespace();
    let method = request_parts.next().unwrap_or("");
    let target = request_parts.next().unwrap_or("");
    if !matches!(method, "GET" | "HEAD") { respond_empty(&mut stream, 405, "Method Not Allowed"); return; }
    let expected_prefix = format!("/video/{token}/");
    let Some(id) = target.strip_prefix(&expected_prefix) else { respond_empty(&mut stream, 404, "Not Found"); return; };
    if id.len() != 64 || !id.bytes().all(|byte| byte.is_ascii_hexdigit()) { respond_empty(&mut stream, 404, "Not Found"); return; }
    let Some(video) = files.read().ok().and_then(|registry| registry.get(&id.to_ascii_lowercase()).cloned()) else { respond_empty(&mut stream, 404, "Not Found"); return; };
    let Some(range_header) = lines.filter_map(|line| line.split_once(':')).find(|(name, _)| name.trim().eq_ignore_ascii_case("range")).map(|(_, value)| value.trim()) else {
        send_file(&mut stream, &video, method, None);
        return;
    };
    send_file(&mut stream, &video, method, Some(range_header));
}

fn send_file(stream: &mut TcpStream, video: &VideoFile, method: &str, range_header: Option<&str>) {
    let Ok(mut file) = File::open(&video.path) else { respond_empty(stream, 404, "Not Found"); return; };
    let Ok(metadata) = file.metadata() else { respond_empty(stream, 404, "Not Found"); return; };
    let size = metadata.len();
    let range = match range_header {
        Some(header) => match parse_range(header, size) {
            Some(range) => Some(range),
            None => {
                let header = format!("HTTP/1.1 416 Range Not Satisfiable\r\nContent-Range: bytes */{size}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                let _ = stream.write_all(header.as_bytes());
                return;
            }
        },
        None => None,
    };
    let (start, end, status) = range.map(|(start, end)| (start, end, "206 Partial Content"))
        .unwrap_or((0, size.saturating_sub(1), "200 OK"));
    let length = if size == 0 { 0 } else { end - start + 1 };
    let mut response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: {}\r\nAccept-Ranges: bytes\r\nContent-Length: {length}\r\nCache-Control: no-store\r\nConnection: close\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Expose-Headers: Accept-Ranges, Content-Length, Content-Range\r\n",
        video.mime_type,
    );
    if let Some((start, end)) = range { response.push_str(&format!("Content-Range: bytes {start}-{end}/{size}\r\n")); }
    response.push_str("\r\n");
    if stream.write_all(response.as_bytes()).is_err() || method == "HEAD" || length == 0 { return; }
    if file.seek(SeekFrom::Start(start)).is_ok() {
        let _ = std::io::copy(&mut file.take(length), stream);
    }
}

fn parse_range(header: &str, size: u64) -> Option<(u64, u64)> {
    if size == 0 || !header.starts_with("bytes=") || header.contains(',') { return None; }
    let (start, end) = header[6..].split_once('-')?;
    let (start, end) = if start.is_empty() {
        let suffix = end.parse::<u64>().ok()?;
        if suffix == 0 { return None; }
        (size.saturating_sub(suffix), size - 1)
    } else {
        let start = start.parse::<u64>().ok()?;
        let end = if end.is_empty() { size - 1 } else { end.parse::<u64>().ok()?.min(size - 1) };
        (start, end)
    };
    (start < size && end >= start).then_some((start, end))
}

fn respond_empty(stream: &mut TcpStream, code: u16, reason: &str) {
    let response = format!("HTTP/1.1 {code} {reason}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
    let _ = stream.write_all(response.as_bytes());
}
