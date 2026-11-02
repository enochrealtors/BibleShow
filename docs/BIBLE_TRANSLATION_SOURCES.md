# BIBLESHOW — BIBLE TEXT SOURCES AND RIGHTS REGISTER

**Document version:** 1.1
**Reviewed:** 2 November 2026
**Status:** KJV selected by the user as the default and first development translation; release-market rights review remains open.

## 1. Purpose

Record the source and reuse terms for Bible text considered for BibleShow. A translation may be bundled, downloaded, displayed, searched, or redistributed only after its rights and source edition are recorded. UI quotation allowances do not automatically authorize bundling a complete searchable translation.

## 2. Selected first translation

**Translation:** King James Version (KJV)
**User preference:** KJV is the default Bible translation.
**Source:** `Hymns & Bibles/Bibles/EnglishKJBible.xml` from the user-provided `Hymns & Bibles.zip`
**Source archive SHA-256:** `a4a1c59d96f8e0ae5ee5196089031cc2087d06765213830bddeacb1a71b82670`
**Source metadata:** The XML labels the translation `English KJV` and its status `Public Domain`.
**Validation:** XML parses; 66 books, 1,189 chapters, and 31,102 non-empty verses.

Use this exact user-supplied KJV file as BibleShow's first translation; do not silently replace it with a different KJV edition. The archive's exact upstream publisher, edition, and revision are not recorded in the XML, so the in-file public-domain label is provenance supplied with the asset, not an independent rights verification.

### Territory note

UK government guidance says the right to print, publish, and distribute the 1611 King James Bible is licensed by the Crown to publishers. Cambridge University Press says it administers those rights in the UK as the Crown's patentee. Confirm intended release territories before bundling or distributing the text publicly. This note does not determine the legal status of every edition or every jurisdiction.

References:
- [GOV.UK copyright guidance — King James Bible](https://www.gov.uk/government/publications/copyright-notice-duration-of-copyright-term/copyright-notice-duration-of-copyright-term)
- [Cambridge rights information for the Authorized (King James) Version](https://assets.cambridge.org/97805211/63347/copyright/9780521163347_copyright_info.pdf)

## 3. Other Bible files in the ZIP

Only the KJV is included in the staging package. The other five files remain excluded until their rights and permitted distribution are documented:

- `EnglishRSVBible.xml` — names the Division of Christian Education of the National Council of the Churches of Christ in the United States; the file does not grant redistribution rights.
- `EnglishAmplifiedBible.xml` — carries a 2015 Lockman Foundation copyright notice and “All rights reserved.”
- `Igbo2020Bible.xml` — carries a Biblica copyright notice.
- `YorubaBible.xml` — carries a Bible Society of Nigeria copyright notice.
- `NigerianPidginBible.xml` — carries a Wycliffe Bible Translators / Nigerian Pidgin Translation Committee copyright notice.

## 4. Lyrics and hymns

The ZIP contains 793 hymn files and 3,442 song files in OpenLyrics XML. Author names are present in the song metadata; 485 song files also contain a copyright field. Missing notices do not establish public-domain status. Preserve author and copyright metadata when importing. Keep the staging package out of Git and do not include the lyrics in a public BibleShow release until song-by-song rights and any church presentation license requirements have been checked.

## 5. Prepared local staging package

`BibleShow_Initial_Content_Staging.zip` in the task outputs contains the selected KJV, all 793 structurally repaired hymns, and 2,742 songs with lyrics. It does not contain the five unselected Bible translations or 700 incomplete song records. The package is staged for local import work; it has not been imported into the application or pushed to GitHub.

The preparation report and incomplete-song list are:
- `BibleShow_Initial_Content_Report.md`
- `BibleShow_Incomplete_Songs.csv`

No lyric text was invented or fetched from the web. Thirteen empty song records were restored only from unambiguous duplicate records in the same user-provided archive. The remaining 700 entries require a verified source before import.

## 6. Open decisions before public release

- Confirm the countries where BibleShow will be distributed and review KJV rights for those markets.
- Decide whether Bible text ships in the installer or as a separate local data package.
- Confirm that the user has rights to use the supplied song lyrics in the intended church presentation workflow and obtain any additional distribution rights needed for public release.
- Decide whether separately licensed translations may be imported by users.

Do not commit the Bible text or song archive to Git.
