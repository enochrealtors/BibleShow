import { useCallback, useEffect, useRef, useState, type CSSProperties, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { convertFileSrc, invoke, isTauri } from '@tauri-apps/api/core'
import { emit, listen } from '@tauri-apps/api/event'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import './App.css'

let pdfJsModule: Promise<typeof import('pdfjs-dist')> | null = null

function loadPdfJs() {
  pdfJsModule ??= import('pdfjs-dist').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
    return pdfjs
  })
  return pdfJsModule
}

type Page = 'home' | 'presentation'
type IconName = 'home' | 'book' | 'screen' | 'search' | 'sun' | 'moon' | 'arrow' | 'plus' | 'import' | 'spark' | 'clock' | 'settings'

function currentTimeMs() { return Date.now() }

type LibrarySummary = {
  kjv_installed: boolean
  default_translation: string | null
  books: number
  chapters: number
  verses: number
  hymns: number
  songs: number
}

type ImportSummary = {
  translation: string
  books: number
  chapters: number
  verses: number
  hymns: number
  songs: number
}

type BookSummary = { book_number: number; name: string; chapter_count: number }
type TranslationSummary = { id: string; name: string; language: string }
type ChapterData = { book_number: number; name: string; chapter_number: number; chapter_count: number; verses: { verse_number: number; text: string }[] }
type BibleSearchResult = { book_number: number; book_name: string; chapter_number: number; verse_number: number; text: string }
type DetectedBibleReference = { reference: string; translationId: string; bookNumber: number; bookName: string; chapterNumber: number; detectionMethod?: 'reference' | 'quotation'; matchScore?: number | null; verses: { verse_number: number; text: string }[] }
type SongSummary = { id: string; title: string; authors: string; category: 'hymn' | 'song' }
type SongDetail = SongSummary & { copyright: string; themes: string[]; sections: { section_type: string; label: string; lyrics: string }[] }
type PresentationSlide = { sourceId: string; title: string; subtitle: string; body: string; bodyOverride?: string | null; reference: string; kind: 'scripture' | 'lyrics' | 'image' | 'video' | 'pdf' | 'powerpoint' | 'live'; bookNumber?: number; chapterNumber?: number; verseNumber?: number; translationId?: string; songId?: string; sectionIndex?: number; mediaId?: string; presentationFileId?: string; documentPage?: number; pageCount?: number; mediaPath?: string; mediaUrl?: string; liveStreamUrl?: string; youtubeVideoId?: string; liveStreamKind?: 'camera' | 'video' | 'mjpeg' | 'youtube' }
type QueuedSlide = PresentationSlide & { queueId: string }
type MediaFile = { id: string; filename: string; mediaType: 'image' | 'video'; mimeType: string; localPath: string; fileSize: number; playbackUrl?: string | null }
type VideoPlayback = { sourceId: string; isPlaying: boolean; loop: boolean; currentTime: number; duration: number; startAtMs: number; updatedAtMs: number; commandId: number }
type SolidTheme = { kind: 'solid'; id: string; name: string; backgroundColor: string; textColor: string }
type MediaTheme = { kind: 'media'; id: string; name: string; mediaId: string; mediaType: 'image' | 'video'; mediaPath: string; playbackUrl?: string | null; textColor: string }
type LiveTheme = { kind: 'live'; id: string; name: string; sourceId: string; liveStreamKind: 'camera' | 'video' | 'mjpeg' | 'youtube'; liveStreamUrl?: string; youtubeVideoId?: string; textColor: string }
type PresentationTheme = SolidTheme | MediaTheme | LiveTheme
type MessageAlert = { id: string; text: string; mode: 'static' | 'scrolling'; position: 'top' | 'middle' | 'bottom'; fontSize: number; textColor: string; backgroundColor: string; staticDurationSeconds: number; repeatCount: number | null }
type SavedMessageAlert = { id: string; title: string; content: string }
const builtInThemes: SolidTheme[] = [
  { kind: 'solid', id: 'classic', name: 'BibleShow Classic', backgroundColor: '#263a2e', textColor: '#fffef7' },
  { kind: 'solid', id: 'warm', name: 'Warm Parchment', backgroundColor: '#5b3f27', textColor: '#fff4dc' },
  { kind: 'solid', id: 'midnight', name: 'Midnight Blue', backgroundColor: '#14233d', textColor: '#f2f5ff' },
  { kind: 'solid', id: 'black', name: 'Black', backgroundColor: '#080808', textColor: '#ffffff' },
  { kind: 'solid', id: 'royal', name: 'Royal Purple', backgroundColor: '#39244f', textColor: '#fff8e9' },
  { kind: 'solid', id: 'ocean', name: 'Ocean', backgroundColor: '#064553', textColor: '#effbff' },
]
const defaultTheme = builtInThemes[0]
type DisplayOverlay = { id: string; title: string; text: string; mode: 'static' | 'scrolling'; visible: boolean; locked: boolean }
type CountdownFunction = { durationSeconds: number; remainingSeconds: number; endsAtMs: number | null; running: boolean; visible: boolean }
type AudienceSnapshot = { slide: PresentationSlide | null; alert: MessageAlert | null; videoPlayback: VideoPlayback | null; theme: PresentationTheme; overlays: DisplayOverlay[]; countdown: CountdownFunction }
type DisplaySummary = { index: number; id: string; name: string; x: number; y: number; width: number; height: number; isPrimary: boolean }
type PendingProjectAction = { kind: 'leave' } | { kind: 'new' } | { kind: 'open'; id: number }
type PresentationSummary = { id: number; title: string; updatedAt: string; slideCount: number }
type PresentationFile = { id: string; filename: string; fileType: 'pdf' | 'ppt' | 'pptx' | 'pps' | 'ppsx' | 'odp'; mimeType: string; localPath: string; fileSize: number; pageCount: number; createdAt: string }
type PowerPointSession = { fileId: string; slideCount: number; slideThumbnails: string[] }
type SavedPresentation = { id: number; title: string; slides: PresentationSlide[] }
type LiveFeedInfo = { streamId: string; streamUrl: string }
type AudioInput = { index: number; name: string; is_default: boolean }
type SpeechTranscriptEvent = { text: string; final_segment: boolean; authoritative: boolean; engine: string; alternatives: string[] }
type SpeechStatusEvent = { status: 'listening' | 'stopped' | 'error'; message: string | null }
type DetectionRequest = { transcript: string; alternatives?: string[]; origin: 'manual' | 'microphone'; finalSegment: boolean }
type BibleDetectionSettings = { detectWhileListening: boolean; directReferencesToLive: boolean; paraphrasesToLive: boolean; reviewThreshold: number; liveThreshold: number; speechEngine: 'streaming' | 'combined'; whisperLanguage: 'en' | 'auto' }
type CameraSignal = { sourceId: string; sender?: 'operator' | 'audience'; description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }

function loadBibleDetectionSettings(): BibleDetectionSettings {
  const defaults: BibleDetectionSettings = { detectWhileListening: true, directReferencesToLive: false, paraphrasesToLive: false, reviewThreshold: 70, liveThreshold: 90, speechEngine: 'combined', whisperLanguage: 'en' }
  try {
    const saved = JSON.parse(localStorage.getItem('bibleshow-bible-detection-settings') ?? 'null') as Partial<BibleDetectionSettings> | null
    return saved ? {
      detectWhileListening: typeof saved.detectWhileListening === 'boolean' ? saved.detectWhileListening : defaults.detectWhileListening,
      directReferencesToLive: typeof saved.directReferencesToLive === 'boolean' ? saved.directReferencesToLive : defaults.directReferencesToLive,
      paraphrasesToLive: false,
      reviewThreshold: Number.isFinite(saved.reviewThreshold) ? Math.max(50, Math.min(95, saved.reviewThreshold!)) : defaults.reviewThreshold,
      liveThreshold: Number.isFinite(saved.liveThreshold) ? Math.max(70, Math.min(100, saved.liveThreshold!)) : defaults.liveThreshold,
      speechEngine: saved.speechEngine === 'streaming' ? 'streaming' : defaults.speechEngine,
      whisperLanguage: saved.whisperLanguage === 'auto' ? 'auto' : defaults.whisperLanguage,
    } : defaults
  } catch { return defaults }
}

function extractYoutubeVideoId(value: string) {
  try {
    const url = new URL(value.trim())
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    let videoId: string | null = null
    if (host === 'youtu.be') videoId = url.pathname.split('/').filter(Boolean)[0] ?? null
    else {
      if (host !== 'youtube.com' && host !== 'm.youtube.com' && host !== 'youtube-nocookie.com') return null
      if (url.pathname === '/watch') videoId = url.searchParams.get('v')
      else videoId = url.pathname.match(/^\/(?:live|embed|shorts|v)\/([^/?]+)/)?.[1] ?? null
    }
    return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null
  } catch { return null }
}

function youtubeEmbedUrl(videoId: string, muted: boolean) {
  const parameters = new URLSearchParams({ autoplay: '1', controls: '1', playsinline: '1', mute: muted ? '1' : '0' })
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${parameters.toString()}`
}
type PresentationFeed = 'bible' | 'lyrics' | 'media' | 'presentations' | 'live' | 'url' | 'themes' | 'functions' | 'overlays'
const presentationFeedLabels: Record<PresentationFeed, string> = {
  bible: 'Bible', lyrics: 'Lyrics', media: 'Videos & Images', presentations: 'Presentations', live: 'Live Feed', url: 'URL Media', themes: 'Themes', functions: 'Functions', overlays: 'Overlays',
}

function persistedSlides(slides: readonly PresentationSlide[]) {
  return slides.map(({ sourceId, title, subtitle, reference, kind, bookNumber, chapterNumber, verseNumber, translationId, songId, sectionIndex, mediaId, presentationFileId, documentPage, bodyOverride }) => ({ sourceId, title, subtitle, reference, kind, bookNumber, chapterNumber, verseNumber, translationId, songId, sectionIndex, mediaId, presentationFileId, documentPage, bodyOverride: bodyOverride ?? undefined }))
}

function displayBody(slide: PresentationSlide) { return slide.bodyOverride ?? slide.body }

function themeStyle(theme: PresentationTheme): CSSProperties {
  return { '--theme-bg': theme.kind === 'solid' ? theme.backgroundColor : '#080a09', '--theme-text': theme.textColor } as CSSProperties
}

function validThemeColor(value: unknown): value is string { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) }

function normalizePresentationTheme(value: unknown): PresentationTheme | null {
  if (typeof value === 'string') return builtInThemes.find((theme) => theme.id === value) ?? null
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<PresentationTheme>
  if (item.kind === 'solid' && typeof item.id === 'string' && typeof item.name === 'string' && validThemeColor(item.backgroundColor) && validThemeColor(item.textColor)) {
    return { kind: 'solid', id: item.id, name: item.name, backgroundColor: item.backgroundColor, textColor: item.textColor }
  }
  if (item.kind === 'media' && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.mediaId === 'string' && (item.mediaType === 'image' || item.mediaType === 'video') && typeof item.mediaPath === 'string' && validThemeColor(item.textColor)) {
    return { kind: 'media', id: item.id, name: item.name, mediaId: item.mediaId, mediaType: item.mediaType, mediaPath: item.mediaPath, textColor: item.textColor }
  }
  return null
}

function loadPresentationTheme(): PresentationTheme {
  try {
    const value = localStorage.getItem('bibleshow-presentation-theme')
    if (!value) return defaultTheme
    try { return normalizePresentationTheme(JSON.parse(value)) ?? normalizePresentationTheme(value) ?? defaultTheme }
    catch { return normalizePresentationTheme(value) ?? defaultTheme }
  } catch { return defaultTheme }
}

function loadCustomThemes(): SolidTheme[] {
  try {
    const values = JSON.parse(localStorage.getItem('bibleshow-custom-themes') ?? '[]') as unknown
    if (!Array.isArray(values)) return []
    return values.map(normalizePresentationTheme).filter((theme): theme is SolidTheme => theme?.kind === 'solid' && !builtInThemes.some((builtIn) => builtIn.id === theme.id))
  } catch { return [] }
}

function persistableTheme(theme: PresentationTheme): PresentationTheme | Omit<LiveTheme, 'liveStreamUrl' | 'youtubeVideoId'> {
  if (theme.kind === 'live') return { kind: 'live', id: theme.id, name: theme.name, sourceId: theme.sourceId, liveStreamKind: theme.liveStreamKind, textColor: theme.textColor }
  if (theme.kind === 'media') return { ...theme, playbackUrl: undefined }
  return theme
}

function loadDisplayOverlays(): DisplayOverlay[] {
  try {
    const value = JSON.parse(localStorage.getItem('bibleshow-display-overlays') ?? '[]') as unknown
    if (!Array.isArray(value)) return []
    return value.filter((item): item is DisplayOverlay => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.text === 'string' && (item.mode === 'static' || item.mode === 'scrolling') && typeof item.visible === 'boolean' && typeof item.locked === 'boolean')
  } catch { return [] }
}

function loadSavedMessageAlerts(): SavedMessageAlert[] {
  try {
    const value = JSON.parse(localStorage.getItem('bibleshow-saved-message-alerts') ?? '[]') as unknown
    if (!Array.isArray(value)) return []
    return value.filter((item): item is SavedMessageAlert => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.content === 'string')
  } catch { return [] }
}

function messageAlertStyle(alert: MessageAlert, operator = false): CSSProperties {
  const placement: CSSProperties = alert.position === 'top' ? { top: '2%', bottom: 'auto' } : alert.position === 'middle' ? { top: '50%', bottom: 'auto', transform: 'translateY(-50%)' } : { bottom: '0', top: 'auto' }
  return { ...placement, color: alert.textColor, backgroundColor: alert.backgroundColor, fontSize: operator ? `clamp(8px, ${alert.fontSize * 0.45}vw, 24px)` : `clamp(18px, ${alert.fontSize}vw, 84px)`, '--alert-repeat-count': alert.repeatCount ?? 'infinite' } as CSSProperties
}

function projectSnapshot(title: string, slides: readonly PresentationSlide[]) {
  return JSON.stringify({ title, slides: persistedSlides(slides) })
}

function preferredDisplayId(displays: readonly DisplaySummary[]) {
  return displays.find((display) => !display.isPrimary)?.id ?? displays[0]?.id ?? ''
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" /><path d="M4 5.5v13A2.5 2.5 0 0 1 6.5 16H20M8 7h8M8 10h7" /></>,
    screen: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4M8 9h8m-8 3h5" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    moon: <path d="M20.8 14.2A8.5 8.5 0 0 1 9.8 3.2 8.5 8.5 0 1 0 20.8 14.2Z" />,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    import: <><path d="M12 3v12m-5-5 5 5 5-5" /><path d="M5 19h14" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" transform="translate(-1 -1)" /></>,
  }

  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

const pageTitles: Record<Page, string> = {
  home: 'Home',
  presentation: 'Presentation',
}

function App() {
  const [page, setPage] = useState<Page>('home')
  const [darkMode, setDarkMode] = useState(false)
  const [library, setLibrary] = useState<LibrarySummary | null>(null)
  const [importState, setImportState] = useState<{ busy: boolean; message: string; error: boolean }>({ busy: false, message: '', error: false })

  useEffect(() => {
    if (!isTauri()) return
    invoke<LibrarySummary>('get_library_summary').then(setLibrary).catch(() => undefined)
  }, [])

  function refreshLibrary() {
    if (!isTauri()) return
    invoke<LibrarySummary>('get_library_summary').then(setLibrary).catch(() => undefined)
  }

  async function importLibrary(file?: File) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setImportState({ busy: false, message: 'Choose the cleaned BibleShow ZIP package.', error: true })
      return
    }
    setImportState({ busy: true, message: 'Importing the KJV and lyrics into this device…', error: false })
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const result = await invoke<ImportSummary>('import_initial_content', bytes)
      setLibrary({ kjv_installed: true, default_translation: 'KJV', books: result.books, chapters: result.chapters, verses: result.verses, hymns: result.hymns, songs: result.songs })
      setImportState({ busy: false, message: `Imported KJV, ${result.hymns} hymns and ${result.songs} songs. KJV is now the default Bible.`, error: false })
    } catch (error) {
      setImportState({ busy: false, message: String(error), error: true })
    }
  }

  return (
    <div className={`app-shell${darkMode ? ' theme-dark' : ''}${page === 'presentation' ? ' presentation-mode' : ''}`}>
      <aside className="sidebar">
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); setPage('home') }} aria-label="BibleShow home">
          <span className="brand-mark"><span /></span>
          <span className="brand-name">Bible<span>Show</span></span>
        </a>

        <div className="sidebar-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={`nav-item${page === 'home' ? ' active' : ''}`} onClick={() => setPage('home')} aria-label="Home" aria-current={page === 'home' ? 'page' : undefined}>
            <Icon name="home" /><span>Home</span>
          </button>
          <button className={`nav-item${page === 'presentation' ? ' active' : ''}`} onClick={() => setPage('presentation')} aria-label="Presentation" aria-current={page === 'presentation' ? 'page' : undefined}>
            <Icon name="screen" /><span>Presentation</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="offline-card"><span className="online-dot" /><span>Offline-first foundation</span></div>
          <div className="profile-button" aria-label="Local workspace">
            <span className="avatar">E</span>
            <span className="profile-copy"><strong>My workspace</strong><small>Personal library</small></span>
            <span className="profile-more">···</span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        {page !== 'presentation' && <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-divider">/</span><strong>{pageTitles[page]}</strong></div>
          <div className="topbar-actions">
            <button className="icon-button search-button" aria-label="Search, coming soon" title="Search is coming soon" disabled><Icon name="search" /><span>Search</span><kbd>Ctrl K</kbd></button>
            <span className="topbar-separator" />
            <button className="icon-button theme-button" onClick={() => setDarkMode(!darkMode)} aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'} title={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}><Icon name={darkMode ? 'sun' : 'moon'} /></button>
            <button className="settings-button" aria-label="Settings, coming soon" title="Settings are coming soon" disabled><Icon name="settings" /></button>
          </div>
        </header>}

        <div className={`page-content${page === 'presentation' ? ' page-content-presentation' : ''}`}>
          {page === 'home' && <HomePage onNavigate={setPage} library={library} importState={importState} onImport={importLibrary} onRefreshLibrary={refreshLibrary} />}
          {page === 'presentation' && <PresentationWorkspace onBack={() => setPage('home')} onRefreshLibrary={refreshLibrary} />}
          {page !== 'presentation' && <footer className="app-footer"><span>BibleShow</span><span>Built for worship and presentation</span><span className="footer-version">EARLY ACCESS</span></footer>}
        </div>
      </main>
    </div>
  )
}

function HomePage({ onNavigate, library, importState, onImport, onRefreshLibrary }: { onNavigate: (page: Page) => void; library: LibrarySummary | null; importState: { busy: boolean; message: string; error: boolean }; onImport: (file?: File) => void; onRefreshLibrary: () => void }) {
  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> YOUR PRESENTATION WORKSPACE</div>
          <h1>Welcome to BibleShow</h1>
          <p className="welcome-subtitle">Prepare Scripture and service content for clear, reliable display.</p>
        </div>
        <div className="date-chip"><span className="date-dot" /> Designed to work without internet</div>
      </section>

      <ResourceImportPanel onImported={onRefreshLibrary} />

      <section className="workspace-grid single-workspace-grid" aria-label="Presentation workspace">
        <button className="workspace-card presentation-card" onClick={() => onNavigate('presentation')}>
          <span className="card-icon presentation-icon"><Icon name="screen" size={21} /></span>
          <span className="card-kicker">PREPARE · PRESENT · SERVE</span>
          <span className="card-title">Church Presentation</span>
          <span className="card-description">Prepare Scripture and service content for your next gathering.</span>
          <span className="card-link">Open presentation workspace <Icon name="arrow" size={16} /></span>
          <span className="card-art art-stage" aria-hidden="true"><span className="stage-screen" /><span className="stage-glow" /></span>
        </button>
      </section>

      <section className="library-panel" aria-labelledby="library-heading">
        <div className="library-copy">
          <div className="section-heading"><div><span className="section-icon"><Icon name="book" size={17} /></span><h2 id="library-heading">Your Bible and song library</h2></div><span className="muted-label">STORED ON THIS DEVICE</span></div>
          {library?.kjv_installed ? <p className="library-status">King James Version is installed and set as your default. {library.verses.toLocaleString()} verses, {library.hymns.toLocaleString()} hymns and {library.songs.toLocaleString()} songs are ready for offline use.</p> : <p className="library-status">Import the cleaned starter package to install the King James Version and the available hymns and songs for offline use.</p>}
          {importState.message && <p className={`import-message${importState.error ? ' is-error' : ''}`} role="status">{importState.message}</p>}
        </div>
        <label className={`import-button${importState.busy ? ' is-busy' : ''}`}>
          <Icon name="plus" size={16} />
          <span>{importState.busy ? 'Importing…' : library?.kjv_installed ? 'Import again' : 'Choose content ZIP'}</span>
          <input type="file" accept=".zip,application/zip" disabled={importState.busy || !isTauri()} onChange={(event) => { onImport(event.currentTarget.files?.[0]); event.currentTarget.value = '' }} />
        </label>
      </section>

      <section className="below-grid">
        <div className="recent-panel">
          <div className="section-heading"><div><span className="section-icon"><Icon name="clock" size={17} /></span><h2>Pick up where you left off</h2></div><span className="muted-label">RECENT ACTIVITY</span></div>
          <div className="empty-state">
            <span className="empty-illustration"><Icon name="book" size={22} /></span>
            <div><strong>Your recent work will appear here</strong><p>Prepare a presentation to see it in this space.</p></div>
          </div>
        </div>
        <aside className="quick-panel">
          <div className="section-heading"><div><span className="section-icon spark-icon"><Icon name="spark" size={17} /></span><h2>Quick start</h2></div></div>
          <button className="quick-action" onClick={() => onNavigate('presentation')}><span className="quick-action-icon quick-screen"><Icon name="screen" size={17} /></span><span><strong>Prepare a presentation</strong><small>Open your service workspace</small></span><Icon name="arrow" size={15} /></button>
        </aside>
      </section>
    </>
  )
}

function ResourceImportPanel({ onImported, mode = 'all' }: { onImported: (complete?: boolean) => void; mode?: 'all' | 'bible' | 'lyrics' }) {
  const [translationId, setTranslationId] = useState('')
  const [translationName, setTranslationName] = useState('')
  const [language, setLanguage] = useState('en')
  const [category, setCategory] = useState<'hymn' | 'song'>('hymn')
  const [lyricsFormat, setLyricsFormat] = useState<'auto' | 'xml' | 'txt' | 'csv'>('auto')
  const [importMode, setImportMode] = useState<'single' | 'batch'>('batch')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  async function importFiles(kind: 'bible' | 'lyrics', selected: FileList | null) {
    if (!selected?.length) return
    const selectedFiles = Array.from(selected)
    let imported = 0
    let skipped = 0
    let completed = 0
    setBusy(true); setMessage('Reading selected files…'); setError(false)
    try {
      if (kind === 'lyrics') {
        const encoder = new TextEncoder()
        const maxBatchFiles = 128
        const maxBatchBytes = 6 * 1024 * 1024
        let batch: File[] = []
        let batchBytes = 0
        async function sendBatch(files: { filename: string; content: string }[]) {
          if (files.length > 1) {
            const bytes = encoder.encode(JSON.stringify({ category, files }))
            if (bytes.byteLength > 8 * 1024 * 1024) {
              const midpoint = Math.ceil(files.length / 2)
              await sendBatch(files.slice(0, midpoint))
              await sendBatch(files.slice(midpoint))
              return
            }
            const result = await invoke<{ imported: number; skipped: number; detail: string }>('import_lyrics_resources', bytes)
            imported += result.imported
            skipped += result.skipped
          } else {
            const result = await invoke<{ imported: number; skipped: number; detail: string }>('import_lyrics_resources', encoder.encode(JSON.stringify({ category, files })))
            imported += result.imported
            skipped += result.skipped
          }
          completed += files.length
          setMessage(`Imported ${completed} of ${selectedFiles.length} files…`)
        }
        async function flushBatch() {
          if (!batch.length) return
          const files = batch
          batch = []
          batchBytes = 0
          setMessage(`Reading ${files.length} files (${completed} of ${selectedFiles.length} completed)…`)
          const contents = await Promise.all(files.map(async (file) => ({ filename: file.name, content: await file.text() })))
          await sendBatch(contents)
        }
        for (const file of selectedFiles) {
          if (batch.length && (batch.length >= maxBatchFiles || batchBytes + file.size > maxBatchBytes)) await flushBatch()
          batch.push(file)
          batchBytes += file.size
          if (batch.length >= maxBatchFiles || batchBytes >= maxBatchBytes) await flushBatch()
        }
        await flushBatch()
        setMessage('Imported ' + imported + ' lyrics resources; skipped ' + skipped + ' duplicates or empty items.')
      } else {
        const files = await Promise.all(selectedFiles.map(async (file) => ({ filename: file.name, content: await file.text() })))
        const payload = { id: translationId, name: translationName, language, files }
        const result = await invoke<{ imported: number; skipped: number; detail: string }>('import_bible_resources', new TextEncoder().encode(JSON.stringify(payload)))
        setMessage(result.detail)
        completed = selectedFiles.length
      }
      onImported(true)
    } catch (reason) {
      if (completed) onImported(false)
      setMessage(completed ? 'Stopped after ' + completed + ' files. Added ' + imported + ' lyrics and skipped ' + skipped + '. ' + String(reason) : String(reason))
      setError(true)
    } finally { setBusy(false) }
  }

  const heading = mode === 'all' ? 'Add library resources' : mode === 'bible' ? 'Import Bible' : 'Import lyrics'
  const lyricsAccept = lyricsFormat === 'auto' ? '.xml,.ost,.txt,.csv' : lyricsFormat === 'xml' ? '.xml,.ost' : `.${lyricsFormat}`
  return <section className={'library-panel resource-import-panel' + (mode === 'all' ? '' : ' feed-resource-import')} aria-labelledby={`resource-import-heading-${mode}`}>
    <div className="library-copy">
      <div className="section-heading"><div><span className="section-icon"><Icon name="plus" size={17} /></span><h2 id={`resource-import-heading-${mode}`}>{heading}</h2></div>{mode === 'all' && <span className="muted-label">OFFLINE IMPORT</span>}</div>
      <p className="library-status">{mode === 'bible' ? 'Import USFM, USX, OSIS, Zefania, or BibleShow XML Bible files.' : mode === 'lyrics' ? 'Import OpenLyrics or OpenSong XML, TXT, and CSV songs.' : 'Add Bible versions or song libraries. BibleShow accepts USFM/USX, OSIS, Zefania, BibleShow XML, OpenLyrics/OpenSong XML, TXT, and CSV.'}</p>
      {message && <p className={'import-message' + (error ? ' is-error' : '')} role="status">{message}</p>}
      <div className="resource-import-fields">
        {mode !== 'lyrics' && <fieldset disabled={busy || !isTauri()}><legend>Bible version</legend>
          <input aria-label="Translation code" placeholder="Code (for example, KJV or ESV)" value={translationId} onChange={(event) => setTranslationId(event.target.value)} />
          <input aria-label="Translation name" placeholder="Version name" value={translationName} onChange={(event) => setTranslationName(event.target.value)} />
          <input aria-label="Language code" placeholder="Language (en)" value={language} onChange={(event) => setLanguage(event.target.value)} />
          <label className="import-button"><span>{busy ? 'Importing…' : 'Choose Bible files'}</span><input type="file" accept=".usfm,.sfm,.usx,.xml,.osis" multiple disabled={busy || !isTauri()} onChange={(event) => { void importFiles('bible', event.currentTarget.files); event.currentTarget.value = '' }} /></label>
        </fieldset>}
        {mode !== 'bible' && <fieldset disabled={busy || !isTauri()}><legend>Lyrics</legend>
          <select aria-label="Default lyrics category" value={category} onChange={(event) => setCategory(event.target.value as 'hymn' | 'song')}><option value="hymn">Hymns</option><option value="song">Songs</option></select>
          <label>File format<select aria-label="Lyrics import format" value={lyricsFormat} onChange={(event) => setLyricsFormat(event.target.value as typeof lyricsFormat)}><option value="auto">Detect from extension</option><option value="xml">OpenLyrics / OpenSong XML</option><option value="txt">Plain text</option><option value="csv">CSV collection</option></select></label>
          <label>Import mode<select aria-label="Lyrics import mode" value={importMode} onChange={(event) => setImportMode(event.target.value as typeof importMode)}><option value="single">Single file</option><option value="batch">Multiple files</option></select></label>
          <label className="import-button"><span>{busy ? 'Importing…' : importMode === 'batch' ? 'Choose lyrics files' : 'Choose lyrics file'}</span><input type="file" accept={lyricsAccept} multiple={importMode === 'batch'} disabled={busy || !isTauri()} onChange={(event) => { void importFiles('lyrics', event.currentTarget.files); event.currentTarget.value = '' }} /></label>
        </fieldset>}
      </div>
    </div>
  </section>
}

function ResourceImportDialog({ mode, onImported, onDismiss, openRequest = 0 }: { mode: 'bible' | 'lyrics'; onImported: () => void; onDismiss?: () => void; openRequest?: number }) {
  const [open, setOpen] = useState(openRequest > 0)
  const title = mode === 'bible' ? 'Import Bible' : 'Import lyrics'
  function close() { setOpen(false); onDismiss?.() }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return <>
    <button type="button" className="feed-import-trigger" aria-label={title} title={title} onClick={() => setOpen(true)}><Icon name="import" size={16} /></button>
    {open && <div className="resource-import-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <section className="resource-import-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <header><strong>{title}</strong><button type="button" aria-label="Close import dialog" onClick={close}>×</button></header>
        <ResourceImportPanel mode={mode} onImported={(complete = true) => { onImported(); if (complete) close() }} />
      </section>
    </div>}
  </>
}
function PresentationWorkspace({ onBack, onRefreshLibrary }: { onBack: () => void; onRefreshLibrary: () => void }) {
  const [activeFeed, setActiveFeed] = useState<PresentationFeed>('bible')
  const [feedSearchQuery, setFeedSearchQuery] = useState('')
  const [resourceRevision, setResourceRevision] = useState(0)
  const [liveFeedSlide, setLiveFeedSlide] = useState<PresentationSlide | null>(null)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [previewSlide, setPreviewSlide] = useState<PresentationSlide | null>(null)
  const [liveSlide, setLiveSlide] = useState<PresentationSlide | null>(null)
  const [previewPlayback, setPreviewPlayback] = useState<VideoPlayback | null>(null)
  const [livePlayback, setLivePlayback] = useState<VideoPlayback | null>(null)
  const [delayLiveVideo, setDelayLiveVideo] = useState(false)
  const [sequence, setSequence] = useState<QueuedSlide[]>([])
  const [editingPosition, setEditingPosition] = useState<number | null>(null)
  const [slideDraft, setSlideDraft] = useState({ title: '', subtitle: '', reference: '', body: '' })
  const [previewPosition, setPreviewPosition] = useState<number | null>(null)
  const [livePosition, setLivePosition] = useState<number | null>(null)
  const [presentationId, setPresentationId] = useState<number | null>(null)
  const [presentationTitle, setPresentationTitle] = useState('Sunday Service')
  const [presentations, setPresentations] = useState<PresentationSummary[]>([])
  const [savedProjectSnapshot, setSavedProjectSnapshot] = useState(() => projectSnapshot('Sunday Service', []))
  const [pendingProjectAction, setPendingProjectAction] = useState<PendingProjectAction | null>(null)
  const [persistenceMessage, setPersistenceMessage] = useState('')
  const [persistenceBusy, setPersistenceBusy] = useState(false)
  const [paneSizes, setPaneSizes] = useState({ left: 250, right: 245, centerTop: 320 })
  const [toolbarPanel, setToolbarPanel] = useState<string | null>(null)
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([])
  const [songEditorRequest, setSongEditorRequest] = useState<{ songId: string | null; request: number } | null>(null)
  const [songExportRequest, setSongExportRequest] = useState<{ songIds: string[]; request: number } | null>(null)
  const [lyricsImportRequest, setLyricsImportRequest] = useState(0)
  const [liveDisplayOpen, setLiveDisplayOpen] = useState(true)
  const [audienceWindowOpen, setAudienceWindowOpen] = useState(false)
  const [displays, setDisplays] = useState<DisplaySummary[]>([])
  const [selectedDisplay, setSelectedDisplay] = useState('')
  const [displayError, setDisplayError] = useState('')
  const userSelectedDisplay = useRef(false)
  const audienceAutoStartAttempted = useRef(false)
  const audienceOutputDismissed = useRef(false)
  const audienceDisplayTarget = useRef<string | null>(null)
  const displayRefreshInFlight = useRef(false)
  const [detectionTranscript, setDetectionTranscript] = useState('')
  const [detectedReferences, setDetectedReferences] = useState<DetectedBibleReference[]>([])
  const [detectionMessage, setDetectionMessage] = useState('')
  const [detectionBusy, setDetectionBusy] = useState(false)
  const [audioInputs, setAudioInputs] = useState<AudioInput[]>([])
  const [selectedAudioInput, setSelectedAudioInput] = useState('')
  const [speechStatus, setSpeechStatus] = useState<SpeechStatusEvent['status']>('stopped')
  const [speechMessage, setSpeechMessage] = useState('')
  const [speechInterim, setSpeechInterim] = useState('')
  const [detectionSettings, setDetectionSettings] = useState(loadBibleDetectionSettings)
  const detectionSettingsRef = useRef(detectionSettings)
  const detectionTranscriptRef = useRef('')
  const completedSpeechTranscriptRef = useRef('')
  const pendingDetectionTranscriptRef = useRef<DetectionRequest | null>(null)
  const detectionAnalysisRunningRef = useRef(false)
  const analyzeBibleTranscriptRef = useRef<(request: DetectionRequest) => void>(() => {})
  const speechAnalysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewedDetectionIdsRef = useRef(new Set<string>())
  const liveDetectionIdsRef = useRef(new Set<string>())
  const [alertTitleDraft, setAlertTitleDraft] = useState('')
  const [alertDraft, setAlertDraft] = useState('')
  const [alertMode, setAlertMode] = useState<'static' | 'scrolling'>('static')
  const [alertPosition, setAlertPosition] = useState<MessageAlert['position']>('bottom')
  const [alertFontSize, setAlertFontSize] = useState(2.7)
  const [alertTextColor, setAlertTextColor] = useState('#ffffff')
  const [alertBackgroundColor, setAlertBackgroundColor] = useState('#852323')
  const [alertStaticDuration, setAlertStaticDuration] = useState(10)
  const [alertRepeatCount, setAlertRepeatCount] = useState(3)
  const [alertRepeatForever, setAlertRepeatForever] = useState(false)
  const [savedAlerts, setSavedAlerts] = useState<SavedMessageAlert[]>(loadSavedMessageAlerts)

  useEffect(() => {
    if (!isTauri()) return
    let active = true
    const cleanup: (() => void)[] = []
    void listen<SpeechTranscriptEvent>('bible-speech-transcript', (event) => {
      if (!event.payload.authoritative) {
        setSpeechInterim(event.payload.text)
        if (detectionSettingsRef.current.detectWhileListening) {
          if (speechAnalysisTimerRef.current) clearTimeout(speechAnalysisTimerRef.current)
          const transcript = `${completedSpeechTranscriptRef.current} ${event.payload.text}`.trim().slice(-700)
          speechAnalysisTimerRef.current = setTimeout(() => {
            analyzeBibleTranscriptRef.current({ transcript, origin: 'microphone', finalSegment: false })
          }, 400)
        }
        return
      }
      if (speechAnalysisTimerRef.current) clearTimeout(speechAnalysisTimerRef.current)
      setSpeechInterim('')
      const next = `${completedSpeechTranscriptRef.current.trim()} ${event.payload.text}`.trim().slice(-700)
      const alternatives = event.payload.alternatives
        .map((text) => `${completedSpeechTranscriptRef.current.trim()} ${text}`.trim().slice(-700))
        .filter((text) => text && text !== next)
      completedSpeechTranscriptRef.current = next
      detectionTranscriptRef.current = event.payload.text
      setDetectionTranscript(event.payload.text)
      if (detectionSettingsRef.current.detectWhileListening) analyzeBibleTranscriptRef.current({ transcript: next, alternatives, origin: 'microphone', finalSegment: true })
    }).then((unlisten) => { if (active) cleanup.push(unlisten); else unlisten() })
    void listen<SpeechStatusEvent>('bible-speech-status', (event) => {
      setSpeechStatus(event.payload.status)
      setSpeechMessage(event.payload.message ?? '')
      if (event.payload.status !== 'listening') setSpeechInterim('')
    }).then((unlisten) => { if (active) cleanup.push(unlisten); else unlisten() })
    return () => { active = false; cleanup.forEach((unlisten) => unlisten()) }
  }, [])
  const [alertLibrarySearch, setAlertLibrarySearch] = useState('')
  const [activeAlert, setActiveAlert] = useState<MessageAlert | null>(null)
  const [presentationTheme, setPresentationTheme] = useState<PresentationTheme>(loadPresentationTheme)
  const [powerpointSession, setPowerPointSession] = useState<PowerPointSession | null>(null)

  const refreshDisplays = useCallback(async () => {
    if (!isTauri() || displayRefreshInFlight.current) return
    displayRefreshInFlight.current = true
    try {
      const items = await invoke<DisplaySummary[]>('get_available_displays')
      setDisplays((current) => JSON.stringify(current) === JSON.stringify(items) ? current : items)
      setSelectedDisplay((current) => {
        if (userSelectedDisplay.current && items.some((item) => item.id === current)) return current
        if (userSelectedDisplay.current && !items.some((item) => item.id === current)) userSelectedDisplay.current = false
        return preferredDisplayId(items)
      })
      setDisplayError('')
    } catch (error) { setDisplayError(String(error)) }
    finally { displayRefreshInFlight.current = false }
  }, [])

  function showAlert() {
    const text = alertDraft.trim()
    if (!text) return
    setActiveAlert({ id: crypto.randomUUID(), text, mode: alertMode, position: alertPosition, fontSize: alertFontSize, textColor: alertTextColor, backgroundColor: alertBackgroundColor, staticDurationSeconds: alertStaticDuration, repeatCount: alertMode === 'scrolling' ? alertRepeatForever ? null : alertRepeatCount : null })
  }

  function saveAlertToLibrary() {
    const title = alertTitleDraft.trim()
    const content = alertDraft.trim()
    if (!title || !content) return
    const id = savedAlerts.find((item) => item.title.toLocaleLowerCase() === title.toLocaleLowerCase())?.id ?? crypto.randomUUID()
    setSavedAlerts((items) => [...items.filter((item) => item.id !== id), { id, title, content }])
  }

  function loadAlertFromLibrary(alert: SavedMessageAlert) {
    setAlertTitleDraft(alert.title)
    setAlertDraft(alert.content)
  }

  function refreshImportedResources() {
    setResourceRevision((revision) => revision + 1)
    onRefreshLibrary()
  }
  function openSongEditor(songId: string | null) {
    setSongEditorRequest((current) => ({ songId, request: (current?.request ?? 0) + 1 }))
    setToolbarPanel(null)
  }
  function openSongExport(songIds: string[]) {
    const ids = [...new Set(songIds)]
    if (!ids.length) return
    setSongExportRequest((current) => ({ songIds: ids, request: (current?.request ?? 0) + 1 }))
    setToolbarPanel(null)
  }
  async function deleteLibrarySongs(songIds: string[]) {
    const ids = [...new Set(songIds)]
    if (!ids.length) return
    const noun = ids.length === 1 ? 'song' : 'songs'
    if (!window.confirm(`Permanently delete ${ids.length} ${noun} from the lyrics library?`)) return
    if (!isTauri()) { setPersistenceMessage('Open BibleShow in the desktop app to delete library songs.'); return }
    try {
      const deleted = await invoke<number>('delete_songs', { songIds: ids })
      const removedIndexes = new Set(sequence.map((item, index) => ids.includes(item.songId ?? '') ? index : -1).filter((index) => index >= 0))
      setSequence((items) => items.filter((item) => !ids.includes(item.songId ?? '')))
      if (previewSlide?.songId && ids.includes(previewSlide.songId)) stagePreview(null, null)
      else if (previewPosition !== null) setPreviewPosition(previewPosition - [...removedIndexes].filter((index) => index < previewPosition).length)
      if (liveSlide?.songId && ids.includes(liveSlide.songId)) { setLiveSlide(null); setLivePosition(null); setLivePlayback(null) }
      else if (livePosition !== null) setLivePosition(livePosition - [...removedIndexes].filter((index) => index < livePosition).length)
      setSelectedSongIds((current) => current.filter((id) => !ids.includes(id)))
      setResourceRevision((revision) => revision + 1)
      setPersistenceMessage(`Deleted ${deleted} ${deleted === 1 ? 'song' : 'songs'} from the lyrics library.`)
    } catch (error) { setPersistenceMessage(String(error)) }
  }
  async function openExternalPresentationFile(fileId: string) {
    if (!isTauri()) { setPersistenceMessage('Open BibleShow in the desktop app to open PowerPoint files.'); return }
    try {
      await invoke('open_external_presentation_file', { fileId })
      setPersistenceMessage('Opened with the app associated with this presentation file.')
    } catch (error) { setPersistenceMessage(String(error)) }
  }
  const startPowerPointSession = useCallback(async (fileId: string): Promise<PowerPointSession | null> => {
    if (!isTauri()) { setPersistenceMessage('Open BibleShow in the desktop app to control PowerPoint.'); return null }
    try {
      const session = await invoke<PowerPointSession>('start_powerpoint_presentation', { fileId })
      setPowerPointSession(session)
      setSequence((items) => items.map((item) => item.kind === 'powerpoint' && item.presentationFileId === session.fileId
        ? { ...item, pageCount: session.slideCount, mediaPath: session.slideThumbnails[(item.documentPage ?? 1) - 1] ?? item.mediaPath, liveStreamUrl: undefined }
        : item))
      setPreviewSlide((slide) => slide?.kind === 'powerpoint' && slide.presentationFileId === session.fileId
        ? { ...slide, pageCount: session.slideCount, mediaPath: session.slideThumbnails[(slide.documentPage ?? 1) - 1] ?? slide.mediaPath, liveStreamUrl: undefined }
        : slide)
      if (liveSlide?.kind === 'powerpoint') {
        const isSameFile = liveSlide.presentationFileId === session.fileId
        const updatedLive = isSameFile ? { ...liveSlide, pageCount: session.slideCount, mediaPath: session.slideThumbnails[(liveSlide.documentPage ?? 1) - 1] ?? liveSlide.mediaPath, liveStreamUrl: undefined } : liveSlide
        if (isSameFile && (liveSlide.documentPage ?? 1) > 1) {
          await invoke('navigate_powerpoint_slide', { request: { fileId: session.fileId, page: liveSlide.documentPage } })
        }
        setLiveSlide(updatedLive)
      }
      setPersistenceMessage(`PowerPoint is ready. ${session.slideCount} slides are available in BibleShow.`)
      return session
    } catch (error) { setPersistenceMessage(String(error)); return null }
  }, [liveSlide])
  const stopPowerPointSession = useCallback(async () => {
    if (!isTauri()) return
    try {
      await invoke('stop_powerpoint_presentation')
      setPowerPointSession(null)
      setSequence((items) => items.map((item) => item.kind === 'powerpoint' ? { ...item, liveStreamUrl: undefined } : item))
      setPreviewSlide((slide) => slide?.kind === 'powerpoint' ? { ...slide, liveStreamUrl: undefined } : slide)
      setLiveSlide((slide) => slide?.kind === 'powerpoint' ? { ...slide, liveStreamUrl: undefined } : slide)
      setPersistenceMessage('PowerPoint is no longer connected to BibleShow.')
    } catch (error) { setPersistenceMessage(String(error)) }
  }, [])
  async function deletePresentationFile(fileId: string) {
    if (!window.confirm('Delete this presentation file from the local library? Saved shows that use its PDF pages will lose those pages.')) return
    if (!isTauri()) { setPersistenceMessage('Open BibleShow in the desktop app to delete presentation files.'); return }
    try {
      await invoke('delete_presentation_file', { fileId })
      const removed = new Set(sequence.map((item, index) => item.presentationFileId === fileId ? index : -1).filter((index) => index >= 0))
      setSequence((items) => items.filter((item) => item.presentationFileId !== fileId))
      if (previewSlide?.presentationFileId === fileId) stagePreview(null, null)
      else if (previewPosition !== null) setPreviewPosition(previewPosition - [...removed].filter((index) => index < previewPosition).length)
      if (liveSlide?.presentationFileId === fileId) { setLiveSlide(null); setLivePosition(null); setLivePlayback(null) }
      else if (livePosition !== null) setLivePosition(livePosition - [...removed].filter((index) => index < livePosition).length)
      await refreshPresentations()
      setPersistenceMessage('Presentation file deleted from the local library.')
    } catch (error) { setPersistenceMessage(String(error)) }
  }
  const [overlays, setOverlays] = useState<DisplayOverlay[]>(loadDisplayOverlays)
  const [countdown, setCountdown] = useState<CountdownFunction>({ durationSeconds: 300, remainingSeconds: 300, endsAtMs: null, running: false, visible: false })
  const liveSequenceIndex = livePosition ?? (liveSlide ? sequence.findIndex((item) => item.sourceId === liveSlide.sourceId) : -1)
  const nextSlide = liveSequenceIndex >= 0 ? sequence[liveSequenceIndex + 1] ?? null : sequence[0] ?? null
  const hasUnsavedProjectChanges = projectSnapshot(presentationTitle, sequence) !== savedProjectSnapshot
  const audienceSnapshot = useRef<AudienceSnapshot>({ slide: null, alert: null, videoPlayback: null, theme: defaultTheme, overlays: [], countdown: { durationSeconds: 300, remainingSeconds: 300, endsAtMs: null, running: false, visible: false } })
  const previewPlaybackRef = useRef<VideoPlayback | null>(null)
  const previewSlideRef = useRef<PresentationSlide | null>(null)
  const playbackCommandId = useRef(0)
  const lastLiveSyncAt = useRef(0)
  const activeLiveFeedId = useRef<string | null>(null)
  const cameraPeer = useRef<RTCPeerConnection | null>(null)
  useEffect(() => {
    previewPlaybackRef.current = previewPlayback
    previewSlideRef.current = previewSlide
    audienceSnapshot.current = { slide: liveSlide, alert: activeAlert, videoPlayback: livePlayback, theme: presentationTheme, overlays, countdown }
    activeLiveFeedId.current = liveFeedSlide?.sourceId ?? null
  }, [previewPlayback, previewSlide, liveSlide, activeAlert, livePlayback, liveFeedSlide, presentationTheme, overlays, countdown])

  useEffect(() => {
    try {
      if (presentationTheme.kind === 'live') localStorage.removeItem('bibleshow-presentation-theme')
      else localStorage.setItem('bibleshow-presentation-theme', JSON.stringify(persistableTheme(presentationTheme)))
    } catch { /* Theme remains available for this session. */ }
  }, [presentationTheme])

  useEffect(() => {
    if (presentationTheme.kind === 'live' && liveFeedSlide?.sourceId !== presentationTheme.sourceId) setPresentationTheme(defaultTheme)
  }, [liveFeedSlide, presentationTheme])

  useEffect(() => {
    try { localStorage.setItem('bibleshow-display-overlays', JSON.stringify(overlays)) } catch { /* Overlay definitions remain available for this session. */ }
  }, [overlays])

  useEffect(() => {
    try { localStorage.setItem('bibleshow-saved-message-alerts', JSON.stringify(savedAlerts)) } catch { setPersistenceMessage('Could not save the message alert library on this device.') }
  }, [savedAlerts])

  useEffect(() => {
    if (!activeAlert) return
    const duration = activeAlert.mode === 'static' ? activeAlert.staticDurationSeconds * 1000 : activeAlert.repeatCount === null ? null : activeAlert.repeatCount * 18_000
    if (duration === null) return
    const alertId = activeAlert.id
    const timeout = window.setTimeout(() => setActiveAlert((current) => current?.id === alertId ? null : current), duration)
    return () => window.clearTimeout(timeout)
  }, [activeAlert])

  useEffect(() => {
    if (!isTauri()) return
    let cancelled = false
    let unlisten: (() => void) | undefined
    listen('bibleshow-audience-ready', () => { void emit('bibleshow-live-update', audienceSnapshot.current) }).then((stop) => {
      if (cancelled) stop()
      else { unlisten = stop; void emit('bibleshow-live-update', audienceSnapshot.current) }
    }).catch((error) => setPersistenceMessage(String(error)))
    return () => { cancelled = true; unlisten?.() }
  }, [])

  useEffect(() => {
    if (!isTauri() || !cameraStream) return
    let active = true
    let unlistenRequest: (() => void) | undefined
    let unlistenAnswer: (() => void) | undefined
    let unlistenIce: (() => void) | undefined
    let peer: RTCPeerConnection | null = null
    const candidates: RTCIceCandidateInit[] = []
    const closePeer = () => { peer?.close(); peer = null; cameraPeer.current = null }
    const startRelay = async (sourceId: string) => {
      if (!active || sourceId !== cameraStream.id || peer) return
      peer = new RTCPeerConnection()
      cameraPeer.current = peer
      cameraStream.getTracks().forEach((track) => peer?.addTrack(track, cameraStream))
      peer.onicecandidate = (event) => { if (event.candidate) void emit('bibleshow-camera-ice', { sourceId, sender: 'operator', candidate: event.candidate.toJSON() } satisfies CameraSignal) }
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      await emit('bibleshow-camera-offer', { sourceId, sender: 'operator', description: peer.localDescription ?? offer } satisfies CameraSignal)
    }
    void listen<CameraSignal>('bibleshow-camera-request', (event) => { void startRelay(event.payload.sourceId).catch(() => closePeer()) }).then((stop) => { if (active) unlistenRequest = stop; else stop() })
    void listen<CameraSignal>('bibleshow-camera-answer', async (event) => {
      if (!peer || event.payload.sender !== 'audience' || event.payload.sourceId !== cameraStream.id || !event.payload.description) return
      await peer.setRemoteDescription(event.payload.description)
      while (candidates.length) await peer.addIceCandidate(candidates.shift()!)
    }).then((stop) => { if (active) unlistenAnswer = stop; else stop() })
    void listen<CameraSignal>('bibleshow-camera-ice', async (event) => {
      if (!peer || event.payload.sender !== 'audience' || event.payload.sourceId !== cameraStream.id || !event.payload.candidate) return
      if (peer.remoteDescription) await peer.addIceCandidate(event.payload.candidate)
      else candidates.push(event.payload.candidate)
    }).then((stop) => { if (active) unlistenIce = stop; else stop() })
    return () => { active = false; unlistenRequest?.(); unlistenAnswer?.(); unlistenIce?.(); closePeer() }
  }, [cameraStream])

  useEffect(() => {
    if (!isTauri()) return
    void refreshDisplays()
    const timer = window.setInterval(() => void refreshDisplays(), 2500)
    return () => window.clearInterval(timer)
  }, [refreshDisplays])

  useEffect(() => {
    if (audienceWindowOpen || audienceOutputDismissed.current || audienceAutoStartAttempted.current || displays.length < 2 || !selectedDisplay) return
    audienceAutoStartAttempted.current = true
    const displayId = selectedDisplay
    void invoke('set_audience_window_visible', { visible: true, displayId }).then(() => {
      audienceDisplayTarget.current = displayId
      setAudienceWindowOpen(true)
    }).catch((error) => setPersistenceMessage(String(error)))
  }, [audienceWindowOpen, displays.length, selectedDisplay])

  useEffect(() => {
    if (!audienceWindowOpen || !selectedDisplay || audienceDisplayTarget.current === selectedDisplay) return
    void invoke('set_audience_window_visible', { visible: true, displayId: selectedDisplay }).then(() => {
      audienceDisplayTarget.current = selectedDisplay
    }).catch((error) => setPersistenceMessage(String(error)))
  }, [audienceWindowOpen, selectedDisplay])

  useEffect(() => {
    if (!isTauri()) return
    let active = true
    invoke<PowerPointSession | null>('get_active_powerpoint_session').then((session) => {
      if (active && session) {
        setPowerPointSession(session)
        setSequence((items) => items.map((item) => item.kind === 'powerpoint' && item.presentationFileId === session.fileId
          ? { ...item, pageCount: session.slideCount, mediaPath: session.slideThumbnails[(item.documentPage ?? 1) - 1] ?? item.mediaPath, liveStreamUrl: undefined }
          : item))
      }
    }).catch(() => undefined)
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (isTauri()) void emit('bibleshow-live-update', audienceSnapshot.current)
  }, [liveSlide, livePlayback, activeAlert, presentationTheme, overlays, countdown])

  useEffect(() => {
    if (!isTauri()) return
    let active = true
    let unlisten: (() => void) | undefined
    listen<[string, string]>('bibleshow-live-feed-error', (event) => {
      const [streamId, message] = event.payload
      if (!active || activeLiveFeedId.current !== `live:${streamId}`) return
      setPersistenceMessage(message)
      setLiveFeedSlide(null)
      if (previewSlideRef.current?.sourceId === `live:${streamId}`) {
        setPreviewSlide(null)
        setPreviewPosition(null)
        setPreviewPlayback(null)
      }
      setLiveSlide((current) => current?.sourceId === `live:${streamId}` ? null : current)
    }).then((stop) => { if (active) unlisten = stop; else stop() }).catch(() => undefined)
    return () => { active = false; unlisten?.() }
  }, [])

  async function toggleAudienceWindow(visible: boolean) {
    if (!isTauri()) { setPersistenceMessage('Open BibleShow in the desktop app to use audience output.'); return }
    try {
      await invoke('set_audience_window_visible', { visible, displayId: selectedDisplay || null })
      if (!visible) audienceOutputDismissed.current = true
      audienceDisplayTarget.current = visible ? selectedDisplay : null
      setAudienceWindowOpen(visible)
    } catch (error) { setPersistenceMessage(String(error)) }
  }

  async function connectNetworkFeed(sourceUrl: string) {
    if (!isTauri()) { setPersistenceMessage('Open BibleShow in the desktop app to connect a network stream.'); return }
    try {
      const info = await invoke<LiveFeedInfo>('connect_live_feed', { sourceUrl })
      const slide: PresentationSlide = { sourceId: `live:${info.streamId}`, title: 'RTSP Live Feed', subtitle: 'Connected stream', body: '', reference: 'RTSP Live Feed', kind: 'live', liveStreamUrl: info.streamUrl, liveStreamKind: 'mjpeg' }
      setLiveFeedSlide(slide)
      preview(slide)
      setPersistenceMessage('Network stream connected and staged in Preview.')
    } catch (error) { setPersistenceMessage(String(error)) }
  }

  function connectCamera(stream: MediaStream, label: string) {
    setCameraStream((previous) => { previous?.getTracks().forEach((track) => track.stop()); return stream })
    const slide: PresentationSlide = { sourceId: stream.id, title: label, subtitle: 'Connected camera', body: '', reference: label, kind: 'live', liveStreamKind: 'camera' }
    setLiveFeedSlide(slide)
    preview(slide)
    setPersistenceMessage('Camera connected and staged in Preview. Send it Live when ready.')
  }

  function connectStreamUrl(sourceUrl: string, streamKind: 'video' | 'mjpeg' | 'youtube') {
    const youtubeVideoId = streamKind === 'youtube' ? sourceUrl : undefined
    const slide: PresentationSlide = { sourceId: `url:${currentTimeMs()}`, title: streamKind === 'youtube' ? 'YouTube Live' : 'Direct Stream', subtitle: streamKind === 'youtube' ? 'YouTube embedded player' : 'Browser-playable stream', body: '', reference: streamKind === 'youtube' ? 'YouTube Live' : 'Direct Stream', kind: 'live', liveStreamUrl: streamKind === 'youtube' ? undefined : sourceUrl, youtubeVideoId, liveStreamKind: streamKind }
    setLiveFeedSlide(slide)
    preview(slide)
    setPersistenceMessage('Stream URL staged in Preview. Confirm playback before sending it Live.')
  }

  async function stopNetworkFeed() {
    if (!isTauri()) return
    const sourceId = liveFeedSlide?.sourceId
    try {
      if (isTauri()) await invoke('stop_live_feed')
      cameraPeer.current?.close()
      cameraPeer.current = null
      cameraStream?.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
      setLiveFeedSlide(null)
      if (previewSlideRef.current?.sourceId === sourceId) stagePreview(null, null)
      if (liveSlide?.sourceId === sourceId) { setLiveSlide(null); setLivePosition(null) }
      setPersistenceMessage('Network stream disconnected.')
    } catch (error) { setPersistenceMessage(String(error)) }
  }
  const [bibleSearchMode, setBibleSearchMode] = useState<'reference' | 'keyword'>('reference')
  const [bibleSearchRequest, setBibleSearchRequest] = useState<{ mode: 'reference' | 'keyword'; query: string; id: number } | null>(null)
  const [bibleBookNames, setBibleBookNames] = useState<string[]>([])
  const [bookSuggestionsVisible, setBookSuggestionsVisible] = useState(false)
  const [activeBookSuggestion, setActiveBookSuggestion] = useState(-1)
  const [lyricsPresentRequest, setLyricsPresentRequest] = useState<{ query: string; id: number } | null>(null)
  const updateBibleBookNames = useCallback((names: string[]) => setBibleBookNames(names), [])

  function submitFeedSearch() {
    const query = feedSearchQuery.trim()
    if (!query) return
    setBookSuggestionsVisible(false)
    if (activeFeed === 'bible') setBibleSearchRequest((current) => ({ mode: bibleSearchMode, query, id: (current?.id ?? 0) + 1 }))
    if (activeFeed === 'lyrics') setLyricsPresentRequest((current) => ({ query, id: (current?.id ?? 0) + 1 }))
  }

  function chooseBookSuggestion(name: string) {
    setFeedSearchQuery(`${name} `)
    setBookSuggestionsVisible(false)
    setActiveBookSuggestion(-1)
  }

  function startPaneResize(event: ReactPointerEvent<HTMLDivElement>, pane: 'left' | 'right' | 'centerTop') {
    event.preventDefault()
    const startX = event.clientX
    const startY = event.clientY
    const startValue = paneSizes[pane]
    const onMove = (moveEvent: PointerEvent) => {
      const delta = pane === 'centerTop' ? moveEvent.clientY - startY : moveEvent.clientX - startX
      const min = pane === 'centerTop' ? 240 : 190
      const max = pane === 'centerTop' ? Math.max(300, window.innerHeight - 410) : Math.max(300, window.innerWidth - 865)
      setPaneSizes((current) => ({ ...current, [pane]: Math.max(min, Math.min(max, startValue + (pane === 'right' ? -delta : delta))) }))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
    }
    document.body.style.cursor = pane === 'centerTop' ? 'row-resize' : 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  function handleSourceDrop(event: ReactDragEvent<HTMLDivElement>, position = sequence.length) {
    event.preventDefault()
    event.stopPropagation()
    const queueId = event.dataTransfer.getData('text/bibleshow-queue-id')
    if (queueId) {
      const source = sequence.findIndex((item) => item.queueId === queueId)
      const insertion = Math.max(0, Math.min(sequence.length, position))
      if (source >= 0) moveSequenceToPosition(source, source < insertion ? insertion - 1 : insertion)
      return
    }
    const raw = event.dataTransfer.getData('text/bibleshow-slide')
    if (!raw) return
    try {
      const slide = JSON.parse(raw) as PresentationSlide
      const textSlide = slide.kind === 'scripture' || slide.kind === 'lyrics'
      const mediaSlide = slide.kind === 'image' || slide.kind === 'video'
      const presentationSlide = slide.kind === 'pdf' || slide.kind === 'powerpoint'
      if (!slide.sourceId || !(textSlide || mediaSlide || presentationSlide) || (textSlide && !slide.body) || (mediaSlide && (!slide.mediaId || !slide.mediaPath)) || (presentationSlide && (!slide.presentationFileId || !slide.documentPage))) return
      if (!addToSequence(slide, position)) return
      setPersistenceMessage(`${slide.title} added to this show.`)
    } catch {
      setPersistenceMessage('That item could not be added to this show.')
    }
  }

  async function refreshPresentations() {
    if (!isTauri()) return
    try { setPresentations(await invoke<PresentationSummary[]>('list_presentations')) }
    catch (error) { setPersistenceMessage(String(error)) }
  }

  useEffect(() => {
    if (!isTauri()) return
    let active = true
    invoke<PresentationSummary[]>('list_presentations').then((items) => { if (active) setPresentations(items) }).catch((error) => { if (active) setPersistenceMessage(String(error)) })
    return () => { active = false }
  }, [])

  function startNewPresentation(skipUnsavedCheck = false) {
    if (!skipUnsavedCheck && hasUnsavedProjectChanges) { setPendingProjectAction({ kind: 'new' }); return }
    setPresentationId(null)
    setPresentationTitle('Sunday Service')
    clearSequence()
    setSavedProjectSnapshot(projectSnapshot('Sunday Service', []))
    setPersistenceMessage('New presentation started.')
  }

  function leavePresentation() {
    if (hasUnsavedProjectChanges) { setPendingProjectAction({ kind: 'leave' }); return }
    onBack()
  }

  async function resolvePendingProjectAction(choice: 'save' | 'discard' | 'stay') {
    const action = pendingProjectAction
    setPendingProjectAction(null)
    if (!action || choice === 'stay') return
    if (choice === 'save' && !(await saveCurrentPresentation())) return
    if (action.kind === 'leave') { onBack(); return }
    if (action.kind === 'new') { startNewPresentation(true); return }
    await openPresentation(action.id, true)
  }

  async function saveCurrentPresentation(): Promise<boolean> {
    if (!isTauri()) { setPersistenceMessage('Open the desktop app to save presentations.'); return false }
    const snapshot = projectSnapshot(presentationTitle, sequence)
    setPersistenceBusy(true)
    try {
      const id = await invoke<number>('save_presentation', {
        presentationId,
        title: presentationTitle,
        slides: persistedSlides(sequence),
      })
      setPresentationId(id)
      setSavedProjectSnapshot(snapshot)
      setPersistenceMessage('Presentation saved on this device.')
      await refreshPresentations()
      return true
    } catch (error) { setPersistenceMessage(String(error)); return false }
    finally { setPersistenceBusy(false) }
  }

  async function openPresentation(id: number, skipUnsavedCheck = false): Promise<boolean> {
    if (!skipUnsavedCheck && hasUnsavedProjectChanges) { setPendingProjectAction({ kind: 'open', id }); return false }
    setPersistenceBusy(true)
    try {
      const saved = await invoke<SavedPresentation>('load_presentation', { presentationId: id })
      const items = saved.slides.map((slide) => ({ ...slide, ...(powerpointSession && slide.kind === 'powerpoint' && powerpointSession.fileId === slide.presentationFileId ? { pageCount: powerpointSession.slideCount, mediaPath: powerpointSession.slideThumbnails[(slide.documentPage ?? 1) - 1] ?? slide.mediaPath, liveStreamUrl: undefined } : {}), queueId: crypto.randomUUID() }))
      setPresentationId(saved.id)
      setPresentationTitle(saved.title)
      setSavedProjectSnapshot(projectSnapshot(saved.title, saved.slides))
      setSequence(items)
      stagePreview(items[0] ?? null, items.length ? 0 : null)
      setLivePosition(null)
      setPersistenceMessage(`Opened “${saved.title}”. Live output was left unchanged.`)
      return true
    } catch (error) { setPersistenceMessage(String(error)) }
    finally { setPersistenceBusy(false) }
    return false
  }

  async function removePresentation() {
    if (presentationId === null) return
    setPersistenceBusy(true)
    try {
      await invoke('delete_presentation', { presentationId })
      setPresentationId(null)
      setPresentationTitle('Sunday Service')
      setSavedProjectSnapshot(projectSnapshot('Sunday Service', []))
      setPersistenceMessage('Saved presentation deleted.')
      await refreshPresentations()
    } catch (error) { setPersistenceMessage(String(error)) }
    finally { setPersistenceBusy(false) }
  }

  async function importProject(file?: File) {
    if (!file) return
    setPersistenceBusy(true)
    try {
      const project = JSON.parse(await file.text()) as { format?: unknown; version?: unknown; title?: unknown; slides?: unknown }
      if (project.format !== 'bibleshow-project' || project.version !== 1 || typeof project.title !== 'string' || !Array.isArray(project.slides)) {
        throw new Error('This is not a supported BibleShow project file.')
      }
      const slides = project.slides as PresentationSlide[]
      const id = await invoke<number>('save_presentation', {
        presentationId: null,
        title: project.title,
        slides: persistedSlides(slides),
      })
      await refreshPresentations()
      const opened = await openPresentation(id)
      setPersistenceMessage(opened ? 'Project imported and opened on this device.' : 'Project imported. Choose whether to save or discard the current show before opening it.')
    } catch (error) { setPersistenceMessage(String(error)) }
    finally { setPersistenceBusy(false) }
  }

  function exportProject() {
    const slides = persistedSlides(sequence)
    const data = JSON.stringify({ format: 'bibleshow-project', version: 1, title: presentationTitle, slides }, null, 2)
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${presentationTitle.trim().replace(/[^a-z0-9-_ ]/gi, '').trim() || 'BibleShow-Project'}.bibleshow.json`
    link.click()
    URL.revokeObjectURL(url)
    setPersistenceMessage('Project file exported.')
  }

  function stagePreview(slide: PresentationSlide | null, position: number | null) {
    setPreviewSlide(slide)
    setPreviewPosition(position)
    if (slide?.kind === 'video') {
      const nextPlayback = makeVideoPlayback(slide.sourceId, 0, true, true, currentTimeMs())
      setPreviewPlayback((current) => current?.sourceId === slide.sourceId ? current : nextPlayback)
    } else {
      setPreviewPlayback(null)
    }
  }

  function preview(slide: PresentationSlide) {
    stagePreview(slide, null)
  }

  function makeVideoPlayback(sourceId: string, currentTime: number, isPlaying: boolean, loop: boolean, startAtMs: number): VideoPlayback {
    playbackCommandId.current += 1
    return { sourceId, currentTime, isPlaying, loop, duration: 0, startAtMs, updatedAtMs: currentTimeMs(), commandId: playbackCommandId.current }
  }

  function changeVideoPlayback(target: 'preview' | 'live', sourceId: string, patch: Partial<VideoPlayback>, command = true) {
    const setter = target === 'preview' ? setPreviewPlayback : setLivePlayback
    setter((current) => {
      if (!current || current.sourceId !== sourceId) return current
      playbackCommandId.current += command ? 1 : 0
      return { ...current, ...patch, updatedAtMs: Date.now(), commandId: command ? playbackCommandId.current : current.commandId }
    })
  }

  function handleVideoTime(target: 'preview' | 'live', sourceId: string, currentTime: number, duration: number) {
    if (target === 'live') {
      const now = Date.now()
      if (now - lastLiveSyncAt.current < 300) return
      lastLiveSyncAt.current = now
    }
    changeVideoPlayback(target, sourceId, { currentTime, duration }, false)
  }

  function addToSequence(slide: PresentationSlide, requestedPosition = sequence.length): boolean {
    if (sequence.length >= 500) { setPersistenceMessage('A saved show can contain up to 500 slides. Remove a slide before adding another.'); return false }
    const item = { ...slide, queueId: crypto.randomUUID() }
    const position = Math.max(0, Math.min(sequence.length, requestedPosition))
    setSequence((items) => [...items.slice(0, position), item, ...items.slice(position)])
    if (livePosition !== null && livePosition >= position) setLivePosition(livePosition + 1)
    stagePreview(item, position)
    return true
  }

  function addManyToSequence(slides: PresentationSlide[]) {
    if (!slides.length) return
    if (sequence.length + slides.length > 500) { setPersistenceMessage(`A saved show can contain up to 500 slides. There is room for ${Math.max(0, 500 - sequence.length)} more.`); return }
    const items = slides.map((slide) => ({ ...slide, queueId: crypto.randomUUID() }))
    const position = sequence.length
    setSequence((current) => [...current, ...items])
    stagePreview(items[0], position)
  }

  function presentSlides(slides: PresentationSlide[]) {
    if (!slides.length) return
    if (sequence.length + slides.length > 500) { setPersistenceMessage(`A saved show can contain up to 500 slides. There is room for ${Math.max(0, 500 - sequence.length)} more.`); return }
    const items = slides.map((slide) => ({ ...slide, queueId: crypto.randomUUID() }))
    const position = sequence.length
    setSequence((current) => [...current, ...items])
    stagePreview(items[0], position)
    sendLive(items[0], position)
    setPersistenceMessage(`${items.length} slides sent to Preview and Live.`)
  }

  function slidesForDetectedReference(candidate: DetectedBibleReference): PresentationSlide[] {
    return candidate.verses.map((verse) => ({
      sourceId: `${candidate.translationId}:${candidate.bookNumber}:${candidate.chapterNumber}:${verse.verse_number}`,
      title: `${candidate.bookName} ${candidate.chapterNumber}:${verse.verse_number}`,
      subtitle: candidate.translationId,
      body: verse.text,
      reference: `${candidate.bookName} ${candidate.chapterNumber}:${verse.verse_number}`,
      kind: 'scripture',
      translationId: candidate.translationId,
      bookNumber: candidate.bookNumber,
      chapterNumber: candidate.chapterNumber,
      verseNumber: verse.verse_number,
    }))
  }

  async function refreshAudioInputs() {
    try {
      const inputs = await invoke<AudioInput[]>('list_audio_inputs')
      setAudioInputs(inputs)
      if (!selectedAudioInput) {
        const defaultInput = inputs.find((input) => input.is_default)
        if (defaultInput) setSelectedAudioInput(String(defaultInput.index))
      }
      setSpeechMessage(inputs.length ? `${inputs.length} microphone input${inputs.length === 1 ? '' : 's'} available.` : 'No microphone inputs found.')
    } catch (error) { setSpeechMessage(String(error)) }
  }

  async function startBibleMicrophone() {
    try {
      const inputs = audioInputs.length ? audioInputs : await invoke<AudioInput[]>('list_audio_inputs')
      setAudioInputs(inputs)
      if (!inputs.length) throw new Error('No microphone inputs found.')
      const deviceIndex = selectedAudioInput ? Number(selectedAudioInput) : null
      if (speechAnalysisTimerRef.current) clearTimeout(speechAnalysisTimerRef.current)
      completedSpeechTranscriptRef.current = ''
      detectionTranscriptRef.current = ''
      previewedDetectionIdsRef.current.clear()
      liveDetectionIdsRef.current.clear()
      setDetectionTranscript('')
      setDetectedReferences([])
      await invoke('start_bible_microphone', { deviceIndex, engine: detectionSettingsRef.current.speechEngine, language: detectionSettingsRef.current.whisperLanguage })
      setSpeechMessage('Starting offline speech recognition…')
    } catch (error) { setSpeechStatus('error'); setSpeechMessage(String(error)) }
  }

  async function stopBibleMicrophone() {
    try { await invoke('stop_bible_microphone') }
    catch (error) { setSpeechMessage(String(error)) }
  }

  async function matchBibleTranscript(request: DetectionRequest) {
    const transcript = request.transcript.trim()
    if (request.origin === 'manual') setDetectionMessage('Matching the transcript against the installed Bible…')
    try {
      const transcripts = [...new Set([transcript, ...(request.alternatives ?? [])].map((item) => item.trim()).filter(Boolean))]
      const variants = await Promise.all(transcripts.map(async (text) => {
        const [referenceResult, quoteResult] = await Promise.allSettled([
          invoke<DetectedBibleReference[]>('detect_bible_references', { transcript: text, translationId: 'KJV' }),
          invoke<DetectedBibleReference[]>('detect_bible_quotes', { transcript: text, translationId: 'KJV' }),
        ])
        return { referenceResult, quoteResult }
      }))
      const referencesByTranscript = variants.map(({ referenceResult }) => referenceResult.status === 'fulfilled' ? referenceResult.value : [])
      const quotationsByTranscript = variants.map(({ quoteResult }) => quoteResult.status === 'fulfilled' ? quoteResult.value : [])
      const references = [...new Map(referencesByTranscript.flat().map((candidate) => [candidate.reference, candidate])).values()]
      const quotations = [...new Map(quotationsByTranscript.flat().map((candidate) => [candidate.reference, candidate])).values()]
      const agreedReferences = new Set(referencesByTranscript[0]?.map((candidate) => candidate.reference) ?? [])
      for (const variantReferences of referencesByTranscript.slice(1)) {
        const variantSet = new Set(variantReferences.map((candidate) => candidate.reference))
        for (const reference of agreedReferences) if (!variantSet.has(reference)) agreedReferences.delete(reference)
      }
      const results = [...new Map([...quotations, ...references].map((candidate) => [candidate.reference, candidate])).values()]
      if (request.origin === 'manual' || results.length) setDetectedReferences(results)
      const failedVariants = variants.filter(({ referenceResult, quoteResult }) => referenceResult.status === 'rejected' && quoteResult.status === 'rejected')
      if (failedVariants.length === variants.length) {
        const firstFailure = failedVariants[0].referenceResult
        throw firstFailure.status === 'rejected' ? firstFailure.reason : new Error('Bible matching is unavailable.')
      }
      const searchWarning = variants.some(({ quoteResult }) => quoteResult.status === 'rejected') ? ' Some wording searches were unavailable.' : ''
      if (request.origin === 'microphone' && detectionSettingsRef.current.detectWhileListening && results.length) {
        const settings = detectionSettingsRef.current
        const routeId = (candidate: DetectedBibleReference) => `${candidate.detectionMethod ?? 'reference'}:${candidate.reference}`
        const liveSlides: PresentationSlide[] = []
        const previewSlides: PresentationSlide[] = []
        for (const candidate of references) {
          const id = routeId(candidate)
          if (liveDetectionIdsRef.current.has(id)) continue
          const isBoundedPassage = candidate.reference.includes(':')
          if (request.finalSegment && settings.directReferencesToLive && isBoundedPassage && agreedReferences.has(candidate.reference)) {
            liveDetectionIdsRef.current.add(id)
            liveSlides.push(...slidesForDetectedReference(candidate))
          } else if (request.finalSegment && !previewedDetectionIdsRef.current.has(id)) {
            previewedDetectionIdsRef.current.add(id)
            previewSlides.push(...slidesForDetectedReference(candidate))
          }
        }
        for (const candidate of quotations) {
          const id = routeId(candidate)
          const score = Math.round((candidate.matchScore ?? 0) * 100)
          if (request.finalSegment && score >= settings.reviewThreshold && !previewedDetectionIdsRef.current.has(id)) {
            previewedDetectionIdsRef.current.add(id)
            previewSlides.push(...slidesForDetectedReference(candidate))
          }
        }
        if (liveSlides.length || previewSlides.length) {
          const slides = [...liveSlides, ...previewSlides]
          if (sequence.length + slides.length > 500) {
            setPersistenceMessage(`A saved show can contain up to 500 slides. There is room for ${Math.max(0, 500 - sequence.length)} more.`)
          } else {
            const items = slides.map((slide) => ({ ...slide, queueId: crypto.randomUUID() }))
            const position = sequence.length
            setSequence((current) => [...current, ...items])
            if (liveSlides.length) sendLive(items[0], position)
            const previewIndex = previewSlides.length ? liveSlides.length : 0
            stagePreview(items[previewIndex], position + previewIndex)
            setDetectionMessage(liveSlides.length
              ? `Validated passage sent to Live${previewSlides.length ? ' and another match staged in Preview' : ''}.`
              : `Bible passage staged in Preview: ${references.map((candidate) => candidate.reference).join(', ') || quotations.map((candidate) => candidate.reference).join(', ')}.`)
          }
        } else if (request.finalSegment) {
          setDetectionMessage(results.length
            ? 'A wording match was found, but it did not reach the Preview review threshold.'
            : 'No Bible reference or wording match found in the latest speech segment.')
        }
      } else if (request.origin === 'manual') {
        setDetectionMessage((results.length
          ? `Found ${references.length} direct reference${references.length === 1 ? '' : 's'} and ${quotations.length} wording match${quotations.length === 1 ? '' : 'es'}. Wording similarity is not calibrated confidence.`
          : 'No reference or strong wording match found in the installed KJV.') + searchWarning)
      }
    } catch (error) {
      setDetectedReferences([])
      setDetectionMessage(String(error))
    }
  }

  function enqueueBibleTranscript(request?: DetectionRequest) {
    const nextRequest = request ?? { transcript: detectionTranscript, origin: 'manual' as const, finalSegment: true }
    const transcript = nextRequest.transcript.trim()
    if (!transcript) return
    pendingDetectionTranscriptRef.current = { ...nextRequest, transcript }
    if (detectionAnalysisRunningRef.current) return
    detectionAnalysisRunningRef.current = true
    setDetectionBusy(true)
    void (async () => {
      try {
        while (pendingDetectionTranscriptRef.current !== null) {
          const next = pendingDetectionTranscriptRef.current
          pendingDetectionTranscriptRef.current = null
          await matchBibleTranscript(next)
        }
      } finally {
        detectionAnalysisRunningRef.current = false
        setDetectionBusy(false)
        if (pendingDetectionTranscriptRef.current !== null) enqueueBibleTranscript(pendingDetectionTranscriptRef.current)
      }
    })()
  }

  useEffect(() => { analyzeBibleTranscriptRef.current = enqueueBibleTranscript }, [detectionTranscript, detectionSettings])
  useEffect(() => {
    detectionSettingsRef.current = detectionSettings
    try { localStorage.setItem('bibleshow-bible-detection-settings', JSON.stringify(detectionSettings)) } catch { /* Settings remain available for this session. */ }
  }, [detectionSettings])
  useEffect(() => { detectionTranscriptRef.current = detectionTranscript }, [detectionTranscript])

  function selectPreviewPosition(position: number) {
    const item = sequence[position]
    if (!item) return
    stagePreview(item, position)
  }

  function movePreview(direction: -1 | 1) {
    if (previewSlide?.kind === 'powerpoint' && previewPosition === null && previewSlide.pageCount) {
      const page = Math.max(1, Math.min(previewSlide.pageCount, (previewSlide.documentPage ?? 1) + direction))
      const next = { ...previewSlide, sourceId: `presentation-file:${previewSlide.presentationFileId}:${page}`, subtitle: `Slide ${page}`, documentPage: page, mediaPath: undefined }
      if (powerpointSession?.fileId === previewSlide.presentationFileId) {
        void invoke<string>('export_powerpoint_slide_preview', { request: { fileId: previewSlide.presentationFileId, page } })
          .then((mediaPath) => stagePreview({ ...next, mediaPath }, null))
          .catch((error) => setPersistenceMessage(String(error)))
      } else stagePreview(next, null)
      return
    }
    if (previewSlide?.kind === 'pdf' && previewPosition === null && previewSlide.pageCount) {
      const page = Math.max(1, Math.min(previewSlide.pageCount, (previewSlide.documentPage ?? 1) + direction))
      stagePreview({ ...previewSlide, sourceId: `presentation-file:${previewSlide.presentationFileId}:${page}`, subtitle: `Page ${page}`, documentPage: page }, null)
      return
    }
    if (!sequence.length) return
    const current = previewPosition ?? (direction > 0 ? -1 : sequence.length)
    selectPreviewPosition(Math.max(0, Math.min(sequence.length - 1, current + direction)))
  }

  const sendLive = useCallback(async (slide: PresentationSlide, position: number | null) => {
    let liveItem = slide
    if (slide.kind === 'powerpoint' && slide.presentationFileId) {
      let session = powerpointSession?.fileId === slide.presentationFileId ? powerpointSession : null
      if (!session) session = await startPowerPointSession(slide.presentationFileId)
      if (!session) return
      const page = slide.documentPage ?? 1
      try {
        await invoke('navigate_powerpoint_slide', { request: { fileId: slide.presentationFileId, page } })
        const mediaPath = await invoke<string>('export_powerpoint_slide_preview', { request: { fileId: slide.presentationFileId, page } })
        liveItem = { ...slide, pageCount: session.slideCount, mediaPath, liveStreamUrl: undefined }
      } catch (error) { setPersistenceMessage(String(error)); return }
    }
    if (liveItem.kind === 'video') {
      const previewState = previewPlaybackRef.current?.sourceId === liveItem.sourceId ? previewPlaybackRef.current : null
      const startAtMs = currentTimeMs() + (delayLiveVideo ? 1000 : 0)
      setLivePlayback(makeVideoPlayback(liveItem.sourceId, previewState?.currentTime ?? 0, previewState?.isPlaying ?? true, previewState?.loop ?? true, startAtMs))
    } else {
      setLivePlayback(null)
    }
    setLiveSlide(liveItem)
    setLivePosition(position)
    setLiveDisplayOpen(true)
  }, [delayLiveVideo, powerpointSession, startPowerPointSession])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat || !previewSlide) return
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      event.preventDefault()
      sendLive(previewSlide, previewPosition)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [previewSlide, previewPosition, sendLive])

  function moveLive(direction: -1 | 1) {
    if (liveSlide?.kind === 'powerpoint' && livePosition === null && liveSlide.pageCount) {
      const page = Math.max(1, Math.min(liveSlide.pageCount, (liveSlide.documentPage ?? 1) + direction))
      void sendLive({ ...liveSlide, sourceId: `presentation-file:${liveSlide.presentationFileId}:${page}`, subtitle: `Slide ${page}`, documentPage: page }, null)
      return
    }
    if (liveSlide?.kind === 'pdf' && livePosition === null && liveSlide.pageCount) {
      const page = Math.max(1, Math.min(liveSlide.pageCount, (liveSlide.documentPage ?? 1) + direction))
      setLiveSlide({ ...liveSlide, sourceId: `presentation-file:${liveSlide.presentationFileId}:${page}`, subtitle: `Page ${page}`, documentPage: page })
      return
    }
    if (!sequence.length) return
    const current = livePosition ?? (direction > 0 ? -1 : sequence.length)
    const position = Math.max(0, Math.min(sequence.length - 1, current + direction))
    sendLive(sequence[position], position)
  }

  function removeFromSequence(position: number) {
    setSequence((items) => items.filter((_, index) => index !== position))
    if (previewPosition === position) {
      stagePreview(null, null)
    } else if (previewPosition !== null && previewPosition > position) setPreviewPosition(previewPosition - 1)
    if (livePosition === position) setLivePosition(null)
    else if (livePosition !== null && livePosition > position) setLivePosition(livePosition - 1)
  }

  function beginSlideEdit(position: number) {
    const slide = sequence[position]
    if (!slide) return
    setSlideDraft({ title: slide.title, subtitle: slide.subtitle, reference: slide.reference, body: displayBody(slide) })
    setEditingPosition(position)
  }

  function saveSlideEdit() {
    if (editingPosition === null) return
    const original = sequence[editingPosition]
    if (!original) { setEditingPosition(null); return }
    const title = slideDraft.title.trim()
    if (!title) return
    const hasEditableText = original.kind === 'scripture' || original.kind === 'lyrics'
    const updated: QueuedSlide = {
      ...original,
      title,
      subtitle: slideDraft.subtitle.trim(),
      reference: slideDraft.reference.trim(),
      ...(hasEditableText ? { bodyOverride: slideDraft.body === original.body ? null : slideDraft.body } : {}),
    }
    setSequence((items) => items.map((item, index) => index === editingPosition ? updated : item))
    if (previewPosition === editingPosition) stagePreview(updated, editingPosition)
    setPersistenceMessage('Slide updated in this show. Save the project to keep the changes.')
    setEditingPosition(null)
  }

  function moveSequenceItem(position: number, direction: -1 | 1) {
    const target = position + direction
    if (target < 0 || target >= sequence.length) return
    setSequence((items) => {
      const reordered = [...items]
      ;[reordered[position], reordered[target]] = [reordered[target], reordered[position]]
      return reordered
    })
    if (previewPosition === position) setPreviewPosition(target)
    else if (previewPosition === target) setPreviewPosition(position)
    if (livePosition === position) setLivePosition(target)
    else if (livePosition === target) setLivePosition(position)
  }

  function moveSequenceToPosition(source: number, target: number) {
    if (source === target || source < 0 || target < 0 || source >= sequence.length || target >= sequence.length) return
    setSequence((items) => {
      const reordered = [...items]
      const [item] = reordered.splice(source, 1)
      reordered.splice(target, 0, item)
      return reordered
    })
    const remap = (position: number | null) => position === null ? null : position === source ? target : source < target && position > source && position <= target ? position - 1 : source > target && position >= target && position < source ? position + 1 : position
    setPreviewPosition((position) => remap(position))
    setLivePosition((position) => remap(position))
  }

  function duplicateSequenceItem(position: number) {
    const original = sequence[position]
    if (!original) return
    const duplicate = { ...original, queueId: crypto.randomUUID() }
    setSequence((items) => [...items.slice(0, position + 1), duplicate, ...items.slice(position + 1)])
    if (previewPosition !== null && previewPosition > position) setPreviewPosition(previewPosition + 1)
    if (livePosition !== null && livePosition > position) setLivePosition(livePosition + 1)
  }

  function clearSequence() {
    setSequence([])
    stagePreview(null, null)
    setLivePosition(null)
  }

  function clearMediaFromSequence() {
    const removed = new Set(sequence.map((item, index) => item.kind === 'image' || item.kind === 'video' ? index : -1).filter((index) => index >= 0))
    if (!removed.size) return
    setSequence((items) => items.filter((item) => item.kind !== 'image' && item.kind !== 'video'))
    if (previewPosition !== null) {
      if (removed.has(previewPosition)) setPreviewPosition(null)
      else setPreviewPosition(previewPosition - [...removed].filter((index) => index < previewPosition).length)
    }
    if (livePosition !== null) {
      if (removed.has(livePosition)) setLivePosition(null)
      else setLivePosition(livePosition - [...removed].filter((index) => index < livePosition).length)
    }
    setPersistenceMessage(`Removed ${removed.size} image/video ${removed.size === 1 ? 'slide' : 'slides'} from this show. Media files remain in the library.`)
  }

  const referenceQuery = feedSearchQuery.trim().toLocaleLowerCase()
  const bookSuggestions = activeFeed === 'bible' && bibleSearchMode === 'reference' && bookSuggestionsVisible && referenceQuery
    ? bibleBookNames.filter((name) => name.toLocaleLowerCase().startsWith(referenceQuery)).slice(0, 10)
    : []
  const selectedDisplayInfo = displays.find((display) => display.id === selectedDisplay)
  const displayStatus = displayError || (!displays.length
    ? 'Your system reports no active display. Enable the TV as an extended display in Display settings; BibleShow checks again automatically.'
    : displays.length === 1
      ? 'Only the primary screen is detected. Enable the TV as an extended screen in Display settings.'
      : selectedDisplayInfo?.isPrimary
        ? 'Primary screen selected. The secondary screen is available in this list.'
        : 'Secondary screen selected automatically. Live output opens there, and new screens are detected while BibleShow is open.')

  return (
    <section className="presentation-workspace">
      <div className="presentation-toolbar" role="toolbar" aria-label="Presentation toolbar">
        <button className="toolbar-exit" onClick={leavePresentation} aria-label="Leave presentation" title="Leave presentation">←</button>
        <span className="toolbar-brand">BibleShow</span>
        {['File', 'Profile', 'Edit', 'View', 'Settings', 'Connections', 'Plugins'].map((item) => <button key={item} className={toolbarPanel === item ? 'active' : ''} onClick={() => setToolbarPanel((open) => open === item ? null : item)}>{item}</button>)}
        {persistenceMessage && <span className="toolbar-status-message" role="status" title={persistenceMessage}>{persistenceMessage}</span>}
        <span className="toolbar-spacer" />
        <span className="translation-badge">{presentationId === null ? 'UNSAVED SHOW' : 'SAVED PROJECT'}</span>
      </div>
      {toolbarPanel === 'File' ? <div className="toolbar-file-panel" role="menu" aria-label="File menu">
        <section className="toolbar-file-projects"><header><strong>Current project</strong><small>{sequence.length} items · {presentationId === null ? 'Unsaved show' : 'Saved project'}</small></header><div className="project-controls">
          <div className="project-actions"><button role="menuitem" onClick={() => { void startNewPresentation(); setToolbarPanel(null) }} disabled={persistenceBusy}>New show</button><button className="save-presentation-button" role="menuitem" onClick={() => void saveCurrentPresentation()} disabled={persistenceBusy}>{persistenceBusy ? 'Working…' : presentationId === null ? 'Save as project' : 'Save changes'}</button></div>
          <label>Show name<input value={presentationTitle} maxLength={160} onChange={(event) => setPresentationTitle(event.target.value)} /></label>
          <label>Open saved project<select value={presentationId ?? ''} onChange={(event) => { const id = Number(event.target.value); if (event.target.value) { void openPresentation(id); setToolbarPanel(null) } }} disabled={!presentations.length || persistenceBusy}><option value="">{presentations.length ? 'Choose a project' : 'No saved projects yet'}</option>{presentations.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.slideCount} items</option>)}</select></label>
          <div className="project-actions"><label className="project-file-button">Import<input type="file" accept=".json,application/json" disabled={persistenceBusy} onChange={(event) => { void importProject(event.currentTarget.files?.[0]); event.currentTarget.value = '' }} /></label><button role="menuitem" onClick={exportProject} disabled={!sequence.length}>Export</button>{presentationId !== null && <button role="menuitem" onClick={() => void removePresentation()} disabled={persistenceBusy}>Delete project</button>}</div>
        </div></section>
        <section className="toolbar-file-lyrics"><strong>Lyrics library</strong><button role="menuitem" onClick={() => openSongEditor(null)}>Add new song</button><button role="menuitem" onClick={() => { setActiveFeed('lyrics'); setLyricsImportRequest((request) => request + 1); setToolbarPanel(null) }}>Import songs or hymns</button><button role="menuitem" onClick={() => openSongEditor(selectedSongIds.length === 1 ? selectedSongIds[0] : null)} disabled={selectedSongIds.length !== 1}>Edit selected song</button><button role="menuitem" onClick={() => deleteLibrarySongs(selectedSongIds)} disabled={!selectedSongIds.length}>Delete selected ({selectedSongIds.length})</button><button role="menuitem" onClick={() => openSongExport(selectedSongIds)} disabled={!selectedSongIds.length}>Export selected</button></section>
      </div> : toolbarPanel && <div className="toolbar-placeholder" role="status"><strong>{toolbarPanel}</strong> options will be shaped with you as this area is implemented.</div>}
      {pendingProjectAction && <div className="project-change-backdrop"><section className="project-change-dialog" role="dialog" aria-modal="true" aria-labelledby="project-change-title"><h2 id="project-change-title">Unsaved show changes</h2><p>{pendingProjectAction.kind === 'leave' ? 'Save your changes before leaving the presentation workspace?' : pendingProjectAction.kind === 'new' ? 'Save your changes before starting a new show?' : 'Save your changes before opening another project?'}</p><div><button className="save-presentation-button" onClick={() => void resolvePendingProjectAction('save')} disabled={persistenceBusy}>Save and continue</button><button onClick={() => void resolvePendingProjectAction('discard')} disabled={persistenceBusy}>Discard changes</button><button onClick={() => void resolvePendingProjectAction('stay')} disabled={persistenceBusy}>Stay here</button></div></section></div>}
      {editingPosition !== null && <div className="project-change-backdrop"><form className="project-change-dialog slide-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="slide-edit-title" onSubmit={(event) => { event.preventDefault(); saveSlideEdit() }}><h2 id="slide-edit-title">Edit show slide</h2><label>Title<input autoFocus maxLength={160} value={slideDraft.title} onChange={(event) => setSlideDraft((draft) => ({ ...draft, title: event.target.value }))} /></label><label>Subtitle<input maxLength={160} value={slideDraft.subtitle} onChange={(event) => setSlideDraft((draft) => ({ ...draft, subtitle: event.target.value }))} /></label><label>Reference or attribution<input maxLength={160} value={slideDraft.reference} onChange={(event) => setSlideDraft((draft) => ({ ...draft, reference: event.target.value }))} /></label>{['scripture', 'lyrics'].includes(sequence[editingPosition]?.kind ?? '') && <label>Displayed text<textarea maxLength={4000} rows={7} value={slideDraft.body} onChange={(event) => setSlideDraft((draft) => ({ ...draft, body: event.target.value }))} /><span>Text changes apply only to this show slide. The imported Bible or song remains unchanged.</span><button type="button" onClick={() => setSlideDraft((draft) => ({ ...draft, body: sequence[editingPosition]?.body ?? '' }))}>Reset text to source</button></label>}<div><button type="button" onClick={() => setEditingPosition(null)}>Cancel</button><button type="submit" className="save-presentation-button" disabled={!slideDraft.title.trim()}>Apply to show</button></div></form></div>}

      <div className="operator-layout" style={{ '--left-pane-width': `${paneSizes.left}px`, '--right-pane-width': `${paneSizes.right}px`, '--center-top-height': `${paneSizes.centerTop}px` } as CSSProperties}>
        <aside className="operator-show-items operator-pane">
          <header className="pane-heading"><div><strong>Current show</strong></div><button onClick={clearSequence} disabled={!sequence.length}>Clear show</button></header>
          <p className="sequence-help">Drag content here to add it. Drag show items to reorder.</p>
          <div className="sequence-list" onDragOver={(event) => event.preventDefault()} onDrop={handleSourceDrop}>
            {sequence.map((item, index) => <div className={`sequence-item${previewPosition === index ? ' is-preview' : ''}${livePosition === index ? ' is-live' : ''}`} key={item.queueId} draggable onDragStart={(event) => { event.dataTransfer.setData('text/bibleshow-queue-id', item.queueId); event.dataTransfer.effectAllowed = 'move' }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); handleSourceDrop(event, index + Number(event.clientY > bounds.top + bounds.height / 2)) }}>
              <button className="sequence-select" onClick={() => selectPreviewPosition(index)} onDoubleClick={() => sendLive(item, index)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); sendLive(item, index) } }} aria-label={`Preview ${item.title}; press Enter or double-click to send Live`}><span className="sequence-number">{String(index + 1).padStart(2, '0')}</span><span className="sequence-thumb">{displayBody(item).slice(0, 38)}</span><span className="sequence-item-title">{item.title}</span><small>{item.subtitle}</small></button>
              <button className="sequence-remove" onClick={() => removeFromSequence(index)} aria-label={`Remove ${item.title} from sequence`}>×</button>
              <div className="sequence-tools"><button onClick={() => beginSlideEdit(index)}>Edit</button><button onClick={() => moveSequenceItem(index, -1)} disabled={index === 0} aria-label={`Move ${item.title} up`}>↑</button><button onClick={() => moveSequenceItem(index, 1)} disabled={index === sequence.length - 1} aria-label={`Move ${item.title} down`}>↓</button><button onClick={() => duplicateSequenceItem(index)}>Duplicate</button></div>
              {livePosition === index && <span className="sequence-live-label">LIVE</span>}{previewPosition === index && <span className="sequence-preview-label">PREVIEW</span>}
            </div>)}
            {sequence.length === 0 && <div className="sequence-empty"><Icon name="plus" size={18} /><strong>Drop items for this show</strong><p>Drag content here from the feeds below or add it with the + buttons.</p></div>}
          </div>
        </aside>

        <div className="pane-resizer vertical-resizer" role="separator" aria-label="Resize current show panel" aria-orientation="vertical" onPointerDown={(event) => startPaneResize(event, 'left')} />

        <main className="operator-center">
          <section className="operator-display-area">
            <div className="operator-monitors">
              <MonitorPanel type="preview" slide={previewSlide} theme={presentationTheme} cameraStream={cameraStream} playback={previewPlayback} delayLiveVideo={delayLiveVideo} onDelayLiveVideoChange={setDelayLiveVideo} onPlaybackCommand={(sourceId, patch) => changeVideoPlayback('preview', sourceId, patch)} onPlaybackTime={(sourceId, currentTime, duration) => handleVideoTime('preview', sourceId, currentTime, duration)} onPrevious={() => movePreview(-1)} onNext={() => movePreview(1)} canNavigate={sequence.length > 0 || (previewSlide?.kind === 'pdf' && previewPosition === null && (previewSlide.pageCount ?? 0) > 1)} onAction={() => previewSlide && sendLive(previewSlide, previewPosition)} />
              <MonitorPanel type="live" slide={liveDisplayOpen ? liveSlide : null} nextSlide={liveDisplayOpen ? nextSlide : null} theme={presentationTheme} overlays={liveDisplayOpen ? overlays : []} countdown={liveDisplayOpen ? countdown : undefined} cameraStream={cameraStream} playback={livePlayback} onPlaybackCommand={(sourceId, patch) => changeVideoPlayback('live', sourceId, patch)} onPlaybackTime={(sourceId, currentTime, duration) => handleVideoTime('live', sourceId, currentTime, duration)} alert={liveDisplayOpen ? activeAlert : null} onPrevious={() => moveLive(-1)} onNext={() => moveLive(1)} canNavigate={sequence.length > 0 || (liveSlide?.kind === 'pdf' && livePosition === null && (liveSlide.pageCount ?? 1) > 1)} onAction={() => moveLive(1)} emptyLabel={liveDisplayOpen ? 'Nothing live yet' : 'Live display is closed'} />
            </div>
            <div className="operator-status feed-search-bar" role="search" aria-label={`Search ${presentationFeedLabels[activeFeed]}`}>
              <Icon name="search" size={17} />
              {activeFeed === 'bible' && <select aria-label="Bible search type" value={bibleSearchMode} onChange={(event) => { setBibleSearchMode(event.target.value as 'reference' | 'keyword'); setBookSuggestionsVisible(false) }}><option value="reference">Reference</option><option value="keyword">Keyword</option></select>}
              <div className="feed-search-input-wrap">
                <input type="search" role={activeFeed === 'bible' && bibleSearchMode === 'reference' ? 'combobox' : undefined} aria-autocomplete={activeFeed === 'bible' && bibleSearchMode === 'reference' ? 'list' : undefined} aria-expanded={Boolean(bookSuggestions.length)} aria-controls={bookSuggestions.length ? 'bible-book-suggestions' : undefined} aria-activedescendant={bookSuggestions[activeBookSuggestion] ? `bible-book-suggestion-${activeBookSuggestion}` : undefined} aria-label={`Search ${presentationFeedLabels[activeFeed]}`} value={feedSearchQuery} onFocus={() => setBookSuggestionsVisible(true)} onBlur={() => setBookSuggestionsVisible(false)} onChange={(event) => { setFeedSearchQuery(event.target.value); setActiveBookSuggestion(-1); setBookSuggestionsVisible(true) }} onKeyDown={(event) => { if (bookSuggestions.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) { event.preventDefault(); setActiveBookSuggestion((index) => event.key === 'ArrowDown' ? Math.min(index + 1, bookSuggestions.length - 1) : Math.max(index - 1, 0)); return } if (event.key === 'Escape' && bookSuggestions.length) { event.preventDefault(); setBookSuggestionsVisible(false); return } if (event.key === 'Enter') { event.preventDefault(); if (bookSuggestions[activeBookSuggestion]) chooseBookSuggestion(bookSuggestions[activeBookSuggestion]); else submitFeedSearch() } }} placeholder={activeFeed === 'bible' ? bibleSearchMode === 'reference' ? 'Search passage (e.g. John 3:16-18)' : 'Search words in the Bible' : `Search ${presentationFeedLabels[activeFeed]}`} />
                {bookSuggestions.length > 0 && <div id="bible-book-suggestions" className="bible-book-suggestions" role="listbox" aria-label="Bible books">{bookSuggestions.map((name, index) => <button id={`bible-book-suggestion-${index}`} key={name} role="option" aria-selected={index === activeBookSuggestion} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseBookSuggestion(name)}>{name}</button>)}</div>}
              </div>
              <button type="button" onClick={submitFeedSearch} disabled={!feedSearchQuery.trim()}>Search</button>
              {activeFeed === 'bible' && <span className="operator-offline">Bible</span>}
              {(activeFeed === 'bible' || activeFeed === 'lyrics') && <ResourceImportDialog key={activeFeed === 'lyrics' ? `lyrics-${lyricsImportRequest}` : 'bible-import'} mode={activeFeed} onImported={refreshImportedResources} onDismiss={activeFeed === 'lyrics' ? () => setLyricsImportRequest(0) : undefined} openRequest={activeFeed === 'lyrics' ? lyricsImportRequest : 0} />}
            </div>
          </section>

          <div className="pane-resizer horizontal-resizer" role="separator" aria-label="Resize preview and content areas" aria-orientation="horizontal" onPointerDown={(event) => startPaneResize(event, 'centerTop')} />

          <section className="content-feed operator-pane">
            <nav className="feed-tabs" aria-label="Content feeds">{([
              ['bible', 'Bible'], ['lyrics', 'Lyrics'], ['media', 'Videos / Images'], ['presentations', 'Presentations'], ['live', 'Live Feed'], ['themes', 'Themes'], ['functions', 'Functions'], ['overlays', 'Overlays'], ['url', 'URL Media'],
            ] as const).map(([key, label]) => <button key={key} className={activeFeed === key ? 'selected' : ''} onClick={() => { setActiveFeed(key); setFeedSearchQuery(''); if (key !== 'bible') setBibleSearchRequest(null); if (key !== 'lyrics') { setLyricsPresentRequest(null); setLyricsImportRequest(0) } }}>{label}</button>)}</nav>
            <div className="feed-content">
              {activeFeed === 'bible' && <BibleSourcePicker key={resourceRevision} onPreview={preview} onSendLive={(slide) => sendLive(slide, null)} onPresentSlides={presentSlides} onAdd={addToSequence} onAddMany={addManyToSequence} previewSourceId={previewSlide?.sourceId ?? null} searchRequest={bibleSearchRequest} searchQuery={feedSearchQuery} searchMode={bibleSearchMode} onBookNamesChange={updateBibleBookNames} />}
              {activeFeed === 'lyrics' && <SongSourcePicker key={resourceRevision} searchQuery={feedSearchQuery} presentRequest={lyricsPresentRequest} selectedSongIds={selectedSongIds} onSelectedSongIdsChange={setSelectedSongIds} onEditSong={openSongEditor} onAddSong={() => openSongEditor(null)} onDeleteSongs={deleteLibrarySongs} onExportSongs={openSongExport} onPreview={preview} onSendLive={(slide) => sendLive(slide, null)} onPresentSlides={presentSlides} onAdd={addToSequence} previewSourceId={previewSlide?.sourceId ?? null} />}
              {activeFeed === 'media' && <MediaSourcePicker searchQuery={feedSearchQuery} onPreview={preview} onSendLive={(slide) => sendLive(slide, null)} onAdd={addToSequence} previewSourceId={previewSlide?.sourceId ?? null} />}
              {activeFeed === 'presentations' && <PresentationLibraryFeed presentations={presentations} searchQuery={feedSearchQuery} showSlideCount={sequence.length} onRefreshShows={refreshPresentations} onPreview={preview} onSendLive={(slide) => void sendLive(slide, null)} onAdd={addToSequence} onAddMany={addManyToSequence} onOpenExternal={openExternalPresentationFile} onDeleteFile={deletePresentationFile} powerpointSession={powerpointSession} onStartPowerpoint={startPowerPointSession} onStopPowerpoint={stopPowerPointSession} />}
              {activeFeed === 'live' && <NetworkLiveFeed searchQuery={feedSearchQuery} onConnect={connectNetworkFeed} onConnectCamera={connectCamera} onConnectUrl={connectStreamUrl} onStop={stopNetworkFeed} slide={liveFeedSlide} cameraStream={cameraStream} onPreview={preview} onSendLive={(slide) => sendLive(slide, null)} />}
              {activeFeed === 'themes' && <ThemesFeed searchQuery={feedSearchQuery} theme={presentationTheme} onSelect={setPresentationTheme} liveFeed={liveFeedSlide} resourceRevision={resourceRevision} />}
              {activeFeed === 'functions' && <FunctionsFeed searchQuery={feedSearchQuery} countdown={countdown} onChange={setCountdown} />}
              {activeFeed === 'overlays' && <OverlaysFeed searchQuery={feedSearchQuery} overlays={overlays} onChange={setOverlays} />}
              {activeFeed === 'url' && <div className="feed-coming-soon"><strong>{presentationFeedLabels[activeFeed]}</strong><p>{feedSearchQuery ? `No URL media matches “${feedSearchQuery}”.` : 'This content feed is planned and remains deferred.'}</p></div>}
            </div>
          </section>
        </main>

        <div className="pane-resizer vertical-resizer" role="separator" aria-label="Resize display controls" aria-orientation="vertical" onPointerDown={(event) => startPaneResize(event, 'right')} />

        <aside className="operator-display-controls operator-pane">
          <header className="pane-heading"><div><strong>Display controls</strong><small>{liveDisplayOpen ? 'Local Live monitor ready' : 'Local Live monitor closed'}</small></div><span className={liveDisplayOpen ? 'display-ready-dot' : 'display-closed-dot'} /></header>
          <section className="display-control-group"><h3>Clear items</h3><button onClick={() => stagePreview(null, null)} disabled={!previewSlide}>Clear Preview</button><button onClick={() => { setLiveSlide(null); setLivePosition(null); setLivePlayback(null) }} disabled={!liveSlide}>Clear Live content</button><button onClick={clearMediaFromSequence} disabled={!sequence.some((item) => item.kind === 'image' || item.kind === 'video')}>Clear media from show</button><button onClick={() => setOverlays((items) => items.map((item) => item.locked ? item : { ...item, visible: false }))} disabled={!overlays.some((item) => item.visible && !item.locked)}>Clear unlocked overlays</button><button onClick={() => setActiveAlert(null)} disabled={!activeAlert}>Clear message alert</button><button onClick={() => setLiveDisplayOpen(false)} disabled={!liveDisplayOpen}>Hide operator Live monitor</button><button onClick={() => setLiveDisplayOpen(true)} disabled={liveDisplayOpen}>Show operator Live monitor</button></section>
          <details className="display-control-group bible-detection-panel" open={speechStatus === 'listening'}>
            <summary>Offline Bible detection</summary>
            <small>Microphone speech is checked against the KJV as it arrives. Combined mode compares both final transcripts; a reference found in only one transcript stays in Preview for review.</small>
            <textarea aria-label="Latest speech phrase or transcript to search" rows={3} maxLength={2000} value={detectionTranscript} onChange={(event) => setDetectionTranscript(event.target.value)} placeholder="Latest speech phrase appears here; paste text to search manually" />
            <button className="save-presentation-button" onClick={() => enqueueBibleTranscript()} disabled={!detectionTranscript.trim() || detectionBusy}>{detectionBusy ? 'Matching…' : 'Find Bible passages'}</button>
            {detectionMessage && <small role="status">{detectionMessage}</small>}
            {detectedReferences.map((candidate) => <article className="bible-detection-result" key={`${candidate.reference}-${candidate.detectionMethod}`}>
              <strong>{candidate.reference}{candidate.detectionMethod === 'quotation' ? ` · wording match ${Math.round((candidate.matchScore ?? 0) * 100)}%` : ''}</strong>
              <small>{candidate.detectionMethod === 'quotation' ? 'Wording similarity, not calibrated confidence' : 'Validated direct reference'} · {candidate.verses[0]?.text}</small>
              <div className="display-actions"><button type="button" onClick={() => addManyToSequence(slidesForDetectedReference(candidate))}>Review {candidate.verses.length === 1 ? 'verse' : 'verses'}</button><button type="button" className="save-presentation-button" onClick={() => presentSlides(slidesForDetectedReference(candidate))}>Send Live</button></div>
            </article>)}
          </details>
          <details className="display-control-group speech-detection-panel" open={speechStatus === 'listening'}>
            <summary>Microphone detection</summary>
            <small>Combined mode checks streaming and Whisper transcripts against the local Bible. Audio stays in memory and is discarded; it is never saved.</small>
            <label>Input microphone<select value={selectedAudioInput} onChange={(event) => setSelectedAudioInput(event.target.value)}><option value="">Default microphone</option>{audioInputs.map((input) => <option key={input.index} value={input.index}>{input.name}{input.is_default ? ' · default' : ''}</option>)}</select></label>
            <label>Recognition mode<select value={detectionSettings.speechEngine} disabled={speechStatus === 'listening'} onChange={(event) => setDetectionSettings((settings) => ({ ...settings, speechEngine: event.target.value as BibleDetectionSettings['speechEngine'] }))}><option value="combined">Streaming + Whisper comparison</option><option value="streaming">Fast streaming only · English model</option></select></label>
            {detectionSettings.speechEngine === 'combined' && <label>Whisper language<select value={detectionSettings.whisperLanguage} disabled={speechStatus === 'listening'} onChange={(event) => setDetectionSettings((settings) => ({ ...settings, whisperLanguage: event.target.value as BibleDetectionSettings['whisperLanguage'] }))}><option value="en">English</option><option value="auto">Detect automatically</option></select></label>}
            <label className="speech-detection-toggle"><input type="checkbox" checked={detectionSettings.detectWhileListening} onChange={(event) => setDetectionSettings((settings) => ({ ...settings, detectWhileListening: event.target.checked }))} />Detect Bible matches while listening</label>
            <label className="speech-detection-toggle"><input type="checkbox" checked={detectionSettings.directReferencesToLive} onChange={(event) => setDetectionSettings((settings) => ({ ...settings, directReferencesToLive: event.target.checked }))} />Send validated verse references to Live after recognition finalizes</label>
            <label className="speech-detection-toggle"><input type="checkbox" checked={false} disabled title="Available after semantic matching is calibrated" />Send paraphrases to Live automatically</label>
            <label>Review wording matches from {detectionSettings.reviewThreshold}%<input type="range" min="50" max="95" step="1" value={detectionSettings.reviewThreshold} onChange={(event) => setDetectionSettings((settings) => ({ ...settings, reviewThreshold: Math.min(Number(event.target.value), settings.liveThreshold) }))} /></label>
            <label>Paraphrase Auto-Live threshold {detectionSettings.liveThreshold}%<input type="range" min="70" max="100" step="1" value={detectionSettings.liveThreshold} disabled /></label>
            <small>Direct references are checked against installed Bible verses. Wording scores are similarity, not accuracy. Semantic paraphrase matching and calibrated Auto-Live still need to be completed.</small>
            <div className="display-actions"><button type="button" onClick={() => void refreshAudioInputs()}>Refresh microphones</button>{speechStatus === 'listening' ? <button type="button" onClick={() => void stopBibleMicrophone()}>Stop listening</button> : <button className="save-presentation-button" type="button" onClick={() => { setSpeechStatus('listening'); void startBibleMicrophone() }} disabled={!isTauri()}>Start listening</button>}</div>
            <small role="status">{speechMessage || (speechStatus === 'listening' ? 'Listening for speech…' : 'Microphone is stopped.')}</small>
            {speechInterim && <p className="speech-interim" aria-live="polite">Heard: {speechInterim}</p>}
          </details>
          <section className="display-control-group"><h3>Audience output</h3><label>Display<select value={selectedDisplay} onChange={(event) => { userSelectedDisplay.current = true; setSelectedDisplay(event.target.value) }} disabled={!displays.length}><option value="">Select a display</option>{displays.map((display) => <option key={display.id} value={display.id}>{display.name} · {display.isPrimary ? 'Primary' : 'Secondary'} · {display.width} × {display.height}</option>)}</select></label><div className="display-actions"><button className="save-presentation-button" onClick={() => void toggleAudienceWindow(true)} disabled={audienceWindowOpen || selectedDisplay === ''}>Open fullscreen output</button><button type="button" onClick={() => void refreshDisplays()}>Refresh displays</button></div><button className="display-close-button" onClick={() => void toggleAudienceWindow(false)} disabled={!audienceWindowOpen}>Close audience output</button><small role="status">{audienceWindowOpen ? `Live is projecting to ${selectedDisplayInfo?.name ?? 'the selected screen'}. ${displayStatus}` : displayStatus}</small></section>
          <section className="display-control-group message-alert-controls"><h3>Message alert</h3><label>Title<input value={alertTitleDraft} maxLength={80} onChange={(event) => setAlertTitleDraft(event.target.value)} placeholder="Name this message" /></label><label>Message<textarea value={alertDraft} onChange={(event) => setAlertDraft(event.target.value)} placeholder="Type a message for the audience" rows={3} /></label><div className="alert-setting-row"><label>Display style<select value={alertMode} onChange={(event) => setAlertMode(event.target.value as 'static' | 'scrolling')}><option value="static">Static</option><option value="scrolling">Scrolling</option></select></label><label>Position<select value={alertPosition} onChange={(event) => setAlertPosition(event.target.value as MessageAlert['position'])}><option value="bottom">Bottom</option><option value="middle">Middle</option><option value="top">Top</option></select></label></div><label>Text size <output>{alertFontSize.toFixed(1)}vw</output><input type="range" min="1.8" max="6" step="0.1" value={alertFontSize} onChange={(event) => setAlertFontSize(Number(event.target.value))} /></label><div className="alert-color-row"><label>Text color<input type="color" value={alertTextColor} onChange={(event) => setAlertTextColor(event.target.value)} /></label><label>Background<input type="color" value={alertBackgroundColor} onChange={(event) => setAlertBackgroundColor(event.target.value)} /></label></div>{alertMode === 'static' ? <label>Show for (seconds)<input type="number" min="1" max="600" value={alertStaticDuration} onChange={(event) => setAlertStaticDuration(Math.max(1, Math.min(600, Number(event.target.value) || 1)))} /></label> : <><label>Repeat count<input type="number" min="1" max="100" value={alertRepeatCount} disabled={alertRepeatForever} onChange={(event) => setAlertRepeatCount(Math.max(1, Math.min(100, Number(event.target.value) || 1)))} /></label><label className="alert-repeat-toggle"><input type="checkbox" checked={alertRepeatForever} onChange={(event) => setAlertRepeatForever(event.target.checked)} />Continue until removed</label></>}<div className="alert-actions"><button className="save-presentation-button" onClick={showAlert} disabled={!alertDraft.trim() || !liveDisplayOpen}>Show alert</button><button onClick={saveAlertToLibrary} disabled={!alertTitleDraft.trim() || !alertDraft.trim()}>Save message</button><button onClick={() => setActiveAlert(null)} disabled={!activeAlert}>Clear</button></div><label>Search saved messages<input type="search" value={alertLibrarySearch} onChange={(event) => setAlertLibrarySearch(event.target.value)} placeholder="Search titles and messages" /></label><div className="saved-alert-list">{savedAlerts.filter((item) => `${item.title} ${item.content}`.toLowerCase().includes(alertLibrarySearch.trim().toLowerCase())).map((item) => <div key={item.id}><button className="saved-alert-load" onClick={() => loadAlertFromLibrary(item)}><strong>{item.title}</strong><small>{item.content}</small></button><button className="saved-alert-delete" onClick={() => setSavedAlerts((items) => items.filter((saved) => saved.id !== item.id))} aria-label={`Delete saved alert ${item.title}`}>×</button></div>)}{savedAlerts.length === 0 && <small className="saved-alert-empty">Save a titled message to reuse it here.</small>}{savedAlerts.length > 0 && !savedAlerts.some((item) => `${item.title} ${item.content}`.toLowerCase().includes(alertLibrarySearch.trim().toLowerCase())) && <small className="saved-alert-empty">No saved messages match.</small>}</div></section>
          {activeAlert && <p className="alert-live-status" role="status">{activeAlert.mode === 'scrolling' ? activeAlert.repeatCount === null ? 'Scrolling until removed' : `Scrolling ${activeAlert.repeatCount} time${activeAlert.repeatCount === 1 ? '' : 's'}` : `Static for ${activeAlert.staticDurationSeconds}s`} · {activeAlert.position}</p>}
        </aside>
      </div>
      {songEditorRequest && <SongEditorDialog key={songEditorRequest.request} songId={songEditorRequest.songId} onClose={() => setSongEditorRequest(null)} onSaved={() => { setSongEditorRequest(null); setResourceRevision((revision) => revision + 1); onRefreshLibrary(); setPersistenceMessage('Song saved permanently in the lyrics library.') }} />}
      {songExportRequest && <SongExportDialog key={songExportRequest.request} songIds={songExportRequest.songIds} onClose={() => setSongExportRequest(null)} />}
    </section>
  )
}

function PresentationLibraryFeed({ presentations, searchQuery, showSlideCount, onRefreshShows, onPreview, onSendLive, onAdd, onAddMany, onOpenExternal, onDeleteFile, powerpointSession, onStartPowerpoint, onStopPowerpoint }: {
  presentations: PresentationSummary[]
  searchQuery: string
  showSlideCount: number
  onRefreshShows: () => Promise<void>
  onPreview: (slide: PresentationSlide) => void
  onSendLive: (slide: PresentationSlide) => void
  onAdd: (slide: PresentationSlide) => void
  onAddMany: (slides: PresentationSlide[]) => void
  onOpenExternal: (fileId: string) => void
  onDeleteFile: (fileId: string) => Promise<void>
  powerpointSession: PowerPointSession | null
  onStartPowerpoint: (fileId: string) => Promise<PowerPointSession | null>
  onStopPowerpoint: () => Promise<void>
}) {
  const [view, setView] = useState<'files' | 'shows'>('files')
  return <div className="presentation-library-feed source-browser">
    <nav className="presentation-library-tabs" aria-label="Presentation library">{([['files', 'Presentation files'], ['shows', 'Saved shows']] as const).map(([key, label]) => <button type="button" key={key} className={view === key ? 'selected' : ''} onClick={() => setView(key)}>{label}</button>)}</nav>
    {view === 'files' ? <PresentationFilesFeed searchQuery={searchQuery} showSlideCount={showSlideCount} onPreview={onPreview} onSendLive={onSendLive} onAdd={onAdd} onAddMany={onAddMany} onOpenExternal={onOpenExternal} onDeleteFile={onDeleteFile} powerpointSession={powerpointSession} onStartPowerpoint={onStartPowerpoint} onStopPowerpoint={onStopPowerpoint} /> : <SavedPresentationsFeed presentations={presentations} searchQuery={searchQuery} onRefresh={onRefreshShows} onPreview={onPreview} onSendLive={onSendLive} onAdd={onAdd} onAddMany={onAddMany} />}
  </div>
}

function PresentationFilesFeed({ searchQuery, showSlideCount, onPreview, onSendLive, onAdd, onAddMany, onOpenExternal, onDeleteFile, powerpointSession, onStartPowerpoint, onStopPowerpoint }: {
  searchQuery: string
  showSlideCount: number
  onPreview: (slide: PresentationSlide) => void
  onSendLive: (slide: PresentationSlide) => void
  onAdd: (slide: PresentationSlide) => void
  onAddMany: (slides: PresentationSlide[]) => void
  onOpenExternal: (fileId: string) => void
  onDeleteFile: (fileId: string) => Promise<void>
  powerpointSession: PowerPointSession | null
  onStartPowerpoint: (fileId: string) => Promise<PowerPointSession | null>
  onStopPowerpoint: () => Promise<void>
}) {
  const [files, setFiles] = useState<PresentationFile[]>([])
  const [selectedFileId, setSelectedFileId] = useState('')
  const [pageByFile, setPageByFile] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [previewPaths, setPreviewPaths] = useState<Record<string, string>>({})
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const visibleFiles = files.filter((file) => `${file.filename} ${file.fileType}`.toLowerCase().includes(normalizedSearch))
  const selectedFile = visibleFiles.find((file) => file.id === selectedFileId) ?? visibleFiles[0] ?? null
  const currentPage = selectedFile && ['pdf', 'ppt', 'pptx', 'pps', 'ppsx'].includes(selectedFile.fileType) && selectedFile.pageCount > 0 ? Math.min(selectedFile.pageCount, Math.max(1, pageByFile[selectedFile.id] ?? 1)) : 1
  const previewPath = selectedFile
    ? previewPaths[`${selectedFile.id}:${currentPage}`] ?? (powerpointSession?.fileId === selectedFile.id ? powerpointSession.slideThumbnails[currentPage - 1] ?? '' : '')
    : ''

  useEffect(() => {
    if (!isTauri()) return
    let active = true
    invoke<PresentationFile[]>('get_presentation_files').then((items) => {
      if (!active) return
      setFiles(items)
      setSelectedFileId((current) => items.some((file) => file.id === current) ? current : items[0]?.id ?? '')
    }).catch((error) => { if (active) setMessage(String(error)) })
    return () => { active = false }
  }, [])

  async function refreshFiles() {
    if (!isTauri()) return
    try {
      const items = await invoke<PresentationFile[]>('get_presentation_files')
      setFiles(items)
      setSelectedFileId((current) => items.some((file) => file.id === current) ? current : items[0]?.id ?? '')
    } catch (error) { setMessage(String(error)) }
  }

  async function importFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    if (!isTauri()) { setMessage('Open BibleShow in the desktop app to import presentation files.'); return }
    setBusy(true)
    setMessage(`Reading ${fileList.length} presentation file${fileList.length === 1 ? '' : 's'}…`)
    let imported = 0
    const failures: string[] = []
    try {
      for (const file of Array.from(fileList)) {
        try {
          if (!file.size || file.size > 500 * 1024 * 1024) throw new Error('Choose a non-empty file smaller than 500 MB.')
          const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
          const bytes = new Uint8Array(await file.arrayBuffer())
          let pageCount = 0
          if (extension === 'pdf') {
            const { getDocument } = await loadPdfJs()
            const pdfTask = getDocument({ data: bytes.slice() })
            const pdf = await pdfTask.promise
            pageCount = pdf.numPages
            await pdfTask.destroy()
          }
          const item = await invoke<PresentationFile>('import_presentation_file', bytes, { headers: { 'x-bibleshow-filename': encodeURIComponent(file.name), 'x-bibleshow-page-count': String(pageCount) } })
          setFiles((current) => [item, ...current.filter((existing) => existing.id !== item.id)])
          setSelectedFileId(item.id)
          imported += 1
          setMessage(`Imported ${imported} of ${fileList.length} file${fileList.length === 1 ? '' : 's'}…`)
        } catch (error) { failures.push(`${file.name}: ${String(error)}`) }
      }
      if (imported) setMessage(`Imported ${imported} presentation file${imported === 1 ? '' : 's'}.${failures.length ? ` ${failures.join(' ')}` : ''}`)
      else if (failures.length) setMessage(failures.join(' '))
    } finally { setBusy(false) }
  }

  async function removeFile(file: PresentationFile) {
    await onDeleteFile(file.id)
    await refreshFiles()
  }

  function pdfSlide(file: PresentationFile, page: number): PresentationSlide {
    return { sourceId: `presentation-file:${file.id}:${page}`, title: file.filename, subtitle: `Page ${page}`, body: '', reference: file.filename, kind: 'pdf', presentationFileId: file.id, documentPage: page, pageCount: file.pageCount, mediaPath: file.localPath }
  }

  function powerpointSlide(file: PresentationFile, page: number, imagePath?: string): PresentationSlide {
    const mediaPath = imagePath ?? previewPaths[`${file.id}:${page}`] ?? (powerpointSession?.fileId === file.id ? powerpointSession.slideThumbnails[page - 1] : undefined)
    return { sourceId: `presentation-file:${file.id}:${page}`, title: file.filename, subtitle: `Slide ${page}`, body: '', reference: file.filename, kind: 'powerpoint', presentationFileId: file.id, documentPage: page, pageCount: file.pageCount, mediaPath }
  }

  const powerpointActive = powerpointSession?.fileId === selectedFile?.id

  async function startPowerPoint() {
    if (!selectedFile || !['ppt', 'pptx', 'pps', 'ppsx'].includes(selectedFile.fileType)) return
    setBusy(true)
    const session = await onStartPowerpoint(selectedFile.id)
    if (session) {
      setFiles((items) => items.map((file) => file.id === selectedFile.id ? { ...file, pageCount: session.slideCount } : file))
      setPageByFile((current) => ({ ...current, [selectedFile.id]: 1 }))
      onPreview(powerpointSlide({ ...selectedFile, pageCount: session.slideCount }, 1, session.slideThumbnails[0]))
      setMessage(`${session.slideCount} slides are ready. Select a slide below to preview it.`)
    }
    setBusy(false)
  }

  function selectPowerPointSlide(file: PresentationFile, page: number) {
    setPageByFile((current) => ({ ...current, [file.id]: page }))
    const slide = powerpointSlide(file, page)
    if (!slide.mediaPath) return
    onPreview(slide)
  }

  async function setPage(page: number) {
    if (!selectedFile || !['pdf', 'ppt', 'pptx', 'pps', 'ppsx'].includes(selectedFile.fileType)) return
    const nextPage = Math.min(selectedFile.pageCount, Math.max(1, page || 1))
    setPageByFile((current) => ({ ...current, [selectedFile.id]: nextPage }))
    if (selectedFile.fileType === 'pdf') return
    if (powerpointSession?.fileId !== selectedFile.id) {
      setMessage('Start this file with PowerPoint to create its slide preview.')
      return
    }
    setBusy(true)
    try {
      const path = await invoke<string>('export_powerpoint_slide_preview', { request: { fileId: selectedFile.id, page: nextPage } })
      setPreviewPaths((current) => ({ ...current, [`${selectedFile.id}:${nextPage}`]: path }))
      onPreview(powerpointSlide(selectedFile, nextPage, path))
      setMessage(`Slide ${nextPage} is ready to preview.`)
    } catch (error) { setMessage(String(error)) }
    finally { setBusy(false) }
  }

  function addAllPowerPointSlides() {
    if (!selectedFile || !powerpointSession || powerpointSession.fileId !== selectedFile.id) return
    const availableSlots = Math.max(0, 500 - showSlideCount)
    if (powerpointSession.slideCount > availableSlots) { setMessage(`This show has room for ${availableSlots} more slides. Remove items before adding all ${powerpointSession.slideCount} pages.`); return }
    const slides = Array.from({ length: powerpointSession.slideCount }, (_, index) => powerpointSlide(selectedFile, index + 1, powerpointSession.slideThumbnails[index]))
    onAddMany(slides)
    setMessage(`Added all ${slides.length} slides to the current show.`)
  }

  const fileTypeName = (file: PresentationFile) => file.fileType === 'pdf' ? 'PDF document' : file.fileType === 'odp' ? 'OpenDocument slideshow' : ['pps', 'ppsx'].includes(file.fileType) ? 'PowerPoint slideshow' : 'PowerPoint presentation'

  return <section className="presentation-files-feed">
    <header className="media-feed-toolbar"><div><strong>Presentation files</strong><span>{visibleFiles.length} matching · {files.length} in this library</span></div><label className="media-import-button">{busy ? 'Importing…' : 'Import files'}<input type="file" accept=".pdf,.ppt,.pptx,.pps,.ppsx,.odp,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" multiple disabled={busy || !isTauri()} onChange={(event) => { void importFiles(event.currentTarget.files); event.currentTarget.value = '' }} /></label></header>
    {message && <p className="presentation-files-message" role="status">{message}</p>}
    <div className="presentation-files-body">
      <nav className="presentation-file-list" aria-label="Presentation files">{visibleFiles.map((file) => <div className="presentation-file-row" key={file.id}><button type="button" className={selectedFile?.id === file.id ? 'selected' : ''} onClick={() => setSelectedFileId(file.id)}><strong>{file.filename}</strong><small>{fileTypeName(file)} · {formatPresentationSize(file.fileSize)}{file.pageCount > 0 ? ` · ${file.pageCount} slides` : ''}</small></button><button type="button" aria-label={`Delete ${file.filename}`} title="Delete file" onClick={() => void removeFile(file)}>×</button></div>)}{!visibleFiles.length && <p>{files.length ? 'No presentation files match this search.' : 'Import PDF, PowerPoint, slideshow, or OpenDocument files to browse them here.'}</p>}</nav>
      {selectedFile ? <section className="presentation-file-detail" aria-label={selectedFile.filename}>
        <header><div><strong>{selectedFile.filename}</strong><span>{fileTypeName(selectedFile)} · {formatPresentationSize(selectedFile.fileSize)}</span></div>{['ppt', 'pptx', 'pps', 'ppsx'].includes(selectedFile.fileType) && <div className="presentation-file-actions"><button type="button" className="save-presentation-button" onClick={() => powerpointActive ? void onStopPowerpoint() : void startPowerPoint()} disabled={busy} title="Load slides in BibleShow">{powerpointActive ? 'Stop' : busy ? 'Starting…' : 'Start'}</button><button type="button" onClick={() => onOpenExternal(selectedFile.id)}>Open in PowerPoint</button></div>}<button type="button" onClick={() => void removeFile(selectedFile)}>Delete</button></header>
        {selectedFile.fileType === 'pdf' ? <>
          <div className="presentation-pdf-controls"><button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1} aria-label="Previous PDF page">‹</button><label>Page<input type="number" min={1} max={selectedFile.pageCount} value={currentPage} onChange={(event) => setPage(Number(event.target.value))} /></label><span>of {selectedFile.pageCount}</span><button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= selectedFile.pageCount} aria-label="Next PDF page">›</button></div>
          <div className="presentation-pdf-page" draggable onDragStart={(event) => event.dataTransfer.setData('text/bibleshow-slide', JSON.stringify(pdfSlide(selectedFile, currentPage)))}><PDFPageCanvas localPath={selectedFile.localPath} pageNumber={currentPage} /></div>
          <div className="presentation-pdf-actions"><button type="button" onClick={() => onPreview(pdfSlide(selectedFile, currentPage))}>Preview page</button><button type="button" className="save-presentation-button" onClick={() => onSendLive(pdfSlide(selectedFile, currentPage))}>Send page Live</button><button type="button" onClick={() => onAdd(pdfSlide(selectedFile, currentPage))}>Add page to show</button><button type="button" onClick={() => onAddMany(Array.from({ length: selectedFile.pageCount }, (_, index) => pdfSlide(selectedFile, index + 1)))} disabled={selectedFile.pageCount > 500}>Add all pages to show</button></div>
          {selectedFile.pageCount > 500 && <small className="presentation-file-note">This show can contain up to 500 pages. Add PDF pages individually.</small>}
        </> : ['ppt', 'pptx', 'pps', 'ppsx'].includes(selectedFile.fileType) ? <>
          <div className="presentation-pdf-controls"><button type="button" onClick={() => void setPage(currentPage - 1)} disabled={busy || !selectedFile.pageCount || currentPage <= 1} aria-label="Previous PowerPoint slide">‹</button><label>Slide<input type="number" min={1} max={selectedFile.pageCount || 1} value={currentPage} disabled={busy || !selectedFile.pageCount} onChange={(event) => void setPage(Number(event.target.value))} /></label><span>of {selectedFile.pageCount || '—'}</span><button type="button" onClick={() => void setPage(currentPage + 1)} disabled={busy || !selectedFile.pageCount || currentPage >= selectedFile.pageCount} aria-label="Next PowerPoint slide">›</button></div>
          <div className="presentation-ppt-preview">{previewPath && <img src={convertFileSrc(previewPath)} alt={`${selectedFile.filename}, slide ${currentPage}`} />}</div>
          <div className="presentation-ppt-list-actions"><strong>{powerpointActive ? `${powerpointSession?.slideCount ?? 0} slides` : 'Start to load slides'}</strong><button type="button" onClick={addAllPowerPointSlides} disabled={!powerpointActive || busy || (powerpointSession?.slideCount ?? 0) === 0 || (powerpointSession?.slideCount ?? 0) > Math.max(0, 500 - showSlideCount)}>Add all pages to show</button></div>{powerpointActive && (powerpointSession?.slideCount ?? 0) > Math.max(0, 500 - showSlideCount) && <small className="presentation-file-note">The current show can fit {Math.max(0, 500 - showSlideCount)} more pages. Add slides individually or remove show items.</small>}
          <div className="presentation-ppt-slides" aria-label={`Slides in ${selectedFile.filename}`}>{powerpointActive && powerpointSession?.slideThumbnails.map((thumbnail, index) => {
            const page = index + 1
            const slide = powerpointSlide(selectedFile, page)
            return <article className={`presentation-ppt-slide-row${currentPage === page ? ' selected' : ''}`} key={page}>
              <button type="button" className="presentation-ppt-slide-select" draggable onDragStart={(event) => event.dataTransfer.setData('text/bibleshow-slide', JSON.stringify(slide))} onClick={() => selectPowerPointSlide(selectedFile, page)} onDoubleClick={() => void onSendLive(slide)} aria-label={`Preview slide ${page}; double-click to send Live`}><img src={convertFileSrc(thumbnail)} alt="" loading="lazy" /><span>Slide {page}</span></button>
              <div><button type="button" onClick={() => selectPowerPointSlide(selectedFile, page)} aria-label={`Preview slide ${page}`}>Preview</button><button type="button" className="save-presentation-button" onClick={() => void onSendLive(slide)}>Live</button><button type="button" onClick={() => onAdd(slide)} aria-label={`Add slide ${page} to show`}>Add</button></div>
            </article>
          })}</div>
        </> : <div className="external-presentation-card"><span className="external-presentation-icon">{selectedFile.fileType.toUpperCase()}</span><div><h3>{fileTypeName(selectedFile)}</h3><p>This file opens in the presentation app associated with its format. Its slideshow runs in that app.</p><button type="button" className="save-presentation-button" onClick={() => onOpenExternal(selectedFile.id)}>Open in presentation app</button></div></div>}
      </section> : <section className="presentation-file-detail presentation-file-empty"><p>Select a presentation file to preview it.</p></section>}
    </div>
  </section>
}

function formatPresentationSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function PDFPageCanvas({ localPath, pageNumber }: { localPath: string; pageNumber: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null)
  const [box, setBox] = useState({ width: 0, height: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect) setBox({ width: rect.width, height: rect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let active = true
    let destroyLoadingTask: (() => void) | null = null
    void (async () => {
      try {
        const { getDocument } = await loadPdfJs()
        if (!active) return
        const loadingTask = getDocument({ url: convertFileSrc(localPath) })
        destroyLoadingTask = () => { void loadingTask.destroy() }
        if (!active) { destroyLoadingTask(); return }
        setPdfDocument(await loadingTask.promise)
      } catch (reason) { if (active) setError(`Could not read this PDF: ${String(reason)}`) }
    })()
    return () => { active = false; destroyLoadingTask?.() }
  }, [localPath])

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || box.width < 1 || box.height < 1) return
    let active = true
    let rendering: { cancel: () => void; promise: Promise<void> } | null = null
    const canvas = canvasRef.current
    void (async () => {
      try {
        const page = await pdfDocument.getPage(pageNumber)
        if (!active) return
        const baseViewport = page.getViewport({ scale: 1 })
        const scale = Math.max(0.1, Math.min(box.width / baseViewport.width, box.height / baseViewport.height))
        const viewport = page.getViewport({ scale })
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.max(1, Math.floor(viewport.width * pixelRatio))
        canvas.height = Math.max(1, Math.floor(viewport.height * pixelRatio))
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        rendering = page.render({ canvas, viewport, transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0] })
        await rendering.promise
        if (active) setError('')
      } catch (reason) { if (active) setError(`Could not render PDF page ${pageNumber}: ${String(reason)}`) }
    })()
    return () => { active = false; rendering?.cancel() }
  }, [pdfDocument, pageNumber, box.width, box.height])

  return <div className="pdf-page-canvas" ref={containerRef} aria-label={`PDF page ${pageNumber}`}><canvas ref={canvasRef} />{error && <p role="alert">{error}</p>}</div>
}

function SavedPresentationsFeed({ presentations, searchQuery, onRefresh, onPreview, onSendLive, onAdd, onAddMany }: {
  presentations: PresentationSummary[]
  searchQuery: string
  onRefresh: () => Promise<void>
  onPreview: (slide: PresentationSlide) => void
  onSendLive: (slide: PresentationSlide) => void
  onAdd: (slide: PresentationSlide) => void
  onAddMany: (slides: PresentationSlide[]) => void
}) {
  const visiblePresentations = presentations.filter((item) => `${item.title} ${item.updatedAt}`.toLowerCase().includes(searchQuery.trim().toLowerCase()))
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [saved, setSaved] = useState<SavedPresentation | null>(null)
  const [loadError, setLoadError] = useState<{ id: number; text: string } | null>(null)
  const busy = selectedId !== null && saved?.id !== selectedId && loadError?.id !== selectedId
  const message = selectedId !== null && loadError?.id === selectedId ? loadError.text : ''

  useEffect(() => {
    if (!isTauri()) return
    let active = true
    if (selectedId === null) return
    invoke<SavedPresentation>('load_presentation', { presentationId: selectedId }).then((result) => {
      if (active) { setSaved(result); setLoadError(null) }
    }).catch((error) => { if (active) setLoadError({ id: selectedId, text: String(error) }) })
    return () => { active = false }
  }, [selectedId])

  return <div className="saved-presentations-feed source-browser">
    <header className="media-feed-toolbar"><div><strong>Saved presentations</strong><span>{visiblePresentations.length} matching projects · {presentations.length} saved</span></div><button className="media-import-button" onClick={() => { void onRefresh() }}>Refresh</button></header>
    <div className="saved-presentations-body">
      <nav className="saved-presentation-list" aria-label="Saved presentations">{visiblePresentations.map((item) => <button key={item.id} className={selectedId === item.id ? 'selected' : ''} onClick={() => setSelectedId(item.id)}><strong>{item.title}</strong><span>{item.slideCount} slides · {item.updatedAt}</span></button>)}{visiblePresentations.length === 0 && <p>{presentations.length ? 'No saved presentations match this search.' : 'No saved presentations yet. Save a show from the left panel to see it here.'}</p>}</nav>
      <section className="saved-presentation-detail" aria-label="Presentation items">
        {busy && <p className="source-error">Loading presentation…</p>}
        {message && <p className="source-error">{message}</p>}
        {!busy && selectedId !== null && saved?.id === selectedId && <><header><div><strong>{saved.title}</strong><span>{saved.slides.length} slides</span></div><button disabled={!saved.slides.length} onClick={() => onAddMany(saved.slides)}>Add all to show</button></header><div className="saved-presentation-slides">{saved.slides.map((slide, index) => <article key={`${slide.sourceId}-${index}`}><button className="saved-slide-select" onClick={() => onPreview(slide)} onDoubleClick={() => onSendLive(slide)}><strong>{index + 1}. {slide.title}</strong><span>{slide.kind === 'scripture' || slide.kind === 'lyrics' ? displayBody(slide) : slide.kind.toUpperCase()}</span></button><button className="saved-slide-add" aria-label={`Add ${slide.title} to this show`} onClick={() => onAdd(slide)}>＋</button></article>)}</div></>}
        {!busy && selectedId === null && <p className="source-error">Select a saved presentation to browse its slides.</p>}
      </section>
    </div>
  </div>
}

function ThemesFeed({ searchQuery, theme, onSelect, liveFeed, resourceRevision }: { searchQuery: string; theme: PresentationTheme; onSelect: (theme: PresentationTheme) => void; liveFeed: PresentationSlide | null; resourceRevision: number }) {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [customThemes, setCustomThemes] = useState<SolidTheme[]>(loadCustomThemes)
  const [name, setName] = useState('')
  const [backgroundColor, setBackgroundColor] = useState('#263a2e')
  const [textColor, setTextColor] = useState('#fffef7')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const query = searchQuery.trim().toLowerCase()

  useEffect(() => {
    if (!isTauri()) return
    let active = true
    invoke<MediaFile[]>('get_media_files').then((items) => { if (active) setFiles(items) }).catch((error) => { if (active) setMessage(String(error)) })
    return () => { active = false }
  }, [resourceRevision])

  useEffect(() => {
    try { localStorage.setItem('bibleshow-custom-themes', JSON.stringify(customThemes)) } catch { setMessage('Could not save custom themes on this device.') }
  }, [customThemes])

  async function importThemeFile(file?: File) {
    if (!file) return
    if (!isTauri()) { setMessage('Open BibleShow in the desktop app to import theme images and videos.'); return }
    setBusy(true)
    setMessage('')
    try {
      const item = await invoke<MediaFile>('import_media_file', new Uint8Array(await file.arrayBuffer()), { headers: { 'x-bibleshow-filename': encodeURIComponent(file.name) } })
      const updated = await invoke<MediaFile[]>('get_media_files')
      setFiles(updated)
      const imported = updated.find((entry) => entry.id === item.id) ?? item
      onSelect({ kind: 'media', id: `media:${imported.id}`, name: imported.filename, mediaId: imported.id, mediaType: imported.mediaType, mediaPath: imported.localPath, playbackUrl: imported.playbackUrl, textColor: '#ffffff' })
      setMessage(`Added “${imported.filename}” as a theme.`)
    } catch (error) { setMessage(String(error)) }
    finally { setBusy(false) }
  }

  function saveCustomTheme(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const label = name.trim()
    if (!label) return
    const item: SolidTheme = { kind: 'solid', id: `custom:${crypto.randomUUID()}`, name: label, backgroundColor, textColor }
    setCustomThemes((items) => [...items, item])
    onSelect(item)
    setName('')
    setMessage(`Saved “${label}” to your themes.`)
  }

  function selectLiveFeed() {
    if (!liveFeed?.liveStreamKind) return
    onSelect({ kind: 'live', id: `live:${liveFeed.sourceId}`, name: liveFeed.title, sourceId: liveFeed.sourceId, liveStreamKind: liveFeed.liveStreamKind, liveStreamUrl: liveFeed.liveStreamUrl, youtubeVideoId: liveFeed.youtubeVideoId, textColor: '#ffffff' })
  }

  const visibleBuiltIns = builtInThemes.filter((item) => !query || `${item.name} solid color`.toLowerCase().includes(query))
  const visibleCustom = customThemes.filter((item) => !query || `${item.name} custom solid color`.toLowerCase().includes(query))
  const visibleFiles = files.filter((item) => !query || `${item.filename} image video`.toLowerCase().includes(query))
  const liveMatches = liveFeed && (!query || `${liveFeed.title} live camera video stream`.toLowerCase().includes(query))
  const selected = (item: PresentationTheme) => item.id === theme.id
  const renderSolid = (item: SolidTheme) => <button key={item.id} className={`theme-choice${selected(item) ? ' selected' : ''}`} style={themeStyle(item)} aria-pressed={selected(item)} onClick={() => onSelect(item)}><span className="theme-choice-sample">Ab</span><span><strong>{item.name}</strong><small>{builtInThemes.some((builtIn) => builtIn.id === item.id) ? 'Built-in solid color' : 'Custom solid color'}</small></span><span className="theme-choice-check">{selected(item) ? 'Applied' : 'Apply'}</span></button>

  return <section className="resource-tool-feed themes-feed">
    <header><strong>Themes</strong><span>Choose a shared background for Scripture and lyric slides in Preview, Live, and audience output.</span></header>
    <section className="theme-section"><h3>Built-in themes</h3><div className="theme-choice-grid">{visibleBuiltIns.map(renderSolid)}{!visibleBuiltIns.length && <small className="theme-empty">No built-in themes match.</small>}</div></section>
    <section className="theme-section"><h3>Design a theme</h3><form className="theme-editor" onSubmit={saveCustomTheme}><label>Theme name<input value={name} maxLength={48} onChange={(event) => setName(event.target.value)} placeholder="e.g. Youth service" required /></label><label>Background<input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} /></label><label>Text<input type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} /></label><button type="submit" disabled={!name.trim()}>Save theme</button></form>{visibleCustom.length > 0 && <div className="theme-choice-grid">{visibleCustom.map(renderSolid)}</div>}</section>
    <section className="theme-section"><div className="theme-section-heading"><h3>Image and video themes</h3><label className="media-import-button">{busy ? 'Importing…' : 'Import image / video'}<input type="file" accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm" disabled={busy} onChange={(event) => { void importThemeFile(event.currentTarget.files?.[0]); event.currentTarget.value = '' }} /></label></div><div className="theme-media-grid">{visibleFiles.map((item) => {
      const isSelected = theme.kind === 'media' && theme.mediaId === item.id
      const src = item.playbackUrl ?? convertFileSrc(item.localPath)
      return <button key={item.id} className={`theme-media-card${isSelected ? ' selected' : ''}`} aria-pressed={isSelected} onClick={() => onSelect({ kind: 'media', id: `media:${item.id}`, name: item.filename, mediaId: item.id, mediaType: item.mediaType, mediaPath: item.localPath, playbackUrl: item.playbackUrl, textColor: '#ffffff' })}>{item.mediaType === 'image' ? <img src={src} alt="" /> : <video src={src} muted playsInline preload="metadata" />}<span>{item.filename}</span></button>
    })}{!visibleFiles.length && <small className="theme-empty">{files.length ? 'No media themes match your search.' : 'Import an image or video to use it as a background.'}</small>}</div></section>
    <section className="theme-section"><h3>Live feed theme</h3>{liveMatches ? <button className={`theme-live-choice${theme.kind === 'live' && selected(theme) ? ' selected' : ''}`} onClick={selectLiveFeed}><span className="live-status-dot" /><span><strong>{liveFeed.title}</strong><small>Use the currently connected camera or stream behind text</small></span><span>{theme.kind === 'live' && selected(theme) ? 'Applied' : 'Apply'}</span></button> : <small className="theme-empty">Connect a camera or video stream from the Live Feed tab to use it here.</small>}</section>
    {message && <p className="media-feed-message" role="status">{message}</p>}
  </section>
}

function FunctionsFeed({ searchQuery, countdown, onChange }: { searchQuery: string; countdown: CountdownFunction; onChange: (value: CountdownFunction) => void }) {
  const [minutes, setMinutes] = useState(5)
  const showCountdown = !searchQuery.trim() || 'service countdown timer'.includes(searchQuery.trim().toLowerCase())
  function start() {
    const seconds = Math.max(60, Math.min(240 * 60, Math.round(minutes) * 60))
    onChange({ durationSeconds: seconds, remainingSeconds: seconds, endsAtMs: currentTimeMs() + seconds * 1000, running: true, visible: true })
  }
  function togglePause() {
    if (countdown.running && countdown.endsAtMs) {
      const remainingSeconds = Math.max(0, Math.ceil((countdown.endsAtMs - currentTimeMs()) / 1000))
      onChange({ ...countdown, remainingSeconds, endsAtMs: null, running: false })
    } else if (countdown.remainingSeconds > 0) {
      onChange({ ...countdown, endsAtMs: currentTimeMs() + countdown.remainingSeconds * 1000, running: true, visible: true })
    }
  }
  function reset() {
    onChange({ ...countdown, remainingSeconds: countdown.durationSeconds, endsAtMs: null, running: false, visible: true })
  }
  return <section className="resource-tool-feed"><header><strong>Functions</strong><span>Small operator tools that can be shown over Live output.</span></header>{showCountdown ? <article className="function-card"><div><strong>Service countdown</strong><small>Start a local countdown and show it as a separate output layer.</small></div><label>Minutes<input type="number" min={1} max={240} step={1} value={minutes} onChange={(event) => setMinutes(Number(event.target.value) || 1)} /></label><div className="function-timer-preview"><CountdownReadout timer={countdown} /></div><div className="function-actions">{!countdown.running && countdown.remainingSeconds === countdown.durationSeconds ? <button className="save-presentation-button" onClick={start}>Start countdown</button> : <button className="save-presentation-button" onClick={togglePause}>{countdown.running ? 'Pause' : countdown.remainingSeconds > 0 ? 'Resume' : 'Start again'}</button>}<button onClick={reset}>Reset</button><button onClick={() => onChange({ ...countdown, visible: !countdown.visible })} aria-pressed={countdown.visible}>{countdown.visible ? 'Hide from output' : 'Show on output'}</button></div><p>The countdown runs on this computer. Pause it before changing its duration. It can be shown or hidden without stopping.</p></article> : <p className="source-error">No functions match this search.</p>}<div className="feed-coming-soon function-roadmap"><strong>More functions</strong><p>Timers are the first working function. Actions, variables, and audience interactions are later additions.</p></div></section>
}

function OverlaysFeed({ searchQuery, overlays, onChange }: { searchQuery: string; overlays: DisplayOverlay[]; onChange: (value: DisplayOverlay[] | ((current: DisplayOverlay[]) => DisplayOverlay[])) => void }) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'static' | 'scrolling'>('static')
  function addOverlay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const label = title.trim()
    const message = text.trim()
    if (!label || !message) return
    onChange((items) => [...items, { id: crypto.randomUUID(), title: label, text: message, mode, visible: false, locked: false }])
    setTitle('')
    setText('')
  }
  const visibleOverlays = overlays.filter((overlay) => `${overlay.title} ${overlay.text} ${overlay.mode}`.toLowerCase().includes(searchQuery.trim().toLowerCase()))
  return <section className="resource-tool-feed"><header><strong>Overlays</strong><span>Show one or more text layers over the current Live slide.</span></header><form className="overlay-create-form" onSubmit={addOverlay}><label>Name<input maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Welcome" /></label><label>Text<input maxLength={240} value={text} onChange={(event) => setText(event.target.value)} placeholder="Message shown to the audience" /></label><label>Style<select value={mode} onChange={(event) => setMode(event.target.value as 'static' | 'scrolling')}><option value="static">Static</option><option value="scrolling">Scrolling</option></select></label><button type="submit" className="save-presentation-button" disabled={!title.trim() || !text.trim()}>Add overlay</button></form><div className="overlay-list">{visibleOverlays.map((overlay) => <article key={overlay.id} className={overlay.visible ? 'is-visible' : ''}><button className="overlay-toggle" onClick={() => onChange((items) => items.map((item) => item.id === overlay.id ? { ...item, visible: !item.visible } : item))} aria-pressed={overlay.visible}><strong>{overlay.title}</strong><span>{overlay.text}</span></button><small>{overlay.mode === 'scrolling' ? 'Scrolling' : 'Static'}{overlay.locked ? ' · Locked' : ''}</small><button onClick={() => onChange((items) => items.map((item) => item.id === overlay.id ? { ...item, locked: !item.locked } : item))} aria-pressed={overlay.locked}>{overlay.locked ? 'Unlock' : 'Lock'}</button><button onClick={() => onChange((items) => items.filter((item) => item.id !== overlay.id))} aria-label={`Delete ${overlay.title}`}>Delete</button></article>)}{!visibleOverlays.length && <p className="overlay-empty">{overlays.length ? 'No overlays match this search.' : 'Create your first text overlay. Click its card to show or hide it on Live.'}</p>}</div><p>Visible overlays are saved on this device. Locked overlays stay on output when unlocked overlays are cleared.</p></section>
}

function CountdownReadout({ timer }: { timer: CountdownFunction }) {
  const [now, setNow] = useState(0)
  useEffect(() => {
    if (!timer.running || timer.endsAtMs === null) return
    let timeoutId = 0
    const tick = () => {
      const value = currentTimeMs()
      setNow(value)
      if (value < timer.endsAtMs!) timeoutId = window.setTimeout(tick, 1000)
    }
    tick()
    return () => window.clearTimeout(timeoutId)
  }, [timer.running, timer.endsAtMs])
  const seconds = timer.running && timer.endsAtMs !== null ? Math.max(0, Math.ceil((timer.endsAtMs - now) / 1000)) : timer.remainingSeconds
  return <strong>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</strong>
}

function OverlayStack({ overlays, countdown }: { overlays: DisplayOverlay[]; countdown?: CountdownFunction }) {
  const visible = overlays.filter((overlay) => overlay.visible)
  return <div className="output-utility-layers" aria-live="polite">{countdown?.visible && <div className="output-countdown"><CountdownReadout timer={countdown} /></div>}{visible.map((overlay, index) => <div key={overlay.id} className={`output-overlay ${overlay.mode}`} style={{ bottom: `calc(8% + ${index * 12}% + ${countdown?.visible ? 11 : 0}%)` }}><span>{overlay.text}</span></div>)}</div>
}

function NetworkLiveFeed({ searchQuery, onConnect, onConnectCamera, onConnectUrl, onStop, slide, cameraStream, onPreview, onSendLive }: {
  searchQuery: string
  onConnect: (url: string) => Promise<void>
  onConnectCamera: (stream: MediaStream, label: string) => void
  onConnectUrl: (url: string, kind: 'video' | 'mjpeg' | 'youtube') => void
  onStop: () => Promise<void>
  slide: PresentationSlide | null
  cameraStream: MediaStream | null
  onPreview: (slide: PresentationSlide) => void
  onSendLive: (slide: PresentationSlide) => void
}) {
  const [sourceUrl, setSourceUrl] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [sourceMode, setSourceMode] = useState<'camera' | 'url' | 'rtsp'>('camera')
  const [streamKind, setStreamKind] = useState<'video' | 'mjpeg'>('video')
  const [showUrl, setShowUrl] = useState(true)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState('')
  const [feedError, setFeedError] = useState('')
  const localVideo = useRef<HTMLVideoElement>(null)
  const pastedYoutubeId = extractYoutubeVideoId(sourceUrl)
  const connected = Boolean(slide && (slide.liveStreamKind === 'camera' ? cameraStream : slide.liveStreamKind === 'youtube' ? slide.youtubeVideoId : slide.liveStreamUrl))
  const activeSlide = connected ? slide : null
  const sourceMatches = !searchQuery.trim() || `${activeSlide?.title ?? ''} ${activeSlide?.subtitle ?? ''} ${activeSlide?.liveStreamUrl ?? ''}`.toLowerCase().includes(searchQuery.trim().toLowerCase())

  useEffect(() => {
    if (localVideo.current) localVideo.current.srcObject = cameraStream
  }, [cameraStream])

  async function startCamera(deviceId?: string) {
    setConnecting(true)
    setFeedError('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera capture is unavailable in this app runtime.')
      const stream = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      const cameras = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === 'videoinput')
      setDevices(cameras)
      const activeDevice = stream.getVideoTracks()[0]?.getSettings().deviceId ?? cameras[0]?.deviceId ?? ''
      setSelectedDevice(activeDevice)
      onConnectCamera(stream, cameras.find((device) => device.deviceId === activeDevice)?.label || 'Camera')
    } catch (error) {
      setFeedError(error instanceof Error ? error.message : String(error))
    } finally { setConnecting(false) }
  }

  function connectUrl(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const youtubeId = extractYoutubeVideoId(sourceUrl)
      if (youtubeId) onConnectUrl(youtubeId, 'youtube')
      else {
        const url = new URL(sourceUrl.trim())
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use a direct HTTP or HTTPS stream endpoint, or paste a YouTube watch/live link.')
        onConnectUrl(url.toString(), streamKind)
      }
      setFeedError('')
    } catch (error) { setFeedError(error instanceof Error ? error.message : String(error)) }
  }

  return <section className="network-live-feed source-browser">
    <header className="media-feed-toolbar"><div><strong>Live Feed</strong><span>Connect a camera or a direct stream endpoint. Sources are session-only.</span></div><span className={`network-live-status${connected ? ' connected' : ''}`}>{connected ? 'CONNECTED' : connecting ? 'CONNECTING' : 'DISCONNECTED'}</span></header>
    <div className="network-live-connect">
      <label htmlFor="live-source-mode">Source type</label>
      <select id="live-source-mode" value={sourceMode} onChange={(event) => setSourceMode(event.target.value as typeof sourceMode)} disabled={connected}><option value="camera">Connected camera / webcam</option><option value="url">Direct HTTP(S) stream URL</option><option value="rtsp">RTSP / RTSPS (GStreamer)</option></select>
      {sourceMode === 'camera' && <><label htmlFor="live-camera-device">Camera</label><select id="live-camera-device" value={selectedDevice} onChange={(event) => { setSelectedDevice(event.target.value); void startCamera(event.target.value) }} disabled={connected || connecting || !devices.length}><option value="">Default camera</option>{devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}</select><small>Camera permission is requested by the system the first time you start capture. The same feed is relayed to audience output when sent Live.</small><div><button type="button" className="save-presentation-button" onClick={() => void startCamera()} disabled={connected || connecting}>{connecting ? 'Starting camera…' : 'Start camera and Preview'}</button><button type="button" onClick={() => void onStop()} disabled={!connected}>Stop source</button></div></>}
      {sourceMode === 'url' && <form onSubmit={connectUrl}><label htmlFor="live-feed-url">Stream URL or YouTube Live link</label><div className="live-url-entry"><input id="live-feed-url" type={showUrl ? 'text' : 'password'} autoComplete="off" spellCheck={false} placeholder="Paste a YouTube live link or direct stream URL" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} disabled={connected || connecting} /><button type="button" onClick={() => setShowUrl((visible) => !visible)} aria-label={showUrl ? 'Hide stream URL' : 'Show stream URL'}>{showUrl ? 'Hide' : 'Show'}</button></div>{pastedYoutubeId ? <small>YouTube link detected. BibleShow will use YouTube’s embedded player; the direct-stream format below does not apply. Playback may be unavailable if the stream owner disables embedding or YouTube restricts this stream.</small> : <><label htmlFor="live-stream-kind">Direct stream format</label><select id="live-stream-kind" value={streamKind} onChange={(event) => setStreamKind(event.target.value as typeof streamKind)} disabled={connected}><option value="video">Video / HLS (WebView supported formats)</option><option value="mjpeg">MJPEG</option></select><small>Use an HTTP(S) URL that points directly to a playable stream, not a watch page. HLS and codecs vary by Windows and Linux WebView. Credentials in the URL stay in memory only.</small></>}<div><button type="submit" className="save-presentation-button" disabled={connected || !sourceUrl.trim()}>Connect and Preview</button><button type="button" onClick={() => void onStop()} disabled={!connected}>Stop source</button></div></form>}
      {sourceMode === 'rtsp' && <><label htmlFor="live-feed-rtsp-url">RTSP / RTSPS address</label><input id="live-feed-rtsp-url" type="password" autoComplete="off" spellCheck={false} placeholder="rtsp://camera.local:554/stream" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} disabled={connected || connecting} /><small>This experimental receiver depends on GStreamer installed on this computer.</small><div><button type="button" className="save-presentation-button" onClick={() => { setConnecting(true); void onConnect(sourceUrl.trim()).finally(() => setConnecting(false)) }} disabled={connected || connecting || !sourceUrl.trim()}>{connecting ? 'Connecting…' : 'Connect and Preview'}</button><button type="button" onClick={() => void onStop()} disabled={!connected}>Stop source</button></div></>}
    </div>
    {feedError && <p className="source-error" role="alert">{feedError}</p>}
    {activeSlide && sourceMatches && <div className="network-live-preview">{activeSlide.liveStreamKind === 'camera' ? <video ref={localVideo} autoPlay muted playsInline /> : activeSlide.liveStreamKind === 'youtube' && activeSlide.youtubeVideoId ? <iframe src={youtubeEmbedUrl(activeSlide.youtubeVideoId, true)} title="YouTube Live preview" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : activeSlide.liveStreamKind === 'mjpeg' ? <img src={activeSlide.liveStreamUrl} alt="Live MJPEG feed" onError={() => setFeedError('The MJPEG endpoint could not be loaded. Check the URL and camera network settings.')} /> : <video src={activeSlide.liveStreamUrl} autoPlay muted playsInline onError={() => setFeedError('This stream could not play in the current WebView. Check the URL, format and codec support.')} />}<div><button onClick={() => onPreview(activeSlide)}>Stage in Preview</button><button className="save-presentation-button" onClick={() => onSendLive(activeSlide)}>Send Live</button><button onClick={() => void onStop()}>Stop source</button></div></div>}
    {activeSlide && !sourceMatches && <p className="network-live-empty">No connected Live Feed source matches this search.</p>}
    {!activeSlide && <p className="network-live-empty">Choose a camera or direct stream source. One Live Feed source can be active at a time.</p>}
  </section>
}

function MonitorPanel({ type, slide, nextSlide = null, theme = defaultTheme, overlays = [], countdown, cameraStream, playback, delayLiveVideo = false, onDelayLiveVideoChange, onPlaybackCommand, onPlaybackTime, alert, emptyLabel, onPrevious, onNext, canNavigate, onAction }: { type: 'preview' | 'live'; slide: PresentationSlide | null; nextSlide?: PresentationSlide | null; theme?: PresentationTheme; overlays?: DisplayOverlay[]; countdown?: CountdownFunction; cameraStream: MediaStream | null; playback: VideoPlayback | null; delayLiveVideo?: boolean; onDelayLiveVideoChange?: (value: boolean) => void; onPlaybackCommand: (sourceId: string, patch: Partial<VideoPlayback>) => void; onPlaybackTime: (sourceId: string, currentTime: number, duration: number) => void; alert?: MessageAlert | null; emptyLabel?: string; onPrevious: () => void; onNext: () => void; canNavigate: boolean; onAction: () => void }) {
  const isPreview = type === 'preview'
  const localPlayback = slide?.kind === 'video' && playback?.sourceId === slide.sourceId ? playback : null
  return (
    <section className={`monitor-panel ${isPreview ? 'monitor-preview' : 'monitor-live'}`}>
      <header className="monitor-heading"><div><span className={`monitor-light ${isPreview ? 'is-preview' : slide ? 'is-live' : ''}`} /><strong>{isPreview ? 'PREVIEW' : 'LIVE'}</strong></div><small>{isPreview ? 'Operator selection' : 'Local Live monitor'}</small></header>
      <div className="monitor-screen-wrap"><SlideScreen slide={slide} theme={theme} mode={type} cameraStream={cameraStream} playback={localPlayback} onPlaybackTime={onPlaybackTime} emptyLabel={emptyLabel ?? (isPreview ? 'Choose content to preview' : 'Nothing live yet')} />{!isPreview && <OverlayStack overlays={overlays} countdown={countdown} />}{!isPreview && alert && <div className={`display-alert ${alert.mode}`} style={messageAlertStyle(alert, true)}><span>{alert.text}</span></div>}</div>
      {slide?.kind === 'video' && localPlayback && <VideoTransport playback={localPlayback} showDelay={isPreview} delayLiveVideo={delayLiveVideo} onDelayLiveVideoChange={onDelayLiveVideoChange} onCommand={(patch) => onPlaybackCommand(slide.sourceId, patch)} />}
      {!isPreview && nextSlide && <NextSlidePreview slide={nextSlide} />}
      <footer className="monitor-controls">
        <button onClick={onPrevious} disabled={!canNavigate} aria-label={`Previous ${type} page`}>‹</button>
        {isPreview && <button className="take-live-button" onClick={onAction} disabled={!slide}>Take Live</button>}
        {!isPreview && <span>{slide ? 'On screen' : 'Standby'}</span>}
        <button onClick={onNext} disabled={!canNavigate} aria-label={`Next ${type} page`}>›</button>
      </footer>
    </section>
  )
}

function NextSlidePreview({ slide }: { slide: PresentationSlide }) {
  return <div className="next-slide-preview" role="group" aria-label={`Up next: ${slide.title}`}>
    <span>UP NEXT</span>
    {slide.kind === 'image' && slide.mediaPath ? <img src={convertFileSrc(slide.mediaPath)} alt="" /> : null}
    <div><strong>{slide.title}</strong><small>{slide.subtitle}</small>{displayBody(slide) && <p>{displayBody(slide)}</p>}</div>
  </div>
}

function VideoTransport({ playback, showDelay, delayLiveVideo, onDelayLiveVideoChange, onCommand }: { playback: VideoPlayback; showDelay: boolean; delayLiveVideo: boolean; onDelayLiveVideoChange?: (value: boolean) => void; onCommand: (patch: Partial<VideoPlayback>) => void }) {
  const seekable = playback.duration > 0 && Number.isFinite(playback.duration)
  const changePosition = (value: number) => onCommand({ currentTime: value, startAtMs: Date.now() })
  return <div className="video-transport" aria-label="Video playback controls">
    <button type="button" onClick={() => onCommand({ isPlaying: !playback.isPlaying, startAtMs: Date.now() })} aria-label={playback.isPlaying ? 'Pause video' : 'Play video'}>{playback.isPlaying ? 'Pause' : 'Play'}</button>
    <span className="video-time">{formatVideoTime(playback.currentTime)}</span>
    <input type="range" min="0" max={seekable ? playback.duration : 0} step="0.1" value={seekable ? Math.min(playback.currentTime, playback.duration) : 0} disabled={!seekable} aria-label="Seek video playback" onChange={(event) => changePosition(Number(event.target.value))} />
    <span className="video-time">{formatVideoTime(playback.duration)}</span>
    <button type="button" className={playback.loop ? 'is-selected' : ''} aria-pressed={playback.loop} onClick={() => onCommand({ loop: !playback.loop })}>Loop</button>
    {showDelay && <label className="video-delay-toggle"><input type="checkbox" checked={delayLiveVideo} onChange={(event) => onDelayLiveVideoChange?.(event.target.checked)} />1s Live delay</label>}
  </div>
}

function formatVideoTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const wholeSeconds = Math.floor(seconds)
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`
}

function BibleSourcePicker({ onPreview, onSendLive, onPresentSlides, onAdd, onAddMany, previewSourceId, searchRequest, searchQuery, searchMode, onBookNamesChange }: { onPreview: (slide: PresentationSlide) => void; onSendLive: (slide: PresentationSlide) => void; onPresentSlides: (slides: PresentationSlide[]) => void; onAdd: (slide: PresentationSlide) => void; onAddMany: (slides: PresentationSlide[]) => void; previewSourceId: string | null; searchRequest: { mode: 'reference' | 'keyword'; query: string; id: number } | null; searchQuery: string; searchMode: 'reference' | 'keyword'; onBookNamesChange: (names: string[]) => void }) {
  const [books, setBooks] = useState<BookSummary[]>([])
  const [translations, setTranslations] = useState<TranslationSummary[]>([])
  const [translationId, setTranslationId] = useState('KJV')
  const [bookNumber, setBookNumber] = useState(1)
  const [chapterNumber, setChapterNumber] = useState(1)
  const [verseNumber, setVerseNumber] = useState(1)
  const [chapter, setChapter] = useState<ChapterData | null>(null)
  const [error, setError] = useState('')
  const [rangeStart, setRangeStart] = useState(1)
  const [rangeEnd, setRangeEnd] = useState(1)
  const [searchResults, setSearchResults] = useState<BibleSearchResult[]>([])
  const [searchMessage, setSearchMessage] = useState('')
  const [keywordSuggestions, setKeywordSuggestions] = useState<BibleSearchResult[]>([])
  const [keywordSuggestionStatus, setKeywordSuggestionStatus] = useState('')
  const pendingRange = useRef<[number, number] | null>(null)
  const handledSearchRequest = useRef<number | null>(null)
  const onPresentSlidesRef = useRef(onPresentSlides)
  useEffect(() => { onPresentSlidesRef.current = onPresentSlides }, [onPresentSlides])
  const activeBook = books.find((book) => book.book_number === bookNumber)
  const currentChapter = chapter?.book_number === bookNumber && chapter.chapter_number === chapterNumber ? chapter : null
  const verse = currentChapter?.verses.find((item) => item.verse_number === verseNumber)
  const slide = verse && currentChapter ? { sourceId: `${translationId}:${bookNumber}:${chapterNumber}:${verseNumber}`, title: `${currentChapter.name} ${chapterNumber}:${verseNumber}`, subtitle: translations.find((item) => item.id === translationId)?.name ?? translationId, body: verse.text, reference: `${currentChapter.name} ${chapterNumber}:${verseNumber}`, kind: 'scripture' as const, translationId, bookNumber, chapterNumber, verseNumber } : null
  const displayError = error || (!isTauri() ? 'Open the desktop app to access the local Bible.' : '')
  const keywordResultsOpen = searchMode === 'keyword' && searchRequest?.mode === 'keyword' && searchRequest.query.trim() === searchQuery.trim() && Boolean(searchMessage)

  const makeVerseSlide = useCallback((item: { verse_number: number; text: string }, chapterData = currentChapter): PresentationSlide | null => {
    if (!chapterData) return null
    return { sourceId: `${translationId}:${chapterData.book_number}:${chapterData.chapter_number}:${item.verse_number}`, title: `${chapterData.name} ${chapterData.chapter_number}:${item.verse_number}`, subtitle: translations.find((item) => item.id === translationId)?.name ?? translationId, body: item.text, reference: `${chapterData.name} ${chapterData.chapter_number}:${item.verse_number}`, kind: 'scripture', translationId, bookNumber: chapterData.book_number, chapterNumber: chapterData.chapter_number, verseNumber: item.verse_number }
  }, [currentChapter, translationId, translations])

  useEffect(() => {
    if (!isTauri()) return
    let active = true
    invoke<TranslationSummary[]>('get_bible_translations').then((items) => { if (active) { setTranslations(items); const selected = items.find((item) => item.id === translationId)?.id ?? items[0]?.id ?? 'KJV'; setTranslationId(selected); return invoke<BookSummary[]>('get_bible_books', { translationId: selected }) } }).then((items) => { if (active && items) { setBooks(items); if (!items.length) setError('Use the Bible import controls above to add a version.') } }).catch((reason) => { if (active) setError(String(reason)) })
    return () => { active = false }
  }, [translationId])

  useEffect(() => {
    if (!isTauri()) return
    let active = true
    invoke<BookSummary[]>('get_bible_books', { translationId }).then((items) => { if (active) { setBooks(items); onBookNamesChange(items.map((item) => item.name)); setBookNumber(items[0]?.book_number ?? 1); setChapterNumber(1) } }).catch((reason) => { if (active) setError(String(reason)) })
    return () => { active = false }
  }, [translationId, onBookNamesChange])

  useEffect(() => {
    if (!books.length) return
    let active = true
    invoke<ChapterData>('get_bible_chapter', { translationId, bookNumber, chapterNumber }).then((result) => { if (active) { setChapter(result); const pending = pendingRange.current; const maxVerse = result.verses.at(-1)?.verse_number ?? 1; if (pending) { const start = Math.min(pending[0], maxVerse); const end = Math.max(start, Math.min(pending[1], maxVerse)); setVerseNumber(start); setRangeStart(start); setRangeEnd(end); pendingRange.current = null } else { setVerseNumber(1); setRangeStart(1); setRangeEnd(1) } setError('') } }).catch((reason) => { if (active) setError(String(reason)) })
    return () => { active = false }
  }, [books.length, bookNumber, chapterNumber, translationId])

  useEffect(() => {
    const query = searchQuery.trim()
    const wordCount = query.split(/\s+/u).filter(Boolean).length
    if (!isTauri() || !books.length || searchMode !== 'keyword' || wordCount < 4 || (searchRequest?.mode === 'keyword' && searchRequest.query.trim() === query)) {
      setKeywordSuggestions([])
      setKeywordSuggestionStatus('')
      return
    }
    let active = true
    setKeywordSuggestions([])
    setKeywordSuggestionStatus('Searching for passages…')
    const timer = window.setTimeout(() => {
      void invoke<BibleSearchResult[]>('search_bible_keyword', { translationId, query, limit: 10 })
        .then((items) => { if (active) { setKeywordSuggestions(items); setKeywordSuggestionStatus(items.length ? `${items.length} suggested passages` : 'No matching passages yet.') } })
        .catch((reason) => { if (active) setKeywordSuggestionStatus(String(reason)) })
    }, 300)
    return () => { active = false; window.clearTimeout(timer) }
  }, [books.length, searchMode, searchQuery, searchRequest?.mode, searchRequest?.query, translationId])

  useEffect(() => {
    if (!searchRequest || !books.length || handledSearchRequest.current === searchRequest.id) return
    handledSearchRequest.current = searchRequest.id
    let active = true
    void Promise.resolve().then(async () => {
      if (!active) return
      setSearchResults([])
      setSearchMessage('Searching…')
      if (searchRequest.mode === 'keyword') {
        try {
          const results = await invoke<BibleSearchResult[]>('search_bible_keyword', { translationId, query: searchRequest.query, limit: 100 })
          if (active) { setSearchResults(results); setSearchMessage(results.length ? `${results.length} matching verses` : 'No matching verses found.') }
        } catch (reason) { if (active) setSearchMessage(String(reason)) }
        return
      }
      const match = searchRequest.query.trim().match(/^(.+?)\s+(\d+):(\d+)(?:\s*-\s*(\d+))?$/)
      const book = match && books.find((item) => item.name.toLowerCase() === match[1].trim().toLowerCase())
      if (!match || !book) { setSearchMessage('Enter a reference such as John 3:16 or John 3:16-18.'); return }
      const chap = Number(match[2]), start = Number(match[3]), end = Number(match[4] || match[3])
      if (start < 1 || end < start) { setSearchMessage('Check the verse range and try again.'); return }
      setSearchMessage('Loading passage…')
      try {
        const result = await invoke<ChapterData>('get_bible_chapter', { translationId, bookNumber: book.book_number, chapterNumber: chap })
        if (!active) return
        const lastVerse = result.verses.at(-1)?.verse_number ?? 0
        if (start > lastVerse) { setSearchMessage(`${book.name} ${chap} has no verse ${start}.`); return }
        const last = Math.min(end, lastVerse)
        const slides = result.verses.filter((item) => item.verse_number >= start && item.verse_number <= last).map((item) => makeVerseSlide(item, result)).filter((item): item is PresentationSlide => item !== null)
        setBookNumber(book.book_number)
        setChapterNumber(chap)
        setChapter(result)
        setVerseNumber(start)
        setRangeStart(start)
        setRangeEnd(last)
        pendingRange.current = null
        setSearchMessage(`Loaded ${book.name} ${chap}:${start}${last === start ? '' : `-${last}`} · ${slides.length} verse slides.`)
        onPresentSlidesRef.current(slides)
      } catch (reason) {
        if (active) setSearchMessage(String(reason))
      }
    })
    return () => { active = false }
  }, [searchRequest, books, translationId, makeVerseSlide])

  function searchResultSlide(result: BibleSearchResult): PresentationSlide {
    return { sourceId: `${translationId}:${result.book_number}:${result.chapter_number}:${result.verse_number}`, title: `${result.book_name} ${result.chapter_number}:${result.verse_number}`, subtitle: translations.find((item) => item.id === translationId)?.name ?? translationId, body: result.text, reference: `${result.book_name} ${result.chapter_number}:${result.verse_number}`, kind: 'scripture', translationId, bookNumber: result.book_number, chapterNumber: result.chapter_number, verseNumber: result.verse_number }
  }

  function selectSearchResult(result: BibleSearchResult) {
    const foundBook = books.find((item) => item.book_number === result.book_number)
    if (foundBook) {
      setBookNumber(foundBook.book_number)
      setChapterNumber(result.chapter_number)
      setVerseNumber(result.verse_number)
      if (foundBook.book_number === bookNumber && result.chapter_number === chapterNumber && currentChapter) {
        setRangeStart(result.verse_number)
        setRangeEnd(result.verse_number)
      } else pendingRange.current = [result.verse_number, result.verse_number]
    }
    setKeywordSuggestions([])
    setKeywordSuggestionStatus('')
    onPreview(searchResultSlide(result))
  }

  return (
    <div className="source-browser">
      {keywordResultsOpen ? <div className="bible-search-results expanded"><span>{searchMessage}</span>{searchResults.map((result) => <button key={`${result.book_number}-${result.chapter_number}-${result.verse_number}`} onClick={() => selectSearchResult(result)} onDoubleClick={() => onSendLive({ sourceId: `${translationId}:${result.book_number}:${result.chapter_number}:${result.verse_number}`, title: `${result.book_name} ${result.chapter_number}:${result.verse_number}`, subtitle: translations.find((item) => item.id === translationId)?.name ?? translationId, body: result.text, reference: `${result.book_name} ${result.chapter_number}:${result.verse_number}`, kind: 'scripture', translationId, bookNumber: result.book_number, chapterNumber: result.chapter_number, verseNumber: result.verse_number })} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); const slide = { sourceId: `${translationId}:${result.book_number}:${result.chapter_number}:${result.verse_number}`, title: `${result.book_name} ${result.chapter_number}:${result.verse_number}`, subtitle: translations.find((item) => item.id === translationId)?.name ?? translationId, body: result.text, reference: `${result.book_name} ${result.chapter_number}:${result.verse_number}`, kind: 'scripture' as const, translationId, bookNumber: result.book_number, chapterNumber: result.chapter_number, verseNumber: result.verse_number }; onSendLive(slide) } }}><strong>{result.book_name} {result.chapter_number}:{result.verse_number}</strong><span>{result.text}</span></button>)}</div> : <>
      <div className="source-selects">
        <label>Version<select value={translationId} onChange={(event) => setTranslationId(event.target.value)}>{translations.map((translation) => <option key={translation.id} value={translation.id}>{translation.name}</option>)}</select></label>
        <label>Book<select value={bookNumber} onChange={(event) => { setBookNumber(Number(event.target.value)); setChapterNumber(1) }} disabled={!books.length}>{books.map((book) => <option key={book.book_number} value={book.book_number}>{book.name}</option>)}</select></label>
        <label>Chapter<select value={chapterNumber} onChange={(event) => setChapterNumber(Number(event.target.value))} disabled={!activeBook}>{Array.from({ length: activeBook?.chapter_count ?? 0 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>
      </div>
      <div className="passage-range"><span>Passage slides</span><label>From<select value={rangeStart} onChange={(event) => setRangeStart(Number(event.target.value))} disabled={!currentChapter}>{currentChapter?.verses.map((item) => <option key={item.verse_number} value={item.verse_number}>{item.verse_number}</option>)}</select></label><label>To<select value={rangeEnd} onChange={(event) => setRangeEnd(Number(event.target.value))} disabled={!currentChapter}>{currentChapter?.verses.filter((item) => item.verse_number >= rangeStart).map((item) => <option key={item.verse_number} value={item.verse_number}>{item.verse_number}</option>)}</select></label><button disabled={!currentChapter || rangeEnd < rangeStart} onClick={() => { const data = currentChapter; if (!data) return; const slides = data.verses.filter((item) => item.verse_number >= rangeStart && item.verse_number <= rangeEnd).map((item) => makeVerseSlide(item, data)).filter((item): item is PresentationSlide => item !== null); onAddMany(slides) }}>Add passage</button><button disabled={!currentChapter || rangeEnd < rangeStart} onClick={() => { const data = currentChapter; if (!data) return; const slides = data.verses.filter((item) => item.verse_number >= rangeStart && item.verse_number <= rangeEnd).map((item) => makeVerseSlide(item, data)).filter((item): item is PresentationSlide => item !== null); onPresentSlides(slides) }}>Preview &amp; Live</button></div>
      {keywordSuggestionStatus && !keywordResultsOpen && <section className="bible-keyword-suggestions" aria-label="Suggested Bible passages"><header><strong>{keywordSuggestionStatus}</strong><small>Updates as you type</small></header>{keywordSuggestions.map((result) => <button key={`suggestion-${result.book_number}-${result.chapter_number}-${result.verse_number}`} type="button" onClick={() => selectSearchResult(result)} onDoubleClick={() => onSendLive(searchResultSlide(result))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); onSendLive(searchResultSlide(result)) } }}><strong>{result.book_name} {result.chapter_number}:{result.verse_number}</strong><span>{result.text}</span></button>)}</section>}
      {searchMessage && searchRequest?.mode === searchMode && searchRequest.query.trim() === searchQuery.trim() && <p className="source-search-status" role="status">{searchMessage}</p>}
      <div className="source-list-heading"><span>VERSE</span><span>{translations.find((item) => item.id === translationId)?.id ?? 'KJV'}</span></div>
      <div className="source-verse-list">{currentChapter?.verses.map((item) => {
        const verseSlide = makeVerseSlide(item)
        if (!verseSlide) return null
        const isPreview = previewSourceId === verseSlide.sourceId
        const inPassage = item.verse_number >= rangeStart && item.verse_number <= rangeEnd
        return <button className={`source-verse-row${item.verse_number === verseNumber ? ' selected' : ''}${inPassage ? ' in-passage' : ''}${isPreview ? ' is-preview' : ''}`} key={item.verse_number} aria-pressed={isPreview} draggable onDragStart={(event) => event.dataTransfer.setData('text/bibleshow-slide', JSON.stringify(verseSlide))} onClick={() => { setVerseNumber(item.verse_number); setRangeStart(item.verse_number); setRangeEnd(item.verse_number); onPreview(verseSlide) }} onDoubleClick={() => onSendLive(verseSlide)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); onSendLive(verseSlide) } }}><sup>{item.verse_number}</sup><span>{item.text}</span>{isPreview && <small>PREVIEW</small>}</button>
      })}{displayError && <p className="source-error">{displayError}</p>}</div>
      <div className="source-actions"><button onClick={() => slide && onPreview(slide)} disabled={!slide}>Preview verse</button><button onClick={() => slide && onAdd(slide)} disabled={!slide}><Icon name="plus" size={14} /> Add to sequence</button></div>
      </>}
    </div>
  )
}

function parseFormattedLyricHeader(line: string): SongDetail['sections'][number] | null {
  const bracketed = /^\s*\[[^\]]+\]\s*:?\s*$/.test(line)
  const value = line.trim().replace(/^\[|\]$/g, '').trim().replace(/:$/, '').trim()
  const normalized = value.toLowerCase().replace(/\s+/g, ' ')
  const verse = normalized.match(/^(?:verse|v)\s*#?(\d*)$/)
  if (verse && (verse[1] || normalized !== 'v' || bracketed)) return { section_type: 'verse', label: verse[1] ? `Verse ${verse[1]}` : 'Verse', lyrics: '' }
  if (/^(?:chorus|refrain)\s*\d*$/.test(normalized) || /^c\d+$/.test(normalized) || (normalized === 'c' && bracketed)) return { section_type: 'chorus', label: 'Chorus', lyrics: '' }
  if (/^bridge\s*\d*$/.test(normalized) || /^b\d+$/.test(normalized) || (normalized === 'b' && bracketed)) return { section_type: 'bridge', label: 'Bridge', lyrics: '' }
  if (/^(?:pre[ -]?chorus\s*\d*|p\s*\d+)$/.test(normalized) || (normalized === 'p' && bracketed)) return { section_type: 'pre-chorus', label: 'Pre-Chorus', lyrics: '' }
  if (/^intro\s*\d*$/.test(normalized) || /^i\d+$/.test(normalized) || (normalized === 'i' && bracketed)) return { section_type: 'intro', label: 'Intro', lyrics: '' }
  if (/^(?:outro|ending)\s*\d*$/.test(normalized) || /^[oe]\d+$/.test(normalized) || ((normalized === 'e' || normalized === 'o') && bracketed)) return { section_type: 'outro', label: 'Ending', lyrics: '' }
  const numberedVerse = normalized.match(/^(\d+)[.)]?$/)
  if (numberedVerse) return { section_type: 'verse', label: `Verse ${numberedVerse[1]}`, lyrics: '' }
  return null
}

function splitFormattedSongSections(sections: SongDetail['sections']): SongDetail['sections'] {
  const expanded: SongDetail['sections'] = []
  sections.forEach((section) => {
    const lines = section.lyrics.replace(/\r\n?/g, '\n').split('\n')
    const hasHeaders = lines.some((line) => parseFormattedLyricHeader(line) !== null)
    if (hasHeaders) {
      let currentType = section.section_type
      let currentLabel = section.label
      let currentLines: string[] = []
      let nextVerseNumber = Number(section.label.match(/\d+/)?.[0] ?? 0)
      const flush = () => {
        const lyrics = currentLines.join('\n').trim()
        if (lyrics) expanded.push({ section_type: currentType, label: currentLabel, lyrics })
        currentLines = []
      }
      for (const line of lines) {
        const header = parseFormattedLyricHeader(line)
        if (!header) { currentLines.push(line); continue }
        flush()
        currentType = header.section_type
        currentLabel = header.label
        if (currentType === 'verse') {
          const number = Number(currentLabel.match(/\d+/)?.[0] ?? 0)
          nextVerseNumber = number || nextVerseNumber + 1
          currentLabel = `Verse ${nextVerseNumber}`
        }
      }
      flush()
      return
    }

    const paragraphs = section.lyrics.replace(/\r\n?/g, '\n').split(/\n\s*\n+/).map((text) => text.trim()).filter(Boolean)
    if (sections.length === 1 && paragraphs.length > 1 && ['verse', 'section'].includes(section.section_type)) {
      const firstVerse = Number(section.label.match(/\d+/)?.[0] ?? 1)
      paragraphs.forEach((lyrics, index) => expanded.push({ section_type: 'verse', label: `Verse ${firstVerse + index}`, lyrics }))
      return
    }
    expanded.push(section)
  })
  return expanded
}

function lyricSectionLabel(section: SongDetail['sections'][number], index: number) {
  if (section.section_type === 'verse') return `Verse ${section.label.replace(/\D/g, '') || index + 1}`
  if (section.section_type === 'chorus') return 'Chorus'
  return section.section_type.replace('-', ' ').replace(/^./, (letter) => letter.toUpperCase())
}

function SongSourcePicker({ searchQuery, presentRequest, selectedSongIds, onSelectedSongIdsChange, onEditSong, onAddSong, onDeleteSongs, onExportSongs, onPreview, onSendLive, onPresentSlides, onAdd, previewSourceId }: { searchQuery: string; presentRequest: { query: string; id: number } | null; selectedSongIds: string[]; onSelectedSongIdsChange: (ids: string[]) => void; onEditSong: (id: string) => void; onAddSong: () => void; onDeleteSongs: (ids: string[]) => void; onExportSongs: (ids: string[]) => void; onPreview: (slide: PresentationSlide) => void; onSendLive: (slide: PresentationSlide) => void; onPresentSlides: (slides: PresentationSlide[]) => void; onAdd: (slide: PresentationSlide) => void; previewSourceId: string | null }) {
  const [category, setCategory] = useState<'all' | 'hymn' | 'song'>('all')
  const [songs, setSongs] = useState<SongSummary[]>([])
  const [selectedSongId, setSelectedSongId] = useState('')
  const [detail, setDetail] = useState<SongDetail | null>(null)
  const [error, setError] = useState('')
  const [contextMenu, setContextMenu] = useState<{ songId: string | null; x: number; y: number } | null>(null)
  const handledPresentRequest = useRef<number | null>(null)
  const selectedSongIdRef = useRef(selectedSongId)
  const onPresentSlidesRef = useRef(onPresentSlides)
  useEffect(() => { selectedSongIdRef.current = selectedSongId }, [selectedSongId])
  useEffect(() => { onPresentSlidesRef.current = onPresentSlides }, [onPresentSlides])
  const currentDetail = detail?.id === selectedSongId ? detail : null
  const visibleSections = currentDetail ? splitFormattedSongSections(currentDetail.sections) : []
  const displayError = error || (!isTauri() ? 'Open the desktop app to access local lyrics.' : '')

  useEffect(() => {
    if (!contextMenu) return
    const dismiss = () => setContextMenu(null)
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss() }
    window.addEventListener('click', dismiss)
    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('click', dismiss); window.removeEventListener('keydown', onKeyDown) }
  }, [contextMenu])

  useEffect(() => {
    if (!isTauri()) return
    let active = true
    invoke<SongSummary[]>('get_song_library', { category, search: searchQuery }).then((items) => {
      if (!active) return
      setSongs(items)
      setSelectedSongId((current) => items.some((song) => song.id === current) ? current : items[0]?.id ?? '')
      setError(items.length ? '' : searchQuery ? 'No matching lyrics. Try another title, author, or word.' : 'No matching lyrics. Use the import button to add songs or hymns.')
    }).catch((reason) => { if (active) setError(String(reason)) })
    return () => { active = false }
  }, [category, searchQuery])

  useEffect(() => {
    if (!selectedSongId) return
    let active = true
    invoke<SongDetail>('get_song_detail', { songId: selectedSongId }).then((result) => { if (active) setDetail(result) }).catch((reason) => { if (active) setError(String(reason)) })
    return () => { active = false }
  }, [selectedSongId])

  function makeSongSlides(song: SongDetail): PresentationSlide[] {
    return splitFormattedSongSections(song.sections).map((section, sectionIndex) => {
      const label = lyricSectionLabel(section, sectionIndex)
      return { sourceId: `song:${song.id}:${sectionIndex}`, title: song.title, subtitle: label, body: section.lyrics, reference: song.authors || (song.category === 'hymn' ? 'Hymn' : 'Song'), kind: 'lyrics' as const, songId: song.id, sectionIndex }
    })
  }

  useEffect(() => {
    if (!presentRequest || !isTauri() || handledPresentRequest.current === presentRequest.id) return
    handledPresentRequest.current = presentRequest.id
    let active = true
    void (async () => {
      try {
        const matches = await invoke<SongSummary[]>('get_song_library', { category, search: presentRequest.query })
        if (!active) return
        const selected = matches.find((song) => song.id === selectedSongIdRef.current) ?? matches[0]
        if (!selected) { setError('No matching lyrics were found to send.'); return }
        setSongs(matches)
        setSelectedSongId(selected.id)
        const song = await invoke<SongDetail>('get_song_detail', { songId: selected.id })
        if (!active) return
        setDetail(song)
        const slides = makeSongSlides(song)
        if (!slides.length) { setError('This song has no lyric sections to send.'); return }
        setError('')
        onPresentSlidesRef.current(slides)
      } catch (reason) {
        if (active) setError(String(reason))
      }
    })()
    return () => { active = false }
  }, [presentRequest, category])

  function makeSlide(sectionIndex: number): PresentationSlide | null {
    const section = visibleSections[sectionIndex]
    if (!currentDetail || !section) return null
    const label = lyricSectionLabel(section, sectionIndex)
    return { sourceId: `song:${currentDetail.id}:${sectionIndex}`, title: currentDetail.title, subtitle: label, body: section.lyrics, reference: currentDetail.authors || (currentDetail.category === 'hymn' ? 'Hymn' : 'Song'), kind: 'lyrics', songId: currentDetail.id, sectionIndex }
  }

  return (
    <div className="source-browser song-source-browser">
      <div className="source-category-tabs" role="tablist" aria-label="Filter lyrics">{(['all', 'hymn', 'song'] as const).map((item) => <button key={item} className={category === item ? 'selected' : ''} role="tab" aria-selected={category === item} onClick={() => setCategory(item)}>{item === 'all' ? 'All' : item === 'hymn' ? 'Hymns' : 'Songs'}</button>)}</div>
      <div className="source-song-list" onContextMenu={(event) => { if (event.target === event.currentTarget) { event.preventDefault(); setContextMenu({ songId: null, x: event.clientX, y: event.clientY }) } }}>
        {songs.map((song) => <div className="source-song-row" key={song.id} onContextMenu={(event) => { event.preventDefault(); setContextMenu({ songId: song.id, x: event.clientX, y: event.clientY }) }}>
          <button className={`source-song-item${selectedSongId === song.id ? ' selected' : ''}`} onClick={() => setSelectedSongId(song.id)}><strong>{song.title}</strong><small>{song.authors || song.category}</small></button>
          <input type="checkbox" aria-label={`Select ${song.title} for batch actions`} checked={selectedSongIds.includes(song.id)} onChange={(event) => onSelectedSongIdsChange(event.target.checked ? [...selectedSongIds, song.id] : selectedSongIds.filter((id) => id !== song.id))} />
        </div>)}
        {!songs.length && <p className="source-error">{displayError || 'No lyrics found.'}</p>}
      </div>
      {contextMenu && <div className="lyrics-context-menu" role="menu" style={{ left: Math.min(contextMenu.x, window.innerWidth - 220), top: Math.min(contextMenu.y, window.innerHeight - 190) }} onClick={(event) => event.stopPropagation()} onContextMenu={(event) => event.preventDefault()}>
        <strong>{contextMenu.songId ? songs.find((song) => song.id === contextMenu.songId)?.title ?? 'Song actions' : 'Lyrics library'}</strong>
        <button role="menuitem" onClick={() => { onAddSong(); setContextMenu(null) }}>Add new song</button>
        {contextMenu.songId && <>
          <button role="menuitem" onClick={() => { onEditSong(contextMenu.songId!); setContextMenu(null) }}>Edit song</button>
          <button role="menuitem" onClick={() => { onExportSongs([contextMenu.songId!]); setContextMenu(null) }}>Export song</button>
          <button role="menuitem" className="danger" onClick={() => { onDeleteSongs([contextMenu.songId!]); setContextMenu(null) }}>Delete song</button>
        </>}
      </div>}
      {currentDetail && <div className="source-sections"><div className="source-list-heading"><span>{currentDetail.title}</span><span>{visibleSections.length} PAGES</span></div>{visibleSections.map((section, index) => {
        const slide = makeSlide(index)
        const isPreview = slide?.sourceId === previewSourceId
        return <div className={`source-section-item${isPreview ? ' is-preview' : ''}`} key={`${section.label}-${index}`}><button aria-label={`Preview ${lyricSectionLabel(section, index)} from ${currentDetail.title}; press Enter or double-click to send Live`} aria-pressed={isPreview} draggable onDragStart={(event) => slide && event.dataTransfer.setData('text/bibleshow-slide', JSON.stringify(slide))} onClick={() => slide && onPreview(slide)} onDoubleClick={() => slide && onSendLive(slide)} onKeyDown={(event) => { if (event.key === 'Enter' && slide) { event.preventDefault(); event.stopPropagation(); onSendLive(slide) } }}><strong>{lyricSectionLabel(section, index)}</strong><span className="source-section-lyrics">{section.lyrics}</span></button><button onClick={() => slide && onAdd(slide)} aria-label={`Add ${lyricSectionLabel(section, index)} to sequence`}><Icon name="plus" size={14} /></button></div>
      })}</div>}
      {displayError && !songs.length && <p className="source-error">{displayError}</p>}
    </div>
  )
}

type SongSectionDraft = { sectionType: string; label: string; lyrics: string }

function SongEditorDialog({ songId, onClose, onSaved }: { songId: string | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('')
  const [authors, setAuthors] = useState('')
  const [copyright, setCopyright] = useState('')
  const [category, setCategory] = useState<'song' | 'hymn'>('song')
  const [sections, setSections] = useState<SongSectionDraft[]>([{ sectionType: 'verse', label: 'Verse 1', lyrics: '' }])
  const [busy, setBusy] = useState(Boolean(songId))
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!songId || !isTauri()) return
    let active = true
    invoke<SongDetail>('get_song_detail', { songId }).then((song) => {
      if (!active) return
      setTitle(song.title)
      setAuthors(song.authors)
      setCopyright(song.copyright)
      setCategory(song.category === 'hymn' ? 'hymn' : 'song')
      setSections(song.sections.map((section) => ({ sectionType: section.section_type, label: section.label, lyrics: section.lyrics })))
    }).catch((error) => { if (active) setMessage(String(error)) }).finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [songId])

  function addSection() {
    if (sections.length >= 100) return
    const verseCount = sections.filter((section) => section.sectionType === 'verse').length
    setSections((current) => [...current, { sectionType: 'verse', label: `Verse ${verseCount + 1}`, lyrics: '' }])
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isTauri()) { setMessage('Open BibleShow in the desktop app to save lyrics.'); return }
    setBusy(true)
    setMessage('')
    try {
      await invoke<SongDetail>('save_song', { songId, title, authors, copyright, category, sections })
      onSaved()
    } catch (error) { setMessage(String(error)) }
    finally { setBusy(false) }
  }

  return <div className="project-change-backdrop lyrics-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <form className="project-change-dialog song-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="song-editor-title" onSubmit={(event) => void save(event)}>
      <header><h2 id="song-editor-title">{songId ? 'Edit song or hymn' : 'Add a song or hymn'}</h2><button type="button" aria-label="Close song editor" onClick={onClose}>×</button></header>
      {message && <p className="song-dialog-message" role="alert">{message}</p>}
      <div className="song-editor-meta"><label>Title<input autoFocus required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Type<select value={category} onChange={(event) => setCategory(event.target.value as 'song' | 'hymn')}><option value="song">Song</option><option value="hymn">Hymn</option></select></label><label>Author<input maxLength={500} value={authors} onChange={(event) => setAuthors(event.target.value)} /></label><label>Copyright<input maxLength={500} value={copyright} onChange={(event) => setCopyright(event.target.value)} /></label></div>
      <div className="song-editor-sections"><div className="song-editor-section-heading"><strong>Verses and chorus</strong><button type="button" onClick={addSection} disabled={sections.length >= 100}>Add section</button></div>
        {sections.map((section, index) => <section className="song-editor-section" key={index}><div><label>Section<select value={section.sectionType} onChange={(event) => setSections((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, sectionType: event.target.value } : item))}><option value="verse">Verse</option><option value="chorus">Chorus</option><option value="bridge">Bridge</option><option value="pre-chorus">Pre-chorus</option><option value="intro">Intro</option><option value="outro">Outro</option></select></label><label>Label<input maxLength={60} value={section.label} onChange={(event) => setSections((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} /></label><button type="button" className="remove-song-section" onClick={() => setSections((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={sections.length === 1}>Remove</button></div><textarea aria-label={`${section.label || `Section ${index + 1}`} lyrics`} maxLength={4000} rows={4} value={section.lyrics} placeholder="Enter the lyrics for this section" onChange={(event) => setSections((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, lyrics: event.target.value } : item))} /></section>)}
      </div>
      <footer><span>Changes are saved to this device’s lyrics library.</span><button type="button" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className="save-presentation-button" disabled={busy || !title.trim()}>{busy ? 'Saving…' : 'Save song'}</button></footer>
    </form>
  </div>
}

function SongExportDialog({ songIds, onClose }: { songIds: string[]; onClose: () => void }) {
  const single = songIds.length === 1
  const [format, setFormat] = useState<'csv' | 'openlyrics' | 'opensong' | 'txt'>('csv')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  function escapeXml(value: string) { return value.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!) }
  function quoteCsv(value: string) { return `"${value.replace(/"/g, '""')}"` }
  function sectionedLyrics(song: SongDetail) { return song.sections.map((section) => `[${section.label || section.section_type}]\n${section.lyrics}`).join('\n\n') }

  async function exportSelected() {
    if (!isTauri()) { setMessage('Open BibleShow in the desktop app to export library songs.'); return }
    setBusy(true)
    setMessage('')
    try {
      const songs = await Promise.all(songIds.map((songId) => invoke<SongDetail>('get_song_detail', { songId })))
      let content = ''
      let extension = 'csv'
      let mime = 'text/csv;charset=utf-8'
      if (format === 'csv') {
        content = [['title', 'authors', 'copyright', 'category', 'lyrics'].join(','), ...songs.map((song) => [song.title, song.authors, song.copyright, song.category, sectionedLyrics(song)].map(quoteCsv).join(','))].join('\r\n')
      } else {
        const song = songs[0]
        if (!song) throw new Error('Select at least one song to export.')
        if (format === 'openlyrics') {
          extension = 'xml'; mime = 'application/xml;charset=utf-8'
          const verseCounts: Record<string, number> = {}
          const lyricSections = song.sections.map((section) => {
            const type = section.section_type === 'verse' ? 'v' : section.section_type === 'chorus' ? 'c' : section.section_type === 'bridge' ? 'b' : section.section_type === 'pre-chorus' ? 'p' : section.section_type === 'intro' ? 'i' : section.section_type === 'outro' ? 'o' : 's'
            verseCounts[type] = (verseCounts[type] ?? 0) + 1
            const number = section.label.match(/\d+/)?.[0] ?? String(verseCounts[type])
            const lines = escapeXml(section.lyrics).replace(/\r\n?/g, '\n').replace(/\n/g, '<br/>')
            return `<verse name="${type}${number}"><lines>${lines}</lines></verse>`
          }).join('')
          content = `<?xml version="1.0" encoding="UTF-8"?><song xmlns="http://openlyrics.info/namespace/2009/song"><properties><titles><title>${escapeXml(song.title)}</title></titles><authors>${song.authors ? `<author>${escapeXml(song.authors)}</author>` : ''}</authors><copyright>${escapeXml(song.copyright)}</copyright></properties><lyrics>${lyricSections}</lyrics></song>`
        } else if (format === 'opensong') {
          extension = 'ost'; mime = 'application/xml;charset=utf-8'
          const lyrics = escapeXml(sectionedLyrics(song))
          content = `<?xml version="1.0" encoding="UTF-8"?><song><title>${escapeXml(song.title)}</title><author>${escapeXml(song.authors)}</author><copyright>${escapeXml(song.copyright)}</copyright><lyrics>${lyrics}</lyrics></song>`
        } else {
          extension = 'txt'; mime = 'text/plain;charset=utf-8'
          content = `${song.title}\n${song.authors ? `${song.authors}\n` : ''}\n${sectionedLyrics(song)}`
        }
      }
      const blob = new Blob([content], { type: mime })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${songs.length === 1 ? songs[0].title : 'BibleShow-Lyrics'}`.replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '-') + `.${extension}`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
      onClose()
    } catch (error) { setMessage(String(error)) }
    finally { setBusy(false) }
  }

  return <div className="project-change-backdrop lyrics-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="project-change-dialog song-export-dialog" role="dialog" aria-modal="true" aria-labelledby="song-export-title"><header><h2 id="song-export-title">Export {single ? 'song' : `${songIds.length} songs`}</h2><button type="button" aria-label="Close export dialog" onClick={onClose}>×</button></header><p>Choose a file format. A collection exports as one CSV file.</p><label>File format<select value={format} onChange={(event) => setFormat(event.target.value as typeof format)}><option value="csv">CSV collection</option>{single && <><option value="openlyrics">OpenLyrics XML</option><option value="opensong">OpenSong XML</option><option value="txt">Plain text</option></>}</select></label>{message && <p className="song-dialog-message" role="alert">{message}</p>}<footer><button type="button" onClick={onClose} disabled={busy}>Cancel</button><button type="button" className="save-presentation-button" onClick={() => void exportSelected()} disabled={busy}>{busy ? 'Preparing…' : 'Export file'}</button></footer></section></div>
}

function MediaSourcePicker({ searchQuery, onPreview, onSendLive, onAdd, previewSourceId }: { searchQuery: string; onPreview: (slide: PresentationSlide) => void; onSendLive: (slide: PresentationSlide) => void; onAdd: (slide: PresentationSlide) => void; previewSourceId: string | null }) {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [mediaFilter, setMediaFilter] = useState<'all' | 'image' | 'video'>('all')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const displayMessage = message || (!isTauri() ? 'Open the desktop app to import and display local media.' : '')
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const visibleFiles = files.filter((file) => (mediaFilter === 'all' || file.mediaType === mediaFilter) && (!normalizedSearch || `${file.filename} ${file.mediaType}`.toLowerCase().includes(normalizedSearch)))

  useEffect(() => {
    if (!isTauri()) return
    let active = true
    invoke<MediaFile[]>('get_media_files').then((items) => { if (active) setFiles(items) }).catch((error) => { if (active) setMessage(String(error)) })
    return () => { active = false }
  }, [])

  async function importMedia(selected: FileList | null) {
    if (!selected?.length) return
    setBusy(true)
    const selectedFiles = Array.from(selected)
    const imageCount = selectedFiles.filter((file) => /\.(png|jpe?g|gif|webp)$/i.test(file.name)).length
    const videoCount = selectedFiles.length - imageCount
    const mediaLabel = [imageCount ? `${imageCount} image${imageCount === 1 ? '' : 's'}` : '', videoCount ? `${videoCount} video${videoCount === 1 ? '' : 's'}` : ''].filter(Boolean).join(' and ')
    setMessage(`Importing ${mediaLabel}…`)
    const imported: MediaFile[] = []
    try {
      const filenameEncoder = new TextEncoder()
      for (let index = 0; index < selectedFiles.length; index += 1) {
        const file = selectedFiles[index]
        if (!file.name || filenameEncoder.encode(file.name).length > 510) throw new Error(`${file.name} has a filename that is too long.`)
        if (!file.size) throw new Error(`${file.name} is empty.`)
        if (/\.(png|jpe?g|gif|webp)$/i.test(file.name) && file.size > 25 * 1024 * 1024) throw new Error(`${file.name} is larger than the 25 MB image limit.`)
        if (/\.(mp4|webm)$/i.test(file.name) && file.size > 250 * 1024 * 1024) throw new Error(`${file.name} is larger than the 250 MB video limit.`)
        setMessage(`Importing ${file.name} (${index + 1} of ${selectedFiles.length})…`)
        const contents = new Uint8Array(await file.arrayBuffer())
        const item = await invoke<MediaFile>('import_media_file', contents, { headers: { 'x-bibleshow-filename': encodeURIComponent(file.name) } })
        imported.push(item)
        setFiles((current) => [item, ...current.filter((existing) => existing.id !== item.id)])
      }
      const importedImages = imported.filter((file) => file.mediaType === 'image').length
      const importedVideos = imported.length - importedImages
      const importedLabels = [importedImages ? `${importedImages} image${importedImages === 1 ? '' : 's'}` : '', importedVideos ? `${importedVideos} video${importedVideos === 1 ? '' : 's'}` : ''].filter(Boolean)
      setMessage(importedLabels.length ? `Added ${importedLabels.join(' and ')} to this device.` : 'Those media files are already in your library.')
    } catch (error) {
      setMessage(imported.length ? `Added ${imported.length} media file${imported.length === 1 ? '' : 's'} before the next file failed: ${String(error)}` : String(error))
    }
    finally { setBusy(false) }
  }

  return <div className="source-browser media-source-browser">
    <div className="media-feed-toolbar"><div><strong>Videos &amp; Images</strong><span>{files.filter((file) => file.mediaType === 'image').length} images · {files.filter((file) => file.mediaType === 'video').length} videos · videos play muted</span></div><div className="media-type-filter" role="group" aria-label="Filter media library">{(['all', 'image', 'video'] as const).map((filter) => <button key={filter} type="button" aria-pressed={mediaFilter === filter} onClick={() => setMediaFilter(filter)}>{filter === 'all' ? 'All' : filter === 'image' ? 'Images' : 'Videos'}</button>)}</div><label className="media-import-button">{busy ? 'Importing…' : 'Import media'}<input type="file" accept=".png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm" multiple disabled={busy} onChange={(event) => { void importMedia(event.currentTarget.files); event.currentTarget.value = '' }} /></label></div>
    {displayMessage && <p className="media-feed-message" role="status">{displayMessage}</p>}
    <div className="media-image-grid">{visibleFiles.map((file) => {
      const slide: PresentationSlide = { sourceId: `media:${file.id}`, title: file.filename, subtitle: file.mediaType === 'video' ? 'Video' : 'Image', body: '', reference: file.filename, kind: file.mediaType, mediaId: file.id, mediaPath: file.localPath, mediaUrl: file.playbackUrl ?? undefined }
      const isPreview = previewSourceId === slide.sourceId
      return <article className={`media-image-card${isPreview ? ' is-preview' : ''}`} key={file.id}>
              <button className="media-image-preview" draggable onDragStart={(event) => event.dataTransfer.setData('text/bibleshow-slide', JSON.stringify(slide))} aria-label={`Preview ${file.filename}; double-click to send Live`} onClick={() => onPreview(slide)} onDoubleClick={() => onSendLive(slide)}>{file.mediaType === 'image' ? <img src={convertFileSrc(file.localPath)} alt="" loading="lazy" /> : <LocalVideo src={file.playbackUrl ?? convertFileSrc(file.localPath)} label={file.filename} preload="metadata" />}<span>{file.filename}</span></button>
        <button className="media-image-add" onClick={() => onAdd(slide)} aria-label={`Add ${file.filename} to this show`}>＋</button>
      </article>
    })}{!visibleFiles.length && !busy && <p className="media-library-empty">{files.length ? normalizedSearch ? 'No media matches this search.' : `No ${mediaFilter === 'image' ? 'images' : 'videos'} are in this library yet.` : 'Import PNG, JPEG, GIF, WebP, MP4 or WebM media files to use them as presentation slides.'}</p>}</div>
  </div>
}

function LocalVideo({ src, label, sourceId, playback, onPlaybackTime, nativeLoop = false, preload = 'metadata' }: { src: string; label: string; sourceId?: string; playback?: VideoPlayback | null; onPlaybackTime?: (currentTime: number, duration: number) => void; nativeLoop?: boolean; preload?: 'none' | 'metadata' | 'auto' }) {
  const [failed, setFailed] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playbackRef = useRef(playback)
  const applyPlaybackRef = useRef<() => void>(() => undefined)
  const playTimer = useRef<number | null>(null)
  useEffect(() => {
    playbackRef.current = playback
    applyPlaybackRef.current = () => {
      const video = videoRef.current
      const state = playbackRef.current
      if (!video) return
      if (!state || (sourceId && state.sourceId !== sourceId)) { video.pause(); return }
      // Restart explicitly at the end; some WebViews can stall at a loop boundary.
      video.loop = nativeLoop && !!state?.loop
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA && Math.abs(video.currentTime - state.currentTime) > 0.35) {
        try { video.currentTime = state.currentTime } catch { /* The browser will sync after metadata loads. */ }
      }
      if (playTimer.current !== null) window.clearTimeout(playTimer.current)
      playTimer.current = null
      if (!state.isPlaying) { video.pause(); return }
      const delay = state.startAtMs - Date.now()
      if (delay > 0) {
        video.pause()
        playTimer.current = window.setTimeout(() => { void video.play().catch(() => setFailed(true)) }, delay)
      } else {
        void video.play().catch(() => setFailed(true))
      }
    }
  }, [playback, sourceId, nativeLoop])

  useEffect(() => {
    applyPlaybackRef.current()
    return () => { if (playTimer.current !== null) window.clearTimeout(playTimer.current) }
  }, [src, playback?.sourceId, playback?.commandId, nativeLoop])

  function reportTime(video: HTMLVideoElement) {
    if (onPlaybackTime && playback?.sourceId === sourceId) onPlaybackTime(video.currentTime, Number.isFinite(video.duration) ? video.duration : 0)
  }

  function loaded() {
    setFailed(false)
    applyPlaybackRef.current()
    const video = videoRef.current
    if (video) reportTime(video)
  }

  function ended(video: HTMLVideoElement) {
    const state = playbackRef.current
    if (!state?.loop || !state.isPlaying || (sourceId && state.sourceId !== sourceId)) {
      setBuffering(false)
      reportTime(video)
      return
    }
    video.currentTime = 0
    reportTime(video)
    void video.play().then(() => setBuffering(false)).catch(() => { setFailed(true); setBuffering(false) })
  }

  return <div className={`local-video-frame${failed ? ' has-error' : ''}${buffering ? ' is-buffering' : ''}`}>
    <video ref={videoRef} src={src} aria-label={label} muted playsInline preload={preload} onError={() => { setFailed(true); setBuffering(false) }} onLoadedMetadata={loaded} onCanPlay={() => { setBuffering(false); loaded() }} onWaiting={() => setBuffering(true)} onStalled={() => setBuffering(true)} onPlaying={() => { setBuffering(false); setFailed(false) }} onEnded={(event) => ended(event.currentTarget)} onTimeUpdate={(event) => reportTime(event.currentTarget)} />
    {buffering && !failed && <span role="status">Buffering video…</span>}
    {failed && <span role="status">This video could not be loaded or decoded by the current desktop webview.</span>}
  </div>
}

function SlideScreen({ slide, theme, mode, cameraStream, playback, onPlaybackTime, emptyLabel }: { slide: PresentationSlide | null; theme: PresentationTheme; mode: 'preview' | 'live'; cameraStream: MediaStream | null; playback: VideoPlayback | null; onPlaybackTime: (sourceId: string, currentTime: number, duration: number) => void; emptyLabel: string }) {
  if (!slide) return <div className="operator-screen is-empty"><div><Icon name="screen" size={23} /><span>{emptyLabel}</span></div></div>
  if (slide.kind === 'image' && slide.mediaPath) return <article className="operator-screen image-screen"><img src={convertFileSrc(slide.mediaPath)} alt={slide.title} /></article>
  if (slide.kind === 'video' && slide.mediaPath) return <article className="operator-screen video-screen"><LocalVideo src={slide.mediaUrl ?? convertFileSrc(slide.mediaPath)} label={slide.reference} sourceId={slide.sourceId} playback={playback} onPlaybackTime={(currentTime, duration) => onPlaybackTime(slide.sourceId, currentTime, duration)} nativeLoop={mode === 'live'} preload="auto" /></article>
  if (slide.kind === 'pdf' && slide.mediaPath) return <article className="operator-screen pdf-screen"><PDFPageCanvas localPath={slide.mediaPath} pageNumber={slide.documentPage ?? 1} /></article>
  if (slide.kind === 'powerpoint') {
    return <article className="operator-screen powerpoint-screen">{slide.mediaPath && <img src={convertFileSrc(slide.mediaPath)} alt={`${slide.title}, slide ${slide.documentPage ?? 1}`} />}</article>
  }
  if (slide.kind === 'live' && slide.liveStreamKind === 'camera') return <article className="operator-screen video-screen"><LiveVideo stream={cameraStream} label="Live camera feed" /></article>
  if (slide.kind === 'live' && slide.liveStreamKind === 'youtube' && slide.youtubeVideoId) return <article className="operator-screen video-screen"><iframe src={youtubeEmbedUrl(slide.youtubeVideoId, true)} title="YouTube Live preview" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></article>
  if (slide.kind === 'live' && slide.liveStreamUrl) return <article className="operator-screen video-screen">{slide.liveStreamKind === 'mjpeg' ? <img src={slide.liveStreamUrl} alt="Live MJPEG feed" /> : <video src={slide.liveStreamUrl} autoPlay muted playsInline />}</article>
  return <article className={`operator-screen theme-text-slide ${slide.kind === 'scripture' ? 'scripture-screen' : 'lyrics-screen'}`} style={themeStyle(theme)}><ThemeBackground theme={theme} cameraStream={cameraStream} /><span>{slide.subtitle}</span><p>{displayBody(slide)}</p><strong>{slide.reference}</strong></article>
}

function ThemeBackground({ theme, cameraStream }: { theme: PresentationTheme; cameraStream: MediaStream | null }) {
  if (theme.kind === 'solid') return null
  let content: ReactNode = null
  if (theme.kind === 'media') {
    const src = theme.playbackUrl ?? convertFileSrc(theme.mediaPath)
    content = theme.mediaType === 'image' ? <img src={src} alt="" /> : <video src={src} autoPlay muted loop playsInline />
  } else if (theme.liveStreamKind === 'camera') content = <LiveVideo stream={cameraStream} label="Live camera theme" />
  else if (theme.liveStreamKind === 'youtube' && theme.youtubeVideoId) content = <iframe src={youtubeEmbedUrl(theme.youtubeVideoId, true)} title="Live video theme" allow="autoplay; encrypted-media; picture-in-picture" />
  else if (theme.liveStreamUrl) content = theme.liveStreamKind === 'mjpeg' ? <img src={theme.liveStreamUrl} alt="" /> : <video src={theme.liveStreamUrl} autoPlay muted loop playsInline />
  return <><div className="theme-background-media" aria-hidden="true">{content}</div><div className="theme-background-shade" aria-hidden="true" /></>
}

export function AudienceWindow() {
  const [snapshot, setSnapshot] = useState<AudienceSnapshot>({ slide: null, alert: null, videoPlayback: null, theme: defaultTheme, overlays: [], countdown: { durationSeconds: 300, remainingSeconds: 300, endsAtMs: null, running: false, visible: false } })
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const audiencePeer = useRef<RTCPeerConnection | null>(null)
  const cameraSourceId = snapshot.slide?.kind === 'live' && snapshot.slide.liveStreamKind === 'camera'
    ? snapshot.slide.sourceId
    : snapshot.theme.kind === 'live' && snapshot.theme.liveStreamKind === 'camera' ? snapshot.theme.sourceId : null

  useEffect(() => {
    if (!isTauri()) return
    let cancelled = false
    let unlisten: (() => void) | undefined
    listen<AudienceSnapshot>('bibleshow-live-update', (event) => setSnapshot(event.payload)).then((stop) => {
      if (cancelled) stop()
      else { unlisten = stop; void emit('bibleshow-audience-ready') }
    }).catch(() => undefined)
    return () => { cancelled = true; unlisten?.() }
  }, [])

  useEffect(() => {
    if (!isTauri() || !cameraSourceId) {
      audiencePeer.current?.close()
      audiencePeer.current = null
      return
    }
    let active = true
    let unlistenOffer: (() => void) | undefined
    let unlistenIce: (() => void) | undefined
    const pendingCandidates: RTCIceCandidateInit[] = []
    let peer: RTCPeerConnection | null = null
    const stopPeer = () => { peer?.close(); peer = null; audiencePeer.current = null; setCameraStream(null) }
    const offerReady = listen<CameraSignal>('bibleshow-camera-offer', async (event) => {
      if (!active || event.payload.sender !== 'operator' || event.payload.sourceId !== cameraSourceId || !event.payload.description) return
      stopPeer()
      peer = new RTCPeerConnection()
      audiencePeer.current = peer
      peer.ontrack = (trackEvent) => { if (active) setCameraStream(trackEvent.streams[0] ?? new MediaStream([trackEvent.track])) }
      peer.onicecandidate = (candidateEvent) => { if (candidateEvent.candidate) void emit('bibleshow-camera-ice', { sourceId: cameraSourceId, sender: 'audience', candidate: candidateEvent.candidate.toJSON() } satisfies CameraSignal) }
      await peer.setRemoteDescription(event.payload.description)
      while (pendingCandidates.length) await peer.addIceCandidate(pendingCandidates.shift()!)
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      await emit('bibleshow-camera-answer', { sourceId: cameraSourceId, sender: 'audience', description: peer.localDescription ?? answer } satisfies CameraSignal)
    })
    const iceReady = listen<CameraSignal>('bibleshow-camera-ice', async (event) => {
      if (!active || event.payload.sender !== 'operator' || event.payload.sourceId !== cameraSourceId || !event.payload.candidate) return
      if (peer?.remoteDescription) await peer.addIceCandidate(event.payload.candidate)
      else pendingCandidates.push(event.payload.candidate)
    })
    void Promise.all([offerReady, iceReady]).then(([stopOffer, stopIce]) => {
      if (!active) { stopOffer(); stopIce(); return }
      unlistenOffer = stopOffer
      unlistenIce = stopIce
      return emit('bibleshow-camera-request', { sourceId: cameraSourceId } satisfies CameraSignal)
    }).catch(() => setCameraStream(null))
    return () => { active = false; unlistenOffer?.(); unlistenIce?.(); stopPeer() }
  }, [cameraSourceId])

  return <main className="audience-window" aria-label="Audience display">
    {snapshot.slide ? snapshot.slide.kind === 'image' && snapshot.slide.mediaPath ? <article className="audience-image-slide"><img src={convertFileSrc(snapshot.slide.mediaPath)} alt="" /></article> : snapshot.slide.kind === 'video' && snapshot.slide.mediaPath ? <article className="audience-image-slide"><LocalVideo src={snapshot.slide.mediaUrl ?? convertFileSrc(snapshot.slide.mediaPath)} label={snapshot.slide.reference} sourceId={snapshot.slide.sourceId} playback={snapshot.videoPlayback} nativeLoop preload="auto" /></article> : snapshot.slide.kind === 'pdf' && snapshot.slide.mediaPath ? <article className="audience-pdf-slide"><PDFPageCanvas localPath={snapshot.slide.mediaPath} pageNumber={snapshot.slide.documentPage ?? 1} /></article> : snapshot.slide.kind === 'powerpoint' ? <article className="audience-image-slide">{snapshot.slide.mediaPath && <img src={convertFileSrc(snapshot.slide.mediaPath)} alt="PowerPoint slide" />}</article> : snapshot.slide.kind === 'live' && snapshot.slide.liveStreamKind === 'camera' ? <article className="audience-image-slide"><LiveVideo stream={cameraStream} label="Audience camera feed" /></article> : snapshot.slide.kind === 'live' && snapshot.slide.liveStreamKind === 'youtube' && snapshot.slide.youtubeVideoId ? <article className="audience-image-slide"><iframe src={youtubeEmbedUrl(snapshot.slide.youtubeVideoId, false)} title="YouTube Live audience output" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></article> : snapshot.slide.kind === 'live' && snapshot.slide.liveStreamUrl ? <article className="audience-image-slide">{snapshot.slide.liveStreamKind === 'mjpeg' ? <img src={snapshot.slide.liveStreamUrl} alt="Live stream" /> : <video src={snapshot.slide.liveStreamUrl} autoPlay muted playsInline />}</article> : <article className={`audience-slide theme-text-slide ${snapshot.slide.kind === 'scripture' ? 'scripture-screen' : 'lyrics-screen'}`} style={themeStyle(snapshot.theme)}><ThemeBackground theme={snapshot.theme} cameraStream={cameraStream} /><span>{snapshot.slide.subtitle}</span><p>{displayBody(snapshot.slide)}</p><strong>{snapshot.slide.reference}</strong></article> : <div className="audience-standby" />}
    <OverlayStack overlays={snapshot.overlays} countdown={snapshot.countdown} />
    {snapshot.alert && <div className={`audience-alert ${snapshot.alert.mode}`} style={messageAlertStyle(snapshot.alert)}><span>{snapshot.alert.text}</span></div>}
  </main>
}

function LiveVideo({ stream, label }: { stream: MediaStream | null; label: string }) {
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => { if (video.current) video.current.srcObject = stream }, [stream])
  return <video ref={video} autoPlay muted playsInline aria-label={label} />
}

export default App
