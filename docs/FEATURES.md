# BIBLESHOW — MASTER FEATURE REGISTER

**Document version:** 1.0
**Last updated:** 3 November 2026

## STATUS KEY

- [ ] Planned
- [~] In development
- [x] Implemented and tested
- [!] Requires investigation or decision

No feature should be marked implemented until it has been tested.

---

# 1. APPLICATION FOUNDATION

- [ ] BibleShow branding and logo.
- [ ] Main application shell.
- [ ] Main navigation.
- [ ] Church Presentation workspace.
- [ ] Home-to-Presentation navigation.
- [ ] Light theme.
- [ ] Dark theme.
- [ ] User preferences.
- [ ] Keyboard shortcuts.
- [ ] Settings.
- [ ] Application update mechanism.

# 2. PRESENTATION CONTENT SOURCES

## Scripture source library
- [x] Bible book selection for KJV.
- [x] Old Testament and New Testament navigation through the book selector.
- [x] Chapter and verse navigation in the presentation feed.
- [~] Select a verse to stage it in Preview.
- [ ] Search and insert Bible references for presentation.

## Bible translations
- [ ] Multiple translation support.
- [ ] Translation selection.
- [ ] Translation import.
- [ ] Translation management.
- [ ] Translation attribution and licence information.

# 3. SONGS AND LYRICS

- [x] Browse the local hymn and song library.
- [x] Search titles and author names.
- [ ] Create songs.
- [ ] Edit songs.
- [x] Display verse, chorus and bridge sections.
- [~] Preview each song section on its own presentation page.
- [ ] Song categorisation.
- [ ] Song import.
- [ ] Song playlists.

# 4. CHURCH PRESENTATION MODE

## Presentation workspace
- [~] Presentation operator interface with distinct Preview and Live screens.
- [~] Full-window presentation mode, hiding the global sidebar and redundant page/header chrome.
- [~] Resizable four-area operator layout with larger text and dedicated content-feed scrolling (desktop review pending).
- [~] Left panel for saved projects and current-show items, including drag/drop from Bible/Lyrics feeds, JSON import/export, and save-before-close prompt.
- [~] Content-feed tabs for Bible, Lyrics, Videos/Images, Presentations, Live Feed, URL Media, Themes, Functions, and Overlays; Bible, Lyrics, Videos/Images, Presentations, camera capture, browser-playable stream URLs and experimental RTSP are connected.
- [~] Capture a connected camera/webcam in the operator window and relay the same feed to the audience window over WebRTC; desktop permission and runtime verification remain.
- [~] Play direct HTTP(S) video/HLS and MJPEG endpoints when supported by the target WebView; Windows WebView2 and Ubuntu WebKitGTK compatibility remain to be verified.
- [~] Detect common YouTube watch/live links and display them in YouTube's embedded player; owner embed restrictions and user gesture/autoplay behavior need desktop verification.
- [!] RTSP/RTSPS uses an experimental GStreamer backend; Windows runtime packaging and real-source playback remain unverified. NDI is not implemented.
- [x] KJV reference/range and keyword search in the presentation workspace.
- [x] Multi-verse passages are staged as one readable verse per slide.
- [x] Single-click stages Preview; double-click or Enter sends the selected source/sequence item to Live.
- [x] Lyrics feed shows song sections alongside the song list.
- [~] Videos / Images feed imports PNG, JPEG, GIF and WebP images plus MP4 and WebM videos into the local library, stages them as presentation slides, and supports muted looping playback in Preview and audience output; verify the reported video-upload issue in the desktop app.
- [ ] Import Bible resources in USFM/USX, OSIS and Zefania XML formats.
- [ ] Import lyrics in OpenLyrics, OpenSong, OpenLP export, TXT and CSV formats.
- [~] Presentations feed browses saved local projects and their slides, with controls to Preview, send Live, add one slide, or add the full presentation to the current show.
- [x] Keyword search results use a dedicated view and clear when a verse is selected.
- [x] Unsaved project changes prompt to save, discard, or stay before leaving, starting a new show, or opening another project.
- [~] Right-panel controls for clearing Preview/Live content, closing the local Live monitor, and static/scrolling alerts in that monitor.
- [~] Top toolbar headings for Profile, Edit, View, Settings, Connections, and Plugins; sub-items are placeholders for later design with the user.
- [ ] Slide editor.
- [ ] Slide thumbnails.
- [~] Preview selection that does not change Live output until explicitly sent.
- [~] Separate fullscreen Live audience-output window with connected-display selection (desktop verification pending).
- [~] Ubuntu 24.04 x64 trial `.deb` packaging workflow, including GStreamer runtime dependencies; workflow artifact still needs to be built and installed on the user's laptop.
- [ ] Next-slide preview.
- [~] Independent Preview and Live previous/next controls for the temporary sequence.
- [~] Save, update, load and delete local presentations in SQLite.
- [~] Import/export presentation project JSON.
- [~] Slide duplication in the service sequence.
- [ ] Slide deletion.
- [~] Move pages earlier or later in the service sequence.
- [~] Presentation saving.
- [~] Presentation loading.

The operator layout and toolbar categories are evolving design direction. Add future suggestions to PROJECT_GUIDE.md and agree on each area’s sub-items before implementation.

## Scripture slides
- [~] Browse and select KJV Scripture from Presentation.
- [~] Selecting a Bible verse or lyric section stages it directly in Preview; selected source is visibly marked. Desktop runtime verification is pending.
- [~] Preview a selected individual verse as a presentation page.
- [ ] Insert Bible references.
- [ ] Insert multiple verses.
- [ ] Select Bible translation.
- [ ] Scripture slide formatting.
- [ ] Scripture backgrounds.
- [ ] Automatic verse layout.
- [ ] Send selected Scripture passage to the service sequence.

The requested four-area layout, project/show workflow, content feed categories, display controls, and toolbar areas are design direction. They are not implemented features; see the evolving layout agreement in PROJECT_GUIDE.md.

## Playlists and service management
- [ ] Create playlists.
- [ ] Save service orders.
- [ ] Add songs.
- [ ] Add Scripture passages.
- [ ] Add presentations.
- [ ] Reorder playlist items.
- [ ] Save reusable service templates.

# 5. MEDIA ENGINE

## Images
- [ ] Image import.
- [ ] Image library.
- [ ] Image backgrounds.
- [ ] Image collections.
- [ ] Image slide support.

## Audio
- [ ] Audio import.
- [ ] Audio playback.
- [ ] Background audio.
- [ ] Audio controls.
- [ ] Playlist audio support.

## Video
- [ ] Video import.
- [ ] Video playback.
- [ ] Fullscreen video.
- [ ] Video backgrounds.
- [ ] Video controls.

## Documents and external media
- [ ] PDF import.
- [ ] PowerPoint import.
- [ ] Local media folders.
- [ ] Missing-file detection.
- [ ] Media relinking.
- [ ] Supported online media integration.

# 6. PRESENTATION DESIGN

- [ ] Custom themes.
- [ ] Background colours.
- [ ] Background images.
- [ ] Background videos.
- [ ] Font selection.
- [ ] Font sizing.
- [ ] Text alignment.
- [ ] Text positioning.
- [ ] Text colour.
- [ ] Slide transitions.
- [ ] Reusable layouts.
- [ ] Theme management.

# 7. INTELLIGENT SCRIPTURE DETECTION

## Speech recognition
- [ ] Microphone selection.
- [ ] Speech transcription.
- [ ] Live transcription.
- [ ] Transcription controls.
- [ ] Offline recognition evaluation.

## Direct reference detection
- [ ] Detect book names.
- [ ] Detect chapter references.
- [ ] Detect verse references.
- [ ] Handle spoken reference variations.
- [ ] Validate Bible references.

## Intelligent matching
- [ ] Exact quotation matching.
- [ ] Paraphrase detection.
- [ ] Contextual Scripture matching.
- [ ] Candidate ranking.
- [ ] Confidence scoring.
- [ ] Translation-aware matching.

## Operator controls
- [ ] Assisted detection mode.
- [ ] Candidate Scripture list.
- [ ] Operator confirmation.
- [ ] Automatic detection mode.
- [ ] Configurable confidence thresholds.
- [ ] Operator override.
- [ ] Detection history.
- [ ] Disable automatic display immediately.

# 8. ADVANCED PRESENTATION

- [ ] Multiple monitor support.
- [ ] Projector output.
- [ ] Independent operator preview.
- [ ] Stage display.
- [ ] Fullscreen output.
- [ ] Display selection.
- [ ] Keyboard controls.
- [ ] Remote control.
- [ ] OBS integration.
- [ ] Presentation recovery after interruption.

# 9. BACKEND AND SYNCHRONISATION

- [ ] Supabase configuration.
- [ ] Optional user registration.
- [ ] Authentication.
- [ ] User workspaces.
- [ ] Cloud database.
- [ ] Local/cloud synchronisation.
- [ ] Backup management.
- [ ] Restore functionality.
- [ ] Conflict detection.
- [ ] Conflict resolution.
- [ ] Multi-device support.

# 10. SECURITY AND RELIABILITY

- [ ] Secure credential handling.
- [ ] Input validation.
- [ ] Import-file validation.
- [ ] Database integrity checks.
- [ ] Backup verification.
- [ ] Crash recovery.
- [ ] Offline reliability testing.
- [ ] Privacy controls.
- [ ] Dependency security checks.
- [ ] Licence compliance checks.

# 11. PACKAGING AND RELEASE

- [ ] Windows installer.
- [ ] Windows application testing.
- [ ] Linux application build.
- [ ] Application icon.
- [ ] Version management.
- [ ] Update mechanism.
- [ ] Installation documentation.
- [ ] User guide.
- [ ] Troubleshooting guide.
- [ ] Release testing.

# 12. CURRENT IMPLEMENTATION STATUS

Current implementation snapshot:

- [x] React and TypeScript scaffold created.
- [x] Vite configured.
- [x] Tauri 2 initialised.
- [x] Desktop application launched successfully.
- [~] BibleShow operator interface implemented; desktop review continues.
- [~] Bible Engine supports local KJV import, reference/range and keyword search in the presentation workflow.
- [~] Resource library imports support USFM/SFM, USX, OSIS, Zefania, OpenLyrics, OpenSong/OpenLP XML, TXT and CSV; desktop import review remains.
- [~] Presentation Engine supports the operator sequence, Preview/Live, saved projects and fullscreen audience output; runtime review continues.
- [~] Media Engine supports local image/video sources and an RTSP receiver; desktop playback and Windows GStreamer packaging remain.
- [ ] Detection Engine implemented.
- [ ] Cloud synchronisation implemented.

The completed items above refer only to the initial development foundation.

---

# FEATURE MANAGEMENT RULES

1. Keep this register updated as features progress.
2. Do not mark a feature complete merely because code has been written.
3. Test functionality before marking it complete.
4. Break large features into smaller testable tasks.
5. Record important dependencies.
6. Do not remove planned features without agreement.
7. Add new agreed features to the appropriate section.
8. Update DEVELOPMENT_STATUS.md when major progress is made.

**Governing principle:** This register tracks the full intended scope of BibleShow, not just the features currently under development.
