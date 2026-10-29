import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './AppShell.tsx'
import { loadAssetManifest } from './lib/assetManifest'

// Read the optional real-asset list first; the game starts either way
loadAssetManifest().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
