const OLLAMA_BASE = (import.meta.env.VITE_OLLAMA_BASE_URL || '/ollama').replace(/\/+$/, '')
const REQUEST_TIMEOUT_MS = 8000

/**
 * Lista los modelos instalados en Ollama (GET /api/tags).
 *
 * @returns {Promise<Array<{ id: string, label: string }>>}
 *   `id` en formato LiteLLM (`ollama/<nombre>`), `label` nombre visible.
 */
export async function fetchOllamaModels() {
  let response

  try {
    response = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    throw new Error('ollama-unreachable')
  }

  if (!response.ok) {
    throw new Error(`ollama-http-${response.status}`)
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new Error('ollama-invalid-response')
  }

  const models = Array.isArray(payload?.models) ? payload.models : []

  return models
    .map((model) => model?.name ?? model?.model)
    .filter((name) => typeof name === 'string' && name.length > 0)
    .map((name) => ({ id: `ollama/${name}`, label: name }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
