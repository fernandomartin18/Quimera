import { createContext, useContext } from 'react'

export const PreferencesContext = createContext(undefined)

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider')
  }
  return context
}
