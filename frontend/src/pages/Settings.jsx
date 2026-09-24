import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import PreferencesSection from '../components/settings/PreferencesSection.jsx'
import { ArrowLeftIcon, LayersIcon } from '../components/Icons.jsx'
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
  const navigate = useNavigate()
  const location = useLocation()
  const [activeId, setActiveId] = useState(
    SETTINGS_SECTIONS.find((section) => section.enabled)?.id ?? SETTINGS_SECTIONS[0].id,
  )

  const ActiveSection = SECTION_COMPONENTS[activeId]

  const handleBack = () => {
    if (location.key !== 'default') {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <section className="page settings-page">
      <button type="button" className="btn btn--ghost btn--back" onClick={handleBack}>
        <ArrowLeftIcon size={15} />
        {t('settings.back')}
      </button>

      <header className="settings-page__header">
        <h1>{t('settings.title')}</h1>
        <div className="settings-tabs" role="tablist" aria-label={t('settings.title')}>
          {SETTINGS_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              role="tab"
              className={`settings-tab${activeId === section.id ? ' is-active' : ''}`}
              aria-selected={activeId === section.id}
              onClick={() => section.enabled && setActiveId(section.id)}
              disabled={!section.enabled}
            >
              <span>{t(section.labelKey)}</span>
              {!section.enabled && (
                <span className="settings-tab__badge">{t('settings.comingSoon')}</span>
              )}
            </button>
          ))}
        </div>
      </header>

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
    </section>
  )
}
