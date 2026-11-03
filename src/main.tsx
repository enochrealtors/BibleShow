import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App, { AudienceWindow } from './App.tsx'

const isAudienceWindow = new URLSearchParams(window.location.search).has('audience')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAudienceWindow ? <AudienceWindow /> : <App />}
  </StrictMode>,
)
