import { useCallback, useEffect, useMemo, useState } from 'react'

import i18n from '../i18n'
import { PreferencesContext } from './preferencesContext.js'

const STORAGE_KEY = 'quimera.preferences'
const THEME_OPTIONS = ['light', 'dark', 'system']
const LANGUAGE_OPTIONS = ['es', 'en', 'system']
const THEME_CYCLE = ['system', 'light', 'dark']

const DEFAULT_PREFERENCES = { theme: 'system', language: 'system' }

function readPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    const parsed = JSON.parse(raw)
    return {
      theme: THEME_OPTIONS.includes(parsed.theme) ? parsed.theme : 'system',
      language: LANGUAGE_OPTIONS.includes(parsed.language) ? parsed.language : 'system',
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

function getSystemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getSystemLanguage() {
  const locales = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const locale of locales) {
    if (!locale) continue
    const base = locale.toLowerCase()
    if (base.startsWith('es')) return 'es'
    if (base.startsWith('en')) return 'en'
  }
  return 'en'
}

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(readPreferences)
  const [systemTheme, setSystemTheme] = useState(getSystemTheme)
  const [systemLanguage, setSystemLanguage] = useState(getSystemLanguage)

  const resolvedTheme = preferences.theme === 'system' ? systemTheme : preferences.theme
  const resolvedLanguage = preferences.language === 'system' ? systemLanguage : preferences.language

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const onSchemeChange = (event) => setSystemTheme(event.matches ? 'dark' : 'light')
    const onLanguageChange = () => setSystemLanguage(getSystemLanguage())

    mediaQuery.addEventListener('change', onSchemeChange)
    window.addEventListener('languagechange', onLanguageChange)
    return () => {
      mediaQuery.removeEventListener('change', onSchemeChange)
      window.removeEventListener('languagechange', onLanguageChange)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch {
      /* almacenamiento no disponible */
    }
  }, [preferences])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme)
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  useEffect(() => {
    if (i18n.language !== resolvedLanguage) {
      void i18n.changeLanguage(resolvedLanguage)
    }
    document.documentElement.lang = resolvedLanguage
  }, [resolvedLanguage])

  const setTheme = useCallback((theme) => {
    setPreferences((current) => ({ ...current, theme }))
  }, [])

  const setLanguage = useCallback((language) => {
    setPreferences((current) => ({ ...current, language }))
  }, [])

  const cycleTheme = useCallback(() => {
    setPreferences((current) => {
      const nextIndex = (THEME_CYCLE.indexOf(current.theme) + 1) % THEME_CYCLE.length
      return { ...current, theme: THEME_CYCLE[nextIndex] }
    })
  }, [])

  const value = useMemo(
    () => ({
      preferences,
      resolvedTheme,
      resolvedLanguage,
      setTheme,
      setLanguage,
      cycleTheme,
    }),
    [preferences, resolvedTheme, resolvedLanguage, setTheme, setLanguage, cycleTheme],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}
