use gstreamer as gst;
use gstreamer::prelude::*;
use gstreamer_app as gst_app;
use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    sync::{
        Arc, Condvar, Mutex, OnceLock,
        atomic::{AtomicBool, Ordering},
    },
    thread,
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

const FRAME_BOUNDARY: &str = "bibleshow-live-frame";
static GSTREAMER_INIT: OnceLock<Result<(), String>> = OnceLock::new();

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveFeedInfo {
    pub stream_id: String,
    pub stream_url: String,
}

struct FrameBuffer {
    state: Mutex<FrameState>,
    changed: Condvar,
}

struct FrameState {
    sequence: u64,
    latest: Option<Vec<u8>>,
}

impl FrameBuffer {
    fn new() -> Self {
        Self {
            state: Mutex::new(FrameState {
                sequence: 0,
                latest: None,
            }),
            changed: Condvar::new(),
        }
    }

    fn publish(&self, frame: Vec<u8>) {
        let mut state = self.state.lock().unwrap_or_else(|error| error.into_inner());
        state.sequence = state.sequence.wrapping_add(1);
        state.latest = Some(frame);
        self.changed.notify_all();
    }

    fn wait_for_first_frame(&self, timeout: Duration) -> bool {
        let state = self.state.lock().unwrap_or_else(|error| error.into_inner());
        if state.latest.is_some() {
            return true;
        }
        let (state, _) = self
            .changed
            .wait_timeout_while(state, timeout, |frames| frames.latest.is_none())
            .unwrap_or_else(|error| error.into_inner());
        state.latest.is_some()
    }
}

pub struct LiveFeedState {
    active: Mutex<Option<ActiveStream>>,
}

impl Default for LiveFeedState {
    fn default() -> Self {
        Self {
            active: Mutex::new(None),
        }
    }
}

struct ActiveStream {
    pipeline: gst::Pipeline,
    stop_server: Arc<AtomicBool>,
}

impl Drop for ActiveStream {
    fn drop(&mut self) {
        self.stop_server.store(true, Ordering::Relaxed);
        let _ = self.pipeline.set_state(gst::State::Null);
    }
}

pub fn initialize() -> Result<(), String> {
    GSTREAMER_INIT
        .get_or_init(|| {
            gst::init().map_err(|_| {
                "GStreamer could not start. Check that the media runtime is installed.".to_string()
            })
        })
        .clone()
}

pub fn connect(
    app: &AppHandle,
    state: &LiveFeedState,
    source_url: String,
) -> Result<LiveFeedInfo, String> {
    initialize()?;
    validate_rtsp_url(&source_url)?;
    stop(state);

    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|error| format!("Could not open the local video output: {error}"))?;
    listener
        .set_nonblocking(true)
        .map_err(|error| format!("Could not prepare the local video output: {error}"))?;
    let address = listener
        .local_addr()
        .map_err(|error| format!("Could not read the local video output address: {error}"))?;
    let id = Uuid::new_v4().to_string();
    let token = Uuid::new_v4().simple().to_string();
    let frame_buffer = Arc::new(FrameBuffer::new());
    let stop_server = Arc::new(AtomicBool::new(false));
    let pipeline = create_pipeline(&source_url, &frame_buffer)?;

    let stream_url = format!("http://{address}/stream/{token}");
    serve_frames(
        listener,
        token,
        Arc::clone(&frame_buffer),
        Arc::clone(&stop_server),
    );

    if pipeline.set_state(gst::State::Playing).is_err() {
        stop_server.store(true, Ordering::Relaxed);
        return Err(
            "Could not start the RTSP stream. Check the source address and decoder plugins.".into(),
        );
    }
    if !frame_buffer.wait_for_first_frame(Duration::from_secs(8)) {
        let _ = pipeline.set_state(gst::State::Null);
        stop_server.store(true, Ordering::Relaxed);
        return Err("The stream did not provide a video frame within 8 seconds. Check the address, network and video codec.".into());
    }

    let app_handle = app.clone();
    let pipeline_for_bus = pipeline.clone();
    let stream_id_for_bus = id.clone();
    let stop_for_bus = Arc::clone(&stop_server);
    thread::spawn(move || {
        let Some(bus) = pipeline_for_bus.bus() else {
            return;
        };
        while !stop_for_bus.load(Ordering::Relaxed) {
            if let Some(message) = bus.timed_pop(gst::ClockTime::from_mseconds(500)) {
                if let gst::MessageView::Error(_) = message.view() {
                    let _ = pipeline_for_bus.set_state(gst::State::Null);
                    let _ = app_handle.emit(
                        "bibleshow-live-feed-error",
                        (
                            stream_id_for_bus,
                            "The network stream stopped. Check the source and network.",
                        ),
                    );
                    break;
                }
            }
        }
    });

    let mut active = state
        .active
        .lock()
        .map_err(|_| "Live Feed state is unavailable.".to_string())?;
    *active = Some(ActiveStream {
        pipeline,
        stop_server,
    });
    Ok(LiveFeedInfo {
        stream_id: id,
        stream_url,
    })
}

pub fn stop(state: &LiveFeedState) {
    if let Ok(mut active) = state.active.lock() {
        active.take();
    }
}

fn validate_rtsp_url(value: &str) -> Result<(), String> {
    if value.len() > 2048 {
        return Err("The stream address is too long.".into());
    }
    let parsed = url::Url::parse(value)
        .map_err(|_| "Enter a complete RTSP or RTSPS address.".to_string())?;
    if !matches!(parsed.scheme(), "rtsp" | "rtsps") || parsed.host_str().is_none() {
        return Err("Live Feed supports RTSP and RTSPS addresses.".into());
    }
    if parsed.fragment().is_some() {
        return Err("Remove the # fragment from the stream address.".into());
    }
    Ok(())
}

fn create_pipeline(source_url: &str, frames: &Arc<FrameBuffer>) -> Result<gst::Pipeline, String> {
    let mut parsed_url = url::Url::parse(source_url)
        .map_err(|_| "Enter a complete RTSP or RTSPS address.".to_string())?;
    let user_id = percent_encoding::percent_decode_str(parsed_url.username())
        .decode_utf8_lossy()
        .into_owned();
    let user_password = parsed_url.password().map(|password| {
        percent_encoding::percent_decode_str(password)
            .decode_utf8_lossy()
            .into_owned()
    });
    parsed_url
        .set_username("")
        .map_err(|_| "The stream address has invalid credentials.".to_string())?;
    parsed_url
        .set_password(None)
        .map_err(|_| "The stream address has invalid credentials.".to_string())?;

    let playbin = gst::ElementFactory::make("playbin").build().map_err(|_| "GStreamer could not create a media receiver. Check that its playback plugins are installed.".to_string())?;
    let converter = gst::ElementFactory::make("videoconvert")
        .build()
        .map_err(|_| "GStreamer could not prepare video frames.".to_string())?;
    let encoder = gst::ElementFactory::make("jpegenc")
        .property("quality", 78u32)
        .build()
        .map_err(|_| "GStreamer could not create the video frame encoder.".to_string())?;
    let sink = gst::ElementFactory::make("appsink")
        .name("bibleshow_frames")
        .property("sync", false)
        .property("max-buffers", 1u32)
        .property("drop", true)
        .build()
        .map_err(|_| "GStreamer could not create a video frame sink.".to_string())?;
    let video_sink = gst::Bin::new();
    video_sink
        .add_many([&converter, &encoder, &sink])
        .map_err(|_| "GStreamer could not assemble the video output.".to_string())?;
    gst::Element::link_many([&converter, &encoder, &sink])
        .map_err(|_| "GStreamer could not link the video output.".to_string())?;
    let converter_sink = converter
        .static_pad("sink")
        .ok_or("GStreamer could not attach the video output.")?;
    let ghost_pad = gst::GhostPad::with_target(&converter_sink)
        .map_err(|_| "GStreamer could not attach the video output.".to_string())?;
    video_sink
        .add_pad(&ghost_pad)
        .map_err(|_| "GStreamer could not attach the video output.".to_string())?;
    let audio_sink = gst::ElementFactory::make("fakesink")
        .build()
        .map_err(|_| "GStreamer could not create an audio sink.".to_string())?;
    playbin.set_property("uri", parsed_url.as_str());
    playbin.set_property("video-sink", &video_sink);
    playbin.set_property("audio-sink", &audio_sink);
    let user_id = (!user_id.is_empty()).then_some(user_id);
    playbin.connect_local("source-setup", false, move |values| {
        if let Ok(source) = values[1].get::<gst::Element>() {
            if let Some(id) = &user_id {
                if source.find_property("user-id").is_some() {
                    source.set_property("user-id", id);
                }
            }
            if let Some(password) = &user_password {
                if source.find_property("user-pw").is_some() {
                    source.set_property("user-pw", password);
                }
            }
            if source.find_property("latency").is_some() {
                source.set_property("latency", 180u32);
            }
            if source.find_property("protocols").is_some() {
                source.set_property_from_str("protocols", "tcp");
            }
        }
        None
    });
    let pipeline = playbin
        .dynamic_cast::<gst::Pipeline>()
        .map_err(|_| "The RTSP receiver could not create a media pipeline.".to_string())?;
    let sink = sink
        .dynamic_cast::<gst_app::AppSink>()
        .map_err(|_| "The RTSP receiver did not create a video frame sink.".to_string())?;
    let target = Arc::clone(frames);
    sink.set_callbacks(
        gst_app::AppSinkCallbacks::builder()
            .new_sample(move |sink| {
                let sample = sink.pull_sample().map_err(|_| gst::FlowError::Eos)?;
                let buffer = sample.buffer().ok_or(gst::FlowError::Error)?;
                let map = buffer.map_readable().map_err(|_| gst::FlowError::Error)?;
                target.publish(map.as_slice().to_vec());
                Ok(gst::FlowSuccess::Ok)
            })
            .build(),
    );
    Ok(pipeline)
}

fn serve_frames(
    listener: TcpListener,
    token: String,
    frames: Arc<FrameBuffer>,
    stop: Arc<AtomicBool>,
) {
    thread::spawn(move || {
        while !stop.load(Ordering::Relaxed) {
            match listener.accept() {
                Ok((mut client, _)) => {
                    let expected_path = format!("/stream/{token}");
                    let mut request = [0u8; 1024];
                    let _ = client.set_read_timeout(Some(Duration::from_secs(1)));
                    let received = client.read(&mut request).unwrap_or(0);
                    let first_line = std::str::from_utf8(&request[..received])
                        .unwrap_or("")
                        .lines()
                        .next()
                        .unwrap_or("");
                    if first_line.starts_with(&format!("GET {expected_path} HTTP/")) {
                        let _ = client.set_write_timeout(Some(Duration::from_secs(2)));
                        let _ = client.write_all(format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: multipart/x-mixed-replace; boundary={FRAME_BOUNDARY}\r\nCache-Control: no-store, no-cache, must-revalidate\r\nPragma: no-cache\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n"
                        ).as_bytes());
                        let buffer = Arc::clone(&frames);
                        let stop = Arc::clone(&stop);
                        thread::spawn(move || send_multipart_frames(client, buffer, stop));
                    } else {
                        let _ = client.write_all(b"HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
                    }
                }
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(25))
                }
                Err(_) => break,
            }
        }
    });
}

fn send_multipart_frames(mut client: TcpStream, frames: Arc<FrameBuffer>, stop: Arc<AtomicBool>) {
    let mut previous = 0;
    let deadline = Instant::now() + Duration::from_secs(24 * 60 * 60);
    while !stop.load(Ordering::Relaxed) && Instant::now() < deadline {
        let latest = {
            let state = frames
                .state
                .lock()
                .unwrap_or_else(|error| error.into_inner());
            state
                .latest
                .as_ref()
                .map(|frame| (state.sequence, frame.clone()))
        };
        if let Some((sequence, bytes)) = latest.filter(|(sequence, _)| *sequence != previous) {
            let header = format!(
                "--{FRAME_BOUNDARY}\r\nContent-Type: image/jpeg\r\nContent-Length: {}\r\n\r\n",
                bytes.len()
            );
            if client
                .write_all(header.as_bytes())
                .and_then(|_| client.write_all(&bytes))
                .and_then(|_| client.write_all(b"\r\n"))
                .is_err()
            {
                break;
            }
            previous = sequence;
        } else {
            thread::sleep(Duration::from_millis(12));
        }
    }
}
