const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

export interface DeepSeekResult {
  text: string | null
  error: string | null
}

export async function callDeepSeek(prompt: string, apiKey: string): Promise<DeepSeekResult> {
  try {
    const resp = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 1024,
      }),
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => null)
      const msg = err?.error?.message || `HTTP ${resp.status}`
      return { text: null, error: msg }
    }

    const data = await resp.json()
    const text = data?.choices?.[0]?.message?.content ?? null
    return { text, error: text ? null : 'Пустой ответ от модели' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Нет соединения'
    return { text: null, error: msg }
  }
}
