# BIBLESHOW — MASTER PROJECT GUIDE

**Document version:** 1.0  
**Project name:** BibleShow  
**Product type:** Desktop Church Presentation Application with integrated Bible, lyric and media sources
**Development approach:** Local-first, modular, open-source-first  
**Current stage:** Early presentation operator workspace and evolving layout design
**Status:** Active development

---

# 1. PROJECT IDENTITY AND VISION

## 1.1 What is BibleShow?

BibleShow is a desktop church presentation application for services, worship, Bible teaching, conferences and other live events. It brings Scripture, lyrics, presentations and media into one operator-led show workflow.

The product should take inspiration from strengths in FreeShow and ProPresenter while remaining local-first, accessible and maintainable. The KJV and other licensed Bible content are presentation sources. BibleShow is not planned as a general-purpose or personal Bible study application.

## 1.2 Core product philosophy

BibleShow must be:

- Local-first: essential functionality must work without an internet connection.
- Reliable: presentations must not fail because of unnecessary online dependencies.
- Modular: major systems must be independently maintainable.
- Extensible: future functionality must fit into the existing architecture.
- User-friendly: powerful features must remain accessible to beginners.
- Open-source-first: prefer free and maintainable technologies.
- Copyright-conscious: Bible translations and media must be used according to their licences.
- Scripture-aware: Bible references and translations must be handled consistently across content selection, slide preparation and live presentation.

## 1.3 Development principle

Build a solid, working application incrementally.

Do not attempt to implement every advanced feature before the foundation is stable.

Every major feature must be designed, implemented, tested and documented before moving forward.

Record new product suggestions and user-reported issues in `docs/PROJECT_SUGGESTIONS.md`. Append entries instead of replacing prior ones, assign each a roadmap stage and status, and synchronize agreed work into `docs/FEATURES.md` and this guide when relevant.

---

# 2. CHURCH PRESENTATION WORKSPACE

BibleShow has one primary workspace: the operator-led church presentation environment. Scripture, lyrics, saved projects, media and display controls are parts of this workflow rather than separate study and presentation modes.

## 2.1 Presentation Workspace

This workspace is designed for church services, worship sessions, Bible teaching, conferences and other live presentations.

### Scripture presentation
- Select Bible translations.
- Import additional translations in USFM/USX, OSIS and Zefania formats; KJV remains the default.
- Search for passages.
- Display individual verses or complete passages.
- Display multiple verses across slides.
- Format Scripture slides.
- Apply backgrounds and themes.
- Preview slides before displaying them.
- Send selected slides to the live projector.

### Songs and lyrics
- Create and manage songs.
- Import OpenLyrics/OpenSong/OpenLP XML, plain-text lyrics and CSV libraries.
- Organise lyrics into verses, choruses and bridges.
- Create song presentations.
- Search thousands of songs efficiently.
- Import supported song files.
- Customise lyric formatting.
- Display lyrics during worship.
- Organise songs into service playlists.

### Presentation management
- Create presentations.
- Create playlists and service orders.
- Arrange slides.
- Duplicate, edit and delete slides.
- Preview upcoming slides.
- Control live slides.
- Navigate forward and backward.
- Display transitions.
- Save presentation projects.

### Media management
- Import images.
- Import audio.
- Import videos.
- Use local media folders.
- Use background images and videos.
- Organise media into collections.
- Support PowerPoint and PDF imports where technically feasible.
- Support offline media playback.
- Import local PNG, JPEG, GIF and WebP images and MP4/WebM videos for presentation; initial video output is muted and loops.

### Display and operator controls
- Main presentation display.
- Operator preview.
- Stage display.
- Multiple monitor support.
- Fullscreen presentation.
- Display selection.
- Keyboard shortcuts.
- Future remote control through a phone or browser.
- Future OBS integration.

### Operator workspace layout — evolving direction

The presentation workspace is planned as a resizable four-area operator layout, beneath a top toolbar:

1. **Left panel — projects and service order:** Show created or imported presentation projects and the items arranged for the current show. Operators should be able to add items to the show, including by drag and drop where appropriate. Before a temporary show is discarded on close, offer to save it as a reusable project, following the familiar project workflow of EasyWorship.
2. **Centre upper panel — Preview and Live:** Keep Preview and Live visible together. Preview shows the selected or staged item; Live shows what the audience currently sees. Selecting or browsing Bible and lyric content must populate Preview without changing Live. Sending the selection to Live must require an explicit action. Include other operator information here when it helps prepare the next item.
3. **Centre lower panel — content feed:** Provide browsable feeds for the types of content that can be added to a show: Bible, Lyrics, Videos/Images, Presentations, Live Feed, URL Video/Images, Themes, Functions, Overlays, and further categories as the product grows. Selecting a feed should expose the appropriate items and selection controls for that content type.
4. **Right panel — display controls:** Provide display/output controls, including clearing individual displayed items, closing an output, and managing message alerts. Alerts should support both scrolling and static presentation.

The left and right panels span the work area's height. The centre is divided into upper and lower areas. Each area should be resizable so operators can allocate space to the task at hand. Preserve a responsive and usable fallback for smaller windows; the desktop operator layout remains the primary target.

### Top toolbar

Provide a top toolbar for application-wide and workspace commands, including Profile, Edit, View, Settings, Connections, and Plugins. These are initial headings, not a final menu specification. Brainstorm and agree the sub-items for each heading when that area is designed; do not pre-emptively add detailed menu trees. More toolbar items and workspace categories may be added as development reveals needs.

### Evolving design agreement

This layout is the current working direction, not a frozen specification. Record additional operator suggestions here as they arrive. Before implementing each content feed, display control, or toolbar area, define its sub-items and behavior with the user. Keep a clear distinction between planned design and features that are actually implemented and verified.

### Preview and Live behavior

- Preview is the operator's staging area for the selected slide or content. Browsing the Bible, changing a verse, or selecting another song section must not silently change what the audience sees.
- Live is the audience-facing output. Sending content from Preview to Live requires an explicit operator action such as Go Live or Take.
- Keep Preview navigation separate from Live navigation. The operator must be able to prepare upcoming content while the current Live slide stays on screen.
- Show the current Live item and the selected Preview item clearly; provide a next-slide preview when a playlist is present.
- Support a separate resizable Live output window before physical projector and multiple-monitor support is available.
- Present Bible verses and individual song sections as slide-sized pages, preserving source ordering and readable text layout.
- Make content selection visible and actionable: choosing a Bible verse or lyric section must populate the selected/staged Preview item and make it available to add to the current show; the operator then explicitly sends it Live.

This operator workflow is informed by the official [FreeShow output workflow](https://freeshow.app/docs/output) and [ProPresenter interface guide](https://support.renewedvision.com/hc/en-us/articles/360041345954-Understanding-The-ProPresenter-User-Interface). These are product references for preview, live output and operator control.

The Bible source system remains focused on fast reference lookup and selecting verses for presentation. Do not expand it into a general-purpose study workspace without a future, explicit change to this product direction.

---

# 3. INTELLIGENT SCRIPTURE DETECTION

This is one of BibleShow's major differentiating features.

The objective is to recognise Bible passages being mentioned or quoted during live speech and help the presentation operator display the correct Scripture.

This feature must be implemented carefully. Incorrect Scripture displayed during a live service would damage trust in the application.

## 3.1 Direct Scripture reference detection

Recognise explicit references such as:

- John 3:16
- Romans 8:28
- Psalm 23:1–6
- 1 Corinthians 13:4

The system should identify the reference, locate the passage and make it available to the operator.

## 3.2 Paraphrased Scripture detection

Recognise Scripture even when a speaker does not quote it word for word.

Example:

Speaker: "For God loved the world so much that He gave His only Son."

Expected match: John 3:16.

The system must be able to compare meaning rather than relying exclusively on exact wording.

## 3.3 Contextual Scripture detection

Recognise passages from surrounding speech.

For example, a speaker might discuss the valley of the shadow of death without explicitly mentioning Psalm 23.

The system should identify likely related passages and suggest them to the operator.

## 3.4 Assisted detection mode

This is the safer initial operating mode.

- Listen to speech.
- Transcribe speech.
- Analyse the text.
- Identify possible Bible references.
- Display candidate passages to the operator.
- Allow the operator to select the correct passage.
- Send the selected passage to the presentation output.

The operator remains in control.

## 3.5 Automatic detection mode

An advanced mode that can automatically display Scripture when confidence is sufficiently high.

Requirements:

- Configurable confidence thresholds.
- Strong reference validation.
- Protection against unrelated speech.
- Operator override.
- Immediate manual control.
- Ability to disable automatic display.
- Logging of detected passages and decisions.

Automatic display must never be enabled by default without clear user consent.

## 3.6 Detection technology

Potential technologies include:

- Whisper for speech recognition.
- Semantic search for meaning-based Scripture matching.
- Text embeddings.
- Vector search.
- PostgreSQL with pgvector for cloud-based semantic search.
- Local alternatives for offline operation.

The detection engine must be modular so that speech recognition and semantic search providers can be replaced without rebuilding the entire application.

Online AI services must remain optional. Do not assume they will be permanently free.

---

# 4. TECHNICAL ARCHITECTURE

The agreed initial technology stack is:

| Component | Technology | Purpose |
|---|---|---|
| Desktop framework | Tauri 2 | Desktop application |
| Frontend | React | User interface |
| Language | TypeScript | Application logic |
| Build system | Vite | Development and production builds |
| Backend language | Rust | Desktop capabilities and native operations |
| Local database | SQLite | Offline data storage |
| Cloud backend | Supabase | Authentication and synchronisation |
| Cloud database | PostgreSQL | Cloud data |
| Semantic search | pgvector | Meaning-based Scripture search |
| Speech recognition | Whisper | Speech transcription |
| Version control | Git/GitHub | Source control and collaboration |

## 4.1 Architecture principles

- React handles the user interface.
- TypeScript handles frontend application logic.
- Rust handles native desktop functionality.
- SQLite stores essential local application data.
- Supabase provides optional cloud services.
- PostgreSQL stores synchronised cloud information.
- The application must not depend on Supabase for essential offline functionality.

## 4.2 Modular application engines

BibleShow should be organised around the following engines:

### Bible Engine
Responsible for:
- Bible versions.
- Books, chapters and verses.
- Bible navigation.
- Fast reference and passage lookup for presentation.
- Translation selection where content rights and available data permit.

### Presentation Engine
Responsible for:
- Slides.
- Presentations.
- Playlists.
- Live output.
- Preview.
- Themes and transitions.
- Display management.

### Media Engine
Responsible for:
- Images.
- Audio.
- Video.
- Media libraries.
- Backgrounds.
- Import and export.

### Detection Engine
Responsible for:
- Speech transcription.
- Reference detection.
- Paraphrase detection.
- Contextual matching.
- Confidence scoring.
- Assisted and automatic modes.

### Synchronisation Engine
Responsible for:
- Local/cloud synchronisation.
- User accounts.
- Backups.
- Conflict handling.
- Workspace synchronisation.

These engines should communicate through clear interfaces rather than being tightly coupled.

---

# 5. DATABASE DESIGN

The database supports presentation content and future expansion.

Initial conceptual entities include:

### Bible data
- bible_versions
- bible_books
- bible_chapters
- bible_verses

### Presentation
- presentations
- slides
- playlists
- playlist_items
- songs
- song_sections
- themes
- transitions

### Media
- media_files
- media_folders
- media_collections

### Detection
- detection_sessions
- transcripts
- scripture_matches
- detection_settings

### Synchronisation
- sync_records
- backups
- device_records

This is a conceptual starting point, not a final database schema.

Before implementation, relationships, indexes, identifiers, data ownership and migration strategies must be designed.

Keep imported Bible source data centralized and let presentation items reference it rather than copying verse text.

---

# 6. OFFLINE-FIRST FUNCTIONALITY

BibleShow must remain useful without internet access.

Essential offline capabilities should include:

- Bible reference and verse selection for presentation.
- Locally installed, licensed Bible content.
- Songs.
- Presentations.
- Playlists.
- Local images and media.
- Live presentation output.

Online features may include:

- Cloud synchronisation.
- Account authentication.
- Online Bible downloads.
- Optional AI-assisted detection.
- Online media retrieval.
- Remote access.

The application must communicate clearly when a feature requires internet access.

Offline functionality must not silently fail because an online service is unavailable.

---

# 7. BIBLE TRANSLATIONS, CONTENT AND LICENSING

BibleShow should support multiple Bible translations.

However, Bible translations are not automatically free to redistribute.

Before integrating a translation:

1. Identify its copyright owner.
2. Review its licence.
3. Confirm whether local storage is permitted.
4. Confirm whether redistribution is permitted.
5. Confirm whether commercial use is permitted.
6. Record attribution and licence requirements.

Prefer public-domain translations and properly licensed open resources.

Do not scrape or redistribute copyrighted Bible content without permission.

The same principle applies to songs, commentaries, dictionaries, images and other media.

The application should support importing legally obtained Bible resources where the format and licence permit.

---

# 8. USER INTERFACE AND EXPERIENCE

BibleShow should have a modern, professional desktop interface.

Design priorities:

- Clean navigation.
- Consistent typography.
- Clear visual hierarchy.
- Responsive layouts.
- Light and dark themes.
- Accessible controls.
- Keyboard shortcuts.
- Clear feedback for user actions.
- Minimal unnecessary complexity.

The presentation workspace is the application's primary work surface. Home and import controls should support this workflow without creating a separate Bible Study mode.

Do not overcrowd the initial interface with advanced features.

Build the core navigation first, then expand each workspace.

The product name displayed in the application is BibleShow.

---

# 9. SECURITY, PRIVACY AND RELIABILITY

Security must be considered throughout development.

Requirements:

- Never hardcode API keys or passwords.
- Never commit secrets to GitHub.
- Use secure storage for credentials.
- Validate imported files.
- Validate user inputs.
- Apply appropriate database access controls.
- Protect local presentation projects and imported content.
- Use secure communication for cloud services.
- Provide reliable backup and restoration.
- Handle application crashes gracefully.
- Avoid unnecessary collection of user data.

The application should not require an account to use its essential local features.

---

# 10. DEVELOPMENT ROADMAP

The project will be developed in eight major phases.

## Phase 1 — Foundation

- Establish project structure.
- Configure Tauri 2.
- Configure React and TypeScript.
- Establish application navigation.
- Implement branding.
- Create theme infrastructure.
- Establish Git version control.
- Create development documentation.

## Phase 2 — Scripture Source Engine

- Maintain the local Bible database for presentation sources.
- Integrate initial Bible translation.
- Implement books and chapters.
- Implement fast reference and verse selection for slides.
- Add import functionality.

## Phase 3 — Presentation Engine

- Resolve Bible/Lyrics selection into Preview and the service sequence.
- Reshape the operator workspace around the evolving, resizable four-area design in Section 2.1.
- Build the project/show panel and save-before-discard workflow.
- Build content feeds incrementally, agreeing their sub-items with the user as each is designed.
- Build display controls and toolbar areas incrementally, agreeing their sub-items with the user as each is designed.
- Create slide editor.
- Implement Scripture slides.
- Implement song slides.
- Implement playlists.
- Implement explicit Preview-to-Live and independent Live navigation.
- Add presentation controls and next-slide preview.

## Phase 4 — Media Engine

- Add image management.
- Add audio support.
- Add video support.
- Add backgrounds.
- Add media organisation.
- Add supported document imports.
- Add presentation themes and transitions.

## Phase 5 — Intelligent Scripture Detection

- Implement speech transcription.
- Implement direct reference detection.
- Implement paraphrase matching.
- Implement contextual matching.
- Implement candidate selection.
- Add confidence scoring.
- Implement assisted mode.
- Implement automatic mode.
- Add operator override and safeguards.

## Phase 6 — Advanced Presentation

- Multiple displays.
- Stage display.
- Remote control.
- Keyboard shortcuts.
- OBS integration.
- Improved live presentation controls.

## Phase 7 — Backend and Synchronisation

- Supabase integration.
- User authentication.
- Cloud workspaces.
- Cloud backups.
- Local/cloud synchronisation.
- Conflict resolution.
- Optional cross-device access.

## Phase 8 — Packaging, Testing and Release

- Windows packaging.
- Application installer.
- Offline testing.
- Performance testing.
- Security testing.
- Backup and recovery testing.
- User acceptance testing.
- Documentation.
- Release preparation.

Phases may overlap when technically justified, but dependencies must be respected.

---

# 11. DEVELOPMENT RULES FOR CHATGPT AND CONTRIBUTORS

These rules are mandatory throughout the project.

## 11.1 Preserve the agreed vision

- Keep BibleShow focused on church presentation; do not add a dedicated Bible Study workspace unless the user changes this direction.
- Do not abandon the intelligent Scripture detection concept.
- Keep one centralized Scripture source library for presentation content.
- Do not introduce Lovable.
- Do not migrate to another framework without a clear technical reason and approval.

## 11.2 Development discipline

- Work incrementally.
- Explain significant architectural decisions.
- Test changes before declaring them complete.
- Preserve existing working functionality.
- Avoid unnecessary dependencies.
- Prefer maintainable code over quick hacks.
- Avoid premature optimisation.
- Do not implement advanced features before their foundations are ready.

## 11.3 Honesty and accuracy

- Never claim code has been tested when it has not.
- Never claim a feature is complete when it is only partially implemented.
- Never invent API capabilities.
- Never fabricate credentials, services or licensing permissions.
- Clearly identify assumptions and unresolved decisions.
- Explain potential costs before introducing paid services.

## 11.4 Working with the developer

The developer works through an Ubuntu terminal.

Therefore:

- Provide commands appropriate for Ubuntu.
- Give one manageable step at a time during setup.
- Wait for terminal output before proceeding when verification is necessary.
- Explain errors and correct them before moving forward.
- Provide complete replacement files when necessary.
- Always identify the project directory before giving commands.
- Avoid commands that can destroy project data unless explicitly explained and approved.

## 11.5 Documentation

Important changes must be reflected in project documentation.

Maintain:
- PROJECT_GUIDE.md — master product blueprint.
- docs/TECHNICAL_DECISIONS.md — important technical decisions and their reasons.
- docs/DEVELOPMENT_STATUS.md — completed work, current work, known issues and next steps.
- docs/DATABASE_DESIGN.md — database architecture and schema.
- docs/FEATURES.md — feature requirements and implementation status.

Do not allow documentation to become inconsistent with the actual application.

---

# 12. CURRENT PROJECT STATUS

This section must be updated as development progresses.

## Completed

- Node.js and npm installed.
- Rust and Cargo installed.
- Tauri 2 CLI installed.
- Ubuntu Tauri prerequisites installed.
- React and TypeScript project scaffold created.
- Vite configured.
- TypeScript dependency compatibility corrected.
- npm dependency audit reduced to zero reported vulnerabilities.
- Production frontend build successfully tested.
- Tauri project initialised.
- Tauri desktop application successfully launched.
- BibleShow shell with Home and Presentation entry points.
- Local KJV and lyric library import and browsing.
- Initial Preview/Live operator monitors and SQLite presentation persistence.

## Current behavior and open design

- The user confirmed the earlier Preview/Live template worked. The revised layout hides the app sidebar, breadcrumb/search header and redundant page title while Presentation is open; desktop visual review is pending.
- Bible verse and lyric-section selection populate Preview. The current layout enlarges operator text, gives the feed its own scroll area, and adds project JSON import/export; verify these interactions in Tauri.
- The former Live status strip now provides KJV reference/range and keyword search. Multi-verse passages are added as one verse per slide. Single-click stages Preview; double-click or Enter sends directly to Live. Song sections remain visible beside the song list.
- The audience output is a separate fullscreen Tauri window. The operator selects a connected display, and Live slides and alerts are synchronized to that window. Verify display routing and reopening behavior in the desktop app.
- KJV keyword search occupies its own results view to keep the passage controls usable; choosing a result clears the search results and returns to the verse browser. Unsaved show changes offer save, discard or stay when changing projects or leaving.
- The Videos / Images feed imports PNG, JPEG, GIF and WebP images plus MP4 and WebM videos into BibleShow's local media library. Uploads send raw bytes without creating a second full-file buffer, and storage uses temporary files to avoid registering truncated uploads. Media can be previewed, sent Live and saved by reference; video playback is muted and loops. Desktop upload and codec playback review remains pending; see `docs/MEDIA_IMPORT_DESIGN.md`.
- The Presentations feed browses saved local projects and their slides. Operators can Preview or send a slide Live, add one slide to the current show, or add all slides.
- Live Feed prioritizes connected cameras/webcams and browser-playable direct HTTP(S) endpoints without an app-level GStreamer bridge. Camera capture stays in the operator window and is relayed to the audience window using WebRTC; HTTP(S) endpoints can be video/HLS or MJPEG when supported by the platform WebView. YouTube watch/live links are recognized and shown with YouTube's embedded player, separate from the direct-stream formats. URLs are held in memory only; the URL input is visible by default with a hide control. RTSP/RTSPS remains an experimental optional GStreamer adapter, and NDI is not implemented. Desktop permission, playback and cross-platform checks remain pending; see `docs/LIVE_FEED_DESIGN.md`.
- The four-area layout includes resizable project/show, Preview/Live, content-feed, and local display-control areas. Bible, Lyrics, Videos / Images, Presentations, and the initial Live Feed paths have implementation; camera/URL runtime review remains pending and other feed categories remain planned.
- Multi-format Bible and lyrics import is implemented for USFM/USX, OSIS, Zefania XML, OpenLyrics/OpenSong/OpenLP XML, TXT and CSV. Verify imports in the desktop app when convenient; see `docs/RESOURCE_IMPORT_DESIGN.md`.
- The Profile/Edit/View/Settings/Connections/Plugins toolbar headings are visible, but detailed sub-items remain open for user brainstorming. Add future suggestions here as they arrive.
- The product plan and navigation no longer include a dedicated Bible Study workspace. Scripture lookup remains part of presentation preparation.

## Current technology versions recorded

- Node.js: 22.22.1
- npm: 9.2.0
- Rust: 1.99.1
- Cargo: 1.99.1
- Tauri CLI: 2.12.4
- Vite: 8.3.5
- React: 19.3.1
- TypeScript: 6.0.3

These are the versions recorded during initial setup, not permanent requirements. Update this section when versions change.

## Not yet implemented

- Expand Scripture selection and search for presentation use, subject to translation rights and scope.
- Fully verified presentation selection, project workflow, slide editing, the evolving four-area operator layout, and separate audience output.
- Media feeds and playback for video, images, URLs and live inputs.
- Display controls and message alerts.
- Scripture detection.
- Optional Supabase integration and cloud synchronisation.
- Windows installer and release validation.

## Immediate next development objectives

1. Verify the full-window layout, larger typography, feed scrolling, resizers, project import/export, save-before-close, display controls and alerts in the desktop app.
2. Verify Bible keyword result selection, the unsaved-show prompt, project management and fullscreen audience output in the Tauri desktop app.
3. Verify the optimized MP4/WebM upload path, codec errors, Preview/Live and saved local media slides in the Tauri desktop app.
4. Define remaining content-feed and toolbar sub-items with the user before implementing each.
5. Verify local presentation save/load/delete at runtime.

These objectives are ordered working guidance. New user suggestions may change their order or add new stages; update this guide and the feature register as the design evolves.

---

# 13. IMPORTANT UNRESOLVED DECISIONS

Do not silently assume these decisions have already been made.

They must be researched and agreed when the relevant phase begins.

- Permanent reverse-domain application identifier.
- Final logo and brand identity.
- Initial Bible translations and their licences.
- Exact Bible database schema.
- Final desktop interface design.
- Local speech recognition implementation.
- Offline semantic search technology.
- Supported PowerPoint and PDF import methods.
- Windows packaging and update mechanism.
- Optional cloud hosting and associated costs.
- Remote control architecture.

---

# 14. DEFINITION OF PROJECT SUCCESS

BibleShow will be considered successful when it provides:

1. A professional and reliable church presentation environment.
2. Fast, accurate Scripture and lyric selection.
3. Excellent offline functionality.
4. Smooth Scripture, song and media presentations.
5. Intelligent Scripture detection with operator safeguards.
6. Reliable multiple-display support.
7. Secure optional cloud synchronisation.
8. An intuitive interface.
9. A maintainable, extensible architecture.

The ultimate objective is to build a dependable application that churches and individuals can use confidently, without being forced into expensive subscriptions for essential functionality.

---

# FINAL DEVELOPMENT DIRECTIVE

**BibleShow is a focused church presentation application with Scripture, lyrics and media as first-class content sources.**

Every architectural decision, feature, interface and development phase must support this vision.

This document is the project's master reference. If a future conversation, suggestion or implementation conflicts with it, consult this document and the recorded technical decisions before proceeding.

Changes to the blueprint must be deliberate, documented and agreed.

**Build BibleShow carefully. Preserve the vision. Test every important change.**
