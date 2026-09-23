import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

import ResultsPanel from '../components/ResultsPanel.jsx'
import Spinner from '../components/Spinner.jsx'
import { ChevronDownIcon, SparklesIcon } from '../components/Icons.jsx'
import { AI_PROVIDERS, DEFAULT_PROVIDER, findProvider } from '../constants/providers.js'
import { generateCode, ApiError } from '../services/api.js'
import { fetchOllamaModels } from '../services/ollama.js'
import '../css/Generator.css'

function buildErrorMessage(error, t) {
  if (error instanceof ApiError) {
    if (error.code === 'network') return t('generator.errors.network')
    if (error.code === 'timeout') return t('generator.errors.timeout')
    if (error.code === 'http') {
      return error.detail
        ? `${t('generator.errors.server')}: ${error.detail}`
        : `${t('generator.errors.server')} (${error.status})`
    }
  }
  return t('generator.errors.generic')
}

export default function Generator() {
  const { t } = useTranslation()
  const [prompt, setPrompt] = useState('')
  const [providerId, setProviderId] = useState(DEFAULT_PROVIDER.id)
  const [modelId, setModelId] = useState(DEFAULT_PROVIDER.models[0].id)
  const [modelOptions, setModelOptions] = useState(DEFAULT_PROVIDER.models)
  // 'ready' | 'loading' | 'error' — estado del selector de modelos
  const [modelStatus, setModelStatus] = useState('ready')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const loadSequence = useRef(0)

  const loadOllamaModels = useCallback(async () => {
    const sequence = ++loadSequence.current
    setModelStatus('loading')
    setModelOptions([])
    setModelId('')

    try {
      const models = await fetchOllamaModels()
      if (sequence !== loadSequence.current) return
      if (models.length > 0) {
        setModelOptions(models)
        setModelId(models[0].id)
        setModelStatus('ready')
      } else {
        setModelStatus('error')
      }
    } catch {
      if (sequence !== loadSequence.current) return
      setModelStatus('error')
    }
  }, [])

  const handleProviderChange = (event) => {
    const nextProviderId = event.target.value
    const provider = findProvider(nextProviderId)
    setProviderId(nextProviderId)

    if (provider.kind === 'ollama') {
      void loadOllamaModels()
      return
    }

    loadSequence.current += 1
    setModelOptions(provider.models)
    setModelId(provider.models[0].id)
    setModelStatus('ready')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (loading) return

    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) {
      toast.error(t('generator.errors.emptyPrompt'))
      return
    }
    if (modelStatus !== 'ready' || !modelId) {
      toast.error(t('generator.errors.noModel'))
      return
    }

    setLoading(true)
    try {
      const data = await generateCode({ prompt: trimmedPrompt, model: modelId })
      setResult(data)
      toast.success(t('generator.success'))
    } catch (error) {
      toast.error(buildErrorMessage(error, t))
    } finally {
      setLoading(false)
    }
  }

  const modelSelectId = 'ai-model'

  return (
    <section className="page generator-page">
      <header className="page-header">
        <span className="page-header__eyebrow">
          <SparklesIcon size={13} />
          {t('app.name')}
        </span>
        <h1>{t('generator.title')}</h1>
        <p>{t('generator.subtitle')}</p>
      </header>

      <form className="card prompt-card" onSubmit={handleSubmit} noValidate>
        <div className="prompt-card__field">
          <label className="field-label" htmlFor="problem-description">
            {t('generator.prompt.label')}
          </label>
          <textarea
            id="problem-description"
            className="textarea"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={t('generator.prompt.placeholder')}
            rows={7}
            spellCheck={false}
            disabled={loading}
          />
          <p className="prompt-card__hint">{t('generator.prompt.hint')}</p>
        </div>

        <div className="prompt-card__footer">
          <div className="prompt-card__fields">
            <div className="select-field">
              <label className="field-label" htmlFor="ai-provider">
                {t('generator.provider.label')}
              </label>
              <div className="select-wrap">
                <select
                  id="ai-provider"
                  className="select"
                  value={providerId}
                  onChange={handleProviderChange}
                  disabled={loading}
                >
                  {AI_PROVIDERS.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label}
                    </option>
                  ))}
                </select>
                <span className="select-wrap__chevron">
                  <ChevronDownIcon />
                </span>
              </div>
            </div>

            <div className="select-field">
              <label className="field-label" htmlFor={modelSelectId}>
                {t('generator.model.label')}
              </label>
              <div className="select-wrap">
                <select
                  id={modelSelectId}
                  className="select"
                  value={modelStatus === 'ready' ? modelId : ''}
                  onChange={(event) => setModelId(event.target.value)}
                  disabled={loading || modelStatus !== 'ready'}
                  aria-busy={modelStatus === 'loading'}
                >
                  {modelStatus === 'loading' && (
                    <option value="" disabled>
                      {t('generator.model.loading')}
                    </option>
                  )}
                  {modelStatus === 'error' && (
                    <option value="" disabled>
                      {t('generator.model.unavailable')}
                    </option>
                  )}
                  {modelStatus === 'ready' &&
                    modelOptions.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                </select>
                <span className="select-wrap__chevron">
                  {modelStatus === 'loading' ? <Spinner size="sm" /> : <ChevronDownIcon />}
                </span>
              </div>

              {modelStatus === 'error' && (
                <p className="select-field__error" role="alert">
                  <span>{t('generator.model.ollamaError')}</span>
                  <button
                    type="button"
                    className="retry-btn"
                    onClick={() => void loadOllamaModels()}
                  >
                    {t('generator.model.retry')}
                  </button>
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--lg generate-btn"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" />
                {t('generator.actions.generating')}
              </>
            ) : (
              <>
                <SparklesIcon size={16} />
                {t('generator.actions.generate')}
              </>
            )}
          </button>
        </div>
      </form>

      {loading && (
        <div className="card loading-panel" role="status" aria-live="polite">
          <Spinner size="lg" />
          <p className="loading-panel__title">{t('generator.loading.title')}</p>
          <p className="loading-panel__description">{t('generator.loading.description')}</p>
        </div>
      )}

      {!loading && !result && (
        <div className="empty-state generator-empty">
          <span className="empty-state__icon">
            <SparklesIcon />
          </span>
          <p className="empty-state__title">{t('generator.results.empty.title')}</p>
          <p className="empty-state__description">{t('generator.results.empty.description')}</p>
        </div>
      )}

      {!loading && result && <ResultsPanel result={result} />}
    </section>
  )
}
