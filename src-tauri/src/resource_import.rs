use roxmltree::{Document, Node};
use std::collections::BTreeMap;

const BOOK_NAMES: [&str; 66] = [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
    "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah",
    "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah",
    "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum",
    "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts",
    "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians",
    "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
    "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
];

const OSIS_CODES: [&str; 66] = [
    "Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam", "1Kgs", "2Kgs",
    "1Chr", "2Chr", "Ezra", "Neh", "Esth", "Job", "Ps", "Prov", "Eccl", "Song", "Isa", "Jer", "Lam",
    "Ezek", "Dan", "Hos", "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech",
    "Mal", "Matt", "Mark", "Luke", "John", "Acts", "Rom", "1Cor", "2Cor", "Gal", "Eph", "Phil", "Col",
    "1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas", "1Pet", "2Pet", "1John", "2John",
    "3John", "Jude", "Rev",
];

const USFM_CODES: [&str; 66] = [
    "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI", "1CH", "2CH",
    "EZR", "NEH", "EST", "JOB", "PSA", "PRO", "ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS",
    "JOL", "AMO", "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL", "MAT", "MRK", "LUK",
    "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT",
    "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
];

pub struct ParsedBibleBook {
    pub number: i64,
    pub name: String,
    pub chapters: BTreeMap<i64, BTreeMap<i64, String>>,
}

pub struct ParsedSong {
    pub title: String,
    pub authors: String,
    pub copyright: String,
    pub themes: Vec<String>,
    pub category: String,
    pub sections: Vec<(String, String, String)>,
}

#[derive(Default)]
struct BookBuilder {
    name: String,
    chapters: BTreeMap<i64, BTreeMap<i64, String>>,
}

#[derive(Default)]
struct UsxState {
    book: Option<i64>,
    chapter: Option<i64>,
    verse: Option<i64>,
}

pub fn parse_bible_files(files: &[(String, String)]) -> Result<Vec<ParsedBibleBook>, String> {
    if files.is_empty() || files.len() > 300 {
        return Err("Select between 1 and 300 Bible files.".into());
    }
    let mut books: BTreeMap<i64, BookBuilder> = BTreeMap::new();
    for (filename, source) in files {
        let extension = filename.rsplit('.').next().unwrap_or("").to_ascii_lowercase();
        let text = source.trim_start_matches('\u{feff}');
        let parsed = if matches!(extension.as_str(), "usfm" | "sfm") {
            parse_usfm(text)?
        } else if matches!(extension.as_str(), "usx" | "xml" | "osis") {
            parse_bible_xml(text)?
        } else {
            return Err(format!("Unsupported Bible file type: {filename}"));
        };
        for (number, book) in parsed {
            let target = books.entry(number).or_default();
            if !target.chapters.is_empty() {
                return Err(format!("The selected files contain book {} more than once.", book.name));
            }
            target.name = book.name;
            target.chapters = book.chapters;
        }
    }
    if books.is_empty() || books.values().all(|book| book.chapters.values().all(BTreeMap::is_empty)) {
        return Err("No Bible verses were found in the selected files.".into());
    }
    Ok(books.into_iter().map(|(number, book)| ParsedBibleBook {
        number,
        name: if book.name.is_empty() { BOOK_NAMES[number as usize - 1].to_string() } else { book.name },
        chapters: book.chapters,
    }).collect())
}

fn parse_bible_xml(source: &str) -> Result<Vec<(i64, BookBuilder)>, String> {
    let doc = Document::parse(source).map_err(|_| "The selected XML Bible file is malformed.".to_string())?;
    match doc.root_element().tag_name().name().to_ascii_lowercase().as_str() {
        "xmlbible" => parse_zefania(&doc),
        "osis" | "osistxt" => parse_osis(&doc),
        "usx" => parse_usx(&doc),
        _ => Err("The XML is not recognized as USX, OSIS, or Zefania Bible data.".into()),
    }
}

fn parse_zefania(doc: &Document<'_>) -> Result<Vec<(i64, BookBuilder)>, String> {
    let mut books = Vec::new();
    for node in doc.root_element().children().filter(|node| node.has_tag_name("BIBLEBOOK")) {
        let number = node.attribute("bnumber").and_then(|value| value.parse::<i64>().ok())
            .filter(|number| (1..=66).contains(number)).ok_or("A Zefania book has an invalid bnumber.")?;
        let mut book = BookBuilder { name: BOOK_NAMES[number as usize - 1].to_string(), ..Default::default() };
        for chapter_node in node.children().filter(|child| child.has_tag_name("CHAPTER")) {
            let chapter = chapter_node.attribute("cnumber").and_then(|value| value.parse::<i64>().ok())
                .filter(|number| *number > 0).ok_or("A Zefania chapter has an invalid cnumber.")?;
            for verse_node in chapter_node.children().filter(|child| child.has_tag_name("VERS")) {
                let verse = verse_node.attribute("vnumber").and_then(|value| leading_number(value))
                    .filter(|number| *number > 0).ok_or("A Zefania verse has an invalid vnumber.")?;
                let text = xml_text(verse_node).trim().to_string();
                if !text.is_empty() { insert_verse(&mut book, chapter, verse, text)?; }
            }
        }
        books.push((number, book));
    }
    if books.is_empty() { return Err("No Zefania Bible books were found.".into()); }
    Ok(books)
}

fn parse_usx(doc: &Document<'_>) -> Result<Vec<(i64, BookBuilder)>, String> {
    let mut state = UsxState::default();
    let mut books = BTreeMap::new();
    walk_usx(doc.root_element(), &mut state, &mut books)?;
    if books.is_empty() { return Err("No USX Bible books were found.".into()); }
    Ok(books.into_iter().collect())
}

fn walk_usx(node: Node<'_, '_>, state: &mut UsxState, books: &mut BTreeMap<i64, BookBuilder>) -> Result<(), String> {
    if node.is_element() {
        if node.has_tag_name("note") { return Ok(()); }
        if node.has_tag_name("book") {
            if let Some(code) = node.attribute("code") {
                let number = book_number(code).ok_or_else(|| format!("Unknown USX book code: {code}"))?;
                state.book = Some(number);
                books.entry(number).or_insert_with(|| BookBuilder { name: BOOK_NAMES[number as usize - 1].to_string(), ..Default::default() });
            }
        } else if node.has_tag_name("chapter") {
            if node.attribute("eid").is_some() { state.chapter = None; state.verse = None; }
            else if let Some(value) = node.attribute("number") {
                state.chapter = leading_number(value);
                state.verse = None;
                if let Some(book) = state.book.and_then(|number| books.get_mut(&number)) {
                    if let Some(chapter) = state.chapter { book.chapters.entry(chapter).or_default(); }
                }
            }
        } else if node.has_tag_name("verse") {
            state.verse = if node.attribute("eid").is_some() { None } else { node.attribute("number").and_then(leading_number) };
        }
    } else if node.is_text() {
        if let (Some(book_number), Some(chapter), Some(verse)) = (state.book, state.chapter, state.verse) {
            let value = node.text().unwrap_or("");
            if !value.is_empty() {
                let book = books.get_mut(&book_number).ok_or("USX text appears before a book marker.")?;
                append_verse_text(book, chapter, verse, value);
            }
        }
    }
    for child in node.children() { walk_usx(child, state, books)?; }
    Ok(())
}

fn parse_osis(doc: &Document<'_>) -> Result<Vec<(i64, BookBuilder)>, String> {
    let mut books = BTreeMap::new();
    for verse_node in doc.root_element().descendants().filter(|node| node.has_tag_name("verse")) {
        if let Some(reference) = verse_node.attribute("osisID") {
            for item in reference.split_whitespace() {
                let (book_number, chapter, verse) = parse_osis_reference(item)?;
                let book = books.entry(book_number).or_insert_with(|| BookBuilder { name: BOOK_NAMES[book_number as usize - 1].to_string(), ..Default::default() });
                let text = xml_text(verse_node).trim().to_string();
                if !text.is_empty() { insert_verse(book, chapter, verse, text)?; }
            }
        }
    }
    if books.is_empty() { return Err("No OSIS verses with osisID references were found. Milestone-only OSIS is not supported yet.".into()); }
    Ok(books.into_iter().collect())
}

fn parse_osis_reference(value: &str) -> Result<(i64, i64, i64), String> {
    let reference = value.split('-').next().unwrap_or(value);
    let mut parts = reference.split('.');
    let book = parts.next().and_then(book_number).ok_or_else(|| format!("Unknown OSIS book in reference: {value}"))?;
    let chapter = parts.next().and_then(leading_number).ok_or_else(|| format!("Invalid OSIS chapter reference: {value}"))?;
    let verse = parts.next().and_then(leading_number).ok_or_else(|| format!("Invalid OSIS verse reference: {value}"))?;
    Ok((book, chapter, verse))
}

fn parse_usfm(source: &str) -> Result<Vec<(i64, BookBuilder)>, String> {
    let mut current_book = None;
    let mut current_chapter = None;
    let mut current_verse = None;
    let mut books: BTreeMap<i64, BookBuilder> = BTreeMap::new();
    for raw_line in source.lines() {
        let line = raw_line.trim_start();
        if let Some(value) = line.strip_prefix("\\id ") {
            let code = value.split_whitespace().next().unwrap_or("");
            current_book = book_number(code).or_else(|| book_number_from_filename(code));
            let number = current_book.ok_or_else(|| format!("Unknown USFM book code in \\id: {code}"))?;
            books.entry(number).or_insert_with(|| BookBuilder { name: BOOK_NAMES[number as usize - 1].to_string(), ..Default::default() });
            current_chapter = None;
            current_verse = None;
        } else if let Some(value) = line.strip_prefix("\\c ") {
            current_chapter = value.split_whitespace().next().and_then(leading_number);
            current_verse = None;
            if let (Some(book), Some(chapter)) = (current_book, current_chapter) {
                books.entry(book).or_default().chapters.entry(chapter).or_default();
            }
        } else if let Some(value) = line.strip_prefix("\\v ") {
            let mut fields = value.splitn(2, char::is_whitespace);
            let marker = fields.next().unwrap_or("");
            current_verse = leading_number(marker);
            if let (Some(book_number), Some(chapter), Some(verse)) = (current_book, current_chapter, current_verse) {
                let text = fields.next().unwrap_or("");
                let clean = clean_usfm(text);
                if !clean.trim().is_empty() { append_verse_text(books.get_mut(&book_number).ok_or("USFM verse appears before \\id.")?, chapter, verse, &clean); }
            }
        } else if let (Some(book_number), Some(chapter), Some(verse)) = (current_book, current_chapter, current_verse) {
            let (marker, body) = line.strip_prefix('\\').map(split_usfm_marker).unwrap_or(("", line));
            if !is_usfm_heading(marker) {
                let clean = clean_usfm(body);
                if !clean.trim().is_empty() { append_verse_text(books.get_mut(&book_number).ok_or("USFM text appears before \\id.")?, chapter, verse, &clean); }
            }
        }
    }
    if books.is_empty() { return Err("No USFM book markers or verses were found.".into()); }
    Ok(books.into_iter().collect())
}

fn split_usfm_marker(line: &str) -> (&str, &str) {
    let mut end = 0;
    for (index, ch) in line.char_indices() {
        if ch.is_ascii_alphanumeric() || ch == '+' || ch == '*' { end = index + ch.len_utf8(); } else { break; }
    }
    (line.get(..end).unwrap_or(""), line.get(end..).unwrap_or("").trim_start())
}

fn is_usfm_heading(marker: &str) -> bool {
    let marker = marker.trim_start_matches('+').trim_end_matches('*');
    ["s", "sr", "r", "d", "sp", "ms", "mr", "mt", "mte", "cl", "cp", "h", "toc", "rem", "ide", "usfm", "periph"]
        .iter().any(|prefix| marker.starts_with(prefix))
}

fn clean_usfm(value: &str) -> String {
    let chars: Vec<char> = value.chars().collect();
    let mut result = String::new();
    let mut index = 0;
    while index < chars.len() {
        if chars[index] != '\\' { result.push(chars[index]); index += 1; continue; }
        index += 1;
        let start = index;
        while index < chars.len() && (chars[index].is_ascii_alphanumeric() || chars[index] == '+' || chars[index] == '*') { index += 1; }
        let marker: String = chars[start..index].iter().collect();
        let marker = marker.trim_start_matches('+').trim_end_matches('*');
        if marker == "f" || marker == "x" || marker == "fe" {
            let closing = format!("\\{marker}*");
            while index < chars.len() {
                let tail: String = chars[index..].iter().take(closing.chars().count()).collect();
                if tail == closing { index += closing.chars().count(); break; }
                index += 1;
            }
        } else if marker == "va" || marker == "vp" {
            while index < chars.len() && chars[index].is_whitespace() { index += 1; }
            while index < chars.len() && !chars[index].is_whitespace() { index += 1; }
        }
    }
    result
}

fn book_number(value: &str) -> Option<i64> {
    let normalized = normalize_book(value);
    for index in 0..66 {
        if normalized == normalize_book(BOOK_NAMES[index])
            || normalized == normalize_book(OSIS_CODES[index])
            || normalized == normalize_book(USFM_CODES[index])
        { return Some(index as i64 + 1); }
    }
    let aliases: &[(usize, &[&str])] = &[
        (18, &["ps", "psalm"]), (21, &["songofsongs", "canticles", "sos"]), (57, &["philemon", "phlm"]),
        (65, &["revelations", "apocalypse"]),
    ];
    aliases.iter().find(|(_, names)| names.iter().any(|name| normalize_book(name) == normalized)).map(|(index, _)| *index as i64 + 1)
}

fn book_number_from_filename(value: &str) -> Option<i64> {
    book_number(value.trim_end_matches(".usfm").trim_end_matches(".sfm"))
}

fn normalize_book(value: &str) -> String { value.chars().filter(|ch| ch.is_ascii_alphanumeric()).flat_map(char::to_lowercase).collect() }

fn leading_number(value: &str) -> Option<i64> {
    let digits: String = value.trim().chars().take_while(|ch| ch.is_ascii_digit()).collect();
    if digits.is_empty() { None } else { digits.parse().ok() }
}

fn insert_verse(book: &mut BookBuilder, chapter: i64, verse: i64, text: String) -> Result<(), String> {
    if chapter < 1 || verse < 1 { return Err("Bible chapter and verse numbers must be positive.".into()); }
    let verses = book.chapters.entry(chapter).or_default();
    if verses.contains_key(&verse) { return Err(format!("Duplicate verse {chapter}:{verse} in an imported book.")); }
    verses.insert(verse, text);
    Ok(())
}

fn append_verse_text(book: &mut BookBuilder, chapter: i64, verse: i64, value: &str) {
    let entry = book.chapters.entry(chapter).or_default().entry(verse).or_default();
    if !entry.is_empty() && !entry.chars().last().is_some_and(char::is_whitespace) { entry.push(' '); }
    entry.push_str(value);
}

fn xml_text(node: Node<'_, '_>) -> String {
    fn visit(node: Node<'_, '_>, output: &mut String) {
        if node.is_text() { output.push_str(node.text().unwrap_or("")); return; }
        if node.is_element() && ["note", "reference", "title", "milestone"].iter().any(|tag| node.has_tag_name(*tag)) { return; }
        for child in node.children() { visit(child, output); }
    }
    let mut output = String::new();
    visit(node, &mut output);
    output.split_whitespace().collect::<Vec<_>>().join(" ")
}

pub fn parse_lyrics_files(files: &[(String, String)], default_category: &str) -> Result<Vec<ParsedSong>, String> {
    if files.is_empty() || files.len() > 300 { return Err("Select between 1 and 300 lyrics files.".into()); }
    let default_category = match default_category { "hymn" => "hymn", "song" => "song", _ => return Err("Choose Hymn or Song as the default category.".into()) };
    let mut songs = Vec::new();
    for (filename, source) in files {
        let extension = filename.rsplit('.').next().unwrap_or("").to_ascii_lowercase();
        let text = source.trim_start_matches('\u{feff}');
        match extension.as_str() {
            "xml" | "ost" => songs.push(parse_song_xml(text, default_category)?),
            "txt" => songs.push(parse_text_song(filename, text, default_category)),
            "csv" => songs.extend(parse_csv_songs(text, default_category)?),
            _ => return Err(format!("Unsupported lyrics file type: {filename}")),
        }
    }
    if songs.is_empty() { return Err("No songs or hymns with lyrics were found.".into()); }
    Ok(songs)
}

fn parse_song_xml(source: &str, default_category: &str) -> Result<ParsedSong, String> {
    let doc = Document::parse(source).map_err(|_| "The selected lyrics XML is malformed.".to_string())?;
    let root = doc.root_element();
    if root.tag_name().name() != "song" { return Err("The XML is not an OpenLyrics or OpenSong song.".into()); }
    if let Some(properties) = root.children().find(|node| node.has_tag_name("properties")) {
        let collect = |container: &str, item: &str| -> Vec<String> {
            properties.descendants().filter(|node| node.has_tag_name(item) && node.parent().is_some_and(|parent| parent.has_tag_name(container)))
                .filter_map(|node| node.text()).map(str::trim).filter(|text| !text.is_empty()).map(str::to_string).collect()
        };
        let title = collect("titles", "title").into_iter().next().ok_or("An OpenLyrics song has no title.")?;
        let authors = collect("authors", "author").join("; ");
        let copyright = properties.descendants().find(|node| node.has_tag_name("copyright")).and_then(|node| node.text()).unwrap_or("").trim().to_string();
        let themes = collect("themes", "theme");
        let lyrics = root.children().find(|node| node.has_tag_name("lyrics")).ok_or("An OpenLyrics song has no lyrics section.")?;
        let sections = lyrics.children().filter(|node| node.has_tag_name("verse")).filter_map(|verse| {
            let name = verse.attribute("name").unwrap_or("section");
            let lines = verse.children().find(|node| node.has_tag_name("lines"))?;
            let mut content = String::new(); collect_lines(lines, &mut content);
            let content = content.trim().to_string();
            (!content.is_empty()).then(|| (section_type(name).to_string(), name.to_string(), content))
        }).collect::<Vec<_>>();
        if sections.is_empty() { return Err("The OpenLyrics song contains no lyric sections.".into()); }
        Ok(ParsedSong { title, authors, copyright, themes, category: default_category.into(), sections })
    } else {
        let child_text = |name: &str| root.children().find(|node| node.has_tag_name(name)).and_then(|node| node.text()).unwrap_or("").trim().to_string();
        let title = child_text("title");
        if title.is_empty() { return Err("An OpenSong file has no title.".into()); }
        let lyrics = child_text("lyrics");
        let sections = split_sections(&lyrics);
        if sections.is_empty() { return Err("The OpenSong file contains no lyrics.".into()); }
        let themes = root.children().filter(|node| node.has_tag_name("theme") || node.has_tag_name("alttheme")).filter_map(|node| node.text()).map(str::trim).filter(|text| !text.is_empty()).map(str::to_string).collect();
        Ok(ParsedSong { title, authors: child_text("author"), copyright: child_text("copyright"), themes, category: default_category.into(), sections })
    }
}

fn collect_lines(node: Node<'_, '_>, output: &mut String) {
    for child in node.children() {
        if child.is_text() { output.push_str(child.text().unwrap_or("")); }
        else if child.is_element() && child.has_tag_name("br") { output.push('\n'); }
        else if child.is_element() && !child.has_tag_name("comment") { collect_lines(child, output); }
    }
}

fn parse_text_song(filename: &str, source: &str, category: &str) -> ParsedSong {
    let title = filename.rsplit('/').next().unwrap_or(filename).rsplit_once('.').map(|(name, _)| name).unwrap_or(filename).to_string();
    ParsedSong { title, authors: String::new(), copyright: String::new(), themes: Vec::new(), category: category.into(), sections: split_sections(source) }
}

fn split_sections(source: &str) -> Vec<(String, String, String)> {
    let mut sections = Vec::new();
    let mut current_type = "verse".to_string();
    let mut current_label = "Verse 1".to_string();
    let mut content = Vec::new();
    let mut found_headers = false;
    let flush = |sections: &mut Vec<(String, String, String)>, kind: &str, label: &str, content: &mut Vec<String>| {
        let text = content.join("\n").trim().to_string();
        if !text.is_empty() { sections.push((kind.to_string(), label.to_string(), text)); }
        content.clear();
    };
    for line in source.lines() {
        if let Some((kind, label)) = parse_section_header(line.trim()) {
            found_headers = true;
            flush(&mut sections, &current_type, &current_label, &mut content);
            current_type = kind;
            current_label = label;
        } else if !found_headers && line.trim().is_empty() {
            flush(&mut sections, &current_type, &current_label, &mut content);
            current_type = "verse".into();
            current_label = format!("Verse {}", sections.len() + 1);
        } else { content.push(line.to_string()); }
    }
    flush(&mut sections, &current_type, &current_label, &mut content);
    sections
}

fn parse_section_header(line: &str) -> Option<(String, String)> {
    let value = line.trim_matches(['[', ']']).trim().trim_end_matches(':').trim();
    let lower = value.to_ascii_lowercase();
    let (kind, label) = if lower.starts_with("verse") || lower.starts_with('v') {
        ("verse", if lower.starts_with("verse") { format!("Verse {}", value.get(5..).unwrap_or("").trim()) } else { format!("Verse {}", value.get(1..).unwrap_or("").trim()) })
    } else if lower == "chorus" || lower == "c" { ("chorus", "Chorus".into()) }
    else if lower == "bridge" || lower == "b" { ("bridge", "Bridge".into()) }
    else if lower.starts_with("pre-chorus") || lower == "p" { ("pre-chorus", "Pre-Chorus".into()) }
    else if lower == "intro" || lower == "i" { ("intro", "Intro".into()) }
    else if lower == "outro" || lower == "ending" || lower == "e" { ("outro", "Ending".into()) }
    else { return None; };
    Some((kind.into(), label))
}

fn section_type(label: &str) -> &'static str {
    match label.chars().next().unwrap_or('v').to_ascii_lowercase() {
        'v' => "verse", 'c' => "chorus", 'b' => "bridge", 'p' => "pre-chorus", 'i' => "intro", 'o' | 'e' => "outro", _ => "section",
    }
}

fn parse_csv_songs(source: &str, default_category: &str) -> Result<Vec<ParsedSong>, String> {
    let rows = parse_csv(source)?;
    let Some(header) = rows.first() else { return Err("The CSV file is empty.".into()); };
    let headers: Vec<String> = header.iter().map(|value| value.trim().to_ascii_lowercase().replace([' ', '-'], "_")).collect();
    let col = |names: &[&str]| headers.iter().position(|header| names.iter().any(|name| header == name));
    let title_col = col(&["title", "name", "song"]);
    let lyrics_col = col(&["lyrics", "text", "words", "verse"]);
    let Some(title_col) = title_col else { return Err("CSV needs a title column (title or name).".into()); };
    let Some(lyrics_col) = lyrics_col else { return Err("CSV needs a lyrics column (lyrics, text, or words).".into()); };
    let mut songs = Vec::new();
    for row in rows.iter().skip(1) {
        let get = |index: Option<usize>| index.and_then(|index| row.get(index)).map(|value| value.trim()).unwrap_or("");
        let title = get(Some(title_col));
        let lyrics = get(Some(lyrics_col));
        if title.is_empty() || lyrics.trim().is_empty() { continue; }
        let category = match get(col(&["category", "type"])).to_ascii_lowercase().as_str() { "hymn" => "hymn", "song" => "song", "" => default_category, other => return Err(format!("Unknown CSV category: {other}")) };
        let themes = get(col(&["themes", "theme", "tags"])).split([';', ',']).map(str::trim).filter(|theme| !theme.is_empty()).map(str::to_string).collect();
        songs.push(ParsedSong {
            title: title.into(), authors: get(col(&["authors", "author", "writers"])).into(),
            copyright: get(col(&["copyright", "license"])).into(), themes, category: category.into(), sections: split_sections(lyrics),
        });
    }
    if songs.is_empty() { return Err("CSV contains no rows with both a title and lyrics.".into()); }
    Ok(songs)
}

fn parse_csv(source: &str) -> Result<Vec<Vec<String>>, String> {
    let mut rows = Vec::new(); let mut row = Vec::new(); let mut field = String::new(); let mut quoted = false;
    let mut chars = source.chars().peekable();
    while let Some(ch) = chars.next() {
        match ch {
            '"' if quoted && chars.peek() == Some(&'"') => { chars.next(); field.push('"'); }
            '"' => quoted = !quoted,
            ',' if !quoted => { row.push(std::mem::take(&mut field)); }
            '\n' if !quoted => { row.push(std::mem::take(&mut field)); if row.iter().any(|cell| !cell.is_empty()) { rows.push(std::mem::take(&mut row)); } else { row.clear(); } }
            '\r' if !quoted => {},
            _ => field.push(ch),
        }
    }
    if quoted { return Err("CSV has an unclosed quoted field.".into()); }
    if !field.is_empty() || !row.is_empty() { row.push(field); rows.push(row); }
    Ok(rows)
}

