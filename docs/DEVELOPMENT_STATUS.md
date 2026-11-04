# BIBLESHOW — DEVELOPMENT STATUS

**Document version:** 1.0
**Last updated:** 3 November 2026
**Project status:** GitHub baseline established; initial shell and local KJV/lyrics importer implemented; starter content package prepared.

## 1. Current Development Environment

Development machine: Ubuntu Linux on AWS virtual machine.

Project directory:
`~/projects/bible-app`

Application name: BibleShow

Initial release target: Windows desktop.

## 2. Installed Development Tools

| Tool | Recorded version | Status |
|---|---|---|
| Node.js | 22.22.1 | Installed |
| npm | 9.2.0 | Installed |
| Rust | 1.99.1 | Installed |
| Cargo | 1.99.1 | Installed |
| Tauri CLI | 2.12.4 | Installed |
| Vite | 8.3.5 | Installed |
| React | 19.3.1 | Installed |
| TypeScript | 6.0.3 | Installed |

Versions are historical records and should be checked before major upgrades.

## 3. Completed Work

### Development environment
- Node.js installed.
- npm installed.
- Rust installed.
- Cargo installed.
- Tauri CLI installed.
- Required Ubuntu Tauri development libraries installed.

### Frontend foundation
- React and TypeScript project created.
- Vite configured.
- ESLint configured.
- TypeScript dependency compatibility issue resolved.
- npm dependency audit reduced to zero reported vulnerabilities.
- Production frontend build completed successfully.
- Replaced the Vite starter screen with the initial BibleShow application shell.
- Added Home, Bible Study and Church Presentation navigation and landing states.
- Per the user's updated product direction, removed the dedicated Bible Study workspace; KJV remains available as a presentation content source.
- Added a working light/dark theme toggle and responsive desktop/mobile layouts.
- Updated the document title and page metadata to BibleShow.
- Production build passed after the shell implementation.
- Narrow browser preview checked at a 296 px viewport; navigation and theme toggle confirmed.
- Saved the shell checkpoint as local commit `9ded581` (`feat: add initial BibleShow application shell`).
- Expanded `docs/DATABASE_DESIGN.md` with the initial SQLite schema proposal.
- Added `docs/BIBLE_TRANSLATION_SOURCES.md` with the user's KJV selection and rights review.
- Inspected the user-provided `Hymns & Bibles.zip`; validated the selected KJV file (66 books, 1,189 chapters, 31,102 verses).
- Prepared a local staging package with the KJV, 793 structured hymns, and 2,742 songs containing lyrics.
- Repaired Windows-1252/UTF-8 encoding in 716 hymn files and split all 793 hymns into 3,849 OpenLyrics sections; lyric wording was checked as preserved.
- Restored lyrics for 13 songs from unambiguous duplicates; listed 700 still-empty songs for manual/source-backed follow-up.
- Added `docs/CONTENT_IMPORT_REVIEW.md`; implemented the version-1 local SQLite schema and transactional importer for the prepared KJV and lyrics. The package remains outside Git.
- Added a home-screen import control and local library summary; KJV is set as the default translation during import.
- Added Bible book and chapter selection, previous/next chapter controls, and verse reading from local KJV SQLite data.
- Fixed the import size limit after confirming that the KJV XML is 5.17 MB; the original 3 MB per-file cap rejected the Bible and rolled back the complete import.
- Added searchable local hymn/song browsing with category filters and formatted lyric details.
- User confirmed that the Bible and lyrics imported successfully. Follow-up added a verse selector, KJV access from Presentation, and one-section-per-page lyric previews with page navigation.
- Implemented the first presentation operator workspace: Bible and lyric source panels, separate Preview and Live monitor panels, explicit Take Live, independent live/preview navigation, and an in-memory service sequence with slide thumbnails.
- The Live monitor is an operator preview. Audience output uses a separate fullscreen Tauri window with display selection.
- Added local SQLite presentation persistence with schema version 2. Saved sequences retain references to installed KJV verses and lyric sections and hydrate their text on load.
- Added presentation name, save/update, saved-presentation selection, New, and Delete controls. Loading a saved sequence stages its first page in Preview and leaves Live untouched.
- Added page duplication and up/down ordering controls to the service sequence; sequence edits keep Preview and Live references aligned.
- Validation: ESLint, TypeScript checks for both frontend projects, Vite production build, `cargo check`, and `git diff --check` passed. Build artifacts were written under `/tmp` because the project checkout is read-only in this environment. Desktop save/load/delete behavior and the installed-library migration still need runtime verification.
- Fixed the reported source-selection gap in the interface: clicking a Bible verse or lyric section now stages it in Preview, with selected-item feedback; the source tab is labeled Lyrics. Frontend checks pass; verify this in the Tauri desktop app when available.
- Updated the presentation design direction: resizable left project/show panel, centre upper Preview/Live area, centre lower content feed, right display controls, and a top toolbar. Content-feed and toolbar sub-items are to be brainstormed with the user as each area is designed; this is a working plan that can evolve.
- Implemented the first four-area layout pass: draggable desktop dividers, a left project/current-show panel, centre Preview/Live monitors over content feeds, and right-side local Live monitor controls with clear/open, static and scrolling alerts.
- Added feed tabs for Bible, Lyrics, Videos/Images, Presentations, Live Feed, URL Media, Themes, Functions and Overlays. Bible and Lyrics are connected; remaining feeds are clearly marked as planned placeholders.
- Added top toolbar headings for Profile, Edit, View, Settings, Connections and Plugins. Their sub-items remain placeholders pending further design.
- Added drag-and-drop from Bible verses and lyric sections into the current show, plus a save-before-close prompt from the workspace Home control. Native desktop visual and interaction review remains pending.
- Reclaimed the Presentation screen by hiding the global sidebar and breadcrumb/search header while Presentation is open, removing its redundant page title block, and expanding the operator UI to use the full window.
- Removed Bible Study navigation and the reading workspace. Home and Presentation remain; KJV import and Scripture selection remain available for presentation use.
- Increased operator, project and feed typography and tightened nested feed sizing to address the verse/lyric list scrolling issue.
- Added project JSON import and export for reusable or transferable service projects.
- Replaced the Live status strip with a KJV Bible search bar supporting reference/range lookup and keyword search.
- Added passage range staging; each selected verse becomes its own slide so text remains at normal size.
- Reworked the Lyrics feed to show song sections beside the song list instead of hiding them below it.
- Single-click on a source/sequence item stages Preview; double-click or Enter sends that item directly to Live.
- Added a separate hidden-at-startup audience output window, connected-display selection, fullscreen monitor placement, and event-based mirroring of Live slides and alerts.
- Changed KJV keyword search into a dedicated results view so search results no longer crowd book/chapter and passage controls; selecting a result returns to the verse browser and clears the result panel.
- Added a three-choice unsaved-show prompt (Save and continue, Discard changes, Stay here) for leaving Presentation, starting a new show, or opening another project.
- Implemented the Videos / Images feed: local image and MP4/WebM video import, Preview/Live output, video schema upgrade to version 5, and media references in saved presentations. Video is muted and loops in its initial playback implementation.
- Connected the Presentations feed to saved projects, with slide browsing, Preview/Live selection, and add-one/add-all actions.
- Added multi-file import for USFM/SFM, USX, OSIS and Zefania Bible resources, plus OpenLyrics/OpenSong/OpenLP XML, TXT and CSV lyrics. Imports parse before writing and commit as a transaction; exact lyric duplicates are skipped.
- Added translation selection to the Bible feed, keyword search, and persisted Scripture slides. KJV remains the default version.
- Added `docs/RESOURCE_IMPORT_DESIGN.md` with format support, import limits, parser boundaries and desktop-review notes.
- Frontend and Rust compile checks are in progress; imported multi-version data and formatting still need review in the desktop app. The build was intentionally kept at the library-import stage while desktop packaging is deferred.
- Reworked local media upload to send file bytes as Tauri's raw request body and carry the filename in a request header, avoiding a second full-size buffer for large videos. The Rust importer still accepts the prior packet format for compatibility.
- Moved the synchronous hashing/storage command off the Tauri main UI thread so large media files do not freeze the operator window during import.
- Media files are written through a temporary file before being installed into the library, reducing the chance that an interrupted large upload leaves a truncated video in the catalog. The media feed now reports image/video counts and per-file progress, and local video playback failures show a WebView codec message.
- Successful files are added to the feed one at a time, so a later error in a multi-file selection does not hide earlier imports. Added `docs/MEDIA_IMPORT_DESIGN.md` with the upload/playback boundary and desktop review checklist.
- The Ubuntu environment has GStreamer H.264 and VP8 decoders available. This does not by itself confirm that its WebKitGTK webview can play the local files; the desktop review still needs to check the actual window.
- Rechecked media imports with frontend type/lint/build and Rust compile checks; actual MP4/WebM upload and playback still need confirmation in the desktop app on the user's Ubuntu laptop.

### Desktop foundation
- Tauri 2 initialised.
- Application name configured as BibleShow.
- Desktop window configured.
- Tauri development application successfully launched.
- BibleShow shell configured to display inside the existing Tauri window.
- Tauri development launch rechecked after the shell work; the process started, with a `libEGL` DRI3 warning. No native app window is exposed to this review session, so Tauri-window visual review remains pending.

### Documentation
- PROJECT_GUIDE.md created.
- docs/TECHNICAL_DECISIONS.md created.
- docs/DEVELOPMENT_STATUS.md created.
- docs/DATABASE_DESIGN.md created.
- docs/FEATURES.md created.
- docs/CONTENT_IMPORT_REVIEW.md created.

The supporting project documents are present. Their contents remain planning references and should be updated as implementation progresses.

## 4. Current Application State

The Vite starter screen has been replaced by a presentation-focused BibleShow shell. Home provides content import and library status; Presentation is the primary workspace. The KJV and lyrics are presentation sources. The presentation workspace now includes reference/keyword search, passage staging, visible song sections, project import/export, local persistence, and a fullscreen audience window with display selection. Desktop runtime review is still needed.

The user-selected KJV and cleaned lyrics are prepared in a local staging package. A home-screen importer writes them to BibleShow's local SQLite database; the Presentation feed reads KJV verses and lyric sections from that database. No content is loaded until the user selects the package in the desktop app.

Media projection and Scripture detection have not been implemented.

## 5. Known Configuration Items

- Tauri application identifier is `com.enochrealtors.bibleshow`; the current data folder remains mapped to `com.tauri.dev` to preserve existing local libraries.
- Check the current Git branch, worktree, and remote status before continuing; do not rely on older commit snapshots in this document.
- Final application branding is pending.
- The frontend remains on the initial Vite React/TypeScript foundation, with a custom BibleShow shell.

Do not change working configuration unnecessarily.

## 6. Outstanding Implementation Work

### Foundation
- [x] Establish Git repository and initial commit.
- [~] Create BibleShow visual identity.
- [x] Replace default Vite starter interface.
- [x] Implement initial application shell.
- [x] Implement main navigation.
- [x] Establish initial light and dark themes.

### Scripture Source Engine
- [x] Implement versioned SQLite schema and local importer; future migrations remain.
- [~] Identify Bible translation rights; KJV source selected, territory review remains open.
- [x] Import initial Bible translation from the local package.
- [x] Browse books, chapters and verses from the Presentation feed.
- [x] Search KJV references, passage ranges and verse keywords for presentation.
- [ ] Add licensed translation management.

### Presentation Engine
- [~] Create presentation operator workspace with distinct Preview and Live screens.
- [~] Use the full application window for Presentation and remove redundant page/header/sidebar chrome.
- [x] Remove the dedicated Bible Study workspace from the application and roadmap; retain KJV lookup in the presentation feed.
- [~] Increase operator typography and improve nested feed scrolling (desktop verification pending).
- [~] Import and export local presentation project JSON files.
- [ ] Implement Scripture slides.
- [ ] Implement song management.
- [ ] Implement slide editor.
- [~] Add individual Bible/lyric pages and multi-verse passage ranges to the service sequence.
- [~] Implement in-workspace Preview-to-Live controls.
- [~] Save and load presentations and service order (implementation complete; runtime verification pending).
- [~] Implement separate fullscreen audience output window and display selection (code complete; desktop verification pending).

### Media Engine
- [~] Image management (local import, library browsing, Preview/Live and saved presentation references; desktop verification pending).
- [ ] Audio playback.
- [~] Video playback (MP4/WebM, muted looping; audio controls remain future work and desktop verification is pending).
- [ ] Background management.
- [ ] Document import.

### Detection Engine
- [ ] Evaluate speech recognition.
- [ ] Implement direct reference detection.
- [ ] Implement paraphrase detection.
- [ ] Implement contextual matching.
- [ ] Implement assisted detection.
- [ ] Implement automatic detection safeguards.

### Advanced Presentation
- [ ] Multiple display support.
- [ ] Stage display.
- [ ] Remote control.
- [ ] OBS integration.

### Cloud and Synchronisation
- [ ] Evaluate Supabase configuration.
- [ ] Implement optional authentication.
- [ ] Design synchronisation.
- [ ] Implement backups.
- [ ] Implement conflict resolution.

### Release
- [ ] Windows packaging.
- [ ] Installer.
- [ ] Offline testing.
- [ ] Performance testing.
- [ ] Security testing.
- [ ] User acceptance testing.

## 7. Immediate Next Steps

The next development sequence is:

1. Windows desktop review of MP4/WebM import, Play/Pause, seeking, Loop, optional Live delay, Preview/Live/audience synchronization, freezing, and the new Up Next card; see `docs/MEDIA_IMPORT_DESIGN.md`.
2. User desktop review of Bible and Lyrics import formats; see `docs/RESOURCE_IMPORT_DESIGN.md`.
3. Verify Live Feed camera permission and selection, WebRTC audience relay, HTTP(S) video/HLS and MJPEG playback, and RTSP fallback on desktop. Confirm the stream stops and releases the camera cleanly.
4. After the media and import reviews, continue the remaining presentation/feed plan. NDI® and cross-platform GStreamer packaging remain separate optional adapter decisions. The user has deferred the desktop installer and plans to run the app from the Ubuntu source checkout.

Do not jump ahead to advanced AI or cloud functionality.

## 8. Development Session Handover

Whenever a development session ends, update this document with:

- Work completed.
- Files created or modified.
- Commands successfully executed.
- Current errors or unresolved issues.
- Features tested.
- The exact next development task.

A new development session must read this document and PROJECT_GUIDE.md before modifying the application.

**Current restart point:** Video playback controls, Preview/Live/audience synchronization, and the Live monitor's compact Up Next card are implemented. The user will do further desktop review on Windows when available; continue implementation while keeping runtime verification pending. Then complete the documented media/resource review sequence. The user is also considering a Windows development checkout; see suggestion S-003 in `docs/PROJECT_SUGGESTIONS.md`.

### 9. Current session — RTSP Live Feed

- Added a native GStreamer RTSP/RTSPS receiver with TCP transport, JPEG decoding, an ephemeral tokenized localhost MJPEG stream shared by operator Preview and audience output, and explicit connect/stop/error handling.
- Added a Live Feed URL control; the address is masked and held only in memory, never persisted or exported. One source is supported at a time; network feeds are not saved into show sequences yet.
- Installed Ubuntu GStreamer development libraries and the tools/base/good/libav plugins on the VM. Runtime and Windows packaging requirements remain to be resolved.
- Frontend lint, TypeScript, production build, Rust `cargo check`, GStreamer plugin availability checks, JSON validation, and `git diff --check` passed. Rust check used reduced debug output to fit the temporary build quota.
- End-to-end playback against a real camera was not verified because no RTSP source was available. Windows GStreamer runtime packaging remains unresolved.

### 10. Current session — camera and direct URL Live Feed

- Added connected camera/webcam capture to the Live Feed panel with device selection after initial permission and explicit user-initiated start/stop.
- Added a single-source WebRTC relay from the operator window to audience output when a camera is sent Live. The audience window does not request a second camera capture.
- Added direct HTTP(S) video/HLS and MJPEG endpoints. URLs remain session-only and masked; arbitrary watch pages and RTSP are not treated as browser-playable sources.
- Added YouTube watch/live/short links via the official embedded player after the user reported the pasted URL appeared masked and could not play with direct stream formats. The URL field now displays the pasted value with a hide/show control, and detected YouTube links bypass the HLS/MJPEG selector.
- Moved Tauri window creation into Rust so the main webview can allow camera permission requests after the operator starts capture, while the audience webview denies camera permission. Permission behavior and playback still require desktop review.
- Kept the existing GStreamer RTSP receiver as an optional experimental choice. Updated the Live Feed design document to reflect actual code and platform verification limits.
- Validation: production frontend build, app and node TypeScript checks, ESLint, Rust `cargo check`, Tauri config JSON parsing, and `git diff --check` passed. The build used `/tmp` for output because dependency cache folders are read-only in this session. YouTube link parsing/embed behavior and real camera/network playback still need desktop runtime verification.

### 11. Current session — Ubuntu trial package

- The user redirected the trial build from Windows to Ubuntu to avoid unresolved Windows GStreamer packaging.
- Added an Ubuntu 24.04 x64 GitHub Actions build that produces a Debian `.deb` package and uploads it as a short-retention workflow artifact.
- The `.deb` declares GStreamer good plugins and libav runtime dependencies so apt can install the RTSP plugins required by the current Linux backend. The build job installs GTK/WebKit, Rust, frontend and GStreamer development dependencies.
- The connected build machine is Ubuntu 26.04 x64. Building on Ubuntu 24.04 avoids producing a binary that requires newer glibc than an Ubuntu 24.04 laptop. Actual installation on the user's laptop still needs confirmation against its Ubuntu release.
- The Windows build path was not completed; no Windows-only changes are retained.

### 12. Current session — local video playback and suggestion tracking

- Investigated the report that imported videos were accepted but would not play. The likely Linux-specific cause is WebKitGTK playback through Tauri's asset URL; see the upstream [Tauri Linux playback issue](https://github.com/tauri-apps/tauri/issues/15472) and related [asset protocol issue](https://github.com/tauri-apps/tauri/issues/3725).
- Added a local-only, token-protected HTTP video endpoint that serves imported MP4/WebM files with `HEAD`, byte-range responses and seek support. The media-feed thumbnail, operator output and audience output now use its playback URL. This is implemented but awaits runtime review in the user's Ubuntu desktop app; WebView codec support still applies.
- Added `docs/PROJECT_SUGGESTIONS.md` as the append-only suggestion and feedback log, linked from `PROJECT_GUIDE.md` and `docs/FEATURES.md`.
- Recorded the Windows laptop workflow as a planned project item. A separate Windows checkout can use the same GitHub repository; cross-platform development and Windows dependencies still need validation.
- Current local branch at inspection: `main`, six commits ahead of `origin/main`; these code and documentation changes remain uncommitted and have not been pushed.

### 13. Current session — unique Tauri application identifier

- The Ubuntu trial workflow failed before packaging because Tauri rejects the default `com.tauri.dev` bundle identifier.
- Changed the application identifier to `com.enochrealtors.bibleshow`.
- Kept Tauri's app data directory mapped to the existing `com.tauri.dev` data folder so changing the identifier does not hide an existing local Bible/lyrics library or media files. Revisit this transitional mapping only with an explicit data migration plan.

### 14. Current session — video playback controls and synchronization

- Added Play/Pause, a seek bar with current and total time, and a Loop toggle under video Preview and Live monitors.
- Added an optional one-second delay for starting Live video. When a video is sent Live, its playback position and play/pause/loop state are copied from Preview; audience output follows Live playback and corrects noticeable drift.
- Reduced independent playback state drift by synchronizing the operator monitors and audience window, preloading monitor videos, and showing a buffering indicator. This is a mitigation, not a confirmed fix for all stutter: real playback smoothness depends on the desktop WebView, codec, and media device and must be reviewed in the Ubuntu app.
- Updated the media guide, feature list and desktop review checklist. Files changed: `src/App.tsx`, `src/App.css`, `docs/MEDIA_IMPORT_DESIGN.md`, `docs/FEATURES.md`, and this document.
- Validation is pending for this session. No desktop app or representative video files were available for runtime review here.
- Exact next task: run `cargo tauri dev`, exercise the playback controls and delay with an imported MP4/WebM, note whether freezing persists, then continue the media/resource review sequence above.

### 15. Current session — Live monitor Up Next preview

- Added a compact Up Next card below the Live monitor. It displays the title, type, and text excerpt of the next queued show item, plus an image thumbnail for an image slide. It follows the Live sequence position, not the operator's Preview selection.
- Video items are represented by title and type rather than starting an additional decoder/player in the monitor, avoiding extra playback load.
- Updated `docs/FEATURES.md` and the desktop review checklist. Files changed: `src/App.tsx`, `src/App.css`, `docs/FEATURES.md`, and this document.
- Validation is pending for this session; Windows layout and sequence behavior need user review.
- Exact next task: continue with the planned presentation workflow, then review video playback and Up Next behavior in the Windows desktop app when available.
