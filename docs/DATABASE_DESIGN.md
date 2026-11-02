# BIBLESHOW — DATABASE DESIGN

**Document version:** 1.0
**Last updated:** 2 November 2026
**Status:** Initial conceptual design; implementation pending.

---

## 1. PURPOSE

This document defines the proposed data architecture for BibleShow.

BibleShow must support two interconnected workspaces:

1. Bible Study Mode.
2. Church Presentation Mode.

Both must use one shared Bible data engine.

The database must support offline operation, future cloud synchronisation and long-term expansion.

This document describes the conceptual design. It is not yet a final SQL schema.

## 2. DATABASE TECHNOLOGY

### Local database
SQLite.

Purpose:
- Store Bible translations.
- Store books, chapters and verses.
- Store personal notes and bookmarks.
- Store songs and presentations.
- Store media metadata.
- Support offline operation.

### Cloud database
PostgreSQL through Supabase.

Purpose:
- User accounts.
- Cloud workspaces.
- Synchronised personal data.
- Cloud backups.
- Optional cross-device access.

### Semantic search
pgvector is the preferred cloud vector-search extension.

A local semantic-search alternative will be evaluated before implementation.

## 3. CORE DESIGN PRINCIPLES

1. One shared Bible data source for both modes.
2. Local-first storage.
3. Clear separation between Bible content and user-created content.
4. Support multiple Bible translations.
5. Avoid unnecessary duplication.
6. Use stable identifiers.
7. Design for future synchronisation.
8. Support database migrations.
9. Protect personal user data.
10. Respect Bible translation licences.

## 4. BIBLE CONTENT STRUCTURE

### bible_versions

Stores available Bible translations.

Proposed fields:
- id
- abbreviation
- name
- language_code
- publisher
- copyright_notice
- licence_information
- source
- is_installed
- created_at

### bible_books

Stores Bible book information.

Proposed fields:
- id
- testament
- canonical_order
- name
- abbreviation
- chapter_count

### bible_chapters

Stores chapter information.

Proposed fields:
- id
- bible_version_id
- bible_book_id
- chapter_number

### bible_verses

Stores individual Bible verses.

Proposed fields:
- id
- bible_version_id
- bible_book_id
- chapter_number
- verse_number
- text

A verse must be uniquely identifiable within its Bible version, book, chapter and verse number.

## 5. PERSONAL BIBLE STUDY DATA

### user_profiles

Stores local user profile information and, where applicable, cloud account references.

### workspaces

Stores personal or shared workspaces.

### bookmarks

Stores bookmarked Bible references.

### highlights

Stores highlighted passages and selected highlight colours.

### study_notes

Stores personal notes associated with Bible references.

### reading_plans

Stores reading plan definitions.

### reading_progress

Tracks a user's progress through a reading plan.

Personal study information must remain separate from Bible translation content.

## 6. PRESENTATION DATA

### presentations

Stores presentation projects.

### slides

Stores individual slides.

Possible slide types:
- Scripture
- Song
- Text
- Image
- Video
- Other supported media

### playlists

Stores service orders and presentation collections.

### playlist_items

Connects presentations, songs and other items to playlists in a defined order.

### songs

Stores song information and metadata.

### song_sections

Stores song sections such as:
- Verse
- Chorus
- Bridge
- Intro
- Outro

Song lyrics must be stored only where the user has appropriate rights to use them.

### themes

Stores presentation design themes.

### transitions

Stores supported slide transition settings.

Presentation content must reference Bible passages where appropriate rather than duplicating Bible translation data unnecessarily.

## 7. MEDIA DATA

### media_files

Stores metadata about imported media.

Proposed fields:
- id
- filename
- media_type
- local_path
- file_size
- mime_type
- checksum
- created_at

### media_folders

Organises media into folders.

### media_collections

Organises media into reusable collections.

Actual media files should be managed separately from database metadata.

The application must handle missing, moved or inaccessible files gracefully.

## 8. SCRIPTURE DETECTION DATA

### detection_sessions

Records detection sessions.

### transcripts

Stores speech transcription segments where recording or retention is enabled.

### scripture_matches

Stores candidate Scripture matches.

Possible information:
- detected text
- Bible reference
- confidence score
- detection method
- operator selection
- display status
- timestamp

### detection_settings

Stores user-configurable detection preferences.

Speech recordings and transcripts must have appropriate privacy controls and retention settings.

## 9. SYNCHRONISATION DATA

### sync_records

Tracks synchronisation state.

### device_records

Identifies registered application devices where account synchronisation is enabled.

### backups

Tracks backup metadata.

The synchronisation architecture must consider:
- Offline changes.
- Duplicate records.
- Conflicting edits.
- Deleted records.
- Failed synchronisation.
- Restoration after data loss.

Do not assume that local and cloud databases will always be online simultaneously.

## 10. RELATIONSHIP OVERVIEW

Conceptual relationships:

- One Bible version contains many Bible chapters and verses.
- One Bible book contains many chapters.
- One chapter contains many verses.
- A user can have many workspaces.
- A workspace can contain many notes and bookmarks.
- A presentation can contain many slides.
- A playlist can contain many ordered items.
- A song can contain many song sections.
- A media folder can contain many media records.
- A detection session can contain many transcripts and Scripture matches.

The final schema must define foreign keys and appropriate constraints.

## 11. IDENTIFIERS AND DATA INTEGRITY

The final schema must use stable record identifiers.

Consider UUIDs for records that may synchronise between devices.

Use appropriate indexes for:
- Bible reference lookup.
- Verse text search.
- Translation lookup.
- User-owned records.
- Presentation ordering.
- Playlist ordering.
- Synchronisation status.

Avoid relying on display names as unique identifiers.

## 12. SEARCH REQUIREMENTS

Bible search should eventually support:

1. Exact phrase search.
2. Keyword search.
3. Partial text search.
4. Reference search.
5. Translation-specific search.
6. Topic search.
7. Semantic search.
8. Paraphrase matching.

Search must remain useful offline even when cloud semantic search is unavailable.

## 13. DATABASE SECURITY

- Validate all user input.
- Protect private study records.
- Apply appropriate cloud access policies.
- Use Supabase Row Level Security where applicable.
- Never store passwords in plain text.
- Keep secrets outside source control.
- Validate imported Bible and media files.

## 14. MIGRATION STRATEGY

Database changes must be versioned.

Use migration scripts rather than manually changing production databases.

Before significant migrations:
1. Back up relevant data.
2. Test the migration.
3. Verify existing records.
4. Provide a recovery strategy.

## 15. IMPLEMENTATION STATUS

Current status: NOT IMPLEMENTED.

The conceptual design must be reviewed before creating the actual SQLite schema.

The following decisions remain open:
- Final table definitions.
- UUID and key strategy.
- Exact Bible content format.
- Local search implementation.
- Local/cloud synchronisation model.
- Media storage strategy.
- Data migration framework.

**Governing principle:** The database must support both Bible Study and Church Presentation without creating separate Bible content systems.

---

## 15. Initial Local Schema Proposal

This section refines the conceptual entities above into a first SQLite schema plan. It is a design proposal, not an implemented migration. The selected Rust SQLite driver and migration tool remain open.

### `bible_translations`

One row per installed translation edition. Keep the text's identity and provenance with the local database so an offline installation can show the correct name, edition, and rights notice.

Proposed fields:
- `id` — stable source identifier, such as `ENGWEBP`.
- `short_name`, `full_name`, `language_tag`, `dialect`, `edition`.
- `source_organization`, `source_id`, `source_url`, `source_format`.
- `versification_id` — identifies the source's book/chapter/verse numbering scheme.
- `rights_label`, `rights_url`, `copyright_notice`, `trademark_notice`.
- `source_revision`, `source_sha256`, `imported_at_utc`.
- `is_installed` and optional `is_default`.

Use a stable ID from the text source where possible. A display abbreviation is not a database key.

### `bible_books` and `translation_books`

`bible_books` is the shared catalog of books, keyed by a stable OSIS book code such as `Gen` or `John`. It stores canonical English name, short name, and testament grouping.

`translation_books` defines which books are present in each edition and their displayed order. Its primary key is `(translation_id, book_id)`; it also stores `book_order` and `chapter_count`. This supports editions with different canons and book ordering without duplicating book metadata.

### `bible_chapters`

One row per chapter present in a translation:
- `translation_id`, `book_id`, `chapter_number` — composite primary key.
- `chapter_order` — explicit sequence for navigation.
- `verse_count` — count of imported source segments, not a claim that all translations use the same versification.

The composite foreign key `(translation_id, book_id)` references `translation_books`.

### `bible_verses`

Store source-native verse segments, including source labels and sequence:
- `translation_id`, `book_id`, `chapter_number`, `verse_order` — composite primary key.
- `verse_label` — exact source label, retained as text (for example `3` or `3-4`).
- `verse_start` and `verse_end` — nullable integer coordinates when the source label can be parsed as a numeric verse or range.
- `text` — imported text, preserved faithfully.

The composite foreign key `(translation_id, book_id, chapter_number)` references `bible_chapters`. Add an index on `(translation_id, book_id, chapter_number, verse_start)` for reference lookup. Do not assume a verse in one edition always maps one-to-one to a verse in another edition.

### Personal study records

Keep personal records separate from translation content:
- `bookmarks`: UUID, passage coordinates, optional label, created/updated timestamps.
- `highlights`: UUID, passage coordinates, color token, created/updated timestamps.
- `study_notes`: UUID, passage coordinates, title/body, created/updated timestamps.

Passage coordinates should use a stable book code, chapter, start/end verse labels, and a versification identifier. Store an optional translation preference separately; personal records must not copy verse text. UUIDs and timestamps make later backup/synchronization design possible. Deletion/sync markers can be added through a versioned migration when synchronization is designed.

### Presentation references

Scripture slides should store a book code, chapter, verse range, versification identifier, and selected translation ID. Resolve the displayed words from `bible_verses` at render time rather than copying text into the slide record. A later presentation export format may embed a snapshot when portability requires it, subject to the translation's rights.

## 16. Integrity, Search, and Import Rules

- Enable SQLite foreign-key enforcement on every connection.
- Apply schema changes through numbered, reversible migrations where practical; never edit an installed database manually.
- Validate book/chapter/verse references against the installed edition at import time.
- Retain source-native verse labels and ordering, even when numeric coordinates are available.
- Store UTC timestamps and stable IDs for user-created records.
- Treat FTS5 as a separate capability to verify with the chosen bundled SQLite build. It is not a prerequisite for exact reference navigation.
- Import into a staging transaction, verify book/chapter/segment counts and source checksum, then mark a translation installed.
- Keep downloaded source archives out of Git unless distribution rights and repository size have been reviewed; the application may provide an import path for a user-supplied archive.

## 17. Design Decisions Still Open

- Rust SQLite driver and migration framework.
- Canonical reference model and mapping strategy for cross-translation comparison.
- Whether imported Bible text is bundled in the installer or installed from a separate signed data package.
- Full-text search implementation and Unicode normalization policy.
- Final passage-coordinate representation for personal notes and highlights.

Do not implement cross-translation comparison until the versification mapping approach has been specified.
