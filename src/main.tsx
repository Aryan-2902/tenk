import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import App from './App'
import './index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root not found')

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)

// The boot skeleton in index.html gave us a first paint before this bundle
// arrived. React clears the container on its first commit, but removing it
// explicitly means that behaviour is not something we are relying on.
document.getElementById('boot')?.remove()
