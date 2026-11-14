# BibleShow resource imports

BibleShow keeps imported Bible text and lyrics in its local SQLite library. The starter ZIP remains the one-step KJV and initial-song import; this workflow adds individual files and collections for later resources.

## Supported formats

- Bible: BibleShow simple XML with numbered books, USFM/SFM (.usfm, .sfm), USX (.usx), OSIS (.osis, .xml), and Zefania XML (.xml). Select a group of per-book USFM files together. Translation code, display name, and language are supplied at import.
- Lyrics: OpenLyrics XML, OpenSong XML (`.xml`, `.ost`), plain text (`.txt`), and CSV (`.csv`). OpenLP song exports use OpenLyrics XML. The selected category is the default for all files; CSV can specify `category` or `type` as `hymn` or `song`.

## Import behavior

- Each submitted batch is parsed before opening a database write transaction. Invalid input leaves that batch unchanged; earlier successful batches remain installed.
- Bible books and chapters are stored against the selected translation code. Existing Bible queries and persisted Scripture slides carry that code; KJV remains the default.
- A Bible code, including KJV, can replace the matching installed translation. The replacement is transactional and must contain parseable verses.
- Lyrics with identical title, authors, and section text are skipped by content fingerprint. Empty lyric files do not create empty song records.
- Bible imports retain limits of 300 files, 8 MB per text file, and 64 MB per request. Lyrics import reads files incrementally and submits batches of up to 128 files or approximately 6 MB of source text; a serialized batch over 8 MB is split again. There is no overall file-count or per-file size cap; available memory, IPC capacity and storage still apply.
- Lyrics batches use one database transaction and cached SQL statements. A slow or invalid file stops the remaining batch sequence while preserving completed batches.
- The Rust profile test parses and persists 5,000 synthetic OpenLyrics files in one batch and reports parsing and database-write durations separately. On the Windows development machine, the passing run took 324 ms to parse and 217 ms to insert into an in-memory SQLite database; this does not include desktop IPC or disk-backed user-library time.

## Parser limitations

XML is a container, not a single Bible schema. Bible XML must use BibleShow simple XML, USX, OSIS, or Zefania; lyrics XML must use OpenLyrics or OpenSong.

- OSIS imports currently require verse elements with `osisID` and ordinary nested verse text. Milestone-only OSIS and apparatus-specific markup are not handled.
- USFM supports standard book/chapter/verse markers and strips common note/alternate-verse markers; complex poetry and character markup is flattened to display text.
- Zefania uses standard numeric book/chapter/verse attributes.
- CSV requires a header row and title/name plus lyrics/text/words columns. Quoted fields and embedded newlines are supported.
- Verify imported formatting and coverage in the desktop library before relying on it for a service. Translation display names and rights/attribution remain the operator's responsibility.
