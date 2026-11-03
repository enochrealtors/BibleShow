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

### Next development stage: network Live Feed

The user selected **network stream URL (RTSP/NDI)** as the first Live Feed source. Read `docs/LIVE_FEED_DESIGN.md` before implementation.

- Start with RTSP/RTSPS receive and display. Add NDI® discovery/receive as a separate follow-on after checking SDK distribution requirements.
- Do not treat an RTSP URL as playable by an HTML `<video>` tag. Live video needs a native media backend and a transport path that works for both operator Preview and the separate audience window.
- The Ubuntu environment used before handoff had no GStreamer or FFmpeg runtime/development packages installed. Check the current environment before choosing dependencies. Plan runtime/build requirements for supported desktop systems; avoid a UI-only placeholder that cannot play the stream.
- Address source lifecycle (connect, stop, reconnect/error state), latency, Preview/Live behavior, project references, and credentials. Do not put credentials in visible labels or exported project files; decide on safe credential handling before persisting URLs that contain them.

### Working approach

- Make a small, complete implementation slice, update `docs/DEVELOPMENT_STATUS.md` and relevant project docs, run appropriate lint/type/build/compile checks, then commit it with a clear message.
- Do not run test suites unless the user asks. Do not push unless the user explicitly authorizes it.
- Keep communication concise and user-friendly. The user may be reviewing the desktop app while development continues, so summarize what changed, how it was checked, and anything that needs desktop verification.
- The user expects useful progress without repeated approval requests for routine reversible work. Ask only when a product decision or external dependency choice materially changes the result.

### Current Git handoff

At the time this guide was created, the repository was pushed to `origin/main` at `b033956` (`docs: plan network live feed stage`), with a clean worktree. Verify current state because this guide will be committed afterward.

---
