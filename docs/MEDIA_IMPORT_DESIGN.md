# Videos and Images feed

The local media library supports PNG, JPEG, GIF and WebP images, plus MP4 and WebM videos. Imported files are stored under BibleShow's application data directory, indexed by a SHA-256 content identifier and referenced from saved presentations.

## Upload path

- The frontend reads one selected file at a time and sends its `Uint8Array` as Tauri's raw IPC body. Its filename travels in the `x-bibleshow-filename` request header, avoiding construction of another full-size upload buffer.
- The synchronous Rust import handler is dispatched on Tauri's async runtime so hashing and writing a large video do not block the main UI thread.
- The Rust command verifies the file signature rather than trusting the name or browser MIME type. Limits are 25 MB per image and 250 MB per video.
- Files are first written to a uniquely named temporary file, then installed into the media directory. The old length-prefixed payload remains accepted for compatibility with older frontends.
- Each file is imported separately. Successful files appear in the feed immediately; if a later file fails, earlier successes remain visible and the error identifies that the batch stopped.
- The feed offers All, Images, and Videos filters so imported videos can be inspected without scrolling through photos.

## Playback

Local video playback uses the active desktop WebView's media decoder. On Linux, Tauri's asset URL can fail in WebKitGTK even when the file is valid; BibleShow therefore serves imported MP4/WebM files from a token-protected loopback HTTP endpoint with byte-range and HEAD support. The same URL is used by the feed preview, operator Preview/Live, and audience window. The endpoint is bound only to `127.0.0.1`, serves only media IDs registered from the local library, and does not expose credentials. BibleShow does not transcode media on import. Playback remains dependent on the WebView's supported codecs and is muted and inline. The operator Preview and Live monitors provide Play/Pause, a seek bar, and a Loop toggle. The Preview panel can optionally delay Live video start by one second. Live monitor time is relayed to audience output and corrected for drift; local video elements preload automatically and show a buffering indicator while waiting.

## Desktop review checklist

1. Import a short H.264 MP4 and a short WebM file, then confirm both appear in the feed with the correct file counts.
2. Select each once for Preview, add it to the show, send it Live, and save/reopen a project containing each.
3. Confirm the audience output plays the same saved local file.
4. Try a larger file and verify the per-file status stays responsive; check that a failed selection reports an upload error while previously imported files remain listed.
5. Confirm Play, Pause, seeking, Loop, and the optional one-second Live delay from the operator Preview and Live controls. Confirm that Live and audience output remain aligned, including after seeking or pausing.
6. Confirm a video can play from the media-feed thumbnail, operator Preview, audience output, and after loading a saved presentation. Seek within a longer file to verify byte-range handling and watch for freezing or repeated buffering.
7. If an import succeeds but playback still shows a decode error through the loopback URL, record the container and codec before changing the decoder or adding format conversion.
