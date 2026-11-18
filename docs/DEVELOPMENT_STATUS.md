# BIBLESHOW — DEVELOPMENT STATUS

**Document version:** 1.0
**Last updated:** 18 November 2026
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

1. Windows desktop review of MP4/WebM import, Play/Pause, seeking, Loop, optional Live delay, Preview/Live/audience synchronization, freezing, the Up Next card, and show slide edits; see `docs/MEDIA_IMPORT_DESIGN.md`.
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

**Current restart point:** Video playback controls, Preview/Live/audience synchronization, the Live monitor's compact Up Next card, and a first-pass show slide editor are implemented. The user will do further desktop review on Windows when available; continue implementation while keeping runtime verification pending. Then complete the documented media/resource review sequence. The user is also considering a Windows development checkout; see suggestion S-003 in `docs/PROJECT_SUGGESTIONS.md`.

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

### 16. Current session — first show slide editor

- Added an Edit action to current-show slides. Operators can change a slide's title, subtitle, reference/attribution, and Bible/lyric displayed text before taking it Live.
- Text overrides belong to the presentation slide. They do not modify the installed Bible translation or song library. Reset text to source is available in the editor. Editing a currently previewed item refreshes Preview; Live changes only after the operator sends the edited item Live.
- Added SQLite schema version 6 with a nullable presentation-item text override and migration from prior libraries. The same field is carried through saved presentations and project JSON import/export.
- Updated the feature register and database design document. Files changed: `src/App.tsx`, `src/App.css`, `src-tauri/src/lib.rs`, `docs/FEATURES.md`, `docs/DATABASE_DESIGN.md`, and this document.
- Validation: `npm run lint`, `npm run build`, `cargo check --manifest-path src-tauri/Cargo.toml`, and `git diff --check` passed. Verify editing, reset, save/reopen and JSON round-trip in the Windows desktop app.
- Exact next task: review this editor on Windows, then continue with Scripture and lyric slide formatting from the presentation design roadmap.

### 17. Current session - Windows RTSP receiver cleanup

- Updated the native GStreamer bus handler so both pipeline errors and end-of-stream stop the tokenized loopback MJPEG bridge. This prevents Preview and audience clients from continuing to receive a stale last frame after the source ends.
- Verified the existing checkout is clean on main and matches the current GitHub main commit 3937249 before editing.
- This Windows environment has GStreamer 1.28.8.1 and the RTSP, JPEG decoder/encoder, appsink, video conversion and playbin plugins. The Windows Rust cargo check passed against those installed libraries.
- Validation passed: npm run lint, TypeScript checks for app and node configs, Vite production build to a scratch directory, Windows cargo check, and git diff --check. No test suites were run.
- No real RTSP source was available. Actual stream playback, Preview/audience runtime behavior, and portable Windows GStreamer packaging remain unverified.
- Exact next task: smoke-check RTSP/RTSPS connection, disconnect and source-loss recovery in the desktop app with a real source; then document the Windows runtime packaging requirements. NDI remains a separate follow-on after SDK distribution review.

### 18. Current session - projector and library import fixes

- Changed audience output to use Tauri fullscreen-on-monitor targeting for the selected display. This is compile-checked; an external-screen desktop review is still needed.
- Added BibleShow simple Bible XML parsing, including the XML schema used by the starter KJV package, and allowed KJV as a translation code.
- Removed arbitrary lyrics count and per-file size limits. Lyrics now upload one file per request so large collections do not need one oversized JSON payload; partial successes remain available if a later file fails.
- Added Bible and Lyrics import controls to their respective Presentation feeds and refreshes the source lists after import.
- Validation passed: lint, TypeScript, frontend build, Rust compile, and diff checks. `rustfmt --check` flags broad formatting differences across both existing Rust files; no whole-file reformat was applied. No test suites were run.
- Runtime review is still needed for external-screen placement and representative Bible/lyrics XML files.

### 19. Current session — Bible and lyrics workflow corrections

- Inspected the clean local checkout on `main`, two commits ahead of `origin/main`, and read the project guide, continuation notes, feature register, import/media/database designs, rights notes, suggestions, and remaining project documentation before editing.
- Identified the regressions in commit `c24384a`: the expanded import panels were inserted above the Bible and Lyrics pickers, and lyrics were changed to one serial Tauri request and database transaction per file. The prior implementation submitted the selected lyric files together.
- Moved feed imports behind compact icon-triggered dialogs. Restored feed browsing space and made the shared search bar follow the active feed; Bible retains Reference/Keyword modes, while lyrics search titles, authors and lyric text.
- Preserved the Bible version/book/chapter and verse-range selectors. Reference submission now loads and highlights the selected range, creates one slide per verse, adds the pages to the current show, and sends the first page to Preview and Live. Verse and lyric section selection continue to stage Preview, with double-click/Enter sending the selected item Live. Lyric sections display their full text; submitting a lyric search presents its ordered sections.
- Changed lyric ingestion to bounded batches of at most 128 files or about 6 MB of source text, with oversized serialized batches split and prior completed batches retained. SQLite inserts reuse prepared statements and use `INSERT OR IGNORE` for duplicate fingerprints.
- Added and passed a focused Rust profile test for parsing and persisting 5,000 synthetic OpenLyrics files: parsing took 324 ms and SQLite insertion took 217 ms in the in-memory test.
- Validation passed: `npm run lint`, TypeScript checks for the app and node configurations, Vite production build, the focused Windows Rust test build/run, and `git diff --check`. The first Rust compile caught a digest-formatting error, which was fixed before the passing run. `cargo fmt --check` still reports broad formatting differences already present across the Rust files; no whole-file reformat was applied.
- The reviewed change set is applied to the original checkout. Desktop review with the user’s real Bible and lyrics library remains necessary to confirm search, Preview/Live behavior, and end-to-end import time. Exact next task: smoke-check those workflows in the desktop app. Do not commit or push without explicit authorization.

### 20. Current session — split formatted lyrics into display slides

- The user reported that a song stored as one database section was being sent to Preview/Live as one long slide.
- The Lyrics feed now splits stored sections at formatted Verse/Chorus/Refrain/Bridge/Pre-Chorus/Intro/Outro headings, short section codes such as V1 and C1, and numbered stanza headings. If a song contains one unheaded Verse/Section, blank-line-separated stanzas become individual verse slides.
- The normalized sections are used both in the Lyrics browser and when submitting a song, so each part can be selected for Preview/Live and the sequence starts with the first part.
- Validation passed: ESLint, TypeScript checks and Vite production build. `git diff --check` passed. Desktop interaction with the user's actual lyrics remains unverified.

### 21. Current session — PowerPoint capture and media output fixes

- Reconstructed the interrupted task from this Codex thread, its earlier completed turns, the cached referenced ChatGPT conversation, and the repository handoff documents. The separately referenced ChatGPT conversation is not readable through the available history connector. The recorded sequence is: implement and verify four PowerPoint/media fixes, then begin automatic Bible reference/paraphrase detection. The previous run stopped at the usage limit after the four fixes were coded and before detection began.
- Added Windows PowerPoint integration: attach to an existing Office instance when possible, launch a windowed slideshow, capture its window for BibleShow Preview/Live, and let BibleShow navigate the slides. A static slide image is used for selection Preview; the captured stream is used for output.
- Changed local video end handling to seek to the beginning, resume playback, and clear stale buffering state. Hid image/video source names in Preview and Live. Added Clear Media to remove image/video entries from the current show while keeping imported library files.
- Automated verification passed: `npm run lint`, `npm run build`, `git diff --check`, and isolated Rust library tests (8 passed, 0 failed, 1 ignored). The ignored PowerPoint test requires an interactive Windows logon and installed PowerPoint. An earlier COM smoke test failed because the background process had no usable Windows logon session; an isolated Tauri launch also could not create a WebView because Windows reported that the resource was in use. Therefore none of the four fixes has received a desktop runtime review yet.
- S-005 is implemented but awaits desktop review. Do not begin S-006 speech detection until PowerPoint capture/navigation, video loop-at-end, hidden media names, and queue-only Clear Media are verified in the Windows app. Detection controls already approved by the user: selectable microphone; local/optional online processing; assisted review and configurable auto-Live; separate direct-reference and paraphrase toggles/thresholds; optional online paraphrase matching sends transcript text only; any audio upload requires a separate, clearly disclosed opt-in.
- Current Git state: `main`, two commits ahead of `origin/main`, with the existing two local commits preserved. The current implementation and documentation edits remain uncommitted; no commit or push was made. Keep all existing work intact.
- Exact next task: run the Windows desktop app in the user's interactive session and verify all four S-005 behaviors with a sample PowerPoint and representative video/image slides. If verified, mark S-005 verified and start S-006; otherwise fix only the observed issue. Do not commit or push until the user confirms the app works.

### 22. Current session — Live loop buffering and PowerPoint launch control

- The user reports Preview video now repeats with only occasional short buffering, while Live can wait up to a minute at each loop. Live output and its operator monitor now use the WebView's native loop; audience drift correction only seeks when the gap exceeds 1.5 seconds and no more than once every two seconds. Preview retains its explicit restart behavior. This targets repeated synchronization seeks near the Live loop boundary; verify against the user's actual video before marking it fixed.
- The selected PowerPoint file now has a visible `Start in BibleShow` button in the file header, next to Delete. It changes to `Stop PowerPoint` after connection. Preview text points to this control; the lower duplicate launch button was removed.
- Added the user's coding preference to this guide: keep changes focused and concise, choosing a few clear lines over broad rewrites when they solve the task safely.
- Validation passed: ESLint, separate TypeScript checks for the app and Vite config using temporary cache files, Vite production build to a temporary output folder, and `git diff --check`. The standard `npm run build` could not write TypeScript/Vite temporary cache files under `node_modules` (`EPERM`); the same type and bundling checks passed with those caches/output redirected to Temp. The user reports BibleShow is open, but desktop window discovery timed out again, so no visual or playback behavior has been confirmed in this session.
- Exact next task: run lint and production build, then inspect the Presentation feed and test the PowerPoint button, Live video loop behavior, Preview loop, hidden media names, and Clear Media in the interactive desktop app. Keep S-005 at implemented/review-needed until these pass. Do not begin S-006 or commit/push yet.

### 23. Current session — PowerPoint responsiveness and live presentation output

- The previous PowerPoint start path synchronously ran PowerShell/COM work in Tauri commands. If the capture thread produced no frame, startup timed out after eight seconds and then joined that thread; a stalled window capture could make the join wait forever. Start, preview export, navigation and stop now run in Tauri's blocking-task pool with bounded PowerShell waits. Failed startup detaches the capture worker instead of waiting indefinitely.
- Starting a selected PowerPoint now stages slide 1 into Preview. Preview uses its exported still image when available and the captured stream as a fallback; Take Live switches the projector output to the stream. The MJPEG response no longer sends `Connection: close`, which conflicts with a continuous multipart frame response.
- Live and audience videos now use native looping. Audience output follows explicit operator play, pause and seek commands without repeated periodic time-correction seeks. This targets the remaining buffering at Live loop boundaries; actual playback still needs review with the user's media.
- Validation: app TypeScript check and Vite production build passed with temporary cache/output paths; all Rust library tests passed (9 passed, 0 failed, 1 ignored); `git diff --check` passed. The ignored PowerPoint capture test requires an interactive Windows logon and installed PowerPoint. The MJPEG header regression is covered by a deterministic unit test; its earlier loopback-socket test was aborted by Windows. ESLint was stopped after unusually slow progress. Desktop inventory timed out twice, so PowerPoint capture/navigation and video looping have not been exercised interactively.
- Exact next task: verify the PowerPoint and media behavior in the desktop app when window access is available. Keep S-005 as implemented/review-needed; do not start S-006 or commit/push until S-005 is verified.

### 24. Current session — In-app PowerPoint slide browser

- The user asked to remove the long Start instruction, keep a compact Start button, and show every PowerPoint slide in a scrollable in-app list for selection. The original file remains available through a separate Open in PowerPoint action. Video buffering is explicitly deferred.
- Reviewed Microsoft's [PowerPoint Slide.Export](https://learn.microsoft.com/en-au/office/vba/api/powerpoint.slide.export), [windowed slideshow](https://learn.microsoft.com/en-us/office/vba/api/powerpoint.slideshowsettings.showtype), [SetParent](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setparent), and [Windows Graphics Capture](https://learn.microsoft.com/en-us/windows/uwp/audio-video-camera/screen-capture) documentation. The capture/reparent paths do not supply the slide browser and bring capture-picker or cross-process/DPI concerns. EasyWorship's [official PowerPoint-to-presentation guide](https://support.easyworship.com/support/solutions/articles/24000020419-create-easyworship-presentation-from-powerpoint-) also documents exporting all slides to PNG for use as an in-app presentation. BibleShow now uses exported slide images for Preview/Live and keeps PowerPoint available for navigation. Microsoft cautions that unattended Office automation can hang; the COM integration needs verification in the logged-in desktop session ([guidance](https://learn.microsoft.com/en-us/office/client-developer/integration/considerations-unattended-automation-office-microsoft-365-for-unattended-rpa)).
- Added slide thumbnails to the Start result and replaced the one-slide page selector with a vertically scrollable slide list. Clicking a slide stages it in Preview; double-click or its Live button sends it Live. The compact Start and separate Open in PowerPoint controls replace the long instruction. Removed the PowerPoint capture worker and its unused dependency.
- Validation: app and node TypeScript checks passed; the Vite production build passed; Rust library tests passed (9 passed, 0 failed, 1 ignored); `git diff --check` passed. I attempted the ignored PowerPoint smoke test, but the background agent session could not create the Office COM object (`0x80070520`: specified logon session does not exist); it failed before creating a test deck. The desktop app is closed, so visual and runtime checks remain pending. Do not claim slide browsing is fully verified until tested in the app.
- Next: verify Start, the scrollable slide list, Preview/Live images and PowerPoint navigation in BibleShow. Then work on S-007 Themes: built-in background/text color themes and imported image/video themes. S-006 Bible speech detection is later in the sequence. Do not commit or push before the user reviews the app.

### 25. Current session — Ordered workspace and content improvements

- Read the project guide, continuation handoff, feature register, suggestions, technical decisions, database design, resource/media/live-feed notes, rights/import review, and development status before editing. The attached FreeShow screenshot is treated as a visual reference only.
- Batch 1: reduced the default Preview/Live height from 390 px to 320 px, capped its share at 46% of the center workspace, and reserved at least 220 px for the shared lower feed. The divider remains adjustable, so all feed tabs benefit.
- Verification: `npm run build` and `git diff --check` passed. Full-project lint was stopped after producing no output for over two minutes. Windows UI automation timed out during app selection, so visual runtime review remains pending.
- Next batches, in order: Bible autocomplete; themes; message-alert timing/library; PowerPoint slide actions; move project management into File and dedicate the left panel to show items. Do not begin later batches until the current one is implemented and checked. No commit or push.

### 26. Current session — Bible search autocomplete

- Reference mode now suggests book names from the selected translation as the operator types, including prefix collisions. Keyboard arrows and Enter select a suggestion without removing the existing reference search.
- Keyword mode starts after four words and uses a 300 ms debounce to query up to ten matching verses from the installed local Bible. A suggested verse stages Preview; double-click or Enter sends it Live. Manual keyword search still returns up to 100 results.
- The Rust search command now accepts a clamped result limit (1–100), shared by suggestion and full-search calls.
- Verification: final `npm run build`, `cargo check --manifest-path src-tauri/Cargo.toml --lib` (passed after a 5m27s build), and `git diff --check` passed. ESLint produced no output for over 30 seconds and was stopped; desktop interaction review remains pending because UI automation timed out during app selection.
- Next in the user's queue: S-007 Themes, expanded to include custom themes and live camera/video backgrounds. Then S-010 message alerts, S-011 PowerPoint actions, and S-012 File/show-panel relocation. No commit or push.

### 27. Current session — Themes

- Added six solid built-in themes and a small editor that saves custom background/text colors locally.
- Reused the existing media library import and storage path for image/video backgrounds. Selected themes render behind Scripture and lyric text in Preview, Live and audience output.
- Added the currently connected camera or video stream as an optional theme. Live source details stay in memory for the session and are cleared when that source disconnects.
- Verification: `npm run build` and `git diff --check` passed. Desktop interaction review remains pending because the Windows UI bridge timed out earlier in this session; ESLint has been unreliable and is not claimed as passed.
- Next in the user's queue: S-010 message-alert timing, styling, saving and search. No commit or push.

### 28. Current session — Timed and reusable message alerts

- Alerts default to the bottom of the output, with top/middle placement, text sizing, text color and background color controls.
- Static alerts clear after the selected number of seconds. Scrolling alerts repeat a selected number of 18-second passes or continue until manually cleared. Preview and audience output use the same position and colors.
- Added a local saved-message library with title/content, search across both fields, load-to-editor and delete actions.
- Verification: `npm run build` and `git diff --check` passed. Desktop interaction/timer review remains pending because the Windows UI bridge timed out earlier in this session.
- Next in the user's queue: S-011 PowerPoint slide Preview/Live/Add/Add all actions. No commit or push.

### 29. Current session — PowerPoint slide actions

- Kept the existing scrollable PowerPoint slide browser and added explicit per-slide Preview, Send Live, and Add actions, plus Add all pages to show.
- Bulk addition respects the existing 500-slide saved-show limit and reports how many more pages fit in the current show.
- Verification: `npm run build` and `git diff --check` passed. PowerPoint desktop interaction remains pending because the Windows UI bridge timed out earlier in this session.
- Next in the user's queue: S-012 move project management into File and dedicate the left panel to current-show items. No commit or push.

### 30. Current session — File menu and current-show workspace

- Moved New, show name, open/save/delete project, JSON import/export and the current-show item count into the File menu, keeping the existing lyrics-library actions there.
- Removed project controls from the left panel and dedicated its full height to current-show items. Bible, lyrics, image/video, PDF and PowerPoint pages can be dragged into the show; show rows can be dragged to reorder, with arrow controls retained.
- Enforced the existing 500-slide show limit when adding one or multiple items so a show cannot become unsavable through these actions.
- Verification: final `npm run build` and `git diff --check` passed. Desktop interaction review remains pending because the Windows UI bridge timed out earlier in this session.
- All six requested batches now have implementation and production-build checks. No commit or push.

### 31. Current session — Offline Bible reference detection foundation

- The user confirmed that secondary-screen Live output works after connecting the TV and authorized the Bible detector as the next stage. The pushed baseline is `main` at `03eedec`; the working tree was clean before this session.
- Added a modular Rust parser for explicit Bible references in transcript text, including multiple references, ranges, chapter-only references, canonical book names, common numbered-book forms, and abbreviations. The Tauri command validates candidates against the selected installed translation (KJV by default), suppresses duplicates, and returns verse text.
- Added a compact operator panel: paste transcript text, inspect validated KJV candidates, queue all verses for review, or explicitly send the selected passage through the existing Preview/Live flow. It does not request microphone access or automatically send anything Live.
- Verification: `npx tsc --noEmit -p tsconfig.app.json`, temporary-output Vite production build, Rust `cargo check --lib --offline`, and `git diff --check` passed. No tests were added or run.
- This is only the transcript-to-reference slice. Microphone capture and offline ASR, quotation/fuzzy matching, MiniLM/ONNX paraphrase matching, calibrated confidence thresholds, selectable/toggleable ASR engines, and self-contained Windows/Ubuntu packaging remain unimplemented. Benchmark Vosk, sherpa-onnx and whisper.cpp on sermon audio before selecting defaults or enabling auto-Live.
- Preserve the uncommitted changes in `src-tauri/src/bible_detection.rs`, `src-tauri/src/lib.rs`, `src/App.tsx`, `src/App.css`, and the updated feature/handoff notes. Do not commit or push unless requested. Do not change the verified audience-display code.

### 32. Current session — Spoken references and local quotation matching

- Extended explicit-reference parsing to common spoken number forms and ranges, including “John three sixteen,” “Romans eight twenty-eight,” and “First Corinthians thirteen four through seven.”
- Added a lazily built SQLite FTS5 verse index with insert/update/delete triggers, transcript-word candidate retrieval, and a small-edit tolerant lexical-overlap ranker. Transcript matches appear beside direct references and use the existing review/explicit Live actions. The displayed percentage is lexical similarity, not calibrated confidence, and never triggers automatic Live.
- The detector still accepts pasted transcript text. Microphone capture/ASR (Vosk, sherpa-onnx, whisper.cpp), semantic MiniLM matching, calibration, automatic routing and bundled models remain unimplemented. Cargo/Powershell network transfers fail during TLS credential setup in this environment, so ASR/model dependencies could not be fetched safely in this slice.
- Verification passed: `cargo test --lib --offline` in an isolated target (14 passed, 0 failed, 1 existing PowerPoint test ignored), TypeScript check, Vite production build and `git diff --check`. Tests cover spoken numeric forms/ranges, quotation matching with small wording edits, and FTS index insert/update/delete synchronization. An initial test run exposed and fixed a separator bug in “John three sixteen.”
- Targeted ESLint on `src/App.tsx` reports five existing `react-hooks/set-state-in-effect` findings in unrelated effects; it did not report the new detector code. Do not expand this task to refactor those existing effects.
- Keep all existing uncommitted work, do not commit or push, and preserve the confirmed audience-display behavior. Microphone capture/transcription and bundled offline engines are still the next implementation step.

### 33. Current session — Microphone capture and first streaming ASR path

- Added native microphone enumeration and selection with CPAL, a bounded in-memory mono audio queue, sherpa-onnx streaming Zipformer decoding, interim/final transcript events, and an operator Stop control. Final transcript segments run through the existing local Bible reference and quote matcher. No microphone audio is saved or sent online; all detected passages remain review-only.
- Added a pinned Apache-2.0 English 20M Zipformer model source and Tauri resource mapping so packaged installers can include the offline model; `npm run prepare:speech-model` prepares the files before a Tauri bundle build. Model weights are ignored by Git.
- Verified: `npx tsc --noEmit --pretty false --incremental false -p tsconfig.app.json`, Node script syntax, Tauri/package JSON parsing, `rustfmt`, and `git diff --check` pass. Rust `cargo check --lib --offline` reached `sherpa-onnx-sys` but its build script could not resolve `github.com` in this agent environment. Rust API type-check passed with `DOCS_RS=1`, which intentionally skips native linking; this is not a full Windows build or runtime test.
- Hardened the live path after the initial check: completed Bible lookups are queued so new speech is not skipped while a lookup is busy, and Stop flushes queued audio and the final partial utterance. Replaced the hand-written spelling-distance helper with the specified RapidFuzz Levenshtein scorer while retaining FTS5 candidate filtering.
- Verification after these hardening changes: the frontend production build passes; Rust `cargo check --lib --offline` passes with `DOCS_RS=1`, including RapidFuzz and the stop-flush path; `rustfmt`, Node script syntax and `git diff --check` pass. `DOCS_RS=1` skips Sherpa native linking, so this is not a full desktop build.
- Still pending: fetch the Sherpa native archive and model in a network-enabled build shell; verify native linking and the microphone path on Windows and Ubuntu; add Vosk and Whisper selectable adapters; implement MiniLM semantic matching, calibrated confidence and routing controls; evaluate with sermon audio; produce and verify both offline installers. Auto-Live stays disabled.
- The user's interactive `cargo search` confirms crates.io search works. The non-interactive build shell cannot download packages through Windows Schannel (`SEC_E_NO_CREDENTIALS`) and cannot validate GitHub's release certificate (`UnknownIssuer`); no TLS verification was bypassed.
- Keep all existing work, preserve the confirmed audience-display behavior, and do not commit or push.

### 34. Current session — Windows Sherpa build and speech model preparation

- The user supplied the official Windows x64 Sherpa archive in `%TEMP%\bibleshow-sherpa-archives`; the folder was created manually. The model files are now present in `src-tauri/resources/speech-models/` and ignored by Git. The preparation script supports resumable downloads; in PowerShell, use `npm.cmd` and `NODE_OPTIONS=--use-system-ca` rather than changing execution policy or disabling TLS verification.
- Verified: the user's full native `cargo check --manifest-path src-tauri/Cargo.toml --lib` passed; `npm.cmd run prepare:speech-model`, `npm.cmd run build`, and `cargo tauri build --no-bundle` passed. The release executable is `src-tauri/target/release/app.exe`. Targeted `cargo test --manifest-path src-tauri/Cargo.toml --lib bible_detection::tests --offline` passed (5 passed, 0 failed; 10 filtered out). `cargo tauri build --no-bundle` does not create an installer.
- UI automation could locate BibleShow windows but timed out retrieving accessibility/screenshot state. Therefore microphone capture, transcript events, Stop/final flush, and live passage routing have not been verified interactively.
- Remaining: runtime microphone review; optional Vosk/Whisper adapters; MiniLM/ONNX paraphrase matching; calibrated confidence, toggles and thresholds; representative sermon evaluation; and fully offline Windows and Ubuntu installers. Auto-Live remains disabled pending calibration. No commit or push; preserve all current changes and model assets.

### 35. Current session — live reference detection and accent-aware ASR

- Changed the speech flow to retain only a 700-character rolling matching context and show the latest recognized segment instead of accumulating a session-long transcript. Detection controls open while the microphone is active, and candidate cards remain visible between updates.
- Live candidates from interim speech are provisional. Finalized segments stage validated references and strong lexical quotation matches in Preview; direct-reference Auto-Live remains an explicit opt-in and uses database-validated verses. Spoken book-name transcription errors may be corrected only when a constrained fuzzy match is followed by a parseable chapter and verse.
- Added a selectable streaming-only mode and a combined mode. Combined mode uses the existing Sherpa model for interim words and bundled multilingual Whisper Tiny for a local final pass. Captured audio stays in memory, is capped at 45 seconds per utterance, and is not written to disk. Whisper model files are pinned by revision and verified using SHA-256 during preparation. The model bundle adds about 103 MB.
- Verified: `npm.cmd run prepare:speech-model`, `npm.cmd run build`, and full native `cargo check --manifest-path src-tauri/Cargo.toml --lib` pass without warnings. No test suite or interactive microphone session was run. The app's microphone/Preview/Live behavior and real accented sermon accuracy still require user-device review.
- Still pending: MiniLM/ONNX semantic paraphrase matching, calibrated confidence and threshold-based paraphrase routing, Vosk evaluation, representative sermon accuracy measurements, interactive end-to-end verification, and self-contained Windows/Ubuntu installer verification. Paraphrase Auto-Live remains disabled. No commit or push; preserve existing uncommitted work.
