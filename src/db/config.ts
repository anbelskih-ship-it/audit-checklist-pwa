import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const CONFIG_DOC = 'config/ai'

export type AiProvider = 'gemini' | 'deepseek'

interface AiConfig {
  provider: AiProvider
  geminiApiKey: string | null
  deepseekApiKey: string | null
}

export async function getAiConfig(): Promise<AiConfig> {
  try {
    const snap = await getDoc(doc(db, CONFIG_DOC))
    if (!snap.exists()) return { provider: 'gemini', geminiApiKey: null, deepseekApiKey: null }
    const data = snap.data()
    return {
      provider: data.provider || 'gemini',
      geminiApiKey: data.geminiApiKey ?? null,
      deepseekApiKey: data.deepseekApiKey ?? null,
    }
  } catch {
    return { provider: 'gemini', geminiApiKey: null, deepseekApiKey: null }
  }
}

export async function saveAiConfig(config: Partial<AiConfig>): Promise<void> {
  await setDoc(doc(db, CONFIG_DOC), config, { merge: true })
}

// Backward compat
export async function getGeminiApiKey(): Promise<string | null> {
  const cfg = await getAiConfig()
  return cfg.geminiApiKey
}

export async function setGeminiApiKey(key: string): Promise<void> {
  await saveAiConfig({ geminiApiKey: key })
}
