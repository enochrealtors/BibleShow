# BIBLESHOW — TECHNICAL DECISIONS REGISTER

**Document version:** 1.0  
**Last updated:** 2 November 2026

This document records important technical decisions, their reasons and their implementation status.

Decisions must not be changed silently. Any proposed change must include its technical justification and potential impact.

## 1. Desktop Framework

**Decision:** Tauri 2  
**Status:** AGREED

Reasons:
- Lightweight desktop application architecture.
- Native desktop integration.
- Rust backend.
- Supports a React frontend.
- Suitable for Windows and Linux development.
- Supports building desktop installers.

## 2. Frontend Framework

**Decision:** React  
**Status:** AGREED

Reasons:
- Component-based interface.
- Suitable for complex application workspaces.
- Large ecosystem.
- Supports reusable UI components.

## 3. Programming Language

**Decision:** TypeScript  
**Status:** AGREED

Reasons:
- Static type checking.
- Improved maintainability.
- Better error detection.
- Suitable for a large application.

Rust will handle native desktop functionality and appropriate backend operations.

## 4. Build System

**Decision:** Vite  
**Status:** AGREED

Reasons:
- Fast development server.
- Modern frontend build system.
- React and TypeScript support.
- Integrates with Tauri.

## 5. Local Database

**Decision:** SQLite  
**Status:** AGREED — INITIAL LOCAL LIBRARY AND PRESENTATION SCHEMA IMPLEMENTED

Reasons:
- Local storage.
- Offline operation.
- No separate database server required.
- Suitable for Scripture and lyric libraries, presentation projects and local media metadata.

The current local schema stores the KJV, lyrics, and presentation references. Schema versions 1 and 2 are applied transactionally. Backup and synchronisation remain future work.

## 6. Cloud Backend

**Decision:** Supabase  
**Status:** AGREED — IMPLEMENTATION PENDING

Intended uses:
- Authentication.
- Cloud database.
- Synchronisation.
- Cloud backups.
- User workspaces.

Supabase must remain optional for essential offline functionality.

Before implementation, assess free-tier limitations and possible future costs.

## 7. Cloud Database

**Decision:** PostgreSQL  
**Status:** AGREED — IMPLEMENTATION PENDING

Intended uses:
- Cloud application data.
- User accounts and workspaces.
- Synchronised records.
- Structured relational data.

## 8. Semantic Search

**Decision:** PostgreSQL with pgvector for cloud semantic search.  
**Status:** AGREED IN PRINCIPLE — IMPLEMENTATION PENDING

Purpose:
- Meaning-based Scripture search.
- Paraphrase matching.
- Contextual Scripture suggestions.

A suitable local/offline alternative must also be evaluated.

## 9. Speech Recognition

**Preferred technology:** Whisper  
**Status:** SELECTED AS PREFERRED OPTION — IMPLEMENTATION PENDING

Purpose:
- Transcribe live speech.
- Support Scripture detection.
- Provide text to the detection engine.

The specific implementation must be evaluated for:
- Offline operation.
- Hardware requirements.
- Recognition accuracy.
- Performance.
- Licensing.
- Operating costs.

## 10. Version Control

**Decision:** Git and GitHub  
**Status:** AGREED — SETUP PENDING

Requirements:
- Track source code changes.
- Maintain meaningful commits.
- Support recovery from mistakes.
- Keep project documentation under version control.
- Never commit secrets or credentials.

## 11. Application Architecture

**Decision:** Modular architecture  
**Status:** AGREED

Major modules:

1. Bible Engine.
2. Presentation Engine.
3. Media Engine.
4. Detection Engine.
5. Synchronisation Engine.

Modules must communicate through clear interfaces.

Avoid unnecessary coupling and duplicated functionality.

## 12. Bible Data Architecture

**Decision:** One local Scripture source library for presentation
**Status:** AGREED

The KJV and any later licensed translations are content sources for the presentation workspace. BibleShow is not planned as a general-purpose Bible study application.

Presentation slides should store references to Scripture, not duplicate verse text.

## 13. Offline-First Strategy

**Decision:** Essential functionality must work offline.  
**Status:** AGREED

Offline functionality should include:
- Local Bible reference and verse selection for presentation.
- Locally available translations.
- Songs.
- Presentations.
- Local media.
- Live presentation output.

Cloud and AI enhancements must not become mandatory dependencies.

## 14. Development Platform

**Current development environment:** Ubuntu Linux on an AWS virtual machine.  
**Status:** ACTIVE

**Initial release target:** Windows desktop.

Linux builds may also be supported.

Windows packaging and testing must be completed before the initial Windows release.

## 15. Development and Dependency Policy

**Decision:** Free and open-source-first development.  
**Status:** AGREED

Rules:
- Avoid unnecessary paid subscriptions.
- Prefer established open-source libraries.
- Evaluate licences before adoption.
- Explain recurring costs before introducing paid services.
- Avoid unnecessary dependencies.
- Do not assume a free tier will remain free indefinitely.

## 16. Product Naming

**Application name:** BibleShow  
**Status:** AGREED

The permanent application identifier remains pending approval.

The initial Tauri identifier `com.tauri.dev` is temporary and must be replaced before release.

## 17. Decisions Requiring Future Evaluation

The following are not yet finalised:

- Permanent application identifier.
- Final UI component library.
- Final SQLite integration approach.
- Bible translation sources and licences.
- Local semantic search implementation.
- Local speech recognition configuration.
- PowerPoint and PDF import libraries.
- Multiple-display implementation.
- Remote-control architecture.
- Windows installer and update mechanism.
- Cloud hosting and long-term operating costs.

## 18. Change Management

When proposing a technical change:

1. Identify the existing decision.
2. Explain why a change is necessary.
3. Identify benefits and disadvantages.
4. Explain migration implications.
5. Consider cost, security and maintainability.
6. Obtain approval before changing an agreed decision.
7. Update this register after approval.

**Governing principle:** Technical decisions must serve the long-term BibleShow vision, not merely make the next coding task easier.
