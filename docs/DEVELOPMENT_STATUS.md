# BIBLESHOW — DEVELOPMENT STATUS

**Document version:** 1.0
**Last updated:** 2 November 2026
**Project status:** GitHub baseline established; initial shell implemented; first local content package prepared.

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
- Added `docs/CONTENT_IMPORT_REVIEW.md`; content files remain outside Git and are not imported into the app yet.

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

The Vite starter screen has been replaced by a first-pass BibleShow shell. Home, Bible Study and Church Presentation are navigable, and the theme toggle switches between light and dark palettes. The study and presentation pages are structural landing states only; their engines and workflows are not implemented. A narrow browser preview was reviewed; the responsive navigation, page switching and theme toggle were checked. Review inside the Tauri desktop window remains pending.

The user-selected KJV and cleaned lyrics are prepared in a local staging package, but the application has no content importer or Bible database yet. No Bible content is currently loaded in the app.

No presentation, song, media or Scripture detection functionality has been implemented.

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

### Bible Engine
- [ ] Design SQLite database.
- [~] Draft initial SQLite schema; choose driver/migration framework and implement migrations.
- [~] Identify Bible translation rights; KJV source selected, territory review remains open.
- [ ] Import initial Bible translation.
- [ ] Implement Bible book navigation.
- [ ] Implement chapter and verse navigation.
- [ ] Implement Bible search.
- [ ] Implement translation switching.
- [ ] Implement comparison.
- [ ] Implement bookmarks, highlights and notes.

### Presentation Engine
- [ ] Create presentation workspace.
- [ ] Implement Scripture slides.
- [ ] Implement song management.
- [ ] Implement slide editor.
- [ ] Implement playlists and service order.
- [ ] Implement preview and live output.

### Media Engine
- [ ] Image management.
- [ ] Audio playback.
- [ ] Video playback.
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

1. Implement a local content importer and versioned SQLite migrations that keep Bible and song data outside Git.
2. Load the user-selected KJV from the prepared package as the default translation; add Bible book/chapter/verse navigation.
3. Add the complete hymns/songs from the package to a local library, retaining credits and copyright metadata.
4. Review KJV/song rights for target release markets before bundling content in a public build; review the 700 incomplete songs when verified lyric sources become available.
5. Review the shell inside the Tauri desktop window when a native window is available.

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

**Current restart point:** Build the local importer for the prepared KJV and lyric package, keeping content outside Git and preserving source/rights metadata.
