# BIBLESHOW — MASTER PROJECT GUIDE

**Document version:** 1.0  
**Project name:** BibleShow  
**Product type:** Desktop Bible Study and Church Presentation Application  
**Development approach:** Local-first, modular, open-source-first  
**Current stage:** Foundation and initial application setup  
**Status:** Active development

---

# 1. PROJECT IDENTITY AND VISION

## 1.1 What is BibleShow?

BibleShow is a desktop application designed to combine two major functions:

1. A comprehensive personal Bible study application.
2. A professional church presentation application.

The long-term goal is to deliver an integrated experience inspired by the strengths of applications such as FreeShow and ProPresenter, while introducing intelligent Scripture recognition and a dedicated Bible study environment.

BibleShow should provide an excellent experience for individual Bible readers, Bible teachers, pastors, worship teams, church media operators and congregations.

It must not become merely a Bible reader with presentation features added as an afterthought. Both functions are equally important parts of the product.

## 1.2 Core product philosophy

BibleShow must be:

- Local-first: essential functionality must work without an internet connection.
- Reliable: presentations must not fail because of unnecessary online dependencies.
- Modular: major systems must be independently maintainable.
- Extensible: future functionality must fit into the existing architecture.
- User-friendly: powerful features must remain accessible to beginners.
- Open-source-first: prefer free and maintainable technologies.
- Copyright-conscious: Bible translations and media must be used according to their licences.
- Consistent: Bible Study and Presentation must share the same Bible data engine.

## 1.3 Development principle

Build a solid, working application incrementally.

Do not attempt to implement every advanced feature before the foundation is stable.

Every major feature must be designed, implemented, tested and documented before moving forward.

---

# 2. THE TWO MAIN OPERATING MODES

BibleShow must have two distinct but interconnected workspaces.

## 2.1 Bible Study Mode

This workspace is intended for personal reading, research, teaching preparation and Scripture study.

Required capabilities:

### Bible navigation
- Browse all available Bible books.
- Navigate chapters and verses.
- Search by book, chapter and verse.
- Navigate between Old and New Testament.
- Support multiple Bible translations.
- Compare translations side by side.
- Display verse references clearly.

### Reading and study
- Highlight verses using different colours.
- Create personal notes.
- Bookmark verses and passages.
- Organise bookmarks into collections.
- Maintain reading history.
- Create personal reading plans.
- Track reading progress.
- Search by keyword and phrase.
- Search topics and related Scriptures.
- Cross-reference related passages.
- View contextual information where available.

### Study tools
- Parallel Bible comparison.
- Chapter and passage context.
- Personal study notes.
- Scripture collections.
- Thematic Bible searches.
- Future concordance and Bible dictionary integration.
- Future commentaries and study resources, subject to licensing.

### Personal organisation
- Save study sessions.
- Organise notes and collections.
- Export personal notes where appropriate.
- Backup and restore personal data.

## 2.2 Church Presentation Mode

This workspace is designed for church services, Bible studies, worship sessions, conferences and other live presentations.

### Scripture presentation
- Select Bible translations.
- Search for passages.
- Display individual verses or complete passages.
- Display multiple verses across slides.
- Format Scripture slides.
- Apply backgrounds and themes.
- Preview slides before displaying them.
- Send selected slides to the live projector.

### Songs and lyrics
- Create and manage songs.
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

### Operator workspace

The presentation workspace should eventually support a layout with:

- Left panel: Bible, songs, media and search.
- Centre panel: presentation preview and live output.
- Right panel: playlist and slide thumbnails.
- Bottom controls: live presentation controls and display management.

The interface must remain adaptable to different screen sizes.

## 2.3 Connection between the two modes

Both workspaces must use one shared Bible data engine.

A user studying a passage should be able to send it directly into a presentation.

A presentation operator should be able to access Bible navigation, translation comparison and relevant study information without maintaining a separate Bible database.

Notes, bookmarks and study information must not be confused with public presentation content.

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
- Scripture search.
- Translation comparison.
- Bookmarks, highlights and notes.

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

The database must support both operating modes and future expansion.

Initial conceptual entities include:

### Bible data
- bible_versions
- bible_books
- bible_chapters
- bible_verses

### Personal study
- users
- workspaces
- bookmarks
- highlights
- study_notes
- reading_plans
- reading_progress

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

Do not create duplicate Bible tables for Study Mode and Presentation Mode.

---

# 6. OFFLINE-FIRST FUNCTIONALITY

BibleShow must remain useful without internet access.

Essential offline capabilities should include:

- Bible reading.
- Bible navigation.
- Translation comparison using locally available versions.
- Personal notes.
- Bookmarks.
- Highlights.
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

The two main workspaces should be clearly distinguishable.

Users must be able to switch between Bible Study and Church Presentation without losing unsaved work.

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
- Protect private study notes and personal information.
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

## Phase 2 — Bible Engine

- Design Bible database.
- Integrate initial Bible translation.
- Implement books and chapters.
- Implement verse navigation.
- Implement Bible search.
- Add translation switching.
- Add translation comparison.
- Add bookmarks.
- Add highlights.
- Add personal notes.
- Add import functionality.

## Phase 3 — Presentation Engine

- Build presentation workspace.
- Create slide editor.
- Implement Scripture slides.
- Implement song slides.
- Implement playlists.
- Add preview and live output.
- Add presentation controls.

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

- Do not remove either main operating mode.
- Do not abandon the intelligent Scripture detection concept.
- Do not create separate Bible engines for the two modes.
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
- Default Vite starter interface displayed inside the Tauri window.

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

- Actual BibleShow interface.
- Bible Study workspace.
- Presentation workspace.
- Bible database.
- Bible translations.
- Song management.
- Slide editor.
- Media engine.
- Scripture detection.
- Supabase integration.
- Cloud synchronisation.
- Windows installer.

## Immediate next development objectives

1. Establish permanent documentation.
2. Replace the default Vite starter interface with the BibleShow application shell.
3. Create navigation for Bible Study and Church Presentation.
4. Establish the visual design system.
5. Begin implementation of the Bible Engine.

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

1. A dependable personal Bible study environment.
2. A professional church presentation environment.
3. One shared and reliable Bible data engine.
4. Excellent offline functionality.
5. Smooth Scripture and song presentations.
6. Intelligent Scripture detection with operator safeguards.
7. Reliable multiple-display support.
8. Secure optional cloud synchronisation.
9. An intuitive interface.
10. A maintainable, extensible architecture.

The ultimate objective is to build a dependable application that churches and individuals can use confidently, without being forced into expensive subscriptions for essential functionality.

---

# FINAL DEVELOPMENT DIRECTIVE

**BibleShow is one integrated product with two equally important modes: Bible Study and Church Presentation.**

Every architectural decision, feature, interface and development phase must support this vision.

This document is the project's master reference. If a future conversation, suggestion or implementation conflicts with it, consult this document and the recorded technical decisions before proceeding.

Changes to the blueprint must be deliberate, documented and agreed.

**Build BibleShow carefully. Preserve the vision. Test every important change.**
