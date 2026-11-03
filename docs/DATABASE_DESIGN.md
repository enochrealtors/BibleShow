# BIBLESHOW — DATABASE DESIGN

**Document version:** 1.0
**Last updated:** 2 November 2026
**Status:** Initial local KJV/song schema implemented; SQLite schema version 2 adds saved presentations.

---

## 1. PURPOSE

This document defines the proposed data architecture for BibleShow.

BibleShow supports one primary operator workspace: Church Presentation. Bible text is stored locally as a source library for selecting and displaying Scripture; this database plan does not include a personal Bible study workspace.

The database must support offline operation, future cloud synchronisation and long-term expansion.

This document describes the conceptual design. It is not yet a final SQL schema.

## 2. DATABASE TECHNOLOGY

### Local database
SQLite.

Purpose:
- Store Bible translations.
- Store books, chapters and verses.
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

## 5. PRESENTATION DATA

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

The first implementation stores local image assets under BibleShow's application data directory. The SQLite record keeps the content hash, display filename, MIME type, size and local path. Supported initial image formats are PNG, JPEG, GIF and WebP.

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

**Governing principle:** Keep imported Scripture source data centralized and let presentation items reference it rather than copying verse text.

---

## 15. Initial Local Schema Proposal

This section records the implemented local SQLite schema. The current database uses version 2; migrations are applied by the Rust SQLite layer when the library opens or content is imported.

The implementation's table names and reference fields are simpler than the conceptual model above. Keep this section aligned with the actual schema as it evolves.

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

### Implemented schema version 2

- Version 1 stores translations, Bible books/chapters/verses, songs, ordered song sections, song themes, settings, and import checksums.
- Version 2 adds `presentations` and ordered `presentation_items`.
- A presentation item stores either KJV verse coordinates or a song ID and section position. Its displayed body is resolved from the local Bible or song tables when loaded; the item does not duplicate the source text.
- Foreign keys and checks constrain references, content kinds, and required coordinate fields. Foreign-key enforcement is enabled on library connections.
- Schema updates are transactional and older version-1 libraries are upgraded when opened.

## 17. Design Decisions Still Open

- Rust SQLite driver and migration framework.
- Canonical reference model and mapping strategy for cross-translation comparison.
- Whether imported Bible text is bundled in the installer or installed from a separate signed data package.
- Full-text search implementation and Unicode normalization policy.
- Final Scripture reference and versification model for presentation items.

Do not implement cross-translation comparison until the versification mapping approach has been specified.

## 18. Initial ZIP Import Mapping

The first source package is the user-provided `Hymns & Bibles.zip`.

### KJV XML

- Import only `Bibles/EnglishKJBible.xml` from this archive for the first translation.
- Map its numbered books `1`–`66` to the shared canonical book catalog by KJV order; the file contains no book-name elements.
- Preserve the source chapter and verse numbers and exact verse text.
- Store the user's selected KJV as the default translation and record the full source-archive SHA-256, member path, and in-file rights status.
- Import validation must confirm 66 books, 1,189 chapters, and 31,102 verses.

### OpenLyrics files

Map hymn/song XML into the existing `songs` and `song_sections` entities:
- Preserve the primary and alternate titles, authors, copyright field, any CCLI metadata, and source filename.
- Preserve each OpenLyrics section name and order (`v1`, `c1`, etc.); store its lines in order so presentation formatting can be reconstructed.
- Map hymn `Category` values to song themes rather than leaving them embedded in the lyric text.
- Do not import records with no lyric text as presentation-ready songs. Keep an audit list so a user can supply verified lyrics later.

### Local-only handling

The cleaned staging package must be imported into the user's local application data, not compiled into frontend assets or committed to Git. The importer should keep the raw source package separate from the SQLite content tables and record a checksum for each installed package.
