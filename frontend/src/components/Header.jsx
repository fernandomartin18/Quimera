import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { usePreferences } from '../context/preferencesContext.js'
import { AtomIcon, GearIcon, MoonIcon, MonitorIcon, SunIcon } from './Icons.jsx'
import '../css/Header.css'

const THEME_ICONS = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
}

export default function Header() {
  const { t } = useTranslation()
  const { preferences, cycleTheme } = usePreferences()
  const ThemeIcon = THEME_ICONS[preferences.theme] ?? MonitorIcon

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link to="/" className="brand" aria-label={t('nav.home')}>
          <span className="brand__mark" aria-hidden="true">
            <AtomIcon size={17} />
          </span>
          <span className="brand__text">
            <span className="brand__name">{t('app.name')}</span>
            <span className="brand__tagline">{t('app.tagline')}</span>
          </span>
        </Link>

        <nav className="app-nav" aria-label={t('app.name')}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `app-nav__link${isActive ? ' is-active' : ''}`}
          >
            <span>{t('nav.generator')}</span>
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `app-nav__link${isActive ? ' is-active' : ''}`}
          >
            <span>{t('nav.settings')}</span>
          </NavLink>
        </nav>

        <div className="app-header__actions">
          <button
            type="button"
            className="icon-btn"
            onClick={cycleTheme}
            title={t('nav.cycleTheme')}
            aria-label={`${t('nav.cycleTheme')} — ${t(`theme.${preferences.theme}`)}`}
          >
            <ThemeIcon size={17} />
          </button>
          <Link
            to="/settings"
            className="icon-btn"
            title={t('nav.openSettings')}
            aria-label={t('nav.openSettings')}
          >
            <GearIcon size={17} />
          </Link>
        </div>
      </div>
    </header>
  )
}
