import { useEffect, useRef, useState, type CSSProperties, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { emit, listen } from '@tauri-apps/api/event'
import './App.css'

type Page = 'home' | 'presentation'
type IconName = 'home' | 'book' | 'screen' | 'search' | 'sun' | 'moon' | 'arrow' | 'plus' | 'spark' | 'clock' | 'settings'

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
type ChapterData = { book_number: number; name: string; chapter_number: number; chapter_count: number; verses: { verse_number: number; text: string }[] }
type BibleSearchResult = { book_number: number; book_name: string; chapter_number: number; verse_number: number; text: string }
type SongSummary = { id: string; title: string; authors: string; category: 'hymn' | 'song' }
type SongDetail = SongSummary & { copyright: string; themes: string[]; sections: { section_type: string; label: string; lyrics: string }[] }
type PresentationSlide = { sourceId: string; title: string; subtitle: string; body: string; reference: string; kind: 'scripture' | 'lyrics'; bookNumber?: number; chapterNumber?: number; verseNumber?: number; songId?: string; sectionIndex?: number }
type QueuedSlide = PresentationSlide & { queueId: string }
type AudienceSnapshot = { slide: PresentationSlide | null; alert: { text: string; mode: 'static' | 'scrolling' } | null }
type DisplaySummary = { index: number; name: string; x: number; y: number; width: number; height: number }
type PendingProjectAction = { kind: 'leave' } | { kind: 'new' } | { kind: 'open'; id: number }
type PresentationSummary = { id: number; title: string; updatedAt: string; slideCount: number }
type SavedPresentation = { id: number; title: string; slides: PresentationSlide[] }
type PresentationFeed = 'bible' | 'lyrics' | 'media' | 'presentations' | 'live' | 'url' | 'themes' | 'functions' | 'overlays'
const presentationFeedLabels: Record<PresentationFeed, string> = {
  bible: 'Bible', lyrics: 'Lyrics', media: 'Videos & Images', presentations: 'Presentations', live: 'Live Feed', url: 'URL Media', themes: 'Themes', functions: 'Functions', overlays: 'Overlays',
}

function persistedSlides(slides: readonly PresentationSlide[]) {
  return slides.map(({ sourceId, title, subtitle, reference, kind, bookNumber, chapterNumber, verseNumber, songId, sectionIndex }) => ({ sourceId, title, subtitle, reference, kind, bookNumber, chapterNumber, verseNumber, songId, sectionIndex }))
}

function projectSnapshot(title: string, slides: readonly PresentationSlide[]) {
  return JSON.stringify({ title, slides: persistedSlides(slides) })
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
          {page === 'home' && <HomePage onNavigate={setPage} library={library} importState={importState} onImport={importLibrary} />}
          {page === 'presentation' && <PresentationWorkspace onBack={() => setPage('home')} />}
          {page !== 'presentation' && <footer className="app-footer"><span>BibleShow</span><span>Built for worship and presentation</span><span className="footer-version">EARLY ACCESS</span></footer>}
        </div>
      </main>
    </div>
  )
}

function HomePage({ onNavigate, library, importState, onImport }: { onNavigate: (page: Page) => void; library: LibrarySummary | null; importState: { busy: boolean; message: string; error: boolean }; onImport: (file?: File) => void }) {
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

function PresentationWorkspace({ onBack }: { onBack: () => void }) {
  const [activeFeed, setActiveFeed] = useState<PresentationFeed>('bible')
  const [previewSlide, setPreviewSlide] = useState<PresentationSlide | null>(null)
  const [liveSlide, setLiveSlide] = useState<PresentationSlide | null>(null)
  const [sequence, setSequence] = useState<QueuedSlide[]>([])
  const [previewPosition, setPreviewPosition] = useState<number | null>(null)
  const [livePosition, setLivePosition] = useState<number | null>(null)
  const [presentationId, setPresentationId] = useState<number | null>(null)
  const [presentationTitle, setPresentationTitle] = useState('Sunday Service')
  const [presentations, setPresentations] = useState<PresentationSummary[]>([])
  const [savedProjectSnapshot, setSavedProjectSnapshot] = useState(() => projectSnapshot('Sunday Service', []))
  const [pendingProjectAction, setPendingProjectAction] = useState<PendingProjectAction | null>(null)
  const [persistenceMessage, setPersistenceMessage] = useState('')
  const [persistenceBusy, setPersistenceBusy] = useState(false)
  const [paneSizes, setPaneSizes] = useState({ left: 250, right: 245, centerTop: 390 })
  const [toolbarPanel, setToolbarPanel] = useState<string | null>(null)
  const [liveDisplayOpen, setLiveDisplayOpen] = useState(true)
  const [audienceWindowOpen, setAudienceWindowOpen] = useState(false)
  const [displays, setDisplays] = useState<DisplaySummary[]>([])
  const [selectedDisplay, setSelectedDisplay] = useState('')
  const [alertDraft, setAlertDraft] = useState('')
  const [alertMode, setAlertMode] = useState<'static' | 'scrolling'>('static')
  const [activeAlert, setActiveAlert] = useState<{ text: string; mode: 'static' | 'scrolling' } | null>(null)
  const hasUnsavedProjectChanges = projectSnapshot(presentationTitle, sequence) !== savedProjectSnapshot
  const audienceSnapshot = useRef<AudienceSnapshot>({ slide: null, alert: null })
  audienceSnapshot.current = { slide: liveSlide, alert: activeAlert }

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
    if (!isTauri()) return
    invoke<DisplaySummary[]>('get_available_displays').then((items) => {
      setDisplays(items)
      if (items.length) setSelectedDisplay(String(items.length > 1 ? 1 : 0))
    }).catch((error) => setPersistenceMessage(String(error)))
  }, [])

  useEffect(() => {
    if (isTauri()) void emit('bibleshow-live-update', audienceSnapshot.current)
  }, [liveSlide, activeAlert])

  async function toggleAudienceWindow(visible: boolean) {
    if (!isTauri()) { setPersistenceMessage('Open BibleShow in the desktop app to use audience output.'); return }
    try {
      await invoke('set_audience_window_visible', { visible, displayIndex: selectedDisplay === '' ? null : Number(selectedDisplay) })
      setAudienceWindowOpen(visible)
    } catch (error) { setPersistenceMessage(String(error)) }
  }
  const [bibleSearchMode, setBibleSearchMode] = useState<'reference' | 'keyword'>('reference')
  const [bibleSearchQuery, setBibleSearchQuery] = useState('')
  const [bibleSearchRequest, setBibleSearchRequest] = useState<{ mode: 'reference' | 'keyword'; query: string; id: number } | null>(null)

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
  }, [previewSlide, previewPosition])

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

  function handleSourceDrop(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault()
    const raw = event.dataTransfer.getData('text/bibleshow-slide')
    if (!raw) return
    try {
      const slide = JSON.parse(raw) as PresentationSlide
      if ((slide.kind !== 'scripture' && slide.kind !== 'lyrics') || !slide.sourceId || !slide.body) return
      addToSequence(slide)
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
        slides: sequence.map(({ sourceId, title, subtitle, reference, kind, bookNumber, chapterNumber, verseNumber, songId, sectionIndex }) => ({ sourceId, title, subtitle, reference, kind, bookNumber, chapterNumber, verseNumber, songId, sectionIndex })),
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
      const items = saved.slides.map((slide) => ({ ...slide, queueId: crypto.randomUUID() }))
      setPresentationId(saved.id)
      setPresentationTitle(saved.title)
      setSavedProjectSnapshot(projectSnapshot(saved.title, saved.slides))
      setSequence(items)
      setPreviewSlide(items[0] ?? null)
      setPreviewPosition(items.length ? 0 : null)
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
        slides: slides.map(({ sourceId, title, subtitle, reference, kind, bookNumber, chapterNumber, verseNumber, songId, sectionIndex }) => ({ sourceId, title, subtitle, reference, kind, bookNumber, chapterNumber, verseNumber, songId, sectionIndex })),
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

  function preview(slide: PresentationSlide) {
    setPreviewSlide(slide)
    setPreviewPosition(null)
  }

  function addToSequence(slide: PresentationSlide) {
    const item = { ...slide, queueId: crypto.randomUUID() }
    const position = sequence.length
    setSequence((items) => [...items, item])
    setPreviewSlide(item)
    setPreviewPosition(position)
  }

  function addManyToSequence(slides: PresentationSlide[]) {
    if (!slides.length) return
    const items = slides.map((slide) => ({ ...slide, queueId: crypto.randomUUID() }))
    const position = sequence.length
    setSequence((current) => [...current, ...items])
    setPreviewSlide(items[0])
    setPreviewPosition(position)
  }

  function selectPreviewPosition(position: number) {
    const item = sequence[position]
    if (!item) return
    setPreviewSlide(item)
    setPreviewPosition(position)
  }

  function movePreview(direction: -1 | 1) {
    if (!sequence.length) return
    const current = previewPosition ?? (direction > 0 ? -1 : sequence.length)
    selectPreviewPosition(Math.max(0, Math.min(sequence.length - 1, current + direction)))
  }

  function sendLive(slide: PresentationSlide, position: number | null) {
    setLiveSlide(slide)
    setLivePosition(position)
    setLiveDisplayOpen(true)
  }

  function moveLive(direction: -1 | 1) {
    if (!sequence.length) return
    const current = livePosition ?? (direction > 0 ? -1 : sequence.length)
    const position = Math.max(0, Math.min(sequence.length - 1, current + direction))
    sendLive(sequence[position], position)
  }

  function removeFromSequence(position: number) {
    setSequence((items) => items.filter((_, index) => index !== position))
    if (previewPosition === position) {
      setPreviewSlide(null)
      setPreviewPosition(null)
    } else if (previewPosition !== null && previewPosition > position) setPreviewPosition(previewPosition - 1)
    if (livePosition === position) setLivePosition(null)
    else if (livePosition !== null && livePosition > position) setLivePosition(livePosition - 1)
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
    setPreviewSlide(null)
    setPreviewPosition(null)
    setLivePosition(null)
  }

  return (
    <section className="presentation-workspace">
      <div className="presentation-toolbar" role="toolbar" aria-label="Presentation toolbar">
        <button className="toolbar-exit" onClick={leavePresentation} aria-label="Leave presentation" title="Leave presentation">←</button>
        <span className="toolbar-brand">BibleShow</span>
        {['Profile', 'Edit', 'View', 'Settings', 'Connections', 'Plugins'].map((item) => <button key={item} className={toolbarPanel === item ? 'active' : ''} onClick={() => setToolbarPanel((open) => open === item ? null : item)}>{item}</button>)}
        <span className="toolbar-spacer" />
        <span className="translation-badge">{presentationId === null ? 'UNSAVED SHOW' : 'SAVED PROJECT'}</span>
      </div>
      {toolbarPanel && <div className="toolbar-placeholder" role="status"><strong>{toolbarPanel}</strong> options will be shaped with you as this area is implemented.</div>}
      {pendingProjectAction && <div className="project-change-backdrop"><section className="project-change-dialog" role="dialog" aria-modal="true" aria-labelledby="project-change-title"><h2 id="project-change-title">Unsaved show changes</h2><p>{pendingProjectAction.kind === 'leave' ? 'Save your changes before leaving the presentation workspace?' : pendingProjectAction.kind === 'new' ? 'Save your changes before starting a new show?' : 'Save your changes before opening another project?'}</p><div><button className="save-presentation-button" onClick={() => void resolvePendingProjectAction('save')} disabled={persistenceBusy}>Save and continue</button><button onClick={() => void resolvePendingProjectAction('discard')} disabled={persistenceBusy}>Discard changes</button><button onClick={() => void resolvePendingProjectAction('stay')} disabled={persistenceBusy}>Stay here</button></div></section></div>}

      <div className="operator-layout" style={{ '--left-pane-width': `${paneSizes.left}px`, '--right-pane-width': `${paneSizes.right}px`, '--center-top-height': `${paneSizes.centerTop}px` } as CSSProperties}>
        <aside className="operator-projects operator-pane">
          <header className="pane-heading"><div><strong>Projects &amp; Show</strong><small>{sequence.length} items in current show</small></div><button onClick={() => startNewPresentation()} disabled={persistenceBusy}>New</button></header>
          <div className="project-controls">
            <label>Show name<input value={presentationTitle} maxLength={160} onChange={(event) => setPresentationTitle(event.target.value)} /></label>
            <label>Open saved project<select value={presentationId ?? ''} onChange={(event) => { if (event.target.value) void openPresentation(Number(event.target.value)) }} disabled={!presentations.length || persistenceBusy}><option value="">{presentations.length ? 'Choose a project' : 'No saved projects yet'}</option>{presentations.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.slideCount} items</option>)}</select></label>
            <div className="project-actions"><button className="save-presentation-button" onClick={() => void saveCurrentPresentation()} disabled={persistenceBusy}>{persistenceBusy ? 'Working…' : presentationId === null ? 'Save as project' : 'Save changes'}</button><label className="project-file-button">Import<input type="file" accept=".json,application/json" disabled={persistenceBusy} onChange={(event) => { void importProject(event.currentTarget.files?.[0]); event.currentTarget.value = '' }} /></label><button onClick={exportProject} disabled={!sequence.length}>Export</button>{presentationId !== null && <button onClick={() => void removePresentation()} disabled={persistenceBusy}>Delete</button>}</div>
            {persistenceMessage && <span className="presentation-save-message" role="status">{persistenceMessage}</span>}
          </div>
          <div className="show-list-heading"><strong>Current show</strong><button onClick={clearSequence} disabled={!sequence.length}>Clear</button></div>
          <p className="sequence-help">Drag content here or use + to add it. Reorder with the arrows.</p>
          <div className="sequence-list" onDragOver={(event) => event.preventDefault()} onDrop={handleSourceDrop}>
            {sequence.map((item, index) => <div className={`sequence-item${previewPosition === index ? ' is-preview' : ''}${livePosition === index ? ' is-live' : ''}`} key={item.queueId}>
              <button className="sequence-select" onClick={() => selectPreviewPosition(index)} onDoubleClick={() => sendLive(item, index)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); sendLive(item, index) } }} aria-label={`Preview ${item.title}; press Enter or double-click to send Live`}><span className="sequence-number">{String(index + 1).padStart(2, '0')}</span><span className="sequence-thumb">{item.body.slice(0, 38)}</span><span className="sequence-item-title">{item.title}</span><small>{item.subtitle}</small></button>
              <button className="sequence-remove" onClick={() => removeFromSequence(index)} aria-label={`Remove ${item.title} from sequence`}>×</button>
              <div className="sequence-tools"><button onClick={() => moveSequenceItem(index, -1)} disabled={index === 0} aria-label={`Move ${item.title} up`}>↑</button><button onClick={() => moveSequenceItem(index, 1)} disabled={index === sequence.length - 1} aria-label={`Move ${item.title} down`}>↓</button><button onClick={() => duplicateSequenceItem(index)}>Duplicate</button></div>
              {livePosition === index && <span className="sequence-live-label">LIVE</span>}{previewPosition === index && <span className="sequence-preview-label">PREVIEW</span>}
            </div>)}
            {sequence.length === 0 && <div className="sequence-empty"><Icon name="plus" size={18} /><strong>Drop items for this show</strong><p>Add Scripture or lyric pages from the content feed below.</p></div>}
          </div>
          <footer className="sequence-footer"><span>{presentationId === null ? 'UNSAVED SHOW' : 'LOCAL PROJECT'}</span><small>{presentationId === null ? 'Save this show as a project before closing.' : 'Changes stay on this device.'}</small></footer>
        </aside>

        <div className="pane-resizer vertical-resizer" role="separator" aria-label="Resize project panel" aria-orientation="vertical" onPointerDown={(event) => startPaneResize(event, 'left')} />

        <main className="operator-center">
          <section className="operator-display-area">
            <div className="operator-monitors">
              <MonitorPanel type="preview" slide={previewSlide} onPrevious={() => movePreview(-1)} onNext={() => movePreview(1)} canNavigate={sequence.length > 0} onAction={() => previewSlide && sendLive(previewSlide, previewPosition)} />
              <MonitorPanel type="live" slide={liveDisplayOpen ? liveSlide : null} alert={liveDisplayOpen ? activeAlert : null} onPrevious={() => moveLive(-1)} onNext={() => moveLive(1)} canNavigate={sequence.length > 0} onAction={() => moveLive(1)} emptyLabel={liveDisplayOpen ? 'Nothing live yet' : 'Live display is closed'} />
            </div>
            <form className="operator-status bible-search-bar" onSubmit={(event) => { event.preventDefault(); if (bibleSearchQuery.trim()) { setActiveFeed('bible'); setBibleSearchRequest({ mode: bibleSearchMode, query: bibleSearchQuery.trim(), id: Date.now() }) } }}>
              <Icon name="search" size={17} />
              <select aria-label="Bible search type" value={bibleSearchMode} onChange={(event) => setBibleSearchMode(event.target.value as 'reference' | 'keyword')}><option value="reference">Reference</option><option value="keyword">Keyword</option></select>
              <input aria-label={bibleSearchMode === 'reference' ? 'Search Bible reference' : 'Search Bible keywords'} value={bibleSearchQuery} onChange={(event) => setBibleSearchQuery(event.target.value)} placeholder={bibleSearchMode === 'reference' ? 'Search passage (e.g. John 3:16-18)' : 'Search words in the Bible'} />
              <button type="submit" disabled={!bibleSearchQuery.trim()}>Search</button>
              <span className="operator-offline">KJV</span>
            </form>
          </section>

          <div className="pane-resizer horizontal-resizer" role="separator" aria-label="Resize preview and content areas" aria-orientation="horizontal" onPointerDown={(event) => startPaneResize(event, 'centerTop')} />

          <section className="content-feed operator-pane">
            <nav className="feed-tabs" aria-label="Content feeds">{([
              ['bible', 'Bible'], ['lyrics', 'Lyrics'], ['media', 'Videos / Images'], ['presentations', 'Presentations'], ['live', 'Live Feed'], ['url', 'URL Media'], ['themes', 'Themes'], ['functions', 'Functions'], ['overlays', 'Overlays'],
            ] as const).map(([key, label]) => <button key={key} className={activeFeed === key ? 'selected' : ''} onClick={() => setActiveFeed(key)}>{label}</button>)}</nav>
            <div className="feed-content">
              {activeFeed === 'bible' && <BibleSourcePicker onPreview={preview} onSendLive={(slide) => sendLive(slide, null)} onAdd={addToSequence} onAddMany={addManyToSequence} previewSourceId={previewSlide?.sourceId ?? null} searchRequest={bibleSearchRequest} />}
              {activeFeed === 'lyrics' && <SongSourcePicker onPreview={preview} onSendLive={(slide) => sendLive(slide, null)} onAdd={addToSequence} previewSourceId={previewSlide?.sourceId ?? null} />}
              {activeFeed !== 'bible' && activeFeed !== 'lyrics' && <div className="feed-coming-soon"><strong>{presentationFeedLabels[activeFeed]}</strong><p>This content feed is planned. Its item types and controls will be designed before it is implemented.</p></div>}
            </div>
          </section>
        </main>

        <div className="pane-resizer vertical-resizer" role="separator" aria-label="Resize display controls" aria-orientation="vertical" onPointerDown={(event) => startPaneResize(event, 'right')} />

        <aside className="operator-display-controls operator-pane">
          <header className="pane-heading"><div><strong>Display controls</strong><small>{liveDisplayOpen ? 'Local Live monitor ready' : 'Local Live monitor closed'}</small></div><span className={liveDisplayOpen ? 'display-ready-dot' : 'display-closed-dot'} /></header>
          <section className="display-control-group"><h3>Clear items</h3><button onClick={() => { setPreviewSlide(null); setPreviewPosition(null) }} disabled={!previewSlide}>Clear Preview</button><button onClick={() => { setLiveSlide(null); setLivePosition(null) }} disabled={!liveSlide}>Clear Live content</button><button onClick={() => setLiveDisplayOpen(false)} disabled={!liveDisplayOpen}>Hide operator Live monitor</button><button onClick={() => setLiveDisplayOpen(true)} disabled={liveDisplayOpen}>Show operator Live monitor</button></section>
          <section className="display-control-group"><h3>Audience output</h3><label>Display<select value={selectedDisplay} onChange={(event) => setSelectedDisplay(event.target.value)} disabled={audienceWindowOpen || !displays.length}><option value="">Select a display</option>{displays.map((display) => <option key={display.index} value={display.index}>{display.name} · {display.width} × {display.height}</option>)}</select></label><button className="save-presentation-button" onClick={() => void toggleAudienceWindow(true)} disabled={audienceWindowOpen || selectedDisplay === ''}>Open fullscreen output</button><button className="display-close-button" onClick={() => void toggleAudienceWindow(false)} disabled={!audienceWindowOpen}>Close audience output</button><small>{audienceWindowOpen ? 'Live slides are mirrored to this display.' : 'Choose the screen for the audience display.'}</small></section>
          <section className="display-control-group"><h3>Message alert</h3><label>Message<textarea value={alertDraft} onChange={(event) => setAlertDraft(event.target.value)} placeholder="Type a message for the audience" rows={3} /></label><label>Display style<select value={alertMode} onChange={(event) => setAlertMode(event.target.value as 'static' | 'scrolling')}><option value="static">Static</option><option value="scrolling">Scrolling</option></select></label><div className="alert-actions"><button className="save-presentation-button" onClick={() => alertDraft.trim() && setActiveAlert({ text: alertDraft.trim(), mode: alertMode })} disabled={!alertDraft.trim() || !liveDisplayOpen}>Show alert</button><button onClick={() => setActiveAlert(null)} disabled={!activeAlert}>Clear alert</button></div></section>
          {activeAlert && <p className="alert-live-status" role="status">{activeAlert.mode === 'scrolling' ? 'Scrolling' : 'Static'} alert is on Live.</p>}
        </aside>
      </div>
    </section>
  )
}

function MonitorPanel({ type, slide, alert, emptyLabel, onPrevious, onNext, canNavigate, onAction }: { type: 'preview' | 'live'; slide: PresentationSlide | null; alert?: { text: string; mode: 'static' | 'scrolling' } | null; emptyLabel?: string; onPrevious: () => void; onNext: () => void; canNavigate: boolean; onAction: () => void }) {
  const isPreview = type === 'preview'
  return (
    <section className={`monitor-panel ${isPreview ? 'monitor-preview' : 'monitor-live'}`}>
      <header className="monitor-heading"><div><span className={`monitor-light ${isPreview ? 'is-preview' : slide ? 'is-live' : ''}`} /><strong>{isPreview ? 'PREVIEW' : 'LIVE'}</strong></div><small>{isPreview ? 'Operator selection' : 'Local Live monitor'}</small></header>
      <div className="monitor-screen-wrap"><SlideScreen slide={slide} emptyLabel={emptyLabel ?? (isPreview ? 'Choose content to preview' : 'Nothing live yet')} />{!isPreview && alert && <div className={`display-alert ${alert.mode}`}><span>{alert.text}</span></div>}</div>
      <footer className="monitor-controls">
        <button onClick={onPrevious} disabled={!canNavigate} aria-label={`Previous ${type} page`}>‹</button>
        {isPreview && <button className="take-live-button" onClick={onAction} disabled={!slide}>Take Live</button>}
        {!isPreview && <span>{slide ? 'On screen' : 'Standby'}</span>}
        <button onClick={onNext} disabled={!canNavigate} aria-label={`Next ${type} page`}>›</button>
      </footer>
    </section>
  )
}

function BibleSourcePicker({ onPreview, onSendLive, onAdd, onAddMany, previewSourceId, searchRequest }: { onPreview: (slide: PresentationSlide) => void; onSendLive: (slide: PresentationSlide) => void; onAdd: (slide: PresentationSlide) => void; onAddMany: (slides: PresentationSlide[]) => void; previewSourceId: string | null; searchRequest: { mode: 'reference' | 'keyword'; query: string; id: number } | null }) {
  const [books, setBooks] = useState<BookSummary[]>([])
  const [bookNumber, setBookNumber] = useState(1)
  const [chapterNumber, setChapterNumber] = useState(1)
  const [verseNumber, setVerseNumber] = useState(1)
  const [chapter, setChapter] = useState<ChapterData | null>(null)
  const [error, setError] = useState('')
  const [rangeStart, setRangeStart] = useState(1)
  const [rangeEnd, setRangeEnd] = useState(1)
  const [searchResults, setSearchResults] = useState<BibleSearchResult[]>([])
  const [searchMessage, setSearchMessage] = useState('')
  const pendingRange = useRef<[number, number] | null>(null)
  const activeBook = books.find((book) => book.book_number === bookNumber)
  const currentChapter = chapter?.book_number === bookNumber && chapter.chapter_number === chapterNumber ? chapter : null
  const verse = currentChapter?.verses.find((item) => item.verse_number === verseNumber)
  const slide = verse && currentChapter ? { sourceId: `kjv:${bookNumber}:${chapterNumber}:${verseNumber}`, title: `${currentChapter.name} ${chapterNumber}:${verseNumber}`, subtitle: 'King James Version', body: verse.text, reference: `${currentChapter.name} ${chapterNumber}:${verseNumber}`, kind: 'scripture' as const, bookNumber, chapterNumber, verseNumber } : null
  const displayError = error || (!isTauri() ? 'Open the desktop app to access the local Bible.' : '')
  const keywordResultsOpen = searchRequest?.mode === 'keyword' && Boolean(searchMessage)

  useEffect(() => {
    if (!isTauri()) return
    let active = true
    invoke<BookSummary[]>('get_bible_books').then((items) => { if (active) { setBooks(items); if (!items.length) setError('Import the KJV package from Home first.') } }).catch((reason) => { if (active) setError(String(reason)) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!books.length) return
    let active = true
    invoke<ChapterData>('get_bible_chapter', { bookNumber, chapterNumber }).then((result) => { if (active) { setChapter(result); const pending = pendingRange.current; const maxVerse = result.verses.at(-1)?.verse_number ?? 1; if (pending) { const start = Math.min(pending[0], maxVerse); const end = Math.max(start, Math.min(pending[1], maxVerse)); setVerseNumber(start); setRangeStart(start); setRangeEnd(end); pendingRange.current = null } else { setVerseNumber(1); setRangeStart(1); setRangeEnd(1) } setError('') } }).catch((reason) => { if (active) setError(String(reason)) })
    return () => { active = false }
  }, [books.length, bookNumber, chapterNumber])

  useEffect(() => {
    if (!searchRequest || !books.length) return
    let active = true
    void Promise.resolve().then(async () => {
      if (!active) return
      setSearchResults([])
      setSearchMessage('Searching…')
      if (searchRequest.mode === 'keyword') {
        try {
          const results = await invoke<BibleSearchResult[]>('search_bible_keyword', { query: searchRequest.query })
          if (active) { setSearchResults(results); setSearchMessage(results.length ? `${results.length} matching verses` : 'No matching verses found.') }
        } catch (reason) { if (active) setSearchMessage(String(reason)) }
        return
      }
      const match = searchRequest.query.trim().match(/^(.+?)\s+(\d+):(\d+)(?:\s*-\s*(\d+))?$/)
      const book = match && books.find((item) => item.name.toLowerCase() === match[1].trim().toLowerCase())
      if (!match || !book) { setSearchMessage('Enter a reference such as John 3:16 or John 3:16-18.'); return }
      const chap = Number(match[2]), start = Number(match[3]), end = Number(match[4] || match[3])
      if (start < 1 || end < start) { setSearchMessage('Check the verse range and try again.'); return }
      setSearchMessage('')
      setBookNumber(book.book_number)
      setChapterNumber(chap)
      pendingRange.current = [start, end]
      if (book.book_number === bookNumber && chap === chapterNumber && currentChapter) { setRangeStart(start); setRangeEnd(Math.min(end, currentChapter.verses.at(-1)?.verse_number ?? end)); setVerseNumber(start); pendingRange.current = null }
    })
    return () => { active = false }
    // The request ID and loaded library define the search; chapter state is only used to avoid a refetch for an already-open passage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchRequest?.id, books.length])

  function makeVerseSlide(item: { verse_number: number; text: string }, chapterData = currentChapter): PresentationSlide | null {
    if (!chapterData) return null
    return { sourceId: `kjv:${chapterData.book_number}:${chapterData.chapter_number}:${item.verse_number}`, title: `${chapterData.name} ${chapterData.chapter_number}:${item.verse_number}`, subtitle: 'King James Version', body: item.text, reference: `${chapterData.name} ${chapterData.chapter_number}:${item.verse_number}`, kind: 'scripture', bookNumber: chapterData.book_number, chapterNumber: chapterData.chapter_number, verseNumber: item.verse_number }
  }

  function selectSearchResult(result: BibleSearchResult) {
    setSearchResults([])
    setSearchMessage('')
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
    const resultSlide: PresentationSlide = { sourceId: `kjv:${result.book_number}:${result.chapter_number}:${result.verse_number}`, title: `${result.book_name} ${result.chapter_number}:${result.verse_number}`, subtitle: 'King James Version', body: result.text, reference: `${result.book_name} ${result.chapter_number}:${result.verse_number}`, kind: 'scripture', bookNumber: result.book_number, chapterNumber: result.chapter_number, verseNumber: result.verse_number }
    onPreview(resultSlide)
  }

  return (
    <div className="source-browser">
      {keywordResultsOpen ? <div className="bible-search-results expanded"><span>{searchMessage}</span>{searchResults.map((result) => <button key={`${result.book_number}-${result.chapter_number}-${result.verse_number}`} onClick={() => selectSearchResult(result)}><strong>{result.book_name} {result.chapter_number}:{result.verse_number}</strong><span>{result.text}</span></button>)}</div> : <>
      <div className="source-selects">
        <label>Book<select value={bookNumber} onChange={(event) => { setBookNumber(Number(event.target.value)); setChapterNumber(1) }} disabled={!books.length}>{books.map((book) => <option key={book.book_number} value={book.book_number}>{book.name}</option>)}</select></label>
        <label>Chapter<select value={chapterNumber} onChange={(event) => setChapterNumber(Number(event.target.value))} disabled={!activeBook}>{Array.from({ length: activeBook?.chapter_count ?? 0 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>
      </div>
      <div className="passage-range"><span>Passage slides</span><label>From<select value={rangeStart} onChange={(event) => setRangeStart(Number(event.target.value))} disabled={!currentChapter}>{currentChapter?.verses.map((item) => <option key={item.verse_number} value={item.verse_number}>{item.verse_number}</option>)}</select></label><label>To<select value={rangeEnd} onChange={(event) => setRangeEnd(Number(event.target.value))} disabled={!currentChapter}>{currentChapter?.verses.filter((item) => item.verse_number >= rangeStart).map((item) => <option key={item.verse_number} value={item.verse_number}>{item.verse_number}</option>)}</select></label><button disabled={!currentChapter || rangeEnd < rangeStart} onClick={() => { const data = currentChapter; if (!data) return; const slides = data.verses.filter((item) => item.verse_number >= rangeStart && item.verse_number <= rangeEnd).map((item) => makeVerseSlide(item, data)).filter((item): item is PresentationSlide => item !== null); onAddMany(slides) }}>Add passage</button></div>
      <div className="source-list-heading"><span>VERSE</span><span>KJV</span></div>
      <div className="source-verse-list">{currentChapter?.verses.map((item) => {
        const verseSlide = makeVerseSlide(item)
        if (!verseSlide) return null
        const isPreview = previewSourceId === verseSlide.sourceId
        return <button className={`source-verse-row${item.verse_number === verseNumber ? ' selected' : ''}${isPreview ? ' is-preview' : ''}`} key={item.verse_number} aria-pressed={isPreview} draggable onDragStart={(event) => event.dataTransfer.setData('text/bibleshow-slide', JSON.stringify(verseSlide))} onClick={() => { setVerseNumber(item.verse_number); setRangeStart(item.verse_number); setRangeEnd(item.verse_number); onPreview(verseSlide) }} onDoubleClick={() => onSendLive(verseSlide)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); onSendLive(verseSlide) } }}><sup>{item.verse_number}</sup><span>{item.text}</span>{isPreview && <small>PREVIEW</small>}</button>
      })}{displayError && <p className="source-error">{displayError}</p>}</div>
      <div className="source-actions"><button onClick={() => slide && onPreview(slide)} disabled={!slide}>Preview verse</button><button onClick={() => slide && onAdd(slide)} disabled={!slide}><Icon name="plus" size={14} /> Add to sequence</button></div>
      </>}
    </div>
  )
}

function lyricSectionLabel(section: SongDetail['sections'][number], index: number) {
  if (section.section_type === 'verse') return `Verse ${section.label.replace(/\D/g, '') || index + 1}`
  if (section.section_type === 'chorus') return 'Chorus'
  return section.section_type.replace('-', ' ').replace(/^./, (letter) => letter.toUpperCase())
}

function SongSourcePicker({ onPreview, onSendLive, onAdd, previewSourceId }: { onPreview: (slide: PresentationSlide) => void; onSendLive: (slide: PresentationSlide) => void; onAdd: (slide: PresentationSlide) => void; previewSourceId: string | null }) {
  const [category, setCategory] = useState<'all' | 'hymn' | 'song'>('all')
  const [search, setSearch] = useState('')
  const [songs, setSongs] = useState<SongSummary[]>([])
  const [selectedSongId, setSelectedSongId] = useState('')
  const [detail, setDetail] = useState<SongDetail | null>(null)
  const [error, setError] = useState('')
  const currentDetail = detail?.id === selectedSongId ? detail : null
  const displayError = error || (!isTauri() ? 'Open the desktop app to access local lyrics.' : '')

  useEffect(() => {
    if (!isTauri()) return
    let active = true
    invoke<SongSummary[]>('get_song_library', { category, search }).then((items) => {
      if (!active) return
      setSongs(items)
      setSelectedSongId((current) => items.some((song) => song.id === current) ? current : items[0]?.id ?? '')
      setError(items.length ? '' : 'No matching lyrics. Import the cleaned content ZIP from Home if the library is empty.')
    }).catch((reason) => { if (active) setError(String(reason)) })
    return () => { active = false }
  }, [category, search])

  useEffect(() => {
    if (!selectedSongId) return
    let active = true
    invoke<SongDetail>('get_song_detail', { songId: selectedSongId }).then((result) => { if (active) setDetail(result) }).catch((reason) => { if (active) setError(String(reason)) })
    return () => { active = false }
  }, [selectedSongId])

  function makeSlide(sectionIndex: number): PresentationSlide | null {
    const section = currentDetail?.sections[sectionIndex]
    if (!currentDetail || !section) return null
    const label = lyricSectionLabel(section, sectionIndex)
    return { sourceId: `song:${currentDetail.id}:${sectionIndex}`, title: currentDetail.title, subtitle: label, body: section.lyrics, reference: currentDetail.authors || (currentDetail.category === 'hymn' ? 'Hymn' : 'Song'), kind: 'lyrics', songId: currentDetail.id, sectionIndex }
  }

  return (
    <div className="source-browser song-source-browser">
      <label className="source-search"><Icon name="search" size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search titles or authors" /></label>
      <div className="source-category-tabs" role="tablist" aria-label="Filter lyrics">{(['all', 'hymn', 'song'] as const).map((item) => <button key={item} className={category === item ? 'selected' : ''} role="tab" aria-selected={category === item} onClick={() => setCategory(item)}>{item === 'all' ? 'All' : item === 'hymn' ? 'Hymns' : 'Songs'}</button>)}</div>
      <div className="source-song-list">{songs.map((song) => <button className={`source-song-item${selectedSongId === song.id ? ' selected' : ''}`} onClick={() => setSelectedSongId(song.id)} key={song.id}><strong>{song.title}</strong><small>{song.authors || song.category}</small></button>)}{!songs.length && <p className="source-error">{displayError || 'No lyrics found.'}</p>}</div>
      {currentDetail && <div className="source-sections"><div className="source-list-heading"><span>{currentDetail.title}</span><span>{currentDetail.sections.length} PAGES</span></div>{currentDetail.sections.map((section, index) => {
        const slide = makeSlide(index)
        const isPreview = slide?.sourceId === previewSourceId
        return <div className={`source-section-item${isPreview ? ' is-preview' : ''}`} key={`${section.label}-${index}`}><button aria-label={`Preview ${lyricSectionLabel(section, index)} from ${currentDetail.title}; press Enter or double-click to send Live`} aria-pressed={isPreview} draggable onDragStart={(event) => slide && event.dataTransfer.setData('text/bibleshow-slide', JSON.stringify(slide))} onClick={() => slide && onPreview(slide)} onDoubleClick={() => slide && onSendLive(slide)} onKeyDown={(event) => { if (event.key === 'Enter' && slide) { event.preventDefault(); event.stopPropagation(); onSendLive(slide) } }}><strong>{lyricSectionLabel(section, index)}</strong><small>{section.lyrics.replace(/\n/g, ' ').slice(0, 52)}</small></button><button onClick={() => slide && onAdd(slide)} aria-label={`Add ${lyricSectionLabel(section, index)} to sequence`}><Icon name="plus" size={14} /></button></div>
      })}</div>}
      {displayError && !songs.length && <p className="source-error">{displayError}</p>}
    </div>
  )
}

function SlideScreen({ slide, emptyLabel }: { slide: PresentationSlide | null; emptyLabel: string }) {
  if (!slide) return <div className="operator-screen is-empty"><div><Icon name="screen" size={23} /><span>{emptyLabel}</span></div></div>
  return <article className={`operator-screen ${slide.kind === 'scripture' ? 'scripture-screen' : 'lyrics-screen'}`}><span>{slide.subtitle}</span><p>{slide.body}</p><strong>{slide.reference}</strong></article>
}

export function AudienceWindow() {
  const [snapshot, setSnapshot] = useState<AudienceSnapshot>({ slide: null, alert: null })

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

  return <main className="audience-window" aria-label="Audience display">
    {snapshot.slide ? <article className={`audience-slide ${snapshot.slide.kind === 'scripture' ? 'scripture-screen' : 'lyrics-screen'}`}><span>{snapshot.slide.subtitle}</span><p>{snapshot.slide.body}</p><strong>{snapshot.slide.reference}</strong></article> : <div className="audience-standby" />}
    {snapshot.alert && <div className={`audience-alert ${snapshot.alert.mode}`}><span>{snapshot.alert.text}</span></div>}
  </main>
}

export default App
