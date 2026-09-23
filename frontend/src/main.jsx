import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import './i18n'
import './styles/variables.css'
import './styles/global.css'

import App from './App.jsx'
import { PreferencesProvider } from './context/PreferencesContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <PreferencesProvider>
        <App />
      </PreferencesProvider>
    </BrowserRouter>
  </StrictMode>,
)
