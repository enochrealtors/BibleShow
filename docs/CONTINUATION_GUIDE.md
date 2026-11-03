# BibleShow — Continuation Guide for ChatGPT

Copy the prompt below into your ChatGPT/Codex chat after opening or cloning the BibleShow repository.

---

## Prompt to continue development

You are continuing development of **BibleShow**, an offline-first church presentation desktop app. The project is on GitHub at `https://github.com/enochrealtors/BibleShow.git`, branch `main`.

### Start here

1. Inspect the current Git branch and worktree before editing. Preserve any existing user changes.
2. Read `PROJECT_GUIDE.md`, `docs/DEVELOPMENT_STATUS.md`, `docs/FEATURES.md`, `docs/LIVE_FEED_DESIGN.md`, and this guide.
3. Check the latest Git history. At handoff, all work through commit `b033956` was pushed to GitHub. The continuation guide itself may have a newer commit; trust the checked-out Git state.
4. Continue from the documented next step. Do not rebuild completed features or replace the agreed product direction.

### Product direction

- Stack: Tauri 2, React 19, TypeScript, Vite, and Rust.
- The default Bible is KJV. Bible lookup belongs in the presentation workflow; there is no separate Bible Study workspace.
- The app is for church presentation operators and follows useful Preview/Live patterns from tools such as FreeShow and ProPresenter.
- Keep the resizable four-area operator layout: left saved project/show sequence, centre Preview and Live above the content feed, right display controls, plus the top toolbar.
- The content feed tabs are Bible, Lyrics, Videos / Images, Presentations, Live Feed, URL Media, Themes, Functions, and Overlays. Detailed sub-items can evolve as the user gives feedback.
- Single-select previews an item; double-click or Enter sends it Live. A passage spanning multiple verses becomes one readable verse per slide.
- Saved shows should not unexpectedly change the Live output when opened. Preserve the existing save/discard/stay prompt for unsaved changes.

### Implemented so far

- Local KJV and song library import/browsing.
- Bible reference/range and keyword search, including one verse per passage slide.
- Lyrics sections shown alongside the song list.
- Four-area operator layout, local Preview/Live monitors, sequence/project save/load/import/export, and separate fullscreen audience output.
- Local image import (PNG/JPEG/GIF/WebP) and video import (MP4/WebM); initial video playback is muted and loops.
- Saved Presentations feed can browse projects, Preview or send individual slides Live, add one slide, or add all slides to the current show.
- SQLite schema is currently version 5.

### Current development stage: Videos / Images upload and playback

The Live Feed implementation supports operator-window camera/webcam capture, a WebRTC relay of the same camera to audience output, direct HTTP(S) video/HLS and MJPEG endpoints, YouTube watch/live links via YouTube's embed player, plus the existing optional experimental RTSP/GStreamer adapter. An Ubuntu 24.04 x64 trial installer workflow exists, but the user has deferred packaging and will review the app with `cargo tauri dev` from the source checkout. The code is not yet validated on Windows WebView2 or Ubuntu WebKitGTK. YouTube playback may still be blocked when the owner disables embedding or the web player requires a user click.

Implemented in the current checkout: resource-library imports for the formats below, with translation-aware Bible browsing and saved Scripture slides. Review `docs/RESOURCE_IMPORT_DESIGN.md` for parser boundaries and import limits. Desktop review is still required for real-world files and display formatting.

The current next step is desktop verification of MP4/WebM import and playback in the Videos / Images feed. See `docs/MEDIA_IMPORT_DESIGN.md` for the implementation and review checklist. The webview upload now sends raw file bytes with the filename in request metadata to avoid a duplicate full-size buffer; the Rust importer accepts the previous packet format as well. Media writes use a temporary file before installation, and local playback shows a codec error if the active WebView cannot decode the file. The user will run `cargo tauri dev` and review the app when available.

If desktop verification succeeds, continue with media-library management (remove/rename, file details and relinking) only after reviewing the current project plan and user feedback. If upload or playback still fails, capture the displayed error and distinguish an import/storage failure from a codec/WebView decode failure before changing formats or dependencies.

Formats selected by the user:

- Bible: USFM/USX, OSIS and Zefania XML.
- Lyrics: OpenLyrics, OpenSong, OpenLP export, plain text and CSV.
- Import preview, richer metadata/attribution review, and support for additional dialects remain future improvements.

Keep direct camera and browser-playable HTTP(S) endpoints as the no-GStreamer default. A webview cannot play arbitrary RTSP/NDI addresses directly; keep those in native adapters. The existing GStreamer 1.28 RTSP backend is experimental and its Windows packaging is unresolved. Keep credentials out of labels, logs, saved projects and exports.

### Working approach

- Make a small, complete implementation slice, update `docs/DEVELOPMENT_STATUS.md` and relevant project docs, run appropriate lint/type/build/compile checks, then commit it with a clear message.
- Do not run test suites unless the user asks. Do not push unless the user explicitly authorizes it.
- Keep communication concise and user-friendly. The user may be reviewing the desktop app while development continues, so summarize what changed, how it was checked, and anything that needs desktop verification.
- The user expects useful progress without repeated approval requests for routine reversible work. Ask only when a product decision or external dependency choice materially changes the result.

### Current Git handoff

Check the current branch, status, remotes, local commits and remote state; do not assume new work has been pushed. At the start of the camera/URL implementation session, `main` was one commit ahead of `origin/main` at local commit `1aab387` (`feat: add RTSP network live feed`), and `docs/LIVE_FEED_DESIGN.md` already contained an uncommitted user-approved direction update. Preserve those facts and any additional worktree edits.

---
