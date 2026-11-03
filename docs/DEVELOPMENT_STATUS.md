# BIBLESHOW — DEVELOPMENT STATUS

**Document version:** 1.0
**Last updated:** 2 November 2026
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

- Tauri application identifier is still the temporary `com.tauri.dev`.
- Git repository is on `main`; baseline commit `90eef49` is pushed to `origin/main`.
- Shell commit `9ded581` is local and not yet pushed; `main` is one commit ahead of `origin/main`.
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

1. Verify keyword results-only browsing, passage staging, the unsaved-show prompt, and project import/export in the Tauri app.
2. Exercise local project save/load/delete and fullscreen audience output reopening on available displays in the Tauri app.
3. Implement the network Live Feed from `docs/LIVE_FEED_DESIGN.md`: RTSP receive/display first, then NDI® discovery/receive after SDK distribution review.
4. Review KJV/song rights for target release markets before bundling content in a public build; review the 700 incomplete songs when verified lyric sources become available.

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

**Current restart point:** Review the video and saved Presentations feed in the Tauri desktop app. Then implement Live Feed using the native backend and shared Preview/audience output described in `docs/LIVE_FEED_DESIGN.md`; the current host lacks the GStreamer/NDI development runtimes needed to build that stage.
