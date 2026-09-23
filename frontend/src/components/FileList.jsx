import { useTranslation } from 'react-i18next'

import '../css/FileList.css'

export default function FileList({ files, selectedIndex, onSelect, accent = 'default' }) {
  const { t } = useTranslation()

  return (
    <aside className={`file-list file-list--${accent}`}>
      <p className="file-list__title">{t('generator.code.files')}</p>
      <ul className="file-list__items">
        {files.map((file, index) => (
          <li key={`${file.filename}-${index}`}>
            <button
              type="button"
              className={`file-list__item${index === selectedIndex ? ' is-active' : ''}`}
              onClick={() => onSelect(index)}
              title={file.description || file.filename}
            >
              <span className="file-list__name">{file.filename}</span>
              {file.description && (
                <span className="file-list__desc">{file.description}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
