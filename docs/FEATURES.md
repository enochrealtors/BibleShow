# BIBLESHOW — MASTER FEATURE REGISTER

**Document version:** 1.0
**Last updated:** 2 November 2026

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
- [ ] Bible Study workspace.
- [ ] Church Presentation workspace.
- [ ] Workspace switching.
- [ ] Light theme.
- [ ] Dark theme.
- [ ] User preferences.
- [ ] Keyboard shortcuts.
- [ ] Settings.
- [ ] Application update mechanism.

# 2. BIBLE ENGINE

## Bible navigation
- [ ] Bible book selection.
- [ ] Old Testament navigation.
- [ ] New Testament navigation.
- [ ] Chapter navigation.
- [ ] Verse navigation.
- [ ] Previous and next chapter.
- [ ] Bible reference input.

## Bible translations
- [ ] Multiple translation support.
- [ ] Translation selection.
- [ ] Translation import.
- [ ] Translation management.
- [ ] Translation attribution and licence information.
- [ ] Translation comparison.

## Bible search
- [ ] Exact phrase search.
- [ ] Keyword search.
- [ ] Partial word search.
- [ ] Bible reference search.
- [ ] Search within a selected translation.
- [ ] Search across translations.
- [ ] Search results navigation.
- [ ] Topic search.
- [ ] Semantic search.

# 3. BIBLE STUDY MODE

- [ ] Reading interface.
- [ ] Verse highlighting.
- [ ] Multiple highlight colours.
- [ ] Bookmarks.
- [ ] Bookmark collections.
- [ ] Personal study notes.
- [ ] Reading history.
- [ ] Reading plans.
- [ ] Reading progress.
- [ ] Cross-references.
- [ ] Parallel Bible view.
- [ ] Chapter context.
- [ ] Scripture collections.
- [ ] Export personal notes.
- [ ] Backup and restore study data.
- [ ] Future Bible dictionary integration.
- [ ] Future commentary integration.
- [ ] Future concordance integration.

# 4. CHURCH PRESENTATION MODE

## Presentation workspace
- [ ] Presentation operator interface.
- [ ] Slide editor.
- [ ] Slide thumbnails.
- [ ] Slide preview.
- [ ] Live presentation output.
- [ ] Next-slide preview.
- [ ] Previous and next controls.
- [ ] Slide duplication.
- [ ] Slide deletion.
- [ ] Slide reordering.
- [ ] Presentation saving.
- [ ] Presentation loading.

## Scripture slides
- [ ] Insert Bible references.
- [ ] Insert individual verses.
- [ ] Insert multiple verses.
- [ ] Select Bible translation.
- [ ] Scripture slide formatting.
- [ ] Scripture backgrounds.
- [ ] Automatic verse layout.
- [ ] Send study passage to presentation.

## Songs and lyrics
- [ ] Song library.
- [ ] Song search.
- [ ] Create songs.
- [ ] Edit songs.
- [ ] Verse sections.
- [ ] Chorus sections.
- [ ] Bridge sections.
- [ ] Song presentation.
- [ ] Song categorisation.
- [ ] Song import.
- [ ] Song playlists.

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

At the time this document was created:

- [x] React and TypeScript scaffold created.
- [x] Vite configured.
- [x] Tauri 2 initialised.
- [x] Desktop application launched successfully.
- [ ] Actual BibleShow interface implemented.
- [ ] Bible Engine implemented.
- [ ] Presentation Engine implemented.
- [ ] Media Engine implemented.
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
