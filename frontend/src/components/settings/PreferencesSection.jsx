import { useTranslation } from 'react-i18next'

import SegmentedControl from '../SegmentedControl.jsx'
import { MonitorIcon, MoonIcon, SunIcon } from '../Icons.jsx'
import { usePreferences } from '../../context/preferencesContext.js'

export default function PreferencesSection() {
  const { t } = useTranslation()
  const { preferences, resolvedLanguage, resolvedTheme, setLanguage, setTheme } =
    usePreferences()

  const languageOptions = [
    {
      value: 'system',
      label: t('language.system'),
      icon: <MonitorIcon size={15} />,
    },
    {
      value: 'es',
      label: t('language.es'),
      icon: <span className="segmented__badge">ES</span>,
    },
    {
      value: 'en',
      label: t('language.en'),
      icon: <span className="segmented__badge">EN</span>,
    },
  ]

  const themeOptions = [
    {
      value: 'system',
      label: t('theme.system'),
      icon: <MonitorIcon size={15} />,
    },
    {
      value: 'light',
      label: t('theme.light'),
      icon: <SunIcon size={15} />,
    },
    {
      value: 'dark',
      label: t('theme.dark'),
      icon: <MoonIcon size={15} />,
    },
  ]

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <h2>{t('settings.preferences.title')}</h2>
        <p>{t('settings.preferences.description')}</p>
      </div>

      <div className="preference-row">
        <div className="preference-row__info">
          <h3>{t('settings.preferences.language.label')}</h3>
          <p>{t('settings.preferences.language.description')}</p>
          <span className="preference-row__detected">
            {t('settings.preferences.language.detected', {
              value: t(`language.${resolvedLanguage}`),
            })}
          </span>
        </div>
        <SegmentedControl
          label={t('settings.preferences.language.label')}
          options={languageOptions}
          value={preferences.language}
          onChange={setLanguage}
        />
      </div>

      <div className="preference-row">
        <div className="preference-row__info">
          <h3>{t('settings.preferences.theme.label')}</h3>
          <p>{t('settings.preferences.theme.description')}</p>
          <span className="preference-row__detected">
            {t('settings.preferences.theme.detected', {
              value: t(`theme.${resolvedTheme}`),
            })}
          </span>
        </div>
        <SegmentedControl
          label={t('settings.preferences.theme.label')}
          options={themeOptions}
          value={preferences.theme}
          onChange={setTheme}
        />
      </div>
    </div>
  )
}
