# Live Feed Design

**Status:** Initial design from the user's selected source: network stream URL (RTSP/NDI).
**Last updated:** 3 November 2026

## Goal

Let an operator receive a live network video source, inspect it in Preview, and send it to the Live monitor and audience output. A live source is a connection, not a media file; saved shows should retain a source reference and reconnect when selected.

## Proposed operator flow

1. Choose **Add network source** in the Live Feed tab.
2. Enter an RTSP/RTSPS URL or select a discovered NDI® source.
3. Connect and show connection state and a live Preview.
4. Single-select to stage in Preview; double-click or Enter sends the feed Live, matching the existing operator controls.
5. Stop the source from the feed or display controls. A saved show keeps the source reference, not a recording.

Keep source credentials out of project exports and visible labels. Define a secure credential-storage approach before saving URLs that include credentials.

## Implementation stages

### 1. RTSP receive and display

- Use a native GStreamer RTSP pipeline; its `rtspsrc` element receives RTSP network media.
- Add a Tauri-managed source lifecycle (connect, stop, reconnect/error state) and route the same source to Preview and audience output.
- Do not rely on an HTML `<video>` element to open `rtsp://` URLs directly; browser support is not native in most browsers.
- Validate on the Ubuntu development host and document the GStreamer runtime/build dependencies for each supported desktop target.

### 2. NDI® discovery and receive

- Add source discovery and receive through the NDI SDK as a separate backend adapter.
- Review current SDK licensing and software distribution requirements before bundling it with BibleShow.
- Keep NDI source selection and status consistent with the RTSP operator flow.

## Current implementation constraints

- The project currently has no GStreamer or NDI dependency, and this Ubuntu host has no GStreamer or FFmpeg runtime/development package installed.
- A correct Preview plus separate audience output needs a shared decoded source or relay. Sending only an RTSP URL to the audience window would create a second connection and still would not make the webview able to decode RTSP.
- The project already mirrors serializable slide state between windows; live video needs a media transport path in addition to those state events.

## Reference documentation

- [GStreamer `rtspsrc`](https://gstreamer.freedesktop.org/documentation/rtsp/rtspsrc.html)
- [MDN live streaming protocols](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery/Live_streaming_web_audio_and_video)
- [NDI SDK documentation](https://docs.ndi.video/all/developing-with-ndi/sdk)
- [NDI software distribution](https://docs.ndi.video/all/developing-with-ndi/sdk/software-distribution)
