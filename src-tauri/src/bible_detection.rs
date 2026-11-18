use rapidfuzz::distance::levenshtein::normalized_similarity;
use rusqlite::{Connection, params};
use std::collections::HashSet;

pub struct QuoteMatch {
    pub book_number: i64,
    pub book_name: String,
    pub chapter_number: i64,
    pub verse_number: i64,
    pub text: String,
    pub score: f64,
}

#[derive(Clone, Debug)]
pub struct ParsedReference {
    pub book_number: i64,
    pub book_name: String,
    pub chapter_number: i64,
    pub verse_start: Option<i64>,
    pub verse_end: Option<i64>,
}

struct BookAlias {
    number: i64,
    name: String,
    words: Vec<String>,
}

struct Token {
    value: String,
    end: usize,
}

pub fn parse_references(transcript: &str, books: &[(i64, String)]) -> Vec<ParsedReference> {
    let tokens = tokenize(transcript);
    let mut aliases = books
        .iter()
        .flat_map(|(number, name)| {
            aliases_for(*number, name)
                .into_iter()
                .map(|words| BookAlias {
                    number: *number,
                    name: name.clone(),
                    words,
                })
                .collect::<Vec<_>>()
        })
        .collect::<Vec<_>>();
    aliases.sort_by_key(|alias| std::cmp::Reverse(alias.words.len()));

    let mut results = Vec::new();
    let mut seen = HashSet::new();
    let mut index = 0;
    while index < tokens.len() {
        let found = aliases
            .iter()
            .find_map(|alias| {
                let end = index + alias.words.len();
                (end <= tokens.len()
                    && tokens[index..end]
                        .iter()
                        .map(|token| token.value.as_str())
                        .eq(alias.words.iter().map(String::as_str)))
                .then_some((alias, end))
            })
            .or_else(|| fuzzy_book_alias(&aliases, &tokens, index));
        let Some((alias, after_book)) = found else {
            index += 1;
            continue;
        };
        let Some((chapter_number, verse_start, verse_end)) =
            parse_reference_tail(transcript, tokens[after_book - 1].end)
        else {
            index = after_book;
            continue;
        };
        let key = (alias.number, chapter_number, verse_start, verse_end);
        if seen.insert(key) {
            results.push(ParsedReference {
                book_number: alias.number,
                book_name: alias.name.clone(),
                chapter_number,
                verse_start,
                verse_end,
            });
        }
        index = after_book;
    }
    results
}

fn fuzzy_book_alias<'a>(
    aliases: &'a [BookAlias],
    tokens: &[Token],
    index: usize,
) -> Option<(&'a BookAlias, usize)> {
    let mut best: Option<(&BookAlias, usize, f64)> = None;
    let mut ambiguous = false;
    for alias in aliases {
        let end = index + alias.words.len();
        if end > tokens.len() {
            continue;
        }
        let last = alias.words.len() - 1;
        if alias.words[..last]
            .iter()
            .zip(&tokens[index..index + last])
            .any(|(expected, actual)| expected != &actual.value)
        {
            continue;
        }
        let expected = &alias.words[last];
        let actual = &tokens[index + last].value;
        if expected.chars().count().min(actual.chars().count()) < 4 {
            continue;
        }
        let similarity = normalized_similarity(expected.chars(), actual.chars());
        if similarity < 0.82 {
            continue;
        }
        match best {
            None => {
                best = Some((alias, end, similarity));
                ambiguous = false;
            }
            Some((_current, _, score)) if similarity > score + f64::EPSILON => {
                best = Some((alias, end, similarity));
                ambiguous = false;
            }
            Some((current, _, score))
                if (similarity - score).abs() <= f64::EPSILON && current.number != alias.number =>
            {
                ambiguous = true;
            }
            _ => {}
        }
    }
    (!ambiguous)
        .then_some(best)
        .flatten()
        .map(|(alias, end, _)| (alias, end))
}

fn aliases_for(number: i64, name: &str) -> Vec<Vec<String>> {
    let canonical = words(name);
    let mut aliases = vec![canonical.clone()];
    if canonical
        .first()
        .is_some_and(|word| matches!(word.as_str(), "1" | "2" | "3"))
    {
        let ordinal = canonical[0].as_str();
        let word_ordinal = match ordinal {
            "1" => "first",
            "2" => "second",
            _ => "third",
        };
        let roman_ordinal = match ordinal {
            "1" => "i",
            "2" => "ii",
            _ => "iii",
        };
        let numeric_ordinal = match ordinal {
            "1" => "1st",
            "2" => "2nd",
            _ => "3rd",
        };
        let last = canonical.last().cloned().unwrap_or_default();
        for prefix in [ordinal, numeric_ordinal, word_ordinal, roman_ordinal] {
            aliases.push(vec![prefix.into(), last.clone()]);
            if last.len() > 3 {
                aliases.push(vec![prefix.into(), last[..3].into()]);
            }
        }
        if last.len() > 3 {
            aliases.push(vec![ordinal.into(), last[..4].into()]);
        }
    } else if canonical.len() == 1 && canonical[0].len() > 4 {
        aliases.push(vec![canonical[0][..3].into()]);
    }
    match number {
        19 => aliases.extend([vec!["psalm".into()], vec!["ps".into()]]),
        22 => aliases.push(words("Song of Songs")),
        _ => {}
    }
    aliases.sort();
    aliases.dedup();
    aliases
}

fn words(value: &str) -> Vec<String> {
    value
        .split(|character: char| !character.is_alphanumeric())
        .filter(|word| !word.is_empty())
        .map(str::to_lowercase)
        .collect()
}

fn tokenize(value: &str) -> Vec<Token> {
    let mut tokens = Vec::new();
    let mut start = None;
    for (index, character) in value.char_indices() {
        if character.is_alphanumeric() {
            start.get_or_insert(index);
        } else if let Some(token_start) = start.take() {
            tokens.push(Token {
                value: value[token_start..index].to_lowercase(),
                end: index,
            });
        }
    }
    if let Some(token_start) = start {
        tokens.push(Token {
            value: value[token_start..].to_lowercase(),
            end: value.len(),
        });
    }
    tokens
}

fn parse_reference_tail(text: &str, offset: usize) -> Option<(i64, Option<i64>, Option<i64>)> {
    let mut cursor = offset;
    skip_space(text, &mut cursor);
    let chapter_word =
        consume_word(text, &mut cursor, "chapter") || consume_word(text, &mut cursor, "chapters");
    if chapter_word {
        skip_space(text, &mut cursor);
    }
    let chapter = read_number(text, &mut cursor)?;
    let after_chapter = cursor;
    skip_space(text, &mut cursor);
    while text[cursor..].starts_with(',') || text[cursor..].starts_with(';') {
        cursor += 1;
        skip_space(text, &mut cursor);
    }

    let explicit_verse = if text[cursor..].starts_with(':') {
        cursor += 1;
        skip_space(text, &mut cursor);
        true
    } else if consume_word(text, &mut cursor, "verse") || consume_word(text, &mut cursor, "verses")
    {
        skip_space(text, &mut cursor);
        true
    } else {
        let separated_by_space = text[after_chapter..cursor].chars().any(char::is_whitespace);
        separated_by_space
            && (text.as_bytes().get(cursor).is_some_and(u8::is_ascii_digit)
                || starts_number_word(text, cursor))
    };

    if !explicit_verse {
        return Some((chapter, None, None));
    }
    let start = read_number(text, &mut cursor)?;
    let end = parse_range_end(text, &mut cursor).unwrap_or(start);
    (end >= start).then_some((chapter, Some(start), Some(end)))
}

fn parse_range_end(text: &str, cursor: &mut usize) -> Option<i64> {
    skip_space(text, cursor);
    if text[*cursor..].starts_with("–") {
        *cursor += "–".len();
    } else if text[*cursor..].starts_with('-') {
        *cursor += 1;
    } else if consume_word(text, cursor, "to") || consume_word(text, cursor, "through") {
        // The range separator was consumed as a word.
    } else {
        return None;
    }
    skip_space(text, cursor);
    read_number(text, cursor)
}

fn consume_word(text: &str, cursor: &mut usize, expected: &str) -> bool {
    let tail = &text[*cursor..];
    let Some(word) = tail.get(..expected.len()) else {
        return false;
    };
    if !word.eq_ignore_ascii_case(expected) {
        return false;
    }
    let boundary = tail[expected.len()..].chars().next();
    if boundary.is_some_and(char::is_alphanumeric) {
        return false;
    }
    *cursor += expected.len();
    true
}

fn skip_space(text: &str, cursor: &mut usize) {
    while let Some(character) = text[*cursor..].chars().next() {
        if !character.is_whitespace() {
            break;
        }
        *cursor += character.len_utf8();
    }
}

fn read_number(text: &str, cursor: &mut usize) -> Option<i64> {
    let start = *cursor;
    while text.as_bytes().get(*cursor).is_some_and(u8::is_ascii_digit) {
        *cursor += 1;
    }
    if start < *cursor {
        return text[start..*cursor].parse().ok();
    }

    let mut position = start;
    let mut value = 0_i64;
    let mut started = false;
    let mut after_scale = false;
    let mut has_tens = false;
    let mut has_ones = false;
    loop {
        let before_separator = position;
        skip_number_separator(text, &mut position);
        let word_start = position;
        while text
            .as_bytes()
            .get(position)
            .is_some_and(u8::is_ascii_alphabetic)
        {
            position += 1;
        }
        if word_start == position {
            position = before_separator;
            break;
        }
        let word = text[word_start..position].to_ascii_lowercase();
        match number_word(&word) {
            Some(1..=9) if !started => {
                value += number_word(&word)?;
                started = true;
                has_ones = true;
            }
            Some(1..=9) if after_scale => {
                value += number_word(&word)?;
                after_scale = false;
                has_ones = true;
            }
            Some(1..=9) if has_tens && !has_ones => {
                value += number_word(&word)?;
                has_ones = true;
            }
            Some(10..=19) if !started || after_scale => {
                value += number_word(&word)?;
                started = true;
                after_scale = false;
                has_tens = true;
                has_ones = true;
            }
            Some(20..=90) if !started || after_scale => {
                value += number_word(&word)?;
                started = true;
                after_scale = false;
                has_tens = true;
                has_ones = false;
            }
            Some(_) => {
                position = before_separator;
                break;
            }
            None if word == "hundred" && started && value <= 99 => {
                value = value.max(1) * 100;
                after_scale = true;
                has_tens = false;
                has_ones = false;
            }
            None if word == "thousand" && started && value <= 999 => {
                value = value.max(1) * 1_000;
                after_scale = true;
                has_tens = false;
                has_ones = false;
            }
            None if word == "and" && after_scale => {}
            _ => {
                position = before_separator;
                break;
            }
        }
        if !text
            .as_bytes()
            .get(position)
            .is_some_and(|byte| byte.is_ascii_whitespace() || *byte == b'-')
        {
            break;
        }
    }
    if !started {
        return None;
    }
    *cursor = position;
    Some(value)
}

fn starts_number_word(text: &str, cursor: usize) -> bool {
    let mut position = cursor;
    while text
        .as_bytes()
        .get(position)
        .is_some_and(u8::is_ascii_alphabetic)
    {
        position += 1;
    }
    position > cursor && number_word(&text[cursor..position].to_ascii_lowercase()).is_some()
}

fn skip_number_separator(text: &str, cursor: &mut usize) {
    while text
        .as_bytes()
        .get(*cursor)
        .is_some_and(|byte| byte.is_ascii_whitespace() || *byte == b'-')
    {
        *cursor += 1;
    }
}

fn number_word(word: &str) -> Option<i64> {
    Some(match word {
        "zero" => 0,
        "one" => 1,
        "two" => 2,
        "three" => 3,
        "four" => 4,
        "five" => 5,
        "six" => 6,
        "seven" => 7,
        "eight" => 8,
        "nine" => 9,
        "ten" => 10,
        "eleven" => 11,
        "twelve" => 12,
        "thirteen" => 13,
        "fourteen" => 14,
        "fifteen" => 15,
        "sixteen" => 16,
        "seventeen" => 17,
        "eighteen" => 18,
        "nineteen" => 19,
        "twenty" => 20,
        "thirty" => 30,
        "forty" => 40,
        "fifty" => 50,
        "sixty" => 60,
        "seventy" => 70,
        "eighty" => 80,
        "ninety" => 90,
        _ => return None,
    })
}

pub fn find_quote_matches(
    db: &Connection,
    translation_id: &str,
    transcript: &str,
) -> Result<Vec<QuoteMatch>, rusqlite::Error> {
    let transcript_words = match_words(transcript);
    if transcript_words.len() < 5 {
        return Ok(Vec::new());
    }
    ensure_bible_search_index(db)?;

    let mut query_terms = transcript_words
        .iter()
        .filter(|word| word.chars().count() >= 4)
        .cloned()
        .collect::<HashSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    query_terms.sort_by_key(|word| std::cmp::Reverse(word.chars().count()));
    query_terms.truncate(20);
    if query_terms.len() < 4 {
        return Ok(Vec::new());
    }
    let query = query_terms
        .iter()
        .map(|word| format!("\"{}\"", word.replace('"', "\"\"")))
        .collect::<Vec<_>>()
        .join(" OR ");

    let mut statement = db.prepare("SELECT CAST(f.book_number AS INTEGER),b.name,CAST(f.chapter_number AS INTEGER),CAST(f.verse_number AS INTEGER),f.text FROM bible_verses_fts f JOIN bible_books b ON b.translation_id=f.translation_id AND b.book_number=CAST(f.book_number AS INTEGER) WHERE bible_verses_fts MATCH ?1 AND f.translation_id=?2 ORDER BY bm25(bible_verses_fts) LIMIT 250")?;
    let rows = statement
        .query_map(params![query, translation_id], |row| {
            Ok(QuoteMatch {
                book_number: row.get(0)?,
                book_name: row.get(1)?,
                chapter_number: row.get(2)?,
                verse_number: row.get(3)?,
                text: row.get(4)?,
                score: 0.0,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let mut matches = rows
        .into_iter()
        .filter_map(|mut candidate| {
            let verse_words = match_words(&candidate.text);
            let (score, overlap) = best_verse_overlap(&transcript_words, &verse_words);
            (overlap >= 5 && score >= 0.5).then(|| {
                candidate.score = score;
                candidate
            })
        })
        .collect::<Vec<_>>();
    matches.sort_by(|left, right| {
        right
            .score
            .total_cmp(&left.score)
            .then_with(|| left.book_number.cmp(&right.book_number))
            .then_with(|| left.chapter_number.cmp(&right.chapter_number))
            .then_with(|| left.verse_number.cmp(&right.verse_number))
    });
    matches.truncate(10);
    Ok(matches)
}

fn ensure_bible_search_index(db: &Connection) -> Result<(), rusqlite::Error> {
    db.execute_batch("CREATE VIRTUAL TABLE IF NOT EXISTS bible_verses_fts USING fts5(translation_id UNINDEXED,book_number UNINDEXED,chapter_number UNINDEXED,verse_number UNINDEXED,text,tokenize='unicode61');
    CREATE TABLE IF NOT EXISTS bible_verses_fts_state(initialized INTEGER PRIMARY KEY CHECK(initialized=1));
    CREATE TRIGGER IF NOT EXISTS bible_verses_fts_insert AFTER INSERT ON bible_verses BEGIN
      INSERT INTO bible_verses_fts(translation_id,book_number,chapter_number,verse_number,text) VALUES (new.translation_id,new.book_number,new.chapter_number,new.verse_number,new.text);
    END;
    CREATE TRIGGER IF NOT EXISTS bible_verses_fts_delete AFTER DELETE ON bible_verses BEGIN
      DELETE FROM bible_verses_fts WHERE translation_id=old.translation_id AND book_number=old.book_number AND chapter_number=old.chapter_number AND verse_number=old.verse_number;
    END;
    CREATE TRIGGER IF NOT EXISTS bible_verses_fts_update AFTER UPDATE OF text ON bible_verses BEGIN
      DELETE FROM bible_verses_fts WHERE translation_id=old.translation_id AND book_number=old.book_number AND chapter_number=old.chapter_number AND verse_number=old.verse_number;
      INSERT INTO bible_verses_fts(translation_id,book_number,chapter_number,verse_number,text) VALUES (new.translation_id,new.book_number,new.chapter_number,new.verse_number,new.text);
    END;")?;

    let tx = db.unchecked_transaction()?;
    let initialized: bool = tx.query_row(
        "SELECT EXISTS(SELECT 1 FROM bible_verses_fts_state)",
        [],
        |row| row.get(0),
    )?;
    if !initialized {
        tx.execute("INSERT INTO bible_verses_fts(translation_id,book_number,chapter_number,verse_number,text) SELECT translation_id,book_number,chapter_number,verse_number,text FROM bible_verses", [])?;
        tx.execute(
            "INSERT INTO bible_verses_fts_state(initialized) VALUES (1)",
            [],
        )?;
    }
    tx.commit()?;
    Ok(())
}

fn match_words(text: &str) -> Vec<String> {
    const STOP: &[&str] = &[
        "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "for", "from", "had",
        "has", "have", "he", "her", "him", "his", "i", "in", "is", "it", "its", "me", "my", "of",
        "on", "or", "our", "she", "so", "that", "the", "their", "them", "there", "they", "this",
        "to", "was", "we", "were", "what", "when", "which", "who", "will", "with", "you", "your",
    ];
    text.split(|character: char| !character.is_alphanumeric())
        .filter(|word| word.chars().count() > 2 && !STOP.contains(&word.to_lowercase().as_str()))
        .map(str::to_lowercase)
        .collect()
}

fn best_verse_overlap(input: &[String], verse: &[String]) -> (f64, usize) {
    if input.len() < 5 || verse.len() < 5 {
        return (0.0, 0);
    }
    let mut best = (0.0, 0);
    for size in [5, 8, 12, 16] {
        if size > input.len() {
            continue;
        }
        let step = (size / 2).max(1);
        let last = input.len() - size;
        let mut start = 0;
        loop {
            let window = &input[start..start + size];
            let mut used = vec![false; verse.len()];
            let overlap = window
                .iter()
                .filter(|word| {
                    if let Some(index) = verse
                        .iter()
                        .enumerate()
                        .position(|(index, candidate)| !used[index] && close_word(word, candidate))
                    {
                        used[index] = true;
                        true
                    } else {
                        false
                    }
                })
                .count();
            if overlap >= 5 {
                let recall = overlap as f64 / window.len() as f64;
                let precision = overlap as f64 / verse.len() as f64;
                let score = 2.0 * recall * precision / (recall + precision);
                if score > best.0 {
                    best = (score, overlap);
                }
            }
            if start >= last {
                break;
            }
            start = (start + step).min(last);
        }
    }
    best
}

fn close_word(left: &str, right: &str) -> bool {
    let left_len = left.chars().count();
    let right_len = right.chars().count();
    left == right
        || (left_len.min(right_len) >= 4
            && left_len.abs_diff(right_len) <= 1
            && normalized_similarity(left.chars(), right.chars()) >= 0.8)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn kjv_books() -> Vec<(i64, String)> {
        [
            (1, "Genesis"),
            (19, "Psalms"),
            (40, "Matthew"),
            (43, "John"),
            (45, "Romans"),
            (46, "1 Corinthians"),
        ]
        .into_iter()
        .map(|(number, name)| (number, name.to_string()))
        .collect()
    }

    #[test]
    fn parses_numeric_reference_ranges_and_multiple_references() {
        let found = parse_references("John 3:16-18, Romans 8:28", &kjv_books());
        assert_eq!(found.len(), 2);
        assert_eq!(
            (
                found[0].book_number,
                found[0].chapter_number,
                found[0].verse_start,
                found[0].verse_end
            ),
            (43, 3, Some(16), Some(18))
        );
        assert_eq!(
            (
                found[1].book_number,
                found[1].chapter_number,
                found[1].verse_start
            ),
            (45, 8, Some(28))
        );
    }

    #[test]
    fn parses_spoken_chapter_verse_and_range_numbers() {
        let found = parse_references(
            "John chapter three verse sixteen; Romans eight twenty-eight; First Corinthians thirteen four through seven",
            &kjv_books(),
        );
        assert_eq!(found.len(), 3);
        assert_eq!(
            (found[0].chapter_number, found[0].verse_start),
            (3, Some(16))
        );
        assert_eq!(
            (found[1].chapter_number, found[1].verse_start),
            (8, Some(28))
        );
        assert_eq!(
            (
                found[2].chapter_number,
                found[2].verse_start,
                found[2].verse_end
            ),
            (13, Some(4), Some(7))
        );
    }

    #[test]
    fn keeps_spoken_chapter_and_verse_as_separate_numbers() {
        let found = parse_references("John three sixteen", &kjv_books());
        assert_eq!(found.len(), 1);
        assert_eq!(
            (found[0].chapter_number, found[0].verse_start),
            (3, Some(16))
        );
    }

    #[test]
    fn finds_quoted_verse_with_small_wording_changes() {
        let db = Connection::open_in_memory().unwrap();
        db.execute_batch("CREATE TABLE bible_books(translation_id TEXT,book_number INTEGER,name TEXT);
          CREATE TABLE bible_verses(translation_id TEXT,book_number INTEGER,chapter_number INTEGER,verse_number INTEGER,text TEXT);
          INSERT INTO bible_books VALUES('KJV',43,'John');
          INSERT INTO bible_verses VALUES('KJV',43,3,16,'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.');").unwrap();
        let matches = find_quote_matches(&db, "KJV", "God so loved the world that he gave his only son so that whoever believes in him will have everlasting life").unwrap();
        assert_eq!(matches.len(), 1);
        assert_eq!(
            (
                matches[0].book_number,
                matches[0].chapter_number,
                matches[0].verse_number
            ),
            (43, 3, 16)
        );
        assert!(matches[0].score >= 0.5);
    }

    #[test]
    fn keeps_quotation_index_in_sync_with_imported_verses() {
        let db = Connection::open_in_memory().unwrap();
        db.execute_batch("CREATE TABLE bible_books(translation_id TEXT,book_number INTEGER,name TEXT);
          CREATE TABLE bible_verses(translation_id TEXT,book_number INTEGER,chapter_number INTEGER,verse_number INTEGER,text TEXT);
          INSERT INTO bible_books VALUES('KJV',1,'Genesis');").unwrap();
        assert!(
            find_quote_matches(
                &db,
                "KJV",
                "A phrase long enough to search for matching words"
            )
            .unwrap()
            .is_empty()
        );
        db.execute("INSERT INTO bible_verses VALUES('KJV',1,1,1,'In the beginning God created the heaven and the earth, and all the host thereof.')", []).unwrap();
        let matches = find_quote_matches(
            &db,
            "KJV",
            "in the beginning God created heaven and the earth, and every host thereof",
        )
        .unwrap();
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].verse_number, 1);
        db.execute("UPDATE bible_verses SET text='A completely different phrase with enough separate words to search' WHERE translation_id='KJV' AND book_number=1 AND chapter_number=1 AND verse_number=1", []).unwrap();
        assert!(
            find_quote_matches(
                &db,
                "KJV",
                "in the beginning God created heaven and the earth, and every host thereof"
            )
            .unwrap()
            .is_empty()
        );
        db.execute("DELETE FROM bible_verses WHERE translation_id='KJV' AND book_number=1 AND chapter_number=1 AND verse_number=1", []).unwrap();
        assert!(
            find_quote_matches(
                &db,
                "KJV",
                "a completely different phrase with enough separate words to search"
            )
            .unwrap()
            .is_empty()
        );
    }
}
