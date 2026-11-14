# BibleShow — Project Suggestions and Feedback Log

This is the append-only record for new product suggestions, workflow requests, and user-reported issues. It keeps future work visible so planned items are not lost between development stages.

For each new item, record a short title, the user's intent, the relevant project area or stage, current status, and links to the plan or implementation notes. Use these statuses: **New**, **Planned**, **In progress**, **Implemented — review needed**, **Verified**, or **Deferred**. Do not remove earlier entries; update their status and add a note when decisions change. When an item is agreed for implementation, synchronize it into `docs/FEATURES.md`, `PROJECT_GUIDE.md`, and `docs/DEVELOPMENT_STATUS.md` where relevant.

## Suggestions

### S-001 — Ensure imported videos actually play

- **Added:** 3 November 2026
- **Request:** Video upload succeeds, but the uploaded video does not play.
- **Area / stage:** Videos and Images; local playback across the media feed, operator Preview/Live, saved presentations, and audience output.
- **Status:** Implemented — review needed.
- **Plan / notes:** `docs/MEDIA_IMPORT_DESIGN.md`. The Linux path now serves registered local videos over a token-protected loopback HTTP endpoint with byte-range support, rather than relying on the Tauri asset URL that can fail in WebKitGTK.
- **Review:** Confirm MP4 and WebM playback, seeking, Preview/Live, audience output, and reopening a saved presentation in the desktop app.

### S-002 — Keep a durable log of new suggestions and synchronize them with the plan

- **Added:** 3 November 2026
- **Request:** Create a project document where new suggestions are recorded and connected to the current plan so they are not skipped when their implementation stage arrives.
- **Area / stage:** Project planning and all future development stages.
- **Status:** Implemented — process active.
- **Plan / notes:** This document is the append-only register. Agreed suggestions must also be reflected in `docs/FEATURES.md`, `PROJECT_GUIDE.md`, and development status as appropriate.

### S-003 — Support continuing development from a Windows laptop

- **Added:** 3 November 2026
- **Request:** Set up a separate working copy on the user's Windows laptop so work can continue there and on Ubuntu.
- **Area / stage:** Development workflow and Windows desktop compatibility.
- **Status:** Planned.
- **Plan / notes:** Use the same GitHub repository for a Windows checkout; follow the official Tauri Windows prerequisites. Synchronize commits through GitHub before switching devices. A dedicated OS branch is optional, not required. Current unpushed local commits must be pushed or otherwise transferred before a new Windows checkout can include them; check Git state and obtain push authorization before publishing.

### S-004 — Restore Bible and lyrics selection workflow and speed up imports

- **Added:** 9 November 2026
- **Request:** Keep Bible reference and keyword search, verse and range selection, readable Bible and lyric content, and Preview/Live actions visible in their feeds. Use one search bar that follows the selected feed. Open Bible and lyrics import details from compact icon buttons. Make 5,000+ lyric imports practical.
- **Area / stage:** Bible, Lyrics, Preview/Live, feed search and resource import.
- **Status:** In progress.
- **Plan / notes:** Preserve the existing verse selectors and section actions. Show complete searched text, split submitted passages into ordered verse slides, use a modal import dialog, and profile bounded lyric batches. The latest local commit `c24384a` inserted expanded import forms above the feed pickers and changed lyrics import to one serial request per file; compare against `origin/main` and retain the needed parser and refresh fixes.

### S-005 — Browse PowerPoint slides inside BibleShow and improve media output controls

- **Added:** 11 November 2026
- **Request:** Browse imported PowerPoint slides inside BibleShow, select them for Preview and Live, and optionally open the original file in PowerPoint. Keep BibleShow in control of slide navigation. Also improve video looping, hide image/video names from Preview and Live, and let Clear items remove media slides from the current show without deleting imported files.
- **Area / stage:** PowerPoint presentations, media playback, Preview/Live and show controls.
- **Status:** Implemented — review needed.
- **Plan / notes:** Microsoft PowerPoint exports each slide as an image. BibleShow now prepares slide images, shows them in a scrollable in-app list, and uses the selected image in Preview and Live; the original file can also open in PowerPoint, which BibleShow navigates. The selected-file header uses a compact Start button. This replaces window capture because it did not provide the in-app slide browser. Live video looping remains under review and is deferred at the user's request. Interactive PowerPoint behavior still needs verification.

### S-006 — Detect spoken Bible references and paraphrases

- **Added:** 11 November 2026
- **Request:** Listen to a selected microphone and detect explicit Bible references or paraphrased Scripture. Support assisted review and configurable automatic Live display, with direct references and paraphrases controlled separately by user-set confidence thresholds.
- **Area / stage:** Intelligent Scripture Detection.
- **Status:** Planned.
- **Plan / notes:** The user prefers free or free-tier services and approved selectable microphone, processing and Live-approval options. Keep local processing available; send transcript text only for optional online paraphrase matching. Any online speech transcription that transmits microphone audio must have a separate, clear, off-by-default user opt-in. The user moved Themes ahead of this work; schedule speech detection after S-007.

### S-007 — Add built-in, imported and live-feed presentation themes

- **Added:** 12 November 2026
- **Request:** Provide solid-color built-in themes, imported image/video backgrounds, user-designed themes, and live camera/video streams as backgrounds.
- **Area / stage:** Presentation Design.
- **Status:** Implemented — review needed.
- **Plan / notes:** Added six built-in solid-color themes, locally saved user color themes, imported library image/video backgrounds, and the currently connected camera/video stream as a session-only background. Theme backgrounds render behind Scripture and lyric text in Preview, Live and audience output. Imported assets reuse the existing media library; live URLs are not persisted. Production build and diff checks passed. Desktop interaction review remains pending because the Windows UI bridge timed out.

### S-008 — Give every content feed more usable height

- **Added:** 13 November 2026
- **Request:** Reduce the oversized Preview/Live area so every lower content tab has more room, matching the compact resource workspace shown in the FreeShow reference.
- **Area / stage:** Shared presentation workspace layout.
- **Status:** Implemented — review needed.
- **Plan / notes:** Reduced the default upper pane and raised the lower feed's minimum height; the horizontal divider remains adjustable. Production build and diff checks passed. Desktop visual review timed out in the Windows UI bridge.

### S-009 — Add Bible reference and keyword suggestions

- **Added:** 13 November 2026
- **Request:** Suggest Bible books as the operator types a reference; after four keyword words, show up to ten matching passages and narrow suggestions as the query becomes specific.
- **Area / stage:** Bible feed search.
- **Status:** Implemented — review needed.
- **Plan / notes:** Preserve the Reference/Keyword selector and existing passage workflow. Book prefixes use the selected translation's book list. After four words, a 300 ms debounce queries up to ten local verse matches; choosing one stages Preview, with double-click/Enter sending Live. Production build, Rust library check and diff check passed. Desktop interaction review remains pending.

### S-010 — Add reusable message-alert controls and library

- **Added:** 13 November 2026
- **Request:** Default alerts to the bottom and let operators set position, size, color and timing. Scrolling alerts can repeat a chosen number of times or continue until removed; static alerts have a configurable duration. Save alerts with a title and content and search them for reuse.
- **Area / stage:** Display controls and message alerts.
- **Status:** Implemented — review needed.
- **Plan / notes:** Alerts default to the bottom and support top/middle placement, adjustable text size and text/background colors. Static messages clear after a configurable duration; scrolling messages repeat a selected count or continue until cleared. Titled messages are stored locally and searchable by title or content. Production build and diff checks passed; desktop interaction review remains pending because the Windows UI bridge timed out.

### S-011 — Complete the PowerPoint slide actions

- **Added:** 13 November 2026
- **Request:** After Start loads a deck, browse every slide in the Presentation feed and provide Preview, Send Live, Add page to show and Add all pages to show actions.
- **Area / stage:** Presentation feed and current show.
- **Status:** Implemented — review needed.
- **Plan / notes:** The scrollable slide list now has explicit Preview, Send Live and Add actions for each page, plus Add all pages to show. Bulk addition respects the existing 500-slide saved-show cap. The separate PowerPoint workflow remains available. Production build and diff checks passed; desktop interaction review remains pending because the Windows UI bridge timed out.

### S-012 — Move project management into File and dedicate the left area to the show

- **Added:** 13 November 2026
- **Request:** Move the current Projects & Show controls into the File tab. Use the left panel for the current show's draggable, reorderable items.
- **Area / stage:** Operator workspace and File menu.
- **Status:** Implemented — review needed.
- **Plan / notes:** Moved New, show name, open/save/delete, JSON import/export and current-show item count into the File menu. The left panel now uses its full height for show items; Bible, lyrics, media, PDF and PowerPoint content can be dragged in, and existing items can be reordered by drag/drop. Existing arrow controls remain available. Production build and diff checks passed; desktop interaction review remains pending because the Windows UI bridge timed out.
