import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import PreferencesSection from '../components/settings/PreferencesSection.jsx'
import { LayersIcon } from '../components/Icons.jsx'
import '../css/Settings.css'

/**
 * Configuración modular de secciones.
 * Para añadir una nueva pestaña: crear el componente e incluirlo en
 * SECTION_COMPONENTS + habilitar la entrada en SETTINGS_SECTIONS.
 */
const SETTINGS_SECTIONS = [
  { id: 'preferences', labelKey: 'settings.sections.preferences', enabled: true },
  { id: 'providers', labelKey: 'settings.sections.providers', enabled: false },
  { id: 'profile', labelKey: 'settings.sections.profile', enabled: false },
]

const SECTION_COMPONENTS = {
  preferences: PreferencesSection,
}

function SectionPlaceholder({ title, description }) {
  return (
    <div className="empty-state settings-placeholder">
      <span className="empty-state__icon">
        <LayersIcon />
      </span>
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__description">{description}</p>
    </div>
  )
}

export default function Settings() {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState(
    SETTINGS_SECTIONS.find((section) => section.enabled)?.id ?? SETTINGS_SECTIONS[0].id,
  )

  const ActiveSection = SECTION_COMPONENTS[activeId]

  return (
    <section className="page settings-page">
      <header className="page-header">
        <span className="page-header__eyebrow">{t('app.name')}</span>
        <h1>{t('settings.title')}</h1>
        <p>{t('settings.subtitle')}</p>
      </header>

      <div className="settings-layout">
        <nav className="settings-nav" aria-label={t('settings.title')}>
          {SETTINGS_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`settings-nav__item${activeId === section.id ? ' is-active' : ''}`}
              onClick={() => section.enabled && setActiveId(section.id)}
              disabled={!section.enabled}
              aria-current={activeId === section.id ? 'page' : undefined}
            >
              <span>{t(section.labelKey)}</span>
              {!section.enabled && (
                <span className="settings-nav__badge">{t('settings.comingSoon')}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="card settings-panel">
          {ActiveSection ? (
            <ActiveSection />
          ) : (
            <SectionPlaceholder
              title={t('settings.placeholder.title')}
              description={t('settings.placeholder.description')}
            />
          )}
        </div>
      </div>
    </section>
  )
}
