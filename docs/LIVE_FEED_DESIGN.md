# Live Feed Design

**Status:** Direct camera/webcam capture, HTTP(S) MJPEG/video endpoints, and YouTube links through the official embedded player are implemented in the Live Feed feed. Camera output uses an operator-to-audience WebRTC relay. Runtime compatibility and actual device playback still need desktop verification. RTSP/GStreamer remains an optional experimental path.
**Last updated:** 3 November 2026

## Goal

Let an operator receive a live network video source, inspect it in Preview, and send it to the Live monitor and audience output. A live source is a connection, not a media file. Future saved shows should retain a credential-safe source reference and reconnect when selected; the current implementation keeps connections session-only.

## Proposed operator flow

1. Choose **Camera / capture device** or **Stream URL** in the Live Feed tab.
2. For a camera, grant camera access and choose an available device. For a URL, enter a direct video stream endpoint.
3. Connect and show connection state and a live Preview.
4. Single-select to stage in Preview; double-click or Enter sends the feed Live, matching the existing operator controls.
5. Stop the source from the feed or display controls. Network and camera sources remain session-only until credential-safe project persistence is designed.

Keep source credentials out of project exports and visible labels. Define a secure credential-storage approach before saving URLs that include credentials.

## Implementation stages

### 1. Direct camera / capture device — implemented; desktop verification pending

- Use the browser media-device API to request a stream after the operator selects Start camera. Keep capture in the operator window and stop every track on disconnect/unmount.
- Route the same captured stream to the separate audience window through an in-app WebRTC peer connection; do not request the camera independently from both windows.
- Main-window camera permission is allowed by Tauri only when the user presses Start camera; the hidden audience window denies permission requests and receives the relayed stream instead.

### 2. Browser-playable direct URL streams — implemented; runtime verification pending

- Accept direct HTTP(S) endpoints as MJPEG image streams or browser video. HLS (`.m3u8`) is submitted as browser video and must be checked on Windows WebView2 and Ubuntu WebKitGTK; no HLS JavaScript player is bundled yet. MP4/WebM local media retains its existing path.
- Preserve URL privacy: show the pasted URL clearly by default, offer a hide control, do not log it, and do not persist credentials or tokens in project JSON. Explain that direct stream formats require a playable endpoint; supported platform links such as YouTube are handled with their own embed player.
- Use the same operator-to-audience WebRTC relay for the decoded URL stream where both windows must show one synchronized source.
- Recognize common YouTube watch, short, and live links and convert only the validated 11-character video ID to YouTube's documented `/embed/VIDEO_ID` player URL. Do not pass a watch page to `<video>`; keep YouTube iframe playback distinct from direct stream formats. A stream can still refuse embed playback or require a user gesture for audio/autoplay.

### 3. RTSP/RTSPS and NDI — optional native adapters

- The current branch contains a GStreamer RTSP receiver with a loopback MJPEG bridge, TCP transport and a tokenized local endpoint. It compiles on this Ubuntu VM but has not been verified against a real camera. It requires GStreamer and is not part of the no-GStreamer camera/URL path.
- Keep or remove this adapter after direct camera and browser-playable URL feeds work. Do not promise arbitrary RTSP URLs as browser-playable.
- NDI® discovery and receive would require its SDK as a separate adapter; review current distribution requirements before implementation.

### 4. NDI® discovery and receive

- Add source discovery and receive through the NDI SDK as a separate backend adapter.
- Review current SDK licensing and software distribution requirements before bundling it with BibleShow.
- Keep NDI source selection and status consistent with the RTSP operator flow.

## Current implementation constraints

- `navigator.mediaDevices.getUserMedia()` requires a secure context and explicit permission; verify device selection and OS-level access in both Tauri target platforms.
- RTSP is not a native browser video transport. A direct camera and supported HTTP(S) stream can avoid GStreamer, but that does not make RTSP/NDI endpoints work without a native adapter or a conversion service.
- A single camera source feeds Preview and audience output through a local WebRTC peer connection. Verify codec support, startup, stop, audience-window reopening, and reconnect behavior on Windows WebView2 and Ubuntu WebKitGTK.
- GStreamer 1.28 development libraries and plugins remain installed on this Ubuntu VM from the experimental RTSP stage. The last compile passed; playback against a real source remains unverified.

## Reference documentation

- [GStreamer `rtspsrc`](https://gstreamer.freedesktop.org/documentation/rtsp/rtspsrc.html)
- [MDN live streaming protocols](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery/Live_streaming_web_audio_and_video)
- [MDN `getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Tauri 2.12 webview permission hook](https://v2.tauri.app/blog/tauri-2.12/)
- [MDN streaming audio/video and HLS support](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Streaming)
- [NDI SDK documentation](https://docs.ndi.video/all/developing-with-ndi/sdk)
- [NDI software distribution](https://docs.ndi.video/all/developing-with-ndi/sdk/software-distribution)
