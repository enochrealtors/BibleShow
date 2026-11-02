import { useState, type ReactNode } from 'react'
import './App.css'

type Page = 'home' | 'study' | 'presentation'
type IconName = 'home' | 'book' | 'screen' | 'search' | 'sun' | 'moon' | 'arrow' | 'plus' | 'spark' | 'clock' | 'settings'

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
  study: 'Bible Study',
  presentation: 'Presentation',
}

function App() {
  const [page, setPage] = useState<Page>('home')
  const [darkMode, setDarkMode] = useState(false)

  return (
    <div className={`app-shell${darkMode ? ' theme-dark' : ''}`}>
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
          <button className={`nav-item${page === 'study' ? ' active' : ''}`} onClick={() => setPage('study')} aria-label="Bible Study" aria-current={page === 'study' ? 'page' : undefined}>
            <Icon name="book" /><span>Bible Study</span>
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
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-divider">/</span><strong>{pageTitles[page]}</strong></div>
          <div className="topbar-actions">
            <button className="icon-button search-button" aria-label="Search, coming soon" title="Search is coming soon" disabled><Icon name="search" /><span>Search</span><kbd>Ctrl K</kbd></button>
            <span className="topbar-separator" />
            <button className="icon-button theme-button" onClick={() => setDarkMode(!darkMode)} aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'} title={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}><Icon name={darkMode ? 'sun' : 'moon'} /></button>
            <button className="settings-button" aria-label="Settings, coming soon" title="Settings are coming soon" disabled><Icon name="settings" /></button>
          </div>
        </header>

        <div className="page-content">
          {page === 'home' && <HomePage onNavigate={setPage} />}
          {page === 'study' && <WorkspacePage kind="study" onBack={() => setPage('home')} />}
          {page === 'presentation' && <WorkspacePage kind="presentation" onBack={() => setPage('home')} />}
          <footer className="app-footer"><span>BibleShow</span><span>Built for study, worship, and service</span><span className="footer-version">EARLY ACCESS</span></footer>
        </div>
      </main>
    </div>
  )
}

function HomePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> YOUR BIBLE WORKSPACE</div>
          <h1>Welcome to BibleShow</h1>
          <p className="welcome-subtitle">A calm place to study Scripture and prepare to share it.</p>
        </div>
        <div className="date-chip"><span className="date-dot" /> Designed to work without internet</div>
      </section>

      <section className="workspace-grid" aria-label="Choose a workspace">
        <button className="workspace-card study-card" onClick={() => onNavigate('study')}>
          <span className="card-icon study-icon"><Icon name="book" size={21} /></span>
          <span className="card-kicker">READ · REFLECT · GROW</span>
          <span className="card-title">Bible Study</span>
          <span className="card-description">Make space for the Word. Your study tools and reading workspace start here.</span>
          <span className="card-link">Open study workspace <Icon name="arrow" size={16} /></span>
          <span className="card-art art-book" aria-hidden="true"><span /><span /><span /></span>
        </button>
        <button className="workspace-card presentation-card" onClick={() => onNavigate('presentation')}>
          <span className="card-icon presentation-icon"><Icon name="screen" size={21} /></span>
          <span className="card-kicker">PREPARE · PRESENT · SERVE</span>
          <span className="card-title">Church Presentation</span>
          <span className="card-description">Prepare Scripture and service content for your next gathering.</span>
          <span className="card-link">Open presentation workspace <Icon name="arrow" size={16} /></span>
          <span className="card-art art-stage" aria-hidden="true"><span className="stage-screen" /><span className="stage-glow" /></span>
        </button>
      </section>

      <section className="below-grid">
        <div className="recent-panel">
          <div className="section-heading"><div><span className="section-icon"><Icon name="clock" size={17} /></span><h2>Pick up where you left off</h2></div><span className="muted-label">RECENT ACTIVITY</span></div>
          <div className="empty-state">
            <span className="empty-illustration"><Icon name="book" size={22} /></span>
            <div><strong>Your recent work will appear here</strong><p>Start a study session or prepare a presentation to see it in this space.</p></div>
          </div>
        </div>
        <aside className="quick-panel">
          <div className="section-heading"><div><span className="section-icon spark-icon"><Icon name="spark" size={17} /></span><h2>Quick start</h2></div></div>
          <button className="quick-action" onClick={() => onNavigate('study')}><span className="quick-action-icon"><Icon name="plus" size={17} /></span><span><strong>Start a Bible study</strong><small>Open your reading workspace</small></span><Icon name="arrow" size={15} /></button>
          <button className="quick-action" onClick={() => onNavigate('presentation')}><span className="quick-action-icon quick-screen"><Icon name="screen" size={17} /></span><span><strong>Prepare a presentation</strong><small>Open your service workspace</small></span><Icon name="arrow" size={15} /></button>
        </aside>
      </section>
    </>
  )
}

function WorkspacePage({ kind, onBack }: { kind: 'study' | 'presentation'; onBack: () => void }) {
  const isStudy = kind === 'study'
  return (
    <section className={`workspace-placeholder ${isStudy ? 'study-placeholder' : 'presentation-placeholder'}`}>
      <button className="back-link" onClick={onBack}>← Back to home</button>
      <div className="placeholder-content">
        <span className={`placeholder-icon ${isStudy ? 'study-icon' : 'presentation-icon'}`}><Icon name={isStudy ? 'book' : 'screen'} size={25} /></span>
        <div className="eyebrow"><span className="eyebrow-line" /> BIBLESHOW WORKSPACE</div>
        <h1>{isStudy ? 'Bible Study' : 'Church Presentation'}</h1>
        <p>{isStudy ? 'A focused space for reading, exploring, and preparing with Scripture.' : 'A dedicated space for preparing Scripture and service content to share.'}</p>
        <div className="coming-soon"><span className="coming-dot" /> This workspace is taking shape</div>
        <button className="return-button" onClick={onBack}>Return to home <Icon name="arrow" size={16} /></button>
      </div>
    </section>
  )
}

export default App
