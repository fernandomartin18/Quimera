import { Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import Header from './components/Header.jsx'
import Generator from './pages/Generator.jsx'
import Settings from './pages/Settings.jsx'
import { usePreferences } from './context/preferencesContext.js'

export default function App() {
  const { resolvedTheme } = usePreferences()

  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Generator />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            fontSize: '14px',
            borderRadius: '12px',
            maxWidth: '420px',
          },
          success: {
            iconTheme: { primary: 'var(--success)', secondary: 'var(--surface)' },
          },
          error: {
            duration: 7000,
            iconTheme: { primary: 'var(--danger)', secondary: 'var(--surface)' },
          },
        }}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      />
    </div>
  )
}
