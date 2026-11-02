# BIBLESHOW — BIBLE TEXT SOURCES AND RIGHTS REGISTER

**Document version:** 1.0  
**Reviewed:** 2 November 2026  
**Status:** Recommended first candidate identified; user approval and target-market review pending.

## 1. Purpose

Record the source and reuse terms for Bible text considered for BibleShow. A translation may be bundled, downloaded, displayed, searched, or redistributed only after its rights and source edition are recorded. UI quotation allowances do not automatically authorize bundling a complete searchable translation.

## 2. Recommended first candidate

**World English Bible (WEB), stable 66-book edition**  
**eBible.org source ID:** `ENGWEBP` (`engwebp`)  
**Language/dialect:** English, American  
**Source format available:** USFM archive, `engwebp_usfm.zip`  
**Recommendation status:** Candidate for the first local Bible dataset; not yet imported.

The eBible.org source record identifies this edition as public domain, provides the USFM download, and identifies it as the 66-book edition without the Deuterocanon/Apocrypha. The project’s rights page states that the text may be copied, distributed, redistributed, sold, and used in Bible study software. It also says the name “World English Bible” is a trademark and should identify faithful copies; if the text is changed, the changed text must not continue to be called by that name.

This is a practical first-data candidate because BibleShow can keep an offline copy and redistribute the text without relying on a quotation allowance. Use the plain USFM text archive, not a decorated PDF or other package that may contain separately copyrighted maps, artwork, or fonts.

### Source and rights references

- Edition record and available USFM archive: <https://www.ebible.org/find/details.php?id=engwebp>
- Copyright and trademark terms for the WEB: <https://ebible.org/engwebp/copyright.htm>
- WEB FAQ on publication and software use: <https://www.ebible.org/eng-web/webfaq.htm>
- eBible.org intellectual-property policy: <https://ebible.org/legal.php>

## 3. Handling requirements for the candidate

Before import:

1. Download the USFM archive from the edition record above.
2. Record the retrieval date, source URL, edition/source ID, and SHA-256 of the exact archive.
3. Parse it without silently rewriting verse wording or punctuation.
4. Retain its canonical book order, source labels, and source revision information.
5. Display the translation's full name accurately and use the trademarked name only for faithful text.
6. Store source and rights metadata in the local database and show it in an About/translation-details view.
7. Recheck the source record and intended distribution jurisdictions before release.

The rights page is the contributor's statement about the text. This register is an engineering record, not a legal opinion about every jurisdiction or every associated asset.

## 4. Restricted-translation example: NIV

Do not bundle or redistribute the NIV without written permission covering the specific BibleShow product and intended distribution. Biblica's current permissions guidance says its general quotation allowance is limited (including a 500-verse cap, no complete book, and other conditions); app and website display requires written permission or an applicable express license, and full-text licensing is available only to a registered legal entity. Biblica also has separate requirements for AI/ML uses. Revisit only after the project has a legal entity and a written license whose scope covers offline storage, search, church presentation, redistribution, and any intended intelligent-detection use.

References:
- Biblica permissions guidance: <https://www.biblica.com/permissions-old/>
- Biblica terms and copyright statement: <https://www.biblica.com/terms-of-use/>

## 5. Open decisions before release

- Confirm that American English is suitable for BibleShow's first audience, or select a different WEB edition.
- Confirm initial target countries and have the rights position checked for those launch markets before bundling a translation in a public release.
- Decide whether the first translation is bundled with the installer or provided as a separate downloadable/importable data package.
- Decide whether WEB is the sole initial translation or whether users will import separately licensed texts.

**Next approval needed:** Confirm the `ENGWEBP` stable 66-book edition as BibleShow's first development dataset, or name the preferred English dialect/edition. Do not commit the Bible text archive to Git.
