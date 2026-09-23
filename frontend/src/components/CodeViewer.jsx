import '../lib/monaco'
import { useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

import { usePreferences } from '../context/preferencesContext.js'
import { CheckIcon, CopyIcon } from './Icons.jsx'
import '../css/CodeViewer.css'

const LANGUAGE_BY_EXTENSION = {
  py: 'python',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  json: 'json',
  c: 'c',
  h: 'c',
  cc: 'cpp',
  cpp: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  java: 'java',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  sh: 'shell',
  bash: 'shell',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'ini',
  sql: 'sql',
  html: 'html',
  css: 'css',
  md: 'markdown',
}

function detectLanguage(filename = '') {
  const extension = filename.split('.').pop()?.toLowerCase()
  return LANGUAGE_BY_EXTENSION[extension] ?? 'plaintext'
}

export default function CodeViewer({ filename, code, description, height = 460 }) {
  const { t } = useTranslation()
  const { resolvedTheme } = usePreferences()
  const [copiedKey, setCopiedKey] = useState(null)
  const copyTimer = useRef(null)

  const language = useMemo(() => detectLanguage(filename), [filename])
  const copied = copiedKey === filename

  useEffect(() => {
    return () => clearTimeout(copyTimer.current)
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedKey(filename)
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopiedKey(null), 2200)
    } catch {
      toast.error(t('generator.code.copyFailed'))
    }
  }

  return (
    <div className="code-viewer">
      <div className="code-viewer__toolbar">
        <div className="code-viewer__meta">
          <span className="code-viewer__filename">{filename}</span>
          {description && <span className="code-viewer__description">{description}</span>}
        </div>
        <button
          type="button"
          className={`btn btn--ghost copy-btn${copied ? ' is-copied' : ''}`}
          onClick={handleCopy}
          aria-label={copied ? t('generator.code.copied') : t('generator.code.copy')}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span>{copied ? t('generator.code.copied') : t('generator.code.copy')}</span>
        </button>
      </div>

      <div className="code-viewer__editor" style={{ height: `${height}px` }}>
        <Editor
          height="100%"
          language={language}
          value={code}
          theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs'}
          loading={
            <div className="code-viewer__loading">
              <span className="code-viewer__loading-text">{t('generator.code.selectHint')}</span>
            </div>
          }
          options={{
            readOnly: true,
            domReadOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineHeight: 21,
            fontFamily: 'var(--font-mono)',
            fontLigatures: false,
            scrollBeyondLastLine: false,
            renderLineHighlight: 'none',
            padding: { top: 14, bottom: 14 },
            automaticLayout: true,
            scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
            overviewRulerLanes: 0,
            folding: true,
            lineNumbersMinChars: 4,
            wordWrap: 'off',
            tabSize: 2,
          }}
        />
      </div>
    </div>
  )
}
