mod bible_detection;
mod live_feed;
mod media_stream;
mod powerpoint;
mod resource_import;
mod speech_recognition;

use roxmltree::{Document, Node};
use rusqlite::{Connection, OptionalExtension, Transaction, params};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use percent_encoding::percent_decode_str;
use std::{fs, io::Read, path::PathBuf};
use tauri::{
    Manager,
    ipc::{InvokeBody, Request},
    webview::{PermissionKind, PermissionResponse, WebviewWindowBuilder},
    WebviewUrl,
};
use zip::ZipArchive;

const MAX_ARCHIVE_BYTES: usize = 20 * 1024 * 1024;
const MAX_MEMBER_BYTES: u64 = 8 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES: u64 = 64 * 1024 * 1024;
const MAX_IMAGE_BYTES: usize = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES: usize = 250 * 1024 * 1024;
const KJV_BOOKS: [&str; 66] = [
    "Genesis",
    "Exodus",
    "Leviticus",
    "Numbers",
    "Deuteronomy",
    "Joshua",
    "Judges",
    "Ruth",
    "1 Samuel",
    "2 Samuel",
    "1 Kings",
    "2 Kings",
    "1 Chronicles",
    "2 Chronicles",
    "Ezra",
    "Nehemiah",
    "Esther",
    "Job",
    "Psalms",
    "Proverbs",
    "Ecclesiastes",
    "Song of Solomon",
    "Isaiah",
    "Jeremiah",
    "Lamentations",
    "Ezekiel",
    "Daniel",
    "Hosea",
    "Joel",
    "Amos",
    "Obadiah",
    "Jonah",
    "Micah",
    "Nahum",
    "Habakkuk",
    "Zephaniah",
    "Haggai",
    "Zechariah",
    "Malachi",
    "Matthew",
    "Mark",
    "Luke",
    "John",
    "Acts",
    "Romans",
    "1 Corinthians",
    "2 Corinthians",
    "Galatians",
    "Ephesians",
    "Philippians",
    "Colossians",
    "1 Thessalonians",
    "2 Thessalonians",
    "1 Timothy",
    "2 Timothy",
    "Titus",
    "Philemon",
    "Hebrews",
    "James",
    "1 Peter",
    "2 Peter",
    "1 John",
    "2 John",
    "3 John",
    "Jude",
    "Revelation",
];

#[derive(Serialize)]
struct ImportSummary {
    translation: String,
    books: usize,
    chapters: usize,
    verses: usize,
    hymns: usize,
    songs: usize,
    source_sha256: String,
}

#[derive(Serialize)]
struct LibrarySummary {
    kjv_installed: bool,
    default_translation: Option<String>,
    books: usize,
    chapters: usize,
    verses: usize,
    hymns: usize,
    songs: usize,
    database_path: String,
}

#[derive(Serialize)]
struct BookSummary {
    book_number: i64,
    name: String,
    chapter_count: i64,
}

#[derive(Serialize)]
struct TranslationSummary { id: String, name: String, language: String }

#[derive(Serialize)]
struct ResourceImportSummary { imported: usize, skipped: usize, detail: String }

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BibleImportRequest { id: String, name: String, language: String, files: Vec<ResourceFile> }

#[derive(Deserialize)]
struct LyricsImportRequest { category: String, files: Vec<ResourceFile> }

#[derive(Deserialize)]
struct ResourceFile { filename: String, content: String }

#[derive(Serialize)]
struct VerseItem {
    verse_number: i64,
    text: String,
}

#[derive(Serialize)]
struct BibleSearchResult {
    book_number: i64,
    book_name: String,
    chapter_number: i64,
    verse_number: i64,
    text: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DetectedBibleReference {
    reference: String,
    translation_id: String,
    book_number: i64,
    book_name: String,
    chapter_number: i64,
    detection_method: String,
    match_score: Option<f64>,
    verses: Vec<VerseItem>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DisplaySummary {
    index: usize,
    id: String,
    name: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    is_primary: bool,
}

#[derive(Serialize)]
struct ChapterData {
    book_number: i64,
    name: String,
    chapter_number: i64,
    chapter_count: i64,
    verses: Vec<VerseItem>,
}

#[derive(Serialize)]
struct SongSummary {
    id: String,
    title: String,
    authors: String,
    category: String,
}

#[derive(Serialize)]
struct SongSection {
    section_type: String,
    label: String,
    lyrics: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SongSectionInput {
    section_type: String,
    label: String,
    lyrics: String,
}

#[derive(Serialize)]
struct SongDetail {
    id: String,
    title: String,
    authors: String,
    copyright: String,
    category: String,
    themes: Vec<String>,
    sections: Vec<SongSection>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PresentationSlideInput {
    source_id: String,
    title: String,
    subtitle: String,
    reference: String,
    kind: String,
    book_number: Option<i64>,
    chapter_number: Option<i64>,
    verse_number: Option<i64>,
    translation_id: Option<String>,
    song_id: Option<String>,
    section_index: Option<i64>,
    media_id: Option<String>,
    presentation_file_id: Option<String>,
    document_page: Option<i64>,
    body_override: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SavedPresentationSlide {
    source_id: String,
    title: String,
    subtitle: String,
    reference: String,
    kind: String,
    body: String,
    body_override: Option<String>,
    book_number: Option<i64>,
    chapter_number: Option<i64>,
    verse_number: Option<i64>,
    translation_id: Option<String>,
    song_id: Option<String>,
    section_index: Option<i64>,
    media_id: Option<String>,
    presentation_file_id: Option<String>,
    document_page: Option<i64>,
    page_count: Option<i64>,
    media_path: Option<String>,
    media_url: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MediaFileSummary {
    id: String,
    filename: String,
    media_type: String,
    mime_type: String,
    local_path: String,
    file_size: u64,
    playback_url: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PresentationSummary {
    id: i64,
    title: String,
    updated_at: String,
    slide_count: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PresentationFileSummary {
    id: String,
    filename: String,
    file_type: String,
    mime_type: String,
    local_path: String,
    file_size: u64,
    page_count: usize,
    created_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PowerPointSlideRequest {
    file_id: String,
    page: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SavedPresentation {
    id: i64,
    title: String,
    slides: Vec<SavedPresentationSlide>,
}

#[tauri::command]
fn import_initial_content(
    app: tauri::AppHandle,
    request: Request<'_>,
) -> Result<ImportSummary, String> {
    let bytes =
        match request.body() {
            InvokeBody::Raw(bytes) => bytes.as_slice(),
            InvokeBody::Json(_) => return Err(
                "Please choose the ZIP file again; the archive data was not received as binary."
                    .into(),
            ),
        };
    if bytes.is_empty() || bytes.len() > MAX_ARCHIVE_BYTES {
        return Err("The selected ZIP must be smaller than 20 MB.".into());
    }
    let digest = Sha256::digest(bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>();
    let mut archive = ZipArchive::new(std::io::Cursor::new(bytes))
        .map_err(|_| "The selected file is not a valid ZIP archive.".to_string())?;
    if archive.len() > 5000 {
        return Err("The ZIP contains an unexpected number of files.".into());
    }
    let mut database = open_database(&app)?;
    database
        .execute_batch("PRAGMA foreign_keys=ON;")
        .map_err(db_error)?;
    let schema_version: i64 = database
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(db_error)?;
    if schema_version > 6 {
        return Err("This BibleShow library was created by a newer app version. Update BibleShow before importing.".into());
    }
    let tx = database.transaction().map_err(db_error)?;
    if schema_version < 1 {
        create_schema(&tx)?;
    }
    if schema_version < 2 {
        create_presentation_schema(&tx)?;
    }
    if schema_version < 3 {
        create_media_schema(&tx)?;
    }
    if schema_version < 4 {
        upgrade_presentation_media_schema(&tx)?;
    }
    if schema_version < 5 {
        upgrade_presentation_video_schema(&tx)?;
    }
    if schema_version < 6 {
        upgrade_presentation_slide_text_schema(&tx)?;
    }
    let mut summary = ImportSummary {
        translation: "King James Version (KJV)".into(),
        books: 0,
        chapters: 0,
        verses: 0,
        hymns: 0,
        songs: 0,
        source_sha256: digest.clone(),
    };
    let mut found_kjv = false;
    let mut expanded_bytes = 0_u64;
    for index in 0..archive.len() {
        let mut entry = archive
            .by_index(index)
            .map_err(|_| "Could not read an item in the ZIP archive.".to_string())?;
        if entry.is_dir() {
            continue;
        }
        let name = entry
            .name()
            .map_err(|_| "The ZIP contains a filename that is not valid UTF-8.".to_string())?
            .into_owned();
        if name.starts_with('/') || name.split('/').any(|part| part == "..") {
            return Err("The ZIP contains an unsafe file path.".into());
        }
        if entry.size() > MAX_MEMBER_BYTES {
            return Err(format!("An item in the ZIP is too large: {name}"));
        }
        expanded_bytes = expanded_bytes.saturating_add(entry.size());
        if expanded_bytes > MAX_UNCOMPRESSED_BYTES {
            return Err("The expanded ZIP content is larger than the 64 MB import limit.".into());
        }
        let is_kjv = name == "BibleShow_Initial_Content/Bibles/EnglishKJBible.xml";
        let is_lyrics = name.starts_with("BibleShow_Initial_Content/Hymns/")
            || name.starts_with("BibleShow_Initial_Content/Songs/");
        if !is_kjv && !is_lyrics {
            continue;
        }
        let mut xml = Vec::with_capacity(entry.size() as usize);
        entry
            .read_to_end(&mut xml)
            .map_err(|_| format!("Could not read {name} from the ZIP."))?;
        let xml = std::str::from_utf8(&xml).map_err(|_| format!("{name} is not valid UTF-8."))?;
        if is_kjv {
            if found_kjv {
                return Err("The ZIP contains more than one KJV Bible file.".into());
            }
            import_kjv(&tx, xml, &mut summary)?;
            found_kjv = true;
        } else {
            let (title, authors, copyright, themes, sections) =
                parse_song(xml).map_err(|e| format!("Could not import {name}: {e}"))?;
            if sections.is_empty() {
                continue;
            }
            let category = if name.contains("/Hymns/") {
                "hymn"
            } else {
                "song"
            };
            let lyric_id = name.trim_start_matches("BibleShow_Initial_Content/");
            tx.execute("INSERT OR REPLACE INTO songs(id,title,authors,copyright,category,source_file) VALUES (?1,?2,?3,?4,?5,?6)", params![lyric_id, title, authors.join("; "), copyright, category, name]).map_err(db_error)?;
            tx.execute("DELETE FROM song_sections WHERE song_id=?1", [lyric_id])
                .map_err(db_error)?;
            tx.execute("DELETE FROM song_themes WHERE song_id=?1", [lyric_id])
                .map_err(db_error)?;
            for (position, (section_type, label, lines)) in sections.iter().enumerate() {
                tx.execute("INSERT INTO song_sections(song_id,position,section_type,label,lyrics) VALUES (?1,?2,?3,?4,?5)", params![lyric_id, position as i64, section_type, label, lines]).map_err(db_error)?;
            }
            for theme in themes {
                tx.execute(
                    "INSERT OR IGNORE INTO song_themes(song_id,theme) VALUES (?1,?2)",
                    params![lyric_id, theme],
                )
                .map_err(db_error)?;
            }
            if category == "hymn" {
                summary.hymns += 1;
            } else {
                summary.songs += 1;
            }
        }
    }
    if !found_kjv {
        return Err("This ZIP does not contain the expected English KJV Bible file.".into());
    }
    tx.execute(
        "INSERT OR REPLACE INTO settings(key,value) VALUES ('default_translation','KJV')",
        [],
    )
    .map_err(db_error)?;
    tx.execute(
        "INSERT OR REPLACE INTO imports(source_sha256,imported_at) VALUES (?1,datetime('now'))",
        [&digest],
    )
    .map_err(db_error)?;
    tx.commit().map_err(db_error)?;
    Ok(summary)
}

#[tauri::command]
fn get_library_summary(app: tauri::AppHandle) -> Result<LibrarySummary, String> {
    let path = database_path(&app)?;
    if !path.exists() {
        return Ok(LibrarySummary {
            kjv_installed: false,
            default_translation: None,
            books: 0,
            chapters: 0,
            verses: 0,
            hymns: 0,
            songs: 0,
            database_path: path.display().to_string(),
        });
    }
    let mut db = Connection::open(&path).map_err(db_error)?;
    ensure_current_schema(&mut db)?;
    let default_translation = db
        .query_row(
            "SELECT value FROM settings WHERE key='default_translation'",
            [],
            |r| r.get(0),
        )
        .optional()
        .map_err(db_error)?;
    let kjv_installed: bool = db.query_row("SELECT EXISTS(SELECT 1 FROM translations WHERE id='KJV')", [], |row| row.get(0)).map_err(db_error)?;
    let bible_count = |table: &str| -> Result<usize, String> {
        db.query_row(&format!("SELECT COUNT(*) FROM {table} WHERE translation_id='KJV'"), [], |row| row.get::<_, i64>(0))
            .map(|number| number as usize).map_err(db_error)
    };
    Ok(LibrarySummary {
        kjv_installed,
        default_translation,
        books: bible_count("bible_books")?,
        chapters: bible_count("bible_chapters")?,
        verses: bible_count("bible_verses")?,
        hymns: db
            .query_row(
                "SELECT COUNT(*) FROM songs WHERE category='hymn'",
                [],
                |r| r.get::<_, i64>(0),
            )
            .map_err(db_error)? as usize,
        songs: db
            .query_row(
                "SELECT COUNT(*) FROM songs WHERE category='song'",
                [],
                |r| r.get::<_, i64>(0),
            )
            .map_err(db_error)? as usize,
        database_path: path.display().to_string(),
    })
}

#[tauri::command]
fn get_bible_translations(app: tauri::AppHandle) -> Result<Vec<TranslationSummary>, String> {
    let db = open_library(&app)?;
    let mut statement = db.prepare("SELECT id,name,language FROM translations ORDER BY CASE WHEN id='KJV' THEN 0 ELSE 1 END,name").map_err(db_error)?;
    statement.query_map([], |row| Ok(TranslationSummary { id: row.get(0)?, name: row.get(1)?, language: row.get(2)? }))
        .map_err(db_error)?.collect::<Result<Vec<_>, _>>().map_err(db_error)
}

#[tauri::command]
fn get_bible_books(app: tauri::AppHandle, translation_id: Option<String>) -> Result<Vec<BookSummary>, String> {
    let translation_id = translation_id.unwrap_or_else(|| "KJV".into());
    let path = database_path(&app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let db = open_library(&app)?;
    let mut query = db
        .prepare("SELECT b.book_number,b.name,COUNT(c.chapter_number) FROM bible_books b LEFT JOIN bible_chapters c ON c.translation_id=b.translation_id AND c.book_number=b.book_number WHERE b.translation_id=?1 GROUP BY b.book_number,b.name ORDER BY b.book_number")
        .map_err(db_error)?;
    let rows = query
        .query_map([translation_id], |row| {
            Ok(BookSummary {
                book_number: row.get(0)?,
                name: row.get(1)?,
                chapter_count: row.get(2)?,
            })
        })
        .map_err(db_error)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(db_error)
}

#[tauri::command]
fn get_bible_chapter(
    app: tauri::AppHandle,
    translation_id: Option<String>,
    book_number: i64,
    chapter_number: i64,
) -> Result<ChapterData, String> {
    let translation_id = translation_id.unwrap_or_else(|| "KJV".into());
    let path = database_path(&app)?;
    if !path.exists() {
        return Err("Import a Bible version from Home to read Scripture offline.".into());
    }
    let db = open_library(&app)?;
    let (name, chapter_count): (String, i64) = db
        .query_row(
            "SELECT b.name,COUNT(c.chapter_number) FROM bible_books b LEFT JOIN bible_chapters c ON c.translation_id=b.translation_id AND c.book_number=b.book_number WHERE b.translation_id=?1 AND b.book_number=?2 GROUP BY b.book_number,b.name",
            params![translation_id, book_number],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(db_error)?
        .ok_or_else(|| "That book is not available in the selected Bible version.".to_string())?;
    let mut query = db
        .prepare("SELECT verse_number,text FROM bible_verses WHERE translation_id=?1 AND book_number=?2 AND chapter_number=?3 ORDER BY verse_number")
        .map_err(db_error)?;
    let verses = query
        .query_map(params![translation_id, book_number, chapter_number], |row| {
            Ok(VerseItem {
                verse_number: row.get(0)?,
                text: row.get(1)?,
            })
        })
        .map_err(db_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(db_error)?;
    if chapter_number < 1 || chapter_number > chapter_count || verses.is_empty() {
        return Err("That chapter is not available in the selected Bible version.".into());
    }
    Ok(ChapterData {
        book_number,
        name,
        chapter_number,
        chapter_count,
        verses,
    })
}

#[tauri::command]
fn search_bible_keyword(app: tauri::AppHandle, translation_id: Option<String>, query: String, limit: usize) -> Result<Vec<BibleSearchResult>, String> {
    let query = query.trim();
    if query.is_empty() || query.chars().count() > 100 {
        return Err("Enter a search phrase of 1 to 100 characters.".into());
    }
    let path = database_path(&app)?;
    if !path.exists() {
        return Err("Import a Bible version from Home before searching.".into());
    }
    let db = open_library(&app)?;
    let pattern = format!("%{}%", query.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_"));
    let translation_id = translation_id.unwrap_or_else(|| "KJV".into());
    let limit = i64::try_from(limit).unwrap_or(100).clamp(1, 100);
    let mut statement = db.prepare("SELECT v.book_number,b.name,v.chapter_number,v.verse_number,v.text FROM bible_verses v JOIN bible_books b ON b.translation_id=v.translation_id AND b.book_number=v.book_number WHERE v.translation_id=?1 AND v.text LIKE ?2 ESCAPE '\\' ORDER BY v.book_number,v.chapter_number,v.verse_number LIMIT ?3").map_err(db_error)?;
    statement.query_map(params![translation_id, pattern, limit], |row| Ok(BibleSearchResult {
        book_number: row.get(0)?, book_name: row.get(1)?, chapter_number: row.get(2)?, verse_number: row.get(3)?, text: row.get(4)?,
    })).map_err(db_error)?.collect::<Result<Vec<_>, _>>().map_err(db_error)
}

#[tauri::command]
fn detect_bible_references(
    app: tauri::AppHandle,
    transcript: String,
    translation_id: Option<String>,
) -> Result<Vec<DetectedBibleReference>, String> {
    if transcript.trim().is_empty() || transcript.chars().count() > 2_000 {
        return Err("Enter transcript text of 1 to 2,000 characters.".into());
    }
    let translation_id = translation_id.unwrap_or_else(|| "KJV".into());
    let path = database_path(&app)?;
    if !path.exists() {
        return Err("Import a Bible version from Home before detecting passages.".into());
    }
    let db = open_library(&app)?;
    let books = db.prepare("SELECT book_number,name FROM bible_books WHERE translation_id=?1 ORDER BY book_number")
        .map_err(db_error)?
        .query_map([&translation_id], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)))
        .map_err(db_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(db_error)?;
    let references = bible_detection::parse_references(&transcript, &books);
    let mut candidates = Vec::with_capacity(references.len());
    let mut total_verses = 0;
    for reference in references.into_iter().take(50) {
        let start = reference.verse_start.unwrap_or(1);
        let end = reference.verse_end.unwrap_or(i64::MAX);
        let mut statement = db.prepare("SELECT verse_number,text FROM bible_verses WHERE translation_id=?1 AND book_number=?2 AND chapter_number=?3 AND verse_number BETWEEN ?4 AND ?5 ORDER BY verse_number LIMIT 251")
            .map_err(db_error)?;
        let verses = statement.query_map(params![translation_id,reference.book_number,reference.chapter_number,start,end], |row| Ok(VerseItem {
            verse_number: row.get(0)?, text: row.get(1)?,
        })).map_err(db_error)?.collect::<Result<Vec<_>, _>>().map_err(db_error)?;
        if verses.is_empty() || verses.len() > 250 {
            continue;
        }
        if reference.verse_start.is_some_and(|verse| verses.first().is_none_or(|item| item.verse_number != verse)) {
            continue;
        }
        if reference.verse_end.is_some_and(|last| verses.last().is_none_or(|item| item.verse_number < last)) {
            continue;
        }
        if total_verses + verses.len() > 500 { break; }
        total_verses += verses.len();
        let label = match (reference.verse_start, reference.verse_end) {
            (Some(first), Some(last)) if first == last => format!("{} {}:{}", reference.book_name, reference.chapter_number, first),
            (Some(first), Some(last)) => format!("{} {}:{}-{}", reference.book_name, reference.chapter_number, first, last),
            _ => format!("{} {}", reference.book_name, reference.chapter_number),
        };
        candidates.push(DetectedBibleReference {
            reference: label,
            translation_id: translation_id.clone(),
            book_number: reference.book_number,
            book_name: reference.book_name,
            chapter_number: reference.chapter_number,
            detection_method: "reference".into(),
            match_score: None,
            verses,
        });
    }
    Ok(candidates)
}

#[tauri::command]
fn detect_bible_quotes(
    app: tauri::AppHandle,
    transcript: String,
    translation_id: Option<String>,
) -> Result<Vec<DetectedBibleReference>, String> {
    if transcript.trim().is_empty() || transcript.chars().count() > 2_000 {
        return Err("Enter transcript text of 1 to 2,000 characters.".into());
    }
    let translation_id = translation_id.unwrap_or_else(|| "KJV".into());
    if !database_path(&app)?.exists() {
        return Err("Import a Bible version from Home before matching quotations.".into());
    }
    let db = open_library(&app)?;
    bible_detection::find_quote_matches(&db, &translation_id, &transcript)
        .map_err(|error| format!("Local quotation search error: {error}"))
        .map(|matches| matches.into_iter().map(|candidate| DetectedBibleReference {
            reference: format!("{} {}:{}", candidate.book_name, candidate.chapter_number, candidate.verse_number),
            translation_id: translation_id.clone(),
            book_number: candidate.book_number,
            book_name: candidate.book_name,
            chapter_number: candidate.chapter_number,
            detection_method: "quotation".into(),
            match_score: Some(candidate.score),
            verses: vec![VerseItem { verse_number: candidate.verse_number, text: candidate.text }],
        }).collect())
}

fn read_resource_request<T: for<'de> Deserialize<'de>>(request: &Request<'_>, label: &str, max_bytes: Option<usize>) -> Result<T, String> {
    let bytes = match request.body() {
        InvokeBody::Raw(bytes) => bytes.as_slice(),
        InvokeBody::Json(_) => return Err(format!("Choose the {label} files again; their contents were not received.")),
    };
    if bytes.is_empty() { return Err(format!("The selected {label} import is empty.")); }
    if max_bytes.is_some_and(|limit| bytes.len() > limit) { return Err(format!("The selected {label} resources exceed the 64 MB import limit.")); }
    serde_json::from_slice(bytes).map_err(|_| format!("The selected {label} data could not be read."))
}

#[tauri::command]
fn import_bible_resources(app: tauri::AppHandle, request: Request<'_>) -> Result<ResourceImportSummary, String> {
    let request: BibleImportRequest = read_resource_request(&request, "Bible", Some(64 * 1024 * 1024))?;
    let id = request.id.trim().to_ascii_uppercase();
    let name = request.name.trim();
    let language = request.language.trim();
    if id.is_empty() || id.len() > 24 || !id.chars().all(|ch| ch.is_ascii_alphanumeric() || ch == '-') {
        return Err("Enter a translation code (1–24 letters, numbers, or hyphens).".into());
    }
    if name.is_empty() || name.chars().count() > 100 || language.is_empty() || language.len() > 16 { return Err("Enter a translation name and language code.".into()); }
    if request.files.len() > 300 || request.files.iter().any(|file| file.content.len() > 8 * 1024 * 1024) { return Err("Choose up to 300 Bible files, each smaller than 8 MB.".into()); }
    let files: Vec<_> = request.files.into_iter().map(|file| (file.filename, file.content)).collect();
    let books = resource_import::parse_bible_files(&files)?;
    let mut db = open_library(&app)?;
    let tx = db.transaction().map_err(db_error)?;
    let in_use: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM presentation_items WHERE translation_id=?1)", [&id], |row| row.get(0)).map_err(db_error)?;
    if in_use { return Err("This Bible version is used by a saved presentation. Remove those Scripture slides before replacing the version.".into()); }
    tx.execute("INSERT INTO translations(id,name,language,source_status) VALUES (?1,?2,?3,'imported') ON CONFLICT(id) DO UPDATE SET name=excluded.name,language=excluded.language,source_status='imported'", params![id,name,language]).map_err(db_error)?;
    tx.execute("DELETE FROM bible_books WHERE translation_id=?1", [&id]).map_err(db_error)?;
    let mut chapters = 0usize;
    let mut verses = 0usize;
    for book in &books {
        tx.execute("INSERT INTO bible_books(translation_id,book_number,name) VALUES (?1,?2,?3)", params![id,book.number,book.name]).map_err(db_error)?;
        for (chapter_number, chapter_verses) in &book.chapters {
            tx.execute("INSERT INTO bible_chapters(translation_id,book_number,chapter_number) VALUES (?1,?2,?3)", params![id,book.number,chapter_number]).map_err(db_error)?;
            chapters += 1;
            for (verse_number, text) in chapter_verses {
                tx.execute("INSERT INTO bible_verses(translation_id,book_number,chapter_number,verse_number,text) VALUES (?1,?2,?3,?4,?5)", params![id,book.number,chapter_number,verse_number,text]).map_err(db_error)?;
                verses += 1;
            }
        }
    }
    tx.commit().map_err(db_error)?;
    Ok(ResourceImportSummary { imported: books.len(), skipped: 0, detail: format!("Imported {name}: {} books, {chapters} chapters and {verses} verses.", books.len()) })
}

#[tauri::command]
fn import_lyrics_resources(app: tauri::AppHandle, request: Request<'_>) -> Result<ResourceImportSummary, String> {
    let request: LyricsImportRequest = read_resource_request(&request, "lyrics", None)?;

    let files: Vec<_> = request.files.into_iter().map(|file| (file.filename, file.content)).collect();
    let songs = resource_import::parse_lyrics_files(&files, &request.category)?;
    let mut db = open_library(&app)?;
    let tx = db.transaction().map_err(db_error)?;
    let (imported, skipped) = persist_lyrics_resources(&tx, &songs)?;
    tx.commit().map_err(db_error)?;
    Ok(ResourceImportSummary { imported, skipped, detail: format!("Imported {imported} lyrics resources; skipped {skipped} duplicates or empty items.") })
}

fn persist_lyrics_resources(tx: &Transaction<'_>, songs: &[resource_import::ParsedSong]) -> Result<(usize, usize), String> {
    let mut imported = 0;
    let mut skipped = 0;
    let mut insert_song = tx.prepare_cached("INSERT OR IGNORE INTO songs(id,title,authors,copyright,category,source_file) VALUES (?1,?2,?3,?4,?5,?6)").map_err(db_error)?;
    let mut insert_section = tx.prepare_cached("INSERT INTO song_sections(song_id,position,section_type,label,lyrics) VALUES (?1,?2,?3,?4,?5)").map_err(db_error)?;
    let mut insert_theme = tx.prepare_cached("INSERT OR IGNORE INTO song_themes(song_id,theme) VALUES (?1,?2)").map_err(db_error)?;
    for song in songs {
        if song.sections.is_empty() { skipped += 1; continue; }
        let lyric_bytes = song.sections.iter().map(|section| section.2.len()).sum::<usize>();
        let mut stable_content = String::with_capacity(song.title.len() + song.authors.len() + lyric_bytes + song.sections.len() + 2);
        stable_content.push_str(&song.title);
        stable_content.push('\0');
        stable_content.push_str(&song.authors);
        stable_content.push('\0');
        for (index, section) in song.sections.iter().enumerate() {
            if index > 0 { stable_content.push('\n'); }
            stable_content.push_str(&section.2);
        }
        let digest = Sha256::digest(stable_content.as_bytes());
        const LOWER_HEX: &[u8; 16] = b"0123456789abcdef";
        let mut id = String::with_capacity(71);
        id.push_str("import:");
        for byte in digest.iter() {
            id.push(LOWER_HEX[(*byte >> 4) as usize] as char);
            id.push(LOWER_HEX[(*byte & 0x0f) as usize] as char);
        }
        let source_file = format!("resource-import-{}", id.strip_prefix("import:").unwrap_or(&id));
        if insert_song.execute(params![id,song.title,song.authors,song.copyright,song.category,source_file]).map_err(db_error)? == 0 { skipped += 1; continue; }
        for (position, (section_type, label, lyrics)) in song.sections.iter().enumerate() {
            insert_section.execute(params![id,position as i64,section_type,label,lyrics]).map_err(db_error)?;
        }
        for theme in &song.themes { insert_theme.execute(params![id,theme]).map_err(db_error)?; }
        imported += 1;
    }
    Ok((imported, skipped))
}

#[cfg(test)]
mod lyrics_import_profile_tests {
    use super::*;
    use std::time::Instant;

    #[test]
    fn imports_valid_songs_and_skips_title_only_entries() {
        let files = vec![
            ("valid.xml".into(), "<song><properties><titles><title>Valid</title></titles></properties><lyrics><verse name=\"v1\"><lines>Words</lines></verse></lyrics></song>".into()),
            ("empty.xml".into(), "<song><properties><titles><title>Empty</title></titles></properties></song>".into()),
            ("empty.ost".into(), "<song><title>OpenSong Empty</title><lyrics/></song>".into()),
        ];
        let songs = resource_import::parse_lyrics_files(&files, "song").unwrap();
        let mut db = Connection::open_in_memory().unwrap();
        db.execute_batch("CREATE TABLE songs(id TEXT PRIMARY KEY,title TEXT,authors TEXT,copyright TEXT,category TEXT,source_file TEXT); CREATE TABLE song_sections(song_id TEXT,position INTEGER,section_type TEXT,label TEXT,lyrics TEXT,PRIMARY KEY(song_id,position)); CREATE TABLE song_themes(song_id TEXT,theme TEXT,PRIMARY KEY(song_id,theme));").unwrap();
        let tx = db.transaction().unwrap();
        assert_eq!(persist_lyrics_resources(&tx, &songs).unwrap(), (1, 2));
        tx.commit().unwrap();
        let (songs_count, sections_count): (i64, i64) = db.query_row(
            "SELECT (SELECT COUNT(*) FROM songs),(SELECT COUNT(*) FROM song_sections)", [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).unwrap();
        assert_eq!((songs_count, sections_count), (1, 1));
    }

    #[test]
    fn parses_and_persists_five_thousand_lyrics_in_batches() {
        let files = (0..5_000).map(|index| (
            format!("song-{index}.xml"),
            format!("<song><properties><titles><title>Song {index}</title></titles><authors><author>Author {index}</author></authors></properties><lyrics><verse name=\"v1\"><lines>Verse {index}<br/>Second line</lines></verse><verse name=\"c1\"><lines>Chorus</lines></verse></lyrics></song>"),
        )).collect::<Vec<_>>();

        let parse_started = Instant::now();
        let songs = resource_import::parse_lyrics_files(&files, "song").unwrap();
        let parse_elapsed = parse_started.elapsed();

        let mut db = Connection::open_in_memory().unwrap();
        db.execute_batch("CREATE TABLE songs(id TEXT PRIMARY KEY,title TEXT,authors TEXT,copyright TEXT,category TEXT,source_file TEXT); CREATE TABLE song_sections(song_id TEXT,position INTEGER,section_type TEXT,label TEXT,lyrics TEXT,PRIMARY KEY(song_id,position)); CREATE TABLE song_themes(song_id TEXT,theme TEXT,PRIMARY KEY(song_id,theme));").unwrap();
        let insert_started = Instant::now();
        let tx = db.transaction().unwrap();
        assert_eq!(persist_lyrics_resources(&tx, &songs).unwrap(), (5_000, 0));
        tx.commit().unwrap();
        let insert_elapsed = insert_started.elapsed();

        let tx = db.transaction().unwrap();
        assert_eq!(persist_lyrics_resources(&tx, &songs).unwrap(), (0, 5_000));
        tx.commit().unwrap();
        eprintln!("5,000 lyrics: parsed in {parse_elapsed:?}, inserted in {insert_elapsed:?}");
    }
}

#[tauri::command(async)]
fn import_media_file(app: tauri::AppHandle, media_stream: tauri::State<'_, media_stream::MediaStreamState>, request: Request<'_>) -> Result<MediaFileSummary, String> {
    let packet = match request.body() {
        InvokeBody::Raw(bytes) => bytes.as_slice(),
        InvokeBody::Json(_) => return Err("Choose the media again; its binary data was not received.".into()),
    };
    if packet.len() < 3 || packet.len() > MAX_VIDEO_BYTES + 512 {
        return Err("Choose a non-empty image smaller than 25 MB or video smaller than 250 MB.".into());
    }
    let (input_name, bytes) = if let Some(header) = request.headers().get("x-bibleshow-filename") {
        let encoded = header.to_str().map_err(|_| "The media filename is invalid.".to_string())?;
        let filename = percent_decode_str(encoded).decode_utf8().map_err(|_| "The media filename is not valid UTF-8.".to_string())?.into_owned();
        if filename.is_empty() || filename.len() > 510 || filename.chars().any(|character| character.is_control() || character == '/' || character == '\\') { return Err("The selected media has an invalid filename.".into()); }
        (filename, packet)
    } else {
        // Accept the legacy payload format so older frontend builds can still import media.
        let name_length = u16::from_be_bytes([packet[0], packet[1]]) as usize;
        if name_length == 0 || name_length > 510 || packet.len() <= name_length + 2 {
            return Err("The selected media has an invalid filename or empty file.".into());
        }
        let filename = std::str::from_utf8(&packet[2..2 + name_length]).map_err(|_| "The media filename is not valid UTF-8.".to_string())?.to_string();
        (filename, &packet[2 + name_length..])
    };
    if bytes.is_empty() { return Err("The selected media file is empty.".into()); }
    let (media_type, extension, mime_type) = detect_media_type(bytes).ok_or_else(|| "This media format is not supported. Choose PNG, JPEG, GIF, WebP, MP4, or WebM.".to_string())?;
    if media_type == "image" && bytes.len() > MAX_IMAGE_BYTES { return Err("Choose an image smaller than 25 MB.".into()); }
    if media_type == "video" && bytes.len() > MAX_VIDEO_BYTES { return Err("Choose a video smaller than 250 MB.".into()); }
    let digest = Sha256::digest(bytes).iter().map(|byte| format!("{byte:02x}")).collect::<String>();
    let original_name = PathBuf::from(input_name).file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();
    let stem = PathBuf::from(&original_name).file_stem().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();
    let safe_stem = stem.chars().filter(|character| character.is_ascii_alphanumeric() || *character == '-' || *character == '_' || *character == ' ').take(100).collect::<String>().trim().to_string();
    let fallback = if media_type == "video" { "Video" } else { "Image" };
    let filename = format!("{}.{}", if safe_stem.is_empty() { format!("{fallback}-{}", &digest[..8]) } else { safe_stem }, extension);
    let app_data = app.path().app_data_dir().map_err(|error| format!("Could not locate BibleShow's media folder: {error}"))?;
    let media_dir = app_data.join("media");
    fs::create_dir_all(&media_dir).map_err(|error| format!("Could not create BibleShow's media folder: {error}"))?;
    let local_path = media_dir.join(format!("{digest}.{extension}"));
    let stored_bytes = local_path.metadata().map(|metadata| metadata.len()).unwrap_or_default();
    if stored_bytes != bytes.len() as u64 {
        let temporary_path = media_dir.join(format!(".{digest}.tmp-{}", uuid::Uuid::new_v4()));
        if let Err(error) = fs::write(&temporary_path, bytes) {
            let _ = fs::remove_file(&temporary_path);
            return Err(format!("Could not store this media in BibleShow: {error}"));
        }
        if local_path.exists() {
            fs::remove_file(&local_path).map_err(|error| format!("Could not replace an incomplete media file: {error}"))?;
        }
        if let Err(error) = fs::rename(&temporary_path, &local_path) {
            let _ = fs::remove_file(&temporary_path);
            return Err(format!("Could not finish storing this media file: {error}"));
        }
    }
    let local_path_string = local_path.to_string_lossy().into_owned();
    let db = open_library(&app)?;
    if media_type == "image" {
        db.execute("INSERT OR IGNORE INTO media_files(id,filename,media_type,mime_type,local_path,file_size,created_at) VALUES (?1,?2,'image',?3,?4,?5,datetime('now'))", params![digest,filename,mime_type,local_path_string,bytes.len() as i64]).map_err(db_error)?;
    } else {
        db.execute("INSERT OR IGNORE INTO video_files(id,filename,mime_type,local_path,file_size,created_at) VALUES (?1,?2,?3,?4,?5,datetime('now'))", params![digest,filename,mime_type,local_path_string,bytes.len() as i64]).map_err(db_error)?;
    }
    let playback_url = if media_type == "video" {
        Some(media_stream.url_for(&digest, local_path.clone(), mime_type)?)
    } else { None };
    Ok(MediaFileSummary { id: digest, filename, media_type: media_type.into(), mime_type: mime_type.into(), local_path: local_path_string, file_size: bytes.len() as u64, playback_url })
}

fn detect_media_type(bytes: &[u8]) -> Option<(&'static str, &'static str, &'static str)> {
    if bytes.starts_with(b"\x89PNG\r\n\x1a\n") { Some(("image", "png", "image/png")) }
    else if bytes.starts_with(b"\xff\xd8\xff") { Some(("image", "jpg", "image/jpeg")) }
    else if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") { Some(("image", "gif", "image/gif")) }
    else if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" { Some(("image", "webp", "image/webp")) }
    else if bytes.len() >= 12 && &bytes[4..8] == b"ftyp" { Some(("video", "mp4", "video/mp4")) }
    else if bytes.starts_with(b"\x1a\x45\xdf\xa3") { Some(("video", "webm", "video/webm")) }
    else { None }
}

#[tauri::command]
fn get_media_files(app: tauri::AppHandle, media_stream: tauri::State<'_, media_stream::MediaStreamState>) -> Result<Vec<MediaFileSummary>, String> {
    if !database_path(&app)?.exists() { return Ok(Vec::new()); }
    let db = open_library(&app)?;
    let mut query = db.prepare("SELECT id,filename,media_type,mime_type,local_path,file_size FROM media_files UNION ALL SELECT id,filename,'video',mime_type,local_path,file_size FROM video_files ORDER BY filename COLLATE NOCASE").map_err(db_error)?;
    let mut files = query.query_map([], |row| Ok(MediaFileSummary { id: row.get(0)?, filename: row.get(1)?, media_type: row.get(2)?, mime_type: row.get(3)?, local_path: row.get(4)?, file_size: row.get::<_,i64>(5)? as u64, playback_url: None })).map_err(db_error)?.collect::<Result<Vec<_>,_>>().map_err(db_error)?;
    for file in &mut files {
        if file.media_type == "video" {
            file.playback_url = media_stream.url_for(&file.id, PathBuf::from(&file.local_path), &file.mime_type).ok();
        }
    }
    Ok(files)
}

#[tauri::command]
fn get_available_displays(app: tauri::AppHandle) -> Result<Vec<DisplaySummary>, String> {
    let monitors = app.available_monitors().map_err(|error| format!("Could not read connected displays: {error}"))?;
    let primary = app.primary_monitor().ok().flatten();
    monitors.into_iter().enumerate().map(|(index, monitor)| {
        let position = monitor.position();
        let size = monitor.size();
        let name = monitor.name().cloned().unwrap_or_else(|| format!("Display {}", index + 1));
        let is_primary = primary.as_ref().is_some_and(|item| monitor_id(item) == monitor_id(&monitor));
        Ok(DisplaySummary { index, id: monitor_id(&monitor), name, x: position.x, y: position.y, width: size.width, height: size.height, is_primary })
    }).collect()
}

fn monitor_id(monitor: &tauri::Monitor) -> String {
    let position = monitor.position();
    let size = monitor.size();
    format!("{}@{},{}:{}x{}", monitor.name().map(String::as_str).unwrap_or(""), position.x, position.y, size.width, size.height)
}

fn monitor_is_primary(monitor: &tauri::Monitor, primary: Option<&tauri::Monitor>) -> bool {
    primary.is_some_and(|item| monitor_id(item) == monitor_id(monitor))
}

#[tauri::command]
fn connect_live_feed(app: tauri::AppHandle, state: tauri::State<'_, live_feed::LiveFeedState>, source_url: String) -> Result<live_feed::LiveFeedInfo, String> {
    live_feed::connect(&app, &state, source_url)
}

#[tauri::command]
fn stop_live_feed(state: tauri::State<'_, live_feed::LiveFeedState>) {
    live_feed::stop(&state);
}

#[tauri::command]
fn set_audience_window_visible(app: tauri::AppHandle, visible: bool, display_id: Option<String>) -> Result<(), String> {
    let window = app
        .get_webview_window("audience")
        .ok_or_else(|| "The audience output window is not available.".to_string())?;
    if visible {
        let monitors = app.available_monitors().map_err(|error| format!("Could not read connected displays: {error}"))?;
        let primary = app.primary_monitor().ok().flatten();
        let monitor = display_id.as_deref()
            .and_then(|id| monitors.iter().find(|item| monitor_id(item) == id))
            .or_else(|| monitors.iter().find(|item| !monitor_is_primary(item, primary.as_ref())))
            .or_else(|| monitors.first())
            .ok_or_else(|| "No active display was detected. Connect or enable a screen in your system's Display settings, then refresh displays.".to_string())?;
        let position = monitor.position();
        window
            .set_fullscreen_on_monitor(tauri::PhysicalPosition::new(
                position.x as f64,
                position.y as f64,
            ))
            .map_err(|error| format!("Could not use fullscreen audience output: {error}"))?;
        window.show().map_err(|error| format!("Could not open audience output: {error}"))?;
    } else {
        window.set_fullscreen(false).map_err(|error| format!("Could not exit audience fullscreen: {error}"))?;
        window.hide().map_err(|error| format!("Could not close audience output: {error}"))?;
    }
    Ok(())
}

#[tauri::command]
fn get_song_library(
    app: tauri::AppHandle,
    category: String,
    search: String,
) -> Result<Vec<SongSummary>, String> {
    let path = database_path(&app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let category = match category.as_str() {
        "hymn" | "song" => category,
        _ => "all".to_string(),
    };
    let search = format!("%{}%", search.trim());
    let db = open_library(&app)?;
    let sql = if category == "all" {
        "SELECT s.id,s.title,s.authors,s.category FROM songs s WHERE s.title LIKE ?1 OR s.authors LIKE ?1 OR s.id IN (SELECT song_id FROM song_sections WHERE lyrics LIKE ?1) ORDER BY s.title COLLATE NOCASE"
    } else {
        "SELECT s.id,s.title,s.authors,s.category FROM songs s WHERE s.category=?2 AND (s.title LIKE ?1 OR s.authors LIKE ?1 OR s.id IN (SELECT song_id FROM song_sections WHERE lyrics LIKE ?1)) ORDER BY s.title COLLATE NOCASE"
    };
    let mut query = db.prepare(sql).map_err(db_error)?;
    let rows = if category == "all" {
        query.query_map([search], song_summary_from_row)
    } else {
        query.query_map(params![search, category], song_summary_from_row)
    }
    .map_err(db_error)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(db_error)
}

#[tauri::command]
fn get_song_detail(app: tauri::AppHandle, song_id: String) -> Result<SongDetail, String> {
    let path = database_path(&app)?;
    if !path.exists() {
        return Err("Import the content package from Home to browse hymns and songs.".into());
    }
    let db = open_library(&app)?;
    let (id, title, authors, copyright, category) = db
        .query_row(
            "SELECT id,title,authors,copyright,category FROM songs WHERE id=?1",
            [&song_id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                ))
            },
        )
        .optional()
        .map_err(db_error)?
        .ok_or_else(|| "That song is not in the local library.".to_string())?;
    let mut theme_query = db
        .prepare("SELECT theme FROM song_themes WHERE song_id=?1 ORDER BY theme COLLATE NOCASE")
        .map_err(db_error)?;
    let themes = theme_query
        .query_map([&song_id], |row| row.get(0))
        .map_err(db_error)?
        .collect::<Result<Vec<String>, _>>()
        .map_err(db_error)?;
    let mut section_query = db
        .prepare("SELECT section_type,label,lyrics FROM song_sections WHERE song_id=?1 ORDER BY position")
        .map_err(db_error)?;
    let sections = section_query
        .query_map([&song_id], |row| {
            Ok(SongSection {
                section_type: row.get(0)?,
                label: row.get(1)?,
                lyrics: row.get(2)?,
            })
        })
        .map_err(db_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(db_error)?;
    Ok(SongDetail {
        id,
        title,
        authors,
        copyright,
        category,
        themes,
        sections,
    })
}

#[tauri::command]
fn save_song(
    app: tauri::AppHandle,
    song_id: Option<String>,
    title: String,
    authors: String,
    copyright: String,
    category: String,
    sections: Vec<SongSectionInput>,
) -> Result<SongDetail, String> {
    let mut db = open_library(&app)?;
    let tx = db.transaction().map_err(db_error)?;
    let id = save_song_record(&tx, song_id, &title, &authors, &copyright, &category, sections)?;
    tx.commit().map_err(db_error)?;
    get_song_detail(app, id)
}

fn save_song_record(
    tx: &Transaction<'_>,
    song_id: Option<String>,
    title: &str,
    authors: &str,
    copyright: &str,
    category: &str,
    sections: Vec<SongSectionInput>,
) -> Result<String, String> {
    let title = title.trim();
    if title.is_empty() || title.chars().count() > 160 {
        return Err("Enter a title of 1 to 160 characters.".into());
    }
    let category = category.trim().to_ascii_lowercase();
    if category != "song" && category != "hymn" {
        return Err("Choose whether this entry is a song or hymn.".into());
    }
    if sections.len() > 100 {
        return Err("A song can contain up to 100 lyric sections.".into());
    }
    let sections = sections.into_iter().filter_map(|section| {
        let lyrics = section.lyrics.trim().to_string();
        (!lyrics.is_empty()).then_some(SongSectionInput {
            section_type: section.section_type,
            label: section.label.trim().to_string(),
            lyrics,
        })
    }).collect::<Vec<_>>();
    if sections.is_empty() {
        return Err("Add at least one non-empty verse, chorus or other lyric section.".into());
    }
    for section in &sections {
        if section.lyrics.chars().count() > 4_000 {
            return Err("Each lyric section must be 4,000 characters or fewer.".into());
        }
        if !["verse", "chorus", "bridge", "pre-chorus", "intro", "outro", "section"].contains(&section.section_type.as_str()) {
            return Err("Choose a valid lyric section type.".into());
        }
    }

    let id = if let Some(id) = song_id {
        let changed = tx.execute(
            "UPDATE songs SET title=?1,authors=?2,copyright=?3,category=?4 WHERE id=?5",
            params![title,authors.trim(),copyright.trim(),category,id],
        ).map_err(db_error)?;
        if changed == 0 { return Err("That song is no longer in the library.".into()); }
        id
    } else {
        let id = format!("manual:{}", uuid::Uuid::new_v4());
        tx.execute(
            "INSERT INTO songs(id,title,authors,copyright,category,source_file) VALUES (?1,?2,?3,?4,?5,'manual-entry')",
            params![id,title,authors.trim(),copyright.trim(),category],
        ).map_err(db_error)?;
        id
    };

    let old_count: i64 = tx.query_row("SELECT COUNT(*) FROM song_sections WHERE song_id=?1", [&id], |row| row.get(0)).map_err(db_error)?;
    for (position, section) in sections.iter().enumerate() {
        let label = if section.label.is_empty() {
            if section.section_type == "verse" { format!("Verse {}", position + 1) }
            else { section.section_type.replace('-', " ").to_ascii_uppercase() }
        } else { section.label.clone() };
        tx.execute(
            "INSERT INTO song_sections(song_id,position,section_type,label,lyrics) VALUES (?1,?2,?3,?4,?5) ON CONFLICT(song_id,position) DO UPDATE SET section_type=excluded.section_type,label=excluded.label,lyrics=excluded.lyrics",
            params![id,position as i64,section.section_type,label,section.lyrics],
        ).map_err(db_error)?;
    }
    if old_count > sections.len() as i64 {
        tx.execute("DELETE FROM presentation_items WHERE song_id=?1 AND section_index>=?2", params![id,sections.len() as i64]).map_err(db_error)?;
        tx.execute("DELETE FROM song_sections WHERE song_id=?1 AND position>=?2", params![id,sections.len() as i64]).map_err(db_error)?;
    }
    Ok(id)
}

fn delete_song_records(tx: &Transaction<'_>, song_ids: &[String]) -> Result<usize, String> {
    let mut delete_presentation_items = tx.prepare_cached("DELETE FROM presentation_items WHERE song_id=?1").map_err(db_error)?;
    let mut delete_song = tx.prepare_cached("DELETE FROM songs WHERE id=?1").map_err(db_error)?;
    let mut deleted = 0;
    for song_id in song_ids {
        delete_presentation_items.execute([song_id]).map_err(db_error)?;
        deleted += delete_song.execute([song_id]).map_err(db_error)?;
    }
    Ok(deleted)
}

#[tauri::command]
fn delete_songs(app: tauri::AppHandle, song_ids: Vec<String>) -> Result<usize, String> {
    let mut ids = song_ids.into_iter().map(|id| id.trim().to_string()).filter(|id| !id.is_empty()).collect::<Vec<_>>();
    ids.sort();
    ids.dedup();
    if ids.len() > 1_000 { return Err("Delete up to 1,000 selected songs at a time.".into()); }
    if ids.is_empty() { return Ok(0); }
    let mut db = open_library(&app)?;
    let tx = db.transaction().map_err(db_error)?;
    let deleted = delete_song_records(&tx, &ids)?;
    tx.commit().map_err(db_error)?;
    Ok(deleted)
}

#[cfg(test)]
mod song_library_edit_tests {
    use super::*;

    fn test_database() -> Connection {
        let db = Connection::open_in_memory().unwrap();
        db.execute_batch("PRAGMA foreign_keys=ON;
            CREATE TABLE songs(id TEXT PRIMARY KEY,title TEXT NOT NULL,authors TEXT NOT NULL,copyright TEXT NOT NULL,category TEXT NOT NULL,source_file TEXT NOT NULL);
            CREATE TABLE song_sections(song_id TEXT NOT NULL,position INTEGER NOT NULL,section_type TEXT NOT NULL,label TEXT NOT NULL,lyrics TEXT NOT NULL,PRIMARY KEY(song_id,position),FOREIGN KEY(song_id) REFERENCES songs(id) ON DELETE CASCADE);
            CREATE TABLE presentation_items(song_id TEXT NOT NULL,section_index INTEGER NOT NULL,FOREIGN KEY(song_id,section_index) REFERENCES song_sections(song_id,position));")
            .unwrap();
        db
    }

    fn section(section_type: &str, label: &str, lyrics: &str) -> SongSectionInput {
        SongSectionInput { section_type: section_type.into(), label: label.into(), lyrics: lyrics.into() }
    }

    #[test]
    fn creates_edits_and_removes_song_sections_safely() {
        let mut db = test_database();
        let tx = db.transaction().unwrap();
        let id = save_song_record(&tx, None, "  New Song  ", "Writer", "", "song", vec![
            section("verse", "Verse 1", "First verse"),
            section("chorus", "Chorus", "Sing together"),
        ]).unwrap();
        tx.execute("INSERT INTO presentation_items(song_id,section_index) VALUES (?1,0),(?1,1)", [&id]).unwrap();
        tx.commit().unwrap();

        let tx = db.transaction().unwrap();
        let edited_id = save_song_record(&tx, Some(id.clone()), "Revised Song", "Writer", "2026", "hymn", vec![
            section("verse", "Verse 1", "Updated words"),
        ]).unwrap();
        assert_eq!(edited_id, id);
        tx.commit().unwrap();
        let (title, category, lyrics): (String, String, String) = db.query_row(
            "SELECT s.title,s.category,ss.lyrics FROM songs s JOIN song_sections ss ON ss.song_id=s.id WHERE s.id=?1 AND ss.position=0",
            [&id], |row| Ok((row.get(0)?,row.get(1)?,row.get(2)?)),
        ).unwrap();
        assert_eq!((title.as_str(), category.as_str(), lyrics.as_str()), ("Revised Song", "hymn", "Updated words"));
        let (section_count, item_count): (i64, i64) = db.query_row(
            "SELECT (SELECT COUNT(*) FROM song_sections WHERE song_id=?1),(SELECT COUNT(*) FROM presentation_items WHERE song_id=?1)",
            [&id], |row| Ok((row.get(0)?,row.get(1)?)),
        ).unwrap();
        assert_eq!((section_count, item_count), (1, 1));

        let tx = db.transaction().unwrap();
        assert_eq!(delete_song_records(&tx, &[id.clone(), id.clone()]).unwrap(), 1);
        tx.commit().unwrap();
        let song_count: i64 = db.query_row("SELECT COUNT(*) FROM songs", [], |row| row.get(0)).unwrap();
        assert_eq!(song_count, 0);
    }

    #[test]
    fn rejects_empty_manual_song_without_writing() {
        let mut db = test_database();
        let tx = db.transaction().unwrap();
        assert!(save_song_record(&tx, None, "Empty Song", "", "", "song", Vec::new()).is_err());
        let count: i64 = tx.query_row("SELECT COUNT(*) FROM songs", [], |row| row.get(0)).unwrap();
        assert_eq!(count, 0);
    }
}

#[cfg(test)]
mod presentation_file_tests {
    use super::*;

    #[test]
    fn detects_supported_presentation_file_formats_and_signatures() {
        assert_eq!(presentation_file_type("Week 1.PDF").unwrap().0, "pdf");
        assert_eq!(presentation_file_type("Slides.pptx").unwrap().0, "pptx");
        assert_eq!(presentation_file_type("Service.ppsx").unwrap().0, "ppsx");
        assert_eq!(presentation_file_type("Notes.odp").unwrap().0, "odp");
        assert!(presentation_file_type("Song.txt").is_none());
        assert!(valid_presentation_signature("pdf", b"%PDF-1.7"));
        assert!(valid_presentation_signature("ppt", b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1rest"));
        assert!(valid_presentation_signature("pptx", b"PK\x03\x04archive"));
        assert!(!valid_presentation_signature("pdf", b"PK\x03\x04archive"));
    }

    #[test]
    fn pdf_schema_migration_keeps_saved_show_items_and_adds_pdf_pages() {
        let mut db = Connection::open_in_memory().unwrap();
        db.execute_batch("PRAGMA foreign_keys=ON;
            CREATE TABLE presentations(id INTEGER PRIMARY KEY,title TEXT,created_at TEXT,updated_at TEXT);
            CREATE TABLE bible_verses(translation_id TEXT,book_number INTEGER,chapter_number INTEGER,verse_number INTEGER,PRIMARY KEY(translation_id,book_number,chapter_number,verse_number));
            CREATE TABLE song_sections(song_id TEXT,position INTEGER,PRIMARY KEY(song_id,position));
            CREATE TABLE presentation_items(id INTEGER PRIMARY KEY,presentation_id INTEGER NOT NULL,position INTEGER NOT NULL,content_type TEXT NOT NULL CHECK(content_type IN ('scripture','lyrics','image','video')),source_id TEXT NOT NULL,translation_id TEXT,book_number INTEGER,chapter_number INTEGER,verse_number INTEGER,song_id TEXT,section_index INTEGER,media_id TEXT,title TEXT NOT NULL,subtitle TEXT NOT NULL,reference_text TEXT NOT NULL,body_override TEXT,UNIQUE(presentation_id,position),FOREIGN KEY(presentation_id) REFERENCES presentations(id) ON DELETE CASCADE,FOREIGN KEY(translation_id,book_number,chapter_number,verse_number) REFERENCES bible_verses(translation_id,book_number,chapter_number,verse_number),FOREIGN KEY(song_id,section_index) REFERENCES song_sections(song_id,position));
            INSERT INTO presentations VALUES (1,'Existing show','now','now');
            INSERT INTO song_sections VALUES ('song-1',0);
            INSERT INTO presentation_items VALUES (1,1,0,'lyrics','song:song-1:0',NULL,NULL,NULL,NULL,'song-1',0,NULL,'Existing lyric','Verse 1','Writer','Custom text');")
            .unwrap();
        let tx = db.transaction().unwrap();
        upgrade_presentation_pdf_schema(&tx).unwrap();
        tx.commit().unwrap();

        let (title, body): (String, Option<String>) = db.query_row("SELECT title,body_override FROM presentation_items WHERE id=1", [], |row| Ok((row.get(0)?,row.get(1)?))).unwrap();
        assert_eq!((title.as_str(), body.as_deref()), ("Existing lyric", Some("Custom text")));
        db.execute("INSERT INTO presentation_files(id,filename,file_type,mime_type,local_path,file_size,page_count,created_at) VALUES ('pdf-1','Slides.pdf','pdf','application/pdf','/slides.pdf',100,2,'now')", []).unwrap();
        db.execute("INSERT INTO presentation_items(presentation_id,position,content_type,source_id,presentation_file_id,document_page,title,subtitle,reference_text) VALUES (1,1,'pdf','presentation-file:pdf-1:1','pdf-1',1,'Slides.pdf','Page 1','Slides.pdf')", []).unwrap();
        let page: i64 = db.query_row("SELECT document_page FROM presentation_items WHERE content_type='pdf'", [], |row| row.get(0)).unwrap();
        assert_eq!(page, 1);
        db.execute("INSERT INTO presentation_files(id,filename,file_type,mime_type,local_path,file_size,page_count,created_at) VALUES ('pptx-1','Slides.pptx','pptx','application/vnd.openxmlformats-officedocument.presentationml.presentation','/slides.pptx',100,3,'now')", []).unwrap();
        let tx = db.transaction().unwrap();
        upgrade_presentation_powerpoint_schema(&tx).unwrap();
        tx.commit().unwrap();
        db.execute("INSERT INTO presentation_items(presentation_id,position,content_type,source_id,presentation_file_id,document_page,title,subtitle,reference_text) VALUES (1,2,'powerpoint','presentation-file:pptx-1:2','pptx-1',2,'Slides.pptx','Slide 2','Slides.pptx')", []).unwrap();
        let ppt_page: i64 = db.query_row("SELECT document_page FROM presentation_items WHERE content_type='powerpoint'", [], |row| row.get(0)).unwrap();
        let version: i64 = db.query_row("PRAGMA user_version", [], |row| row.get(0)).unwrap();
        assert_eq!((ppt_page, version), (2, 8));
    }
}

fn song_summary_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<SongSummary> {
    Ok(SongSummary {
        id: row.get(0)?,
        title: row.get(1)?,
        authors: row.get(2)?,
        category: row.get(3)?,
    })
}

const MAX_PRESENTATION_FILE_BYTES: usize = 500 * 1024 * 1024;

fn presentation_file_type(filename: &str) -> Option<(&'static str, &'static str)> {
    match PathBuf::from(filename).extension()?.to_str()?.to_ascii_lowercase().as_str() {
        "pdf" => Some(("pdf", "application/pdf")),
        "ppt" => Some(("ppt", "application/vnd.ms-powerpoint")),
        "pptx" => Some(("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation")),
        "pps" => Some(("pps", "application/vnd.ms-powerpoint")),
        "ppsx" => Some(("ppsx", "application/vnd.openxmlformats-officedocument.presentationml.slideshow")),
        "odp" => Some(("odp", "application/vnd.oasis.opendocument.presentation")),
        _ => None,
    }
}

fn valid_presentation_signature(file_type: &str, bytes: &[u8]) -> bool {
    match file_type {
        "pdf" => bytes.get(..1024.min(bytes.len())).is_some_and(|header| header.windows(5).any(|part| part == b"%PDF-")),
        "ppt" | "pps" => bytes.starts_with(b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1"),
        "pptx" | "ppsx" | "odp" => bytes.starts_with(b"PK\x03\x04"),
        _ => false,
    }
}

#[tauri::command(async)]
fn import_presentation_file(app: tauri::AppHandle, request: Request<'_>) -> Result<PresentationFileSummary, String> {
    let bytes = match request.body() {
        InvokeBody::Raw(bytes) => bytes.as_slice(),
        InvokeBody::Json(_) => return Err("Choose the presentation file again; its binary data was not received.".into()),
    };
    if bytes.is_empty() || bytes.len() > MAX_PRESENTATION_FILE_BYTES {
        return Err("Choose a non-empty presentation file smaller than 500 MB.".into());
    }
    let encoded_name = request.headers().get("x-bibleshow-filename")
        .and_then(|value| value.to_str().ok())
        .ok_or("The presentation filename is missing or invalid.")?;
    let input_name = percent_decode_str(encoded_name).decode_utf8()
        .map_err(|_| "The presentation filename is not valid UTF-8.")?.into_owned();
    if input_name.is_empty() || input_name.len() > 510 || input_name.chars().any(|character| character.is_control() || character == '/' || character == '\\') {
        return Err("The selected presentation has an invalid filename.".into());
    }
    let (file_type, mime_type) = presentation_file_type(&input_name)
        .ok_or("Choose a PDF, PowerPoint, PowerPoint slideshow, or OpenDocument presentation file.")?;
    if !valid_presentation_signature(file_type, bytes) {
        return Err(format!("The file contents do not match the .{file_type} format."));
    }
    let page_count = if file_type == "pdf" {
        request.headers().get("x-bibleshow-page-count")
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.parse::<usize>().ok())
            .filter(|count| (1..=10_000).contains(count))
            .ok_or("BibleShow could not read the PDF page count.")?
    } else { 0 };

    let digest = Sha256::digest(bytes).iter().map(|byte| format!("{byte:02x}")).collect::<String>();
    let original_name = PathBuf::from(&input_name).file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();
    let stem = PathBuf::from(&original_name).file_stem().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();
    let safe_stem = stem.chars().filter(|character| character.is_ascii_alphanumeric() || *character == '-' || *character == '_' || *character == ' ').take(100).collect::<String>().trim().to_string();
    let filename = format!("{}.{}", if safe_stem.is_empty() { format!("Presentation-{}", &digest[..8]) } else { safe_stem }, file_type);
    let app_data = app.path().app_data_dir().map_err(|error| format!("Could not locate BibleShow's presentation folder: {error}"))?;
    let presentation_dir = app_data.join("media");
    fs::create_dir_all(&presentation_dir).map_err(|error| format!("Could not create BibleShow's presentation folder: {error}"))?;
    let local_path = presentation_dir.join(format!("presentation-{digest}.{file_type}"));
    if local_path.metadata().map(|metadata| metadata.len()).unwrap_or_default() != bytes.len() as u64 {
        let temporary_path = presentation_dir.join(format!(".presentation-{digest}.tmp-{}", uuid::Uuid::new_v4()));
        if let Err(error) = fs::write(&temporary_path, bytes) {
            let _ = fs::remove_file(&temporary_path);
            return Err(format!("Could not store this presentation in BibleShow: {error}"));
        }
        if local_path.exists() { fs::remove_file(&local_path).map_err(|error| format!("Could not replace an incomplete presentation file: {error}"))?; }
        if let Err(error) = fs::rename(&temporary_path, &local_path) {
            let _ = fs::remove_file(&temporary_path);
            return Err(format!("Could not finish storing this presentation: {error}"));
        }
    }
    let local_path_string = local_path.to_string_lossy().into_owned();
    let db = open_library(&app)?;
    db.execute("INSERT OR IGNORE INTO presentation_files(id,filename,file_type,mime_type,local_path,file_size,page_count,created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,datetime('now'))", params![digest,filename,file_type,mime_type,local_path_string,bytes.len() as i64,page_count as i64]).map_err(db_error)?;
    db.query_row("SELECT id,filename,file_type,mime_type,local_path,file_size,page_count,created_at FROM presentation_files WHERE id=?1", [&digest], presentation_file_from_row).map_err(db_error)
}

#[tauri::command]
fn get_presentation_files(app: tauri::AppHandle) -> Result<Vec<PresentationFileSummary>, String> {
    if !database_path(&app)?.exists() { return Ok(Vec::new()); }
    let db = open_library(&app)?;
    let mut query = db.prepare("SELECT id,filename,file_type,mime_type,local_path,file_size,page_count,created_at FROM presentation_files ORDER BY filename COLLATE NOCASE").map_err(db_error)?;
    query.query_map([], presentation_file_from_row).map_err(db_error)?.collect::<Result<Vec<_>, _>>().map_err(db_error)
}

fn presentation_file_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<PresentationFileSummary> {
    Ok(PresentationFileSummary { id: row.get(0)?, filename: row.get(1)?, file_type: row.get(2)?, mime_type: row.get(3)?, local_path: row.get(4)?, file_size: row.get::<_, i64>(5)? as u64, page_count: row.get::<_, i64>(6)? as usize, created_at: row.get(7)? })
}

#[tauri::command]
fn delete_presentation_file(app: tauri::AppHandle, file_id: String) -> Result<(), String> {
    let mut db = open_library(&app)?;
    let tx = db.transaction().map_err(db_error)?;
    let path = tx.query_row("SELECT local_path FROM presentation_files WHERE id=?1", [&file_id], |row| row.get::<_, String>(0)).optional().map_err(db_error)?
        .ok_or_else(|| "That presentation file is no longer in the library.".to_string())?;
    tx.execute("DELETE FROM presentation_files WHERE id=?1", [&file_id]).map_err(db_error)?;
    tx.commit().map_err(db_error)?;
    if let Err(error) = fs::remove_file(path) { if error.kind() != std::io::ErrorKind::NotFound { return Err(format!("The library entry was removed, but its file could not be deleted: {error}")); } }
    Ok(())
}

fn powerpoint_preview_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not locate BibleShow's presentation cache: {error}"))?
        .join("media");
    fs::create_dir_all(&root)
        .map_err(|error| format!("Could not prepare BibleShow's presentation cache: {error}"))?;
    Ok(root)
}

#[tauri::command]
async fn start_powerpoint_presentation(
    app: tauri::AppHandle,
    file_id: String,
) -> Result<powerpoint::PowerPointSessionInfo, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let db = open_library(&app)?;
        let (file_type, path): (String, String) = db
            .query_row(
                "SELECT file_type,local_path FROM presentation_files WHERE id=?1",
                [&file_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()
            .map_err(db_error)?
            .ok_or_else(|| "That presentation file is no longer in the library.".to_string())?;
        if !matches!(file_type.as_str(), "ppt" | "pptx" | "pps" | "ppsx") {
            return Err("Choose a PowerPoint presentation or slideshow file.".into());
        }
        let file_path = PathBuf::from(path);
        if !file_path.is_file() {
            return Err("The PowerPoint file could not be found on this device.".into());
        }
        let preview_root = powerpoint_preview_root(&app)?;
        let state = app.state::<powerpoint::PowerPointState>();
        let session = powerpoint::start(&app, &state, file_id.clone(), file_path, preview_root)?;
        db.execute(
            "UPDATE presentation_files SET page_count=?1 WHERE id=?2",
            params![session.slide_count as i64, file_id],
        )
        .map_err(db_error)?;
        Ok(session)
    })
    .await
    .map_err(|error| format!("PowerPoint startup task failed: {error}"))?
}

#[tauri::command]
fn get_active_powerpoint_session(
    state: tauri::State<'_, powerpoint::PowerPointState>,
) -> Result<Option<powerpoint::PowerPointSessionInfo>, String> {
    state.active_session()
}

#[tauri::command]
async fn export_powerpoint_slide_preview(
    app: tauri::AppHandle,
    request: PowerPointSlideRequest,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let db = open_library(&app)?;
        let file_type: String = db
            .query_row(
                "SELECT file_type FROM presentation_files WHERE id=?1",
                [&request.file_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(db_error)?
            .ok_or_else(|| "That presentation file is no longer in the library.".to_string())?;
        if !matches!(file_type.as_str(), "ppt" | "pptx" | "pps" | "ppsx") {
            return Err("Choose a PowerPoint presentation or slideshow file.".into());
        }
        let root = powerpoint_preview_root(&app)?;
        let state = app.state::<powerpoint::PowerPointState>();
        powerpoint::export_slide_preview(&state, &request.file_id, request.page, &root)
    })
    .await
    .map_err(|error| format!("PowerPoint preview task failed: {error}"))?
}

#[tauri::command]
async fn navigate_powerpoint_slide(
    app: tauri::AppHandle,
    request: PowerPointSlideRequest,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<powerpoint::PowerPointState>();
        powerpoint::navigate(&state, &request.file_id, request.page)
    })
    .await
    .map_err(|error| format!("PowerPoint navigation task failed: {error}"))?
}

#[tauri::command]
async fn stop_powerpoint_presentation(app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<powerpoint::PowerPointState>();
        powerpoint::stop(&state)
    })
    .await
    .map_err(|error| format!("PowerPoint shutdown task failed: {error}"))?
}

#[tauri::command]
fn open_external_presentation_file(app: tauri::AppHandle, file_id: String) -> Result<(), String> {
    let db = open_library(&app)?;
    let (file_type, path): (String, String) = db.query_row("SELECT file_type,local_path FROM presentation_files WHERE id=?1", [&file_id], |row| Ok((row.get(0)?,row.get(1)?))).optional().map_err(db_error)?
        .ok_or_else(|| "That presentation file is no longer in the library.".to_string())?;
    if file_type == "pdf" { return Err("PDF files open inside BibleShow.".into()); }
    if !PathBuf::from(&path).is_file() { return Err("The presentation file could not be found on this device.".into()); }
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::ffi::OsStrExt;
        use std::ffi::OsStr;
        #[link(name = "shell32")]
        unsafe extern "system" { fn ShellExecuteW(hwnd: *mut std::ffi::c_void, operation: *const u16, file: *const u16, parameters: *const u16, directory: *const u16, show_command: i32) -> *mut std::ffi::c_void; }
        let operation: Vec<u16> = OsStr::new("open").encode_wide().chain(Some(0)).collect();
        let file: Vec<u16> = PathBuf::from(path).as_os_str().encode_wide().chain(Some(0)).collect();
        // SAFETY: both pointers are NUL-terminated UTF-16 strings that remain alive for the call.
        let result = unsafe { ShellExecuteW(std::ptr::null_mut(), operation.as_ptr(), file.as_ptr(), std::ptr::null(), std::ptr::null(), 1) } as isize;
        if result <= 32 { return Err(format!("Windows could not open this .{file_type} file with its associated app.")); }
    }
    #[cfg(target_os = "macos")]
    std::process::Command::new("open").arg(&path).spawn().map_err(|error| format!("Could not open the presentation: {error}"))?;
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open").arg(&path).spawn().map_err(|error| format!("Could not open the presentation: {error}"))?;
    Ok(())
}

#[tauri::command]
fn list_presentations(app: tauri::AppHandle) -> Result<Vec<PresentationSummary>, String> {
    let path = database_path(&app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let db = open_library(&app)?;
    let mut query = db.prepare("SELECT p.id,p.title,p.updated_at,COUNT(i.id) FROM presentations p LEFT JOIN presentation_items i ON i.presentation_id=p.id GROUP BY p.id ORDER BY p.updated_at DESC,p.id DESC").map_err(db_error)?;
    let rows = query.query_map([], |row| {
        Ok(PresentationSummary {
            id: row.get(0)?,
            title: row.get(1)?,
            updated_at: row.get(2)?,
            slide_count: row.get::<_, i64>(3)? as usize,
        })
    }).map_err(db_error)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(db_error)
}

#[tauri::command]
fn save_presentation(
    app: tauri::AppHandle,
    presentation_id: Option<i64>,
    title: String,
    slides: Vec<PresentationSlideInput>,
) -> Result<i64, String> {
    let title = title.trim();
    if title.is_empty() || title.chars().count() > 160 {
        return Err("Give this presentation a title of 1 to 160 characters.".into());
    }
    if slides.len() > 500 {
        return Err("A presentation can contain up to 500 pages.".into());
    }
    if slides.iter().any(|slide| slide.body_override.as_ref().is_some_and(|body| body.chars().count() > 4000)) {
        return Err("Edited slide text must be 4,000 characters or fewer.".into());
    }
    let mut db = open_library(&app)?;
    let tx = db.transaction().map_err(db_error)?;
    let id = if let Some(id) = presentation_id {
        let changed = tx.execute("UPDATE presentations SET title=?1,updated_at=datetime('now') WHERE id=?2", params![title,id]).map_err(db_error)?;
        if changed == 0 { return Err("That saved presentation could not be found.".into()); }
        tx.execute("DELETE FROM presentation_items WHERE presentation_id=?1", [id]).map_err(db_error)?;
        id
    } else {
        tx.execute("INSERT INTO presentations(title,created_at,updated_at) VALUES (?1,datetime('now'),datetime('now'))", [title]).map_err(db_error)?;
        tx.last_insert_rowid()
    };
    for (position, slide) in slides.iter().enumerate() {
        validate_presentation_slide(&tx, slide)?;
        tx.execute("INSERT INTO presentation_items(presentation_id,position,content_type,source_id,translation_id,book_number,chapter_number,verse_number,song_id,section_index,media_id,presentation_file_id,document_page,title,subtitle,reference_text,body_override) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)", params![id,position as i64,slide.kind,slide.source_id,if slide.kind=="scripture" {Some(slide.translation_id.as_deref().unwrap_or("KJV"))} else {None},slide.book_number,slide.chapter_number,slide.verse_number,slide.song_id,slide.section_index,slide.media_id,slide.presentation_file_id,slide.document_page,slide.title,slide.subtitle,slide.reference,slide.body_override]).map_err(db_error)?;
    }
    tx.commit().map_err(db_error)?;
    Ok(id)
}

fn validate_presentation_slide(tx: &Transaction<'_>, slide: &PresentationSlideInput) -> Result<(), String> {
    match slide.kind.as_str() {
        "scripture" => {
            let (book, chapter, verse) = (slide.book_number.ok_or("A Scripture slide is missing its book number.")?, slide.chapter_number.ok_or("A Scripture slide is missing its chapter number.")?, slide.verse_number.ok_or("A Scripture slide is missing its verse number.")?);
            let translation = slide.translation_id.as_deref().unwrap_or("KJV");
            let exists: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM bible_verses WHERE translation_id=?1 AND book_number=?2 AND chapter_number=?3 AND verse_number=?4)", params![translation,book,chapter,verse], |row| row.get(0)).map_err(db_error)?;
            if !exists { return Err("A Scripture page refers to a verse that is not installed.".into()); }
        }
        "lyrics" => {
            let song_id = slide.song_id.as_deref().ok_or("A lyric page is missing its song reference.")?;
            let section = slide.section_index.ok_or("A lyric page is missing its section number.")?;
            let exists: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM song_sections WHERE song_id=?1 AND position=?2)", params![song_id,section], |row| row.get(0)).map_err(db_error)?;
            if !exists { return Err("A lyric page refers to a section that is not installed.".into()); }
        }
        "image" => {
            let media_id = slide.media_id.as_deref().ok_or("An image slide is missing its media reference.")?;
            let exists: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM media_files WHERE id=?1 AND media_type='image')", [media_id], |row| row.get(0)).map_err(db_error)?;
            if !exists { return Err("An image slide refers to a file that is not in the local media library.".into()); }
        }
        "video" => {
            let media_id = slide.media_id.as_deref().ok_or("A video slide is missing its media reference.")?;
            let exists: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM video_files WHERE id=?1)", [media_id], |row| row.get(0)).map_err(db_error)?;
            if !exists { return Err("A video slide refers to a file that is not in the local media library.".into()); }
        }
        "pdf" => {
            let file_id = slide.presentation_file_id.as_deref().ok_or("A PDF page is missing its file reference.")?;
            let page = slide.document_page.ok_or("A PDF page is missing its page number.")?;
            let exists: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM presentation_files WHERE id=?1 AND file_type='pdf' AND page_count>=?2)", params![file_id,page], |row| row.get(0)).map_err(db_error)?;
            if !exists { return Err("A PDF page refers to a file or page that is no longer installed.".into()); }
        }
        "powerpoint" => {
            let file_id = slide.presentation_file_id.as_deref().ok_or("A PowerPoint slide is missing its file reference.")?;
            let page = slide.document_page.ok_or("A PowerPoint slide is missing its slide number.")?;
            let exists: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM presentation_files WHERE id=?1 AND file_type IN ('ppt','pptx','pps','ppsx') AND page_count>=?2)", params![file_id,page], |row| row.get(0)).map_err(db_error)?;
            if !exists { return Err("A PowerPoint slide refers to a file or slide that is no longer available. Start the presentation in BibleShow first.".into()); }
        }
        _ => return Err("This presentation page type is not supported yet.".into()),
    }
    Ok(())
}

#[tauri::command]
fn load_presentation(app: tauri::AppHandle, media_stream: tauri::State<'_, media_stream::MediaStreamState>, presentation_id: i64) -> Result<SavedPresentation, String> {
    let db = open_library(&app)?;
    let title: String = db.query_row("SELECT title FROM presentations WHERE id=?1", [presentation_id], |row| row.get(0)).optional().map_err(db_error)?.ok_or_else(|| "That saved presentation could not be found.".to_string())?;
    let mut query = db.prepare("SELECT content_type,source_id,translation_id,book_number,chapter_number,verse_number,song_id,section_index,media_id,title,subtitle,reference_text,body_override,presentation_file_id,document_page FROM presentation_items WHERE presentation_id=?1 ORDER BY position").map_err(db_error)?;
    let records = query.query_map([presentation_id], |row| {
        Ok((row.get::<_,String>(0)?,row.get::<_,String>(1)?,row.get::<_,Option<String>>(2)?,row.get::<_,Option<i64>>(3)?,row.get::<_,Option<i64>>(4)?,row.get::<_,Option<i64>>(5)?,row.get::<_,Option<String>>(6)?,row.get::<_,Option<i64>>(7)?,row.get::<_,Option<String>>(8)?,row.get::<_,String>(9)?,row.get::<_,String>(10)?,row.get::<_,String>(11)?,row.get::<_,Option<String>>(12)?,row.get::<_,Option<String>>(13)?,row.get::<_,Option<i64>>(14)?))
    }).map_err(db_error)?.collect::<Result<Vec<_>,_>>().map_err(db_error)?;
    let mut slides = Vec::with_capacity(records.len());
    for (kind, source_id, translation_id, book_number, chapter_number, verse_number, song_id, section_index, media_id, saved_title, subtitle, reference, body_override, presentation_file_id, document_page) in records {
        let (body, media_path, media_url, page_count) = if kind == "scripture" {
            let (translation, book, chapter, verse) = (translation_id.as_deref().unwrap_or("KJV"),book_number.ok_or("A saved Scripture page is missing its book.")?,chapter_number.ok_or("A saved Scripture page is missing its chapter.")?,verse_number.ok_or("A saved Scripture page is missing its verse.")?);
            (db.query_row("SELECT text FROM bible_verses WHERE translation_id=?1 AND book_number=?2 AND chapter_number=?3 AND verse_number=?4", params![translation,book,chapter,verse], |row| row.get(0)).optional().map_err(db_error)?.ok_or_else(|| format!("The verse for {saved_title} is no longer installed."))?, None, None, None)
        } else if kind == "lyrics" {
            let song = song_id.as_deref().ok_or("A saved lyric page is missing its song.")?;
            let section = section_index.ok_or("A saved lyric page is missing its section.")?;
            (db.query_row("SELECT lyrics FROM song_sections WHERE song_id=?1 AND position=?2", params![song,section], |row| row.get(0)).optional().map_err(db_error)?.ok_or_else(|| format!("The lyrics for {saved_title} are no longer installed."))?, None, None, None)
        } else if kind == "pdf" {
            let file_id = presentation_file_id.as_deref().ok_or("A saved PDF page is missing its file.")?;
            let page = document_page.ok_or("A saved PDF page is missing its page number.")?;
            let (path, count): (String, i64) = db.query_row("SELECT local_path,page_count FROM presentation_files WHERE id=?1 AND file_type='pdf'", [file_id], |row| Ok((row.get(0)?,row.get(1)?))).optional().map_err(db_error)?.ok_or_else(|| format!("The PDF for {saved_title} is no longer installed."))?;
            if page > count { return Err(format!("Page {page} is no longer in {saved_title}.")); }
            (String::new(), Some(path), None, Some(count))
        } else if kind == "powerpoint" {
            let file_id = presentation_file_id.as_deref().ok_or("A saved PowerPoint slide is missing its file.")?;
            let page = document_page.ok_or("A saved PowerPoint slide is missing its slide number.")?;
            let count: i64 = db.query_row("SELECT page_count FROM presentation_files WHERE id=?1 AND file_type IN ('ppt','pptx','pps','ppsx')", [file_id], |row| row.get(0)).optional().map_err(db_error)?.ok_or_else(|| format!("The PowerPoint file for {saved_title} is no longer installed."))?;
            if page > count { return Err(format!("Slide {page} is no longer in {saved_title}.")); }
            let root = powerpoint_preview_root(&app)?;
            let preview_path = powerpoint::preview_file_path(&root, file_id, page as usize);
            (String::new(), Some(preview_path.to_string_lossy().into_owned()), None, Some(count))
        } else {
            let media = media_id.as_deref().ok_or("A saved image or video page is missing its media reference.")?;
            let (path, url) = if kind == "video" {
                let (path, mime_type): (String, String) = db.query_row("SELECT local_path,mime_type FROM video_files WHERE id=?1", [media], |row| Ok((row.get(0)?,row.get(1)?))).optional().map_err(db_error)?.ok_or_else(|| format!("The video for {saved_title} is no longer installed."))?;
                let url = media_stream.url_for(media, PathBuf::from(&path), &mime_type).ok();
                (path, url)
            } else {
                let path = db.query_row("SELECT local_path FROM media_files WHERE id=?1 AND media_type='image'", [media], |row| row.get(0)).optional().map_err(db_error)?.ok_or_else(|| format!("The image for {saved_title} is no longer installed."))?;
                (path, None)
            };
            (String::new(), Some(path), url, None)
        };
        slides.push(SavedPresentationSlide { source_id,title:saved_title,subtitle,reference,kind,body,body_override,book_number,chapter_number,verse_number,translation_id,song_id,section_index,media_id,presentation_file_id,document_page,page_count,media_path,media_url });
    }
    Ok(SavedPresentation { id:presentation_id,title,slides })
}

#[tauri::command]
fn delete_presentation(app: tauri::AppHandle, presentation_id: i64) -> Result<(), String> {
    let db = open_library(&app)?;
    let deleted = db.execute("DELETE FROM presentations WHERE id=?1", [presentation_id]).map_err(db_error)?;
    if deleted == 0 { return Err("That saved presentation could not be found.".into()); }
    Ok(())
}

fn import_kjv(tx: &Transaction<'_>, xml: &str, summary: &mut ImportSummary) -> Result<(), String> {
    let doc = Document::parse(xml).map_err(|_| "The KJV XML is malformed.".to_string())?;
    let root = doc.root_element();
    if root.tag_name().name() != "bible" {
        return Err("The KJV file has an unexpected XML structure.".into());
    }
    tx.execute("INSERT OR REPLACE INTO translations(id,name,language,source_status) VALUES ('KJV','King James Version','en',?1)", [root.attribute("status").unwrap_or("unknown")]).map_err(db_error)?;
    tx.execute("DELETE FROM bible_books WHERE translation_id='KJV'", [])
        .map_err(db_error)?;
    for (i, book) in root
        .descendants()
        .filter(|n| n.has_tag_name("book"))
        .enumerate()
    {
        if i >= KJV_BOOKS.len() {
            return Err("The KJV file contains more than 66 books.".into());
        }
        let book_no: usize = book
            .attribute("number")
            .ok_or("A KJV book is missing its number.")?
            .parse()
            .map_err(|_| "A KJV book number is invalid.")?;
        if book_no != i + 1 {
            return Err("The KJV books are not in canonical order.".into());
        }
        tx.execute(
            "INSERT INTO bible_books(translation_id,book_number,name) VALUES ('KJV',?1,?2)",
            params![book_no as i64, KJV_BOOKS[i]],
        )
        .map_err(db_error)?;
        summary.books += 1;
        for chapter in book.children().filter(|n| n.has_tag_name("chapter")) {
            let chapter_no: i64 = parse_number(chapter, "number")?;
            tx.execute("INSERT INTO bible_chapters(translation_id,book_number,chapter_number) VALUES ('KJV',?1,?2)", params![book_no as i64,chapter_no]).map_err(db_error)?;
            summary.chapters += 1;
            for verse in chapter.children().filter(|n| n.has_tag_name("verse")) {
                let verse_no: i64 = parse_number(verse, "number")?;
                let text = verse.text().unwrap_or("").trim();
                if text.is_empty() {
                    continue;
                }
                tx.execute("INSERT INTO bible_verses(translation_id,book_number,chapter_number,verse_number,text) VALUES ('KJV',?1,?2,?3,?4)", params![book_no as i64,chapter_no,verse_no,text]).map_err(db_error)?;
                summary.verses += 1;
            }
        }
    }
    if summary.books != 66 || summary.verses == 0 {
        return Err("The KJV file appears incomplete.".into());
    }
    Ok(())
}

fn parse_number(node: Node<'_, '_>, key: &str) -> Result<i64, String> {
    node.attribute(key)
        .ok_or_else(|| format!("A Bible {key} is missing."))?
        .parse()
        .map_err(|_| format!("A Bible {key} is invalid."))
}

fn parse_song(
    xml: &str,
) -> Result<
    (
        String,
        Vec<String>,
        String,
        Vec<String>,
        Vec<(String, String, String)>,
    ),
    String,
> {
    let doc = Document::parse(xml).map_err(|_| "malformed lyrics XML".to_string())?;
    let root = doc.root_element();
    if root.tag_name().name() != "song" {
        return Err("unexpected lyrics XML root".into());
    }
    let prop = root
        .children()
        .find(|n| n.tag_name().name() == "properties")
        .ok_or("missing song metadata")?;
    let collect = |container: &str, item: &str| -> Vec<String> {
        prop.descendants()
            .filter(|n| {
                n.tag_name().name() == item
                    && n.parent().is_some_and(|p| p.tag_name().name() == container)
            })
            .filter_map(|n| n.text())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(str::to_string)
            .collect()
    };
    let title = collect("titles", "title")
        .into_iter()
        .next()
        .ok_or("missing title")?;
    let authors = collect("authors", "author");
    let copyright = prop
        .descendants()
        .find(|n| n.tag_name().name() == "copyright")
        .and_then(|n| n.text())
        .unwrap_or("")
        .trim()
        .to_string();
    let themes = collect("themes", "theme");
    let lyrics = root
        .children()
        .find(|n| n.tag_name().name() == "lyrics")
        .ok_or("missing lyrics")?;
    let mut sections = Vec::new();
    for verse in lyrics.children().filter(|n| n.tag_name().name() == "verse") {
        let name = verse.attribute("name").unwrap_or("section");
        let section_type = match name.chars().next().unwrap_or('v').to_ascii_lowercase() {
            'v' => "verse",
            'c' => "chorus",
            'b' => "bridge",
            'p' => "pre-chorus",
            'i' => "intro",
            'o' => "outro",
            _ => "section",
        };
        let label = name.to_string();
        let lines_node = verse.children().find(|n| n.tag_name().name() == "lines");
        let mut lines = Vec::new();
        if let Some(node) = lines_node {
            collect_line_nodes(node, &mut lines);
        }
        let text = lines.join("").trim().to_string();
        if !text.is_empty() {
            sections.push((section_type.to_string(), label, text));
        }
    }
    Ok((title, authors, copyright, themes, sections))
}

fn collect_line_nodes(node: Node<'_, '_>, lines: &mut Vec<String>) {
    for child in node.children() {
        if child.is_text() {
            if let Some(text) = child.text() {
                let text = text.trim();
                if !text.is_empty() {
                    lines.push(text.to_string());
                }
            }
        } else if child.is_element() && child.tag_name().name() == "br" {
            lines.push("\n".into());
        } else if child.is_element() {
            collect_line_nodes(child, lines);
        }
    }
}

fn create_schema(tx: &Transaction<'_>) -> Result<(), String> {
    tx.execute_batch("CREATE TABLE IF NOT EXISTS translations(id TEXT PRIMARY KEY,name TEXT NOT NULL,language TEXT NOT NULL,source_status TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS bible_books(translation_id TEXT NOT NULL,book_number INTEGER NOT NULL,name TEXT NOT NULL,PRIMARY KEY(translation_id,book_number),FOREIGN KEY(translation_id) REFERENCES translations(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS bible_chapters(translation_id TEXT NOT NULL,book_number INTEGER NOT NULL,chapter_number INTEGER NOT NULL,PRIMARY KEY(translation_id,book_number,chapter_number),FOREIGN KEY(translation_id,book_number) REFERENCES bible_books(translation_id,book_number) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS bible_verses(translation_id TEXT NOT NULL,book_number INTEGER NOT NULL,chapter_number INTEGER NOT NULL,verse_number INTEGER NOT NULL,text TEXT NOT NULL,PRIMARY KEY(translation_id,book_number,chapter_number,verse_number),FOREIGN KEY(translation_id,book_number,chapter_number) REFERENCES bible_chapters(translation_id,book_number,chapter_number) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS songs(id TEXT PRIMARY KEY,title TEXT NOT NULL,authors TEXT NOT NULL,copyright TEXT NOT NULL,category TEXT NOT NULL,source_file TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS song_sections(song_id TEXT NOT NULL,position INTEGER NOT NULL,section_type TEXT NOT NULL,label TEXT NOT NULL,lyrics TEXT NOT NULL,PRIMARY KEY(song_id,position),FOREIGN KEY(song_id) REFERENCES songs(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS song_themes(song_id TEXT NOT NULL,theme TEXT NOT NULL,PRIMARY KEY(song_id,theme),FOREIGN KEY(song_id) REFERENCES songs(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS imports(source_sha256 TEXT PRIMARY KEY,imported_at TEXT NOT NULL);
    PRAGMA user_version=1;")
    .map_err(db_error)
}

fn create_presentation_schema(tx: &Transaction<'_>) -> Result<(), String> {
    tx.execute_batch("CREATE TABLE IF NOT EXISTS presentations(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS presentation_items(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      presentation_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      content_type TEXT NOT NULL CHECK(content_type IN ('scripture','lyrics')),
      source_id TEXT NOT NULL,
      translation_id TEXT,
      book_number INTEGER,
      chapter_number INTEGER,
      verse_number INTEGER,
      song_id TEXT,
      section_index INTEGER,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      reference_text TEXT NOT NULL,
      UNIQUE(presentation_id,position),
      FOREIGN KEY(presentation_id) REFERENCES presentations(id) ON DELETE CASCADE,
      FOREIGN KEY(translation_id,book_number,chapter_number,verse_number) REFERENCES bible_verses(translation_id,book_number,chapter_number,verse_number),
      FOREIGN KEY(song_id,section_index) REFERENCES song_sections(song_id,position),
      CHECK((content_type='scripture' AND translation_id IS NOT NULL AND book_number IS NOT NULL AND chapter_number IS NOT NULL AND verse_number IS NOT NULL AND song_id IS NULL AND section_index IS NULL) OR (content_type='lyrics' AND song_id IS NOT NULL AND section_index IS NOT NULL AND translation_id IS NULL AND book_number IS NULL AND chapter_number IS NULL AND verse_number IS NULL))
    );
    CREATE INDEX IF NOT EXISTS idx_presentation_items_order ON presentation_items(presentation_id,position);
    PRAGMA user_version=2;")
    .map_err(db_error)
}

fn create_media_schema(tx: &Transaction<'_>) -> Result<(), String> {
    tx.execute_batch("CREATE TABLE IF NOT EXISTS media_files(
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      media_type TEXT NOT NULL CHECK(media_type IN ('image')),
      mime_type TEXT NOT NULL,
      local_path TEXT NOT NULL UNIQUE,
      file_size INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    PRAGMA user_version=3;")
    .map_err(db_error)
}

fn upgrade_presentation_media_schema(tx: &Transaction<'_>) -> Result<(), String> {
    tx.execute_batch("ALTER TABLE presentation_items RENAME TO presentation_items_v2;
    CREATE TABLE presentation_items(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      presentation_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      content_type TEXT NOT NULL CHECK(content_type IN ('scripture','lyrics','image')),
      source_id TEXT NOT NULL,
      translation_id TEXT,
      book_number INTEGER,
      chapter_number INTEGER,
      verse_number INTEGER,
      song_id TEXT,
      section_index INTEGER,
      media_id TEXT,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      reference_text TEXT NOT NULL,
      UNIQUE(presentation_id,position),
      FOREIGN KEY(presentation_id) REFERENCES presentations(id) ON DELETE CASCADE,
      FOREIGN KEY(translation_id,book_number,chapter_number,verse_number) REFERENCES bible_verses(translation_id,book_number,chapter_number,verse_number),
      FOREIGN KEY(song_id,section_index) REFERENCES song_sections(song_id,position),
      FOREIGN KEY(media_id) REFERENCES media_files(id) ON DELETE RESTRICT,
      CHECK((content_type='scripture' AND translation_id IS NOT NULL AND book_number IS NOT NULL AND chapter_number IS NOT NULL AND verse_number IS NOT NULL AND song_id IS NULL AND section_index IS NULL AND media_id IS NULL) OR (content_type='lyrics' AND song_id IS NOT NULL AND section_index IS NOT NULL AND translation_id IS NULL AND book_number IS NULL AND chapter_number IS NULL AND verse_number IS NULL AND media_id IS NULL) OR (content_type='image' AND media_id IS NOT NULL AND translation_id IS NULL AND book_number IS NULL AND chapter_number IS NULL AND verse_number IS NULL AND song_id IS NULL AND section_index IS NULL))
    );
    INSERT INTO presentation_items(id,presentation_id,position,content_type,source_id,translation_id,book_number,chapter_number,verse_number,song_id,section_index,media_id,title,subtitle,reference_text)
      SELECT id,presentation_id,position,content_type,source_id,translation_id,book_number,chapter_number,verse_number,song_id,section_index,NULL,title,subtitle,reference_text FROM presentation_items_v2;
    DROP TABLE presentation_items_v2;
    CREATE INDEX IF NOT EXISTS idx_presentation_items_order ON presentation_items(presentation_id,position);
    PRAGMA user_version=4;")
    .map_err(db_error)
}

fn upgrade_presentation_video_schema(tx: &Transaction<'_>) -> Result<(), String> {
    tx.execute_batch("CREATE TABLE IF NOT EXISTS video_files(
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      local_path TEXT NOT NULL UNIQUE,
      file_size INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    ALTER TABLE presentation_items RENAME TO presentation_items_v4;
    CREATE TABLE presentation_items(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      presentation_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      content_type TEXT NOT NULL CHECK(content_type IN ('scripture','lyrics','image','video')),
      source_id TEXT NOT NULL,
      translation_id TEXT,
      book_number INTEGER,
      chapter_number INTEGER,
      verse_number INTEGER,
      song_id TEXT,
      section_index INTEGER,
      media_id TEXT,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      reference_text TEXT NOT NULL,
      UNIQUE(presentation_id,position),
      FOREIGN KEY(presentation_id) REFERENCES presentations(id) ON DELETE CASCADE,
      FOREIGN KEY(translation_id,book_number,chapter_number,verse_number) REFERENCES bible_verses(translation_id,book_number,chapter_number,verse_number),
      FOREIGN KEY(song_id,section_index) REFERENCES song_sections(song_id,position),
      CHECK((content_type='scripture' AND translation_id IS NOT NULL AND book_number IS NOT NULL AND chapter_number IS NOT NULL AND verse_number IS NOT NULL AND song_id IS NULL AND section_index IS NULL AND media_id IS NULL) OR (content_type='lyrics' AND song_id IS NOT NULL AND section_index IS NOT NULL AND translation_id IS NULL AND book_number IS NULL AND chapter_number IS NULL AND verse_number IS NULL AND media_id IS NULL) OR (content_type IN ('image','video') AND media_id IS NOT NULL AND translation_id IS NULL AND book_number IS NULL AND chapter_number IS NULL AND verse_number IS NULL AND song_id IS NULL AND section_index IS NULL))
    );
    INSERT INTO presentation_items(id,presentation_id,position,content_type,source_id,translation_id,book_number,chapter_number,verse_number,song_id,section_index,media_id,title,subtitle,reference_text)
      SELECT id,presentation_id,position,content_type,source_id,translation_id,book_number,chapter_number,verse_number,song_id,section_index,media_id,title,subtitle,reference_text FROM presentation_items_v4;
    DROP TABLE presentation_items_v4;
    CREATE INDEX IF NOT EXISTS idx_presentation_items_order ON presentation_items(presentation_id,position);
    PRAGMA user_version=5;")
    .map_err(db_error)
}

fn ensure_current_schema(db: &mut Connection) -> Result<(), String> {
    db.execute_batch("PRAGMA foreign_keys=ON;").map_err(db_error)?;
    let mut version: i64 = db.query_row("PRAGMA user_version", [], |row| row.get(0)).map_err(db_error)?;
    if version > 8 {
        return Err("This BibleShow library was created by a newer app version. Update BibleShow first.".into());
    }
    if version < 1 {
        let tx = db.transaction().map_err(db_error)?;
        create_schema(&tx)?;
        tx.commit().map_err(db_error)?;
        version = 1;
    }
    if version < 2 {
        let tx = db.transaction().map_err(db_error)?;
        create_presentation_schema(&tx)?;
        tx.commit().map_err(db_error)?;
        version = 2;
    }
    if version < 3 {
        let tx = db.transaction().map_err(db_error)?;
        create_media_schema(&tx)?;
        tx.commit().map_err(db_error)?;
        version = 3;
    }
    if version < 4 {
        let tx = db.transaction().map_err(db_error)?;
        upgrade_presentation_media_schema(&tx)?;
        tx.commit().map_err(db_error)?;
        version = 4;
    }
    if version < 5 {
        let tx = db.transaction().map_err(db_error)?;
        upgrade_presentation_video_schema(&tx)?;
        tx.commit().map_err(db_error)?;
        version = 5;
    }
    if version < 6 {
        let tx = db.transaction().map_err(db_error)?;
        upgrade_presentation_slide_text_schema(&tx)?;
        tx.commit().map_err(db_error)?;
        version = 6;
    }
    if version < 7 {
        let tx = db.transaction().map_err(db_error)?;
        upgrade_presentation_pdf_schema(&tx)?;
        tx.commit().map_err(db_error)?;
    }
    if version < 8 {
        let tx = db.transaction().map_err(db_error)?;
        upgrade_presentation_powerpoint_schema(&tx)?;
        tx.commit().map_err(db_error)?;
    }
    Ok(())
}

fn upgrade_presentation_slide_text_schema(tx: &Transaction<'_>) -> Result<(), String> {
    tx.execute_batch("ALTER TABLE presentation_items ADD COLUMN body_override TEXT; PRAGMA user_version=6;")
        .map_err(db_error)
}

fn upgrade_presentation_pdf_schema(tx: &Transaction<'_>) -> Result<(), String> {
    tx.execute_batch("CREATE TABLE IF NOT EXISTS presentation_files(
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL CHECK(file_type IN ('pdf','ppt','pptx','pps','ppsx','odp')),
      mime_type TEXT NOT NULL,
      local_path TEXT NOT NULL UNIQUE,
      file_size INTEGER NOT NULL,
      page_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    ALTER TABLE presentation_items RENAME TO presentation_items_v6;
    CREATE TABLE presentation_items(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      presentation_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      content_type TEXT NOT NULL CHECK(content_type IN ('scripture','lyrics','image','video','pdf')),
      source_id TEXT NOT NULL,
      translation_id TEXT,
      book_number INTEGER,
      chapter_number INTEGER,
      verse_number INTEGER,
      song_id TEXT,
      section_index INTEGER,
      media_id TEXT,
      presentation_file_id TEXT,
      document_page INTEGER,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      reference_text TEXT NOT NULL,
      body_override TEXT,
      UNIQUE(presentation_id,position),
      FOREIGN KEY(presentation_id) REFERENCES presentations(id) ON DELETE CASCADE,
      FOREIGN KEY(translation_id,book_number,chapter_number,verse_number) REFERENCES bible_verses(translation_id,book_number,chapter_number,verse_number),
      FOREIGN KEY(song_id,section_index) REFERENCES song_sections(song_id,position),
      FOREIGN KEY(presentation_file_id) REFERENCES presentation_files(id) ON DELETE CASCADE,
      CHECK((content_type='scripture' AND translation_id IS NOT NULL AND book_number IS NOT NULL AND chapter_number IS NOT NULL AND verse_number IS NOT NULL AND song_id IS NULL AND section_index IS NULL AND media_id IS NULL AND presentation_file_id IS NULL AND document_page IS NULL) OR
            (content_type='lyrics' AND song_id IS NOT NULL AND section_index IS NOT NULL AND translation_id IS NULL AND book_number IS NULL AND chapter_number IS NULL AND verse_number IS NULL AND media_id IS NULL AND presentation_file_id IS NULL AND document_page IS NULL) OR
            (content_type IN ('image','video') AND media_id IS NOT NULL AND translation_id IS NULL AND book_number IS NULL AND chapter_number IS NULL AND verse_number IS NULL AND song_id IS NULL AND section_index IS NULL AND presentation_file_id IS NULL AND document_page IS NULL) OR
            (content_type='pdf' AND presentation_file_id IS NOT NULL AND document_page > 0 AND translation_id IS NULL AND book_number IS NULL AND chapter_number IS NULL AND verse_number IS NULL AND song_id IS NULL AND section_index IS NULL AND media_id IS NULL))
    );
    INSERT INTO presentation_items(id,presentation_id,position,content_type,source_id,translation_id,book_number,chapter_number,verse_number,song_id,section_index,media_id,title,subtitle,reference_text,body_override)
      SELECT id,presentation_id,position,content_type,source_id,translation_id,book_number,chapter_number,verse_number,song_id,section_index,media_id,title,subtitle,reference_text,body_override FROM presentation_items_v6;
    DROP TABLE presentation_items_v6;
    CREATE INDEX IF NOT EXISTS idx_presentation_items_order ON presentation_items(presentation_id,position);
    PRAGMA user_version=7;")
    .map_err(db_error)
}

fn upgrade_presentation_powerpoint_schema(tx: &Transaction<'_>) -> Result<(), String> {
    tx.execute_batch("ALTER TABLE presentation_items RENAME TO presentation_items_v7;
    CREATE TABLE presentation_items(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      presentation_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      content_type TEXT NOT NULL CHECK(content_type IN ('scripture','lyrics','image','video','pdf','powerpoint')),
      source_id TEXT NOT NULL,
      translation_id TEXT,
      book_number INTEGER,
      chapter_number INTEGER,
      verse_number INTEGER,
      song_id TEXT,
      section_index INTEGER,
      media_id TEXT,
      presentation_file_id TEXT,
      document_page INTEGER,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      reference_text TEXT NOT NULL,
      body_override TEXT,
      UNIQUE(presentation_id,position),
      FOREIGN KEY(presentation_id) REFERENCES presentations(id) ON DELETE CASCADE,
      FOREIGN KEY(translation_id,book_number,chapter_number,verse_number) REFERENCES bible_verses(translation_id,book_number,chapter_number,verse_number),
      FOREIGN KEY(song_id,section_index) REFERENCES song_sections(song_id,position),
      FOREIGN KEY(presentation_file_id) REFERENCES presentation_files(id) ON DELETE CASCADE,
      CHECK((content_type='scripture' AND translation_id IS NOT NULL AND book_number IS NOT NULL AND chapter_number IS NOT NULL AND verse_number IS NOT NULL AND song_id IS NULL AND section_index IS NULL AND media_id IS NULL AND presentation_file_id IS NULL AND document_page IS NULL) OR
            (content_type='lyrics' AND song_id IS NOT NULL AND section_index IS NOT NULL AND translation_id IS NULL AND book_number IS NULL AND chapter_number IS NULL AND verse_number IS NULL AND media_id IS NULL AND presentation_file_id IS NULL AND document_page IS NULL) OR
            (content_type IN ('image','video') AND media_id IS NOT NULL AND translation_id IS NULL AND book_number IS NULL AND chapter_number IS NULL AND verse_number IS NULL AND song_id IS NULL AND section_index IS NULL AND presentation_file_id IS NULL AND document_page IS NULL) OR
            (content_type IN ('pdf','powerpoint') AND presentation_file_id IS NOT NULL AND document_page > 0 AND translation_id IS NULL AND book_number IS NULL AND chapter_number IS NULL AND verse_number IS NULL AND song_id IS NULL AND section_index IS NULL AND media_id IS NULL))
    );
    INSERT INTO presentation_items(id,presentation_id,position,content_type,source_id,translation_id,book_number,chapter_number,verse_number,song_id,section_index,media_id,presentation_file_id,document_page,title,subtitle,reference_text,body_override)
      SELECT id,presentation_id,position,content_type,source_id,translation_id,book_number,chapter_number,verse_number,song_id,section_index,media_id,presentation_file_id,document_page,title,subtitle,reference_text,body_override FROM presentation_items_v7;
    DROP TABLE presentation_items_v7;
    CREATE INDEX IF NOT EXISTS idx_presentation_items_order ON presentation_items(presentation_id,position);
    PRAGMA user_version=8;")
    .map_err(db_error)
}

fn database_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not locate BibleShow's local data folder: {e}"))?;
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Could not create BibleShow's local data folder: {e}"))?;
    Ok(dir.join("bibleshow.sqlite3"))
}
fn open_database(app: &tauri::AppHandle) -> Result<Connection, String> {
    Connection::open(database_path(app)?).map_err(db_error)
}
fn open_library(app: &tauri::AppHandle) -> Result<Connection, String> {
    let mut db = open_database(app)?;
    ensure_current_schema(&mut db)?;
    Ok(db)
}
fn db_error(error: rusqlite::Error) -> String {
    format!("Local library database error: {error}")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            app.manage(live_feed::LiveFeedState::default());
            app.manage(powerpoint::PowerPointState::default());
            app.manage(media_stream::MediaStreamState::start().map_err(std::io::Error::other)?);
            app.manage(speech_recognition::SpeechRecognitionState::default());
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("BibleShow")
                .inner_size(800.0, 600.0)
                .resizable(true)
                .on_permission_request(|window, kind| match kind {
                    PermissionKind::Camera if window.label() == "main" => PermissionResponse::Allow,
                    _ => PermissionResponse::Default,
                })
                .build()?;
            WebviewWindowBuilder::new(app, "audience", WebviewUrl::App("index.html?audience=1".into()))
                .title("BibleShow — Audience Output")
                .inner_size(1280.0, 720.0)
                .min_inner_size(640.0, 360.0)
                .resizable(true)
                .visible(false)
                .on_permission_request(|_, _| PermissionResponse::Deny)
                .build()?;
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            import_initial_content,
            import_bible_resources,
            import_lyrics_resources,
            get_library_summary,
            get_bible_translations,
            get_bible_books,
            get_bible_chapter,
            search_bible_keyword,
            detect_bible_references,
            detect_bible_quotes,
            speech_recognition::list_audio_inputs,
            speech_recognition::start_bible_microphone,
            speech_recognition::stop_bible_microphone,
            import_media_file,
            get_media_files,
            get_available_displays,
            connect_live_feed,
            stop_live_feed,
            set_audience_window_visible,
            get_song_library,
            get_song_detail,
            save_song,
            delete_songs,
            import_presentation_file,
            get_presentation_files,
            delete_presentation_file,
            start_powerpoint_presentation,
            get_active_powerpoint_session,
            export_powerpoint_slide_preview,
            navigate_powerpoint_slide,
            stop_powerpoint_presentation,
            open_external_presentation_file,
            list_presentations,
            save_presentation,
            load_presentation,
            delete_presentation
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
