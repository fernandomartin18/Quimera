const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')
const REQUEST_TIMEOUT_MS = 600_000 // 10 minutos (modelos locales lentos)

export class ApiError extends Error {
  constructor(message, { code = 'http', status = 0, detail = '' } = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.detail = detail
  }
}

/**
 * POST /api/generate-code — ejecuta el pipeline multiagente del backend.
 *
 * @param {{ prompt: string, model: string }} payload
 * @returns {Promise<{
 *   classical_modules: Array<{ filename: string, code: string, description: string }>,
 *   quantum_modules: Array<{ filename: string, code: string, description: string }>,
 *   architecture_notes: string,
 *   model_used: string
 * }>}
 */
export async function generateCode({ prompt, model }) {
  let response

  try {
    response = await fetch(`${API_BASE}/generate-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new ApiError('timeout', { code: 'timeout' })
    }
    throw new ApiError('network', { code: 'network' })
  }

  if (!response.ok) {
    let detail = ''
    try {
      const body = await response.json()
      if (typeof body.detail === 'string') {
        detail = body.detail
      } else if (body.detail) {
        detail = JSON.stringify(body.detail)
      }
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new ApiError(detail || `HTTP ${response.status}`, {
      code: 'http',
      status: response.status,
      detail,
    })
  }

  try {
    return await response.json()
  } catch {
    throw new ApiError('invalid-response', { code: 'http', status: response.status })
  }
}
