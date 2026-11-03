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
