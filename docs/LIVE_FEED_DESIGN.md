# Live Feed Design

**Status:** RTSP receive/Preview/Live first implementation slice is in progress; NDI remains planned.
**Last updated:** 3 November 2026

## Goal

Let an operator receive a live network video source, inspect it in Preview, and send it to the Live monitor and audience output. A live source is a connection, not a media file. Future saved shows should retain a credential-safe source reference and reconnect when selected; the current implementation keeps connections session-only.

## Proposed operator flow

1. Choose **Add network source** in the Live Feed tab.
2. Enter an RTSP/RTSPS URL or select a discovered NDI® source.
3. Connect and show connection state and a live Preview.
4. Single-select to stage in Preview; double-click or Enter sends the feed Live, matching the existing operator controls.
5. Stop the source from the feed or display controls. In a future version, a saved show may keep a source reference, not a recording.

Keep source credentials out of project exports and visible labels. Define a secure credential-storage approach before saving URLs that include credentials.

## Implementation stages

### 1. RTSP receive and display

- Use a native GStreamer RTSP pipeline; its `rtspsrc` element receives RTSP network media.
- Current implementation: one active RTSP/RTSPS source, TCP transport, a short GStreamer jitter buffer, JPEG frame decoding, and one token-protected loopback MJPEG endpoint shared by Preview and the audience window.
- The stream URL is entered in a password-style field and held only in process memory. It is not logged, exported, placed in the presentation sequence, or persisted. Embedded URL credentials are supported for the current connection only.
- A source must produce its first frame within eight seconds. On disconnect/error, the source is stopped and its Preview/Live slide is cleared. Reconnect is a manual operator action.
- Adding network sources to saved shows is deferred until a credential-safe persistence model is designed. NDI discovery and receive remain a separate follow-up.
- Do not rely on an HTML `<video>` element to open `rtsp://` URLs directly; browser support is not native in most browsers.
- Ubuntu development requires GStreamer 1.28 development headers, GStreamer base/good plugins, and the libav plugin for common H.264 streams. Install with `sudo apt install gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-libav libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev`. The application binary dynamically links GStreamer; Linux runtime packages must be installed. Windows runtime bundling and packaging still need a documented installer/toolchain path before that release target can use this backend.

### 2. NDI® discovery and receive

- Add source discovery and receive through the NDI SDK as a separate backend adapter.
- Review current SDK licensing and software distribution requirements before bundling it with BibleShow.
- Keep NDI source selection and status consistent with the RTSP operator flow.

## Current implementation constraints

- GStreamer Rust bindings are now a project dependency. This Ubuntu host has GStreamer 1.28 development libraries and the tools/base/good/libav plugins installed for development.
- A correct Preview plus separate audience output needs a shared decoded source or relay. Sending only an RTSP URL to the audience window would create a second connection and still would not make the webview able to decode RTSP.
- The project mirrors serializable slide state between windows; the loopback MJPEG URL is carried in that ephemeral state while the actual frame source remains a single native GStreamer pipeline.
- The Rust build and frontend checks pass on this VM. A reachable RTSP source was not available during implementation, so end-to-end camera playback still needs desktop verification.

## Reference documentation

- [GStreamer `rtspsrc`](https://gstreamer.freedesktop.org/documentation/rtsp/rtspsrc.html)
- [MDN live streaming protocols](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery/Live_streaming_web_audio_and_video)
- [NDI SDK documentation](https://docs.ndi.video/all/developing-with-ndi/sdk)
- [NDI software distribution](https://docs.ndi.video/all/developing-with-ndi/sdk/software-distribution)
