/**
 * Proveedores de IA disponibles en el selector.
 *
 * `kind`:
 *  - 'static': modelos catalogados en el frontend (strings LiteLLM).
 *  - 'ollama': modelos instalados localmente, consultados en runtime a
 *              GET /ollama/api/tags (proxy de Vite → http://localhost:11434).
 *
 * El campo `id` de cada modelo es el string LiteLLM que viaja en el payload
 * del endpoint POST /api/generate-code.
 */
export const AI_PROVIDERS = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    kind: 'static',
    models: [
      { id: 'gemini/gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
      { id: 'gemini/gemini-3.6-pro', label: 'Gemini 3.6 Pro' },
      { id: 'gemini/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    kind: 'static',
    models: [
      { id: 'openai/gpt-4o', label: 'GPT-4o' },
      { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'openai/gpt-4.1', label: 'GPT-4.1' },
      { id: 'openai/gpt-4.1-mini', label: 'GPT-4.1 mini' },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    kind: 'static',
    models: [
      { id: 'anthropic/claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { id: 'anthropic/claude-opus-4-20250514', label: 'Claude Opus 4' },
      { id: 'anthropic/claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    ],
  },
  {
    id: 'mistral',
    label: 'Mistral AI',
    kind: 'static',
    models: [
      { id: 'mistral/mistral-large-latest', label: 'Mistral Large' },
      { id: 'mistral/mistral-medium-latest', label: 'Mistral Medium' },
      { id: 'mistral/mistral-small-latest', label: 'Mistral Small' },
    ],
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    kind: 'ollama',
    models: [],
  },
]

export const DEFAULT_PROVIDER = AI_PROVIDERS[0]

export function findProvider(providerId) {
  return AI_PROVIDERS.find((provider) => provider.id === providerId) ?? DEFAULT_PROVIDER
}
