import * as monaco from 'monaco-editor'
import { loader } from '@monaco-editor/react'

import editorWorker from 'monaco-editor/editor/editor.worker?worker'

// Monaco local (sin CDN) para que el visor funcione también offline.
self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker()
  },
}

loader.config({ monaco })
