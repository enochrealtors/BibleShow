# BIBLESHOW — INITIAL CONTENT IMPORT REVIEW

**Reviewed:** 2 November 2026  
**Source archive:** User-provided `Hymns & Bibles.zip`  
**Source SHA-256:** `a4a1c59d96f8e0ae5ee5196089031cc2087d06765213830bddeacb1a71b82670`  
**Status:** Cleaned local staging package prepared; application import support is not implemented.

## 1. User-selected content

- Default and first Bible: the exact `EnglishKJBible.xml` file from the archive.
- Hymns and songs: use the archive's `Hymns Files` and `Songs` collections as the initial local library source.
- Do not silently replace the selected KJV file with another edition.

## 2. Archive inspection and cleanup

The archive contains six Bible XML files, 793 OpenLyrics hymn XML files, and 3,442 OpenLyrics song XML files. No source files were zero bytes.

### King James Version

The selected Bible XML parsed cleanly and contains 66 books, 1,189 chapters, and 31,102 non-empty verses. Its metadata labels it `Public Domain`, but the exact upstream edition and source are not recorded in the file. Only this Bible file was placed in the staging package. The other five versions remain excluded pending rights review.

### Hymns

- 716 hymn files contained Windows-1252 punctuation while declaring UTF-8; these were converted to valid UTF-8.
- All 793 files were validly parsed after repair.
- All 793 had the entire hymn stored in one OpenLyrics verse. The preparation step split stanza numbers and chorus headings into 3,849 verse/chorus sections, moved 792 embedded category labels into theme metadata, and added a verse order.
- A line-by-line check confirmed that lyric wording was preserved; only structural labels and category metadata were moved.

### Songs

- All 3,442 files were valid XML.
- 2,729 contained lyrics. Thirteen empty entries were restored from unambiguous duplicates in the same archive with matching normalized titles, author order, copyright metadata, and CCLI metadata.
- The remaining 700 entries have no usable lyric text (607 have no verse sections; 93 have empty verse sections). They are excluded from the import-ready package and listed in `BibleShow_Incomplete_Songs.csv`.
- 485 song files include a copyright field. Missing copyright metadata is not evidence that a song is public domain.

No lyric wording was invented or retrieved from the web. The source archive remains unchanged.

## 3. Rights and distribution controls

The KJV source XML's `Public Domain` label is retained as source metadata, not treated as independent legal verification. UK government guidance states that the Crown licenses the right to print, publish, and distribute the 1611 King James Bible; Cambridge University Press says it administers those rights in the UK as the Crown's patentee. Review the target markets before public distribution:

- [GOV.UK — copyright term and King James Bible](https://www.gov.uk/government/publications/copyright-notice-duration-of-copyright-term/copyright-notice-duration-of-copyright-term)
- [Cambridge — Authorized (King James) Version rights](https://assets.cambridge.org/97805211/63347/copyright/9780521163347_copyright_info.pdf)

The supplied song archive includes contemporary works and does not establish a blanket redistribution license. Preserve all author/copyright data, keep the content package out of Git, and do not ship it publicly until the required rights and any church presentation licensing are confirmed.

## 4. Prepared artifacts

The cleaned package and its review files are in the task outputs directory:

- `BibleShow_Initial_Content_Staging.zip` — KJV, repaired/structured hymns, and complete songs for local import work.
- `BibleShow_Initial_Content_Report.md` — detailed processing and rights summary.
- `BibleShow_Incomplete_Songs.csv` — 700 records requiring lyrics from a verified source.

These assets have not been loaded into BibleShow because the application does not yet have a local content importer or Bible database. The staging ZIP is not committed to the source repository or uploaded to GitHub.
