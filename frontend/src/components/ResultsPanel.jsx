import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'

import FileList from './FileList.jsx'
import MarkdownPanel from './MarkdownPanel.jsx'
import Spinner from './Spinner.jsx'
import { AtomIcon, CodeIcon, FileTextIcon, SparklesIcon } from './Icons.jsx'
import '../css/Results.css'

// Monaco es pesado: se carga solo cuando hay resultados que visualizar.
const CodeViewer = lazy(() => import('./CodeViewer.jsx'))

const TABS = [
  { id: 'classical', labelKey: 'generator.results.tabs.classical', Icon: CodeIcon },
  { id: 'quantum', labelKey: 'generator.results.tabs.quantum', Icon: AtomIcon },
  { id: 'architecture', labelKey: 'generator.results.tabs.architecture', Icon: FileTextIcon },
]

function ModulesView({ files, selectedIndex, onSelect, accent, emptyMessage }) {
  if (!files.length) {
    return (
      <div className="empty-state">
        <span className="empty-state__icon">
          <SparklesIcon />
        </span>
        <p className="empty-state__title">{emptyMessage}</p>
      </div>
    )
  }

  const safeIndex = Math.min(selectedIndex, files.length - 1)
  const selected = files[safeIndex]

  return (
    <div className="code-split">
      <FileList
        files={files}
        selectedIndex={safeIndex}
        onSelect={onSelect}
        accent={accent}
      />
      <Suspense
        fallback={
          <div className="code-viewer__loading code-viewer__loading--suspense">
            <Spinner size="sm" />
          </div>
        }
      >
        <CodeViewer
          filename={selected.filename}
          code={selected.code}
          description={selected.description}
        />
      </Suspense>
    </div>
  )
}

export default function ResultsPanel({ result }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('classical')
  const [selection, setSelection] = useState({ classical: 0, quantum: 0 })

  const classicalModules = result.classical_modules ?? []
  const quantumModules = result.quantum_modules ?? []

  const counts = {
    classical: classicalModules.length,
    quantum: quantumModules.length,
    architecture: null,
  }

  return (
    <section className="card results" aria-label={t('generator.results.title')}>
      <header className="results__header">
        <h2 className="results__title">{t('generator.results.title')}</h2>
        {result.model_used && (
          <span className="results__model" title={t('generator.results.modelUsed')}>
            {t('generator.results.modelUsed')}: {result.model_used}
          </span>
        )}
      </header>

      <div className="results__tabs" role="tablist">
        {TABS.map(({ id, labelKey, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            data-tab={id}
            aria-selected={activeTab === id}
            className={`results__tab${activeTab === id ? ' is-active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={15} />
            <span>{t(labelKey)}</span>
            {counts[id] !== null && (
              <span className="results__count">{counts[id]}</span>
            )}
          </button>
        ))}
      </div>

      <div className="results__body" role="tabpanel">
        {activeTab === 'classical' && (
          <ModulesView
            files={classicalModules}
            selectedIndex={selection.classical}
            onSelect={(index) => setSelection((s) => ({ ...s, classical: index }))}
            accent="classical"
            emptyMessage={t('generator.results.noFiles')}
          />
        )}

        {activeTab === 'quantum' && (
          <ModulesView
            files={quantumModules}
            selectedIndex={selection.quantum}
            onSelect={(index) => setSelection((s) => ({ ...s, quantum: index }))}
            accent="quantum"
            emptyMessage={t('generator.results.noFiles')}
          />
        )}

        {activeTab === 'architecture' && (
          <MarkdownPanel content={result.architecture_notes} />
        )}
      </div>
    </section>
  )
}
