import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import {
  AtomIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GearIcon,
  MenuIcon,
  XIcon,
} from './Icons.jsx'
import '../css/Sidebar.css'

const COLLAPSED_KEY = 'quimera.sidebar.collapsed'
const MOBILE_QUERY = '(max-width: 720px)'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function readIsMobile() {
  return window.matchMedia?.(MOBILE_QUERY).matches ?? false
}

export default function Sidebar() {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(readIsMobile)

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY)
    const onChange = (event) => {
      setIsMobile(event.matches)
      if (!event.matches) setDrawerOpen(false)
    }
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [])

  const isCollapsed = collapsed && !isMobile

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        /* almacenamiento no disponible */
      }
      return next
    })
  }

  const closeDrawer = () => setDrawerOpen(false)

  return (
    <>
      {!drawerOpen && (
        <button
          type="button"
          className="sidebar-mobile-toggle"
          onClick={() => setDrawerOpen(true)}
          aria-label={t('sidebar.openMenu')}
          title={t('sidebar.openMenu')}
        >
          <MenuIcon size={18} />
        </button>
      )}

      {drawerOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'sidebar',
          isCollapsed ? 'is-collapsed' : '',
          drawerOpen ? 'is-drawer-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={t('app.name')}
      >
        <div className="sidebar__header">
          {isCollapsed ? (
            <button
              type="button"
              className="sidebar__logo-btn"
              onClick={toggleCollapsed}
              title={t('sidebar.expand')}
              aria-label={t('sidebar.expand')}
            >
              <span className="brand__mark" aria-hidden="true">
                <AtomIcon size={18} />
              </span>
              <span className="sidebar__logo-btn-hint" aria-hidden="true">
                <ChevronRightIcon size={15} />
              </span>
            </button>
          ) : (
            <>
              <Link
                to="/"
                className="sidebar__brand"
                aria-label={t('nav.home')}
                onClick={closeDrawer}
              >
                <span className="brand__mark" aria-hidden="true">
                  <AtomIcon size={18} />
                </span>
                <span className="sidebar__brand-name">{t('app.name')}</span>
              </Link>
              <div className="sidebar__header-actions">
                {isMobile ? (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setDrawerOpen(false)}
                    aria-label={t('sidebar.closeMenu')}
                    title={t('sidebar.closeMenu')}
                  >
                    <XIcon size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={toggleCollapsed}
                    aria-label={t('sidebar.collapse')}
                    title={t('sidebar.collapse')}
                  >
                    <ChevronLeftIcon size={16} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="sidebar__history">
          <p className="sidebar__section-label">{t('sidebar.history.title')}</p>
          <div className="sidebar__history-empty">
            <p>{t('sidebar.history.empty')}</p>
          </div>
        </div>

        <div className="sidebar__footer">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `sidebar__settings${isActive ? ' is-active' : ''}`
            }
            title={t('nav.openSettings')}
            aria-label={t('nav.openSettings')}
            onClick={closeDrawer}
          >
            <GearIcon size={18} />
            <span className="sidebar__settings-label">{t('nav.settings')}</span>
          </NavLink>
        </div>
      </aside>
    </>
  )
}
