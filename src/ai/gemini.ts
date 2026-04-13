const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export interface GeminiResult {
  text: string | null
  error: string | null
}

export async function callGemini(prompt: string, apiKey: string): Promise<GeminiResult> {
  try {
    const resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
        },
      }),
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => null)
      const msg = err?.error?.message || `HTTP ${resp.status}`
      return { text: null, error: msg }
    }

    const data = await resp.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null
    return { text, error: text ? null : 'Пустой ответ от модели' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Нет соединения'
    return { text: null, error: msg }
  }
}
