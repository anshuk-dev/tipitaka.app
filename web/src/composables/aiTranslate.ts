/**
 * Dynamic AI & Automatic Translation service for Pāḷi texts.
 * 1. If a Web2API / OpenAI / Gemini API key is configured, uses the LLM endpoint directly.
 * 2. Otherwise (Zero-Setup Auto Mode), automatically combines:
 *    - Authentic Tipitaka VRI corpus translations (for any paragraph/section)
 *    - Public neural MT bridge (Hindi <-> English, CORS-enabled, no key needed)
 *    - Built-in DPD / Pāḷi Dictionary word-by-word analysis for selected sub-passages.
 */
import type { Api } from '@/data/api'
import type { Translation } from '@/data/types'
import { toRoman } from '@/composables/script'
import { plainText } from '@shared/markup'

export interface AiTranslateConfig {
  apiKey: string
  apiUrl?: string
  model?: string
  bypassCache?: boolean
}

export interface TranslationCacheKey {
  text: string
  targetLang: 'hi' | 'en'
}

export interface AutoTranslateParams {
  text: string
  targetLang: 'hi' | 'en'
  key?: string
  para?: number
  paraEnd?: number
  api?: Api
  web2apiConfig?: AiTranslateConfig
  signal?: AbortSignal
}

export interface AutoTranslateResult {
  text: string
  mode: 'web2api' | 'corpus' | 'corpus+mt' | 'dict+mt' | 'dict'
  sourceLabel: string
}

// In-memory cache for the current session to avoid redundant API calls
const cache = new Map<string, string>()
const mtCache = new Map<string, string>()

function getCacheKey(text: string, lang: 'hi' | 'en', apiKey: string, model?: string): string {
  return `${lang}|${model || 'default'}|${apiKey.slice(-6)}|${text.trim()}`
}

/**
 * Normalizes user-provided Base URL into a full OpenAI-compatible chat completions endpoint.
 * Handles variations such as:
 *   - "" -> https://api.openai.com/v1/chat/completions
 *   - "http://localhost:8080" -> http://localhost:8080/v1/chat/completions
 *   - "http://localhost:8080/v1" -> http://localhost:8080/v1/chat/completions
 *   - "http://localhost:8080/v1/chat/completions" -> http://localhost:8080/v1/chat/completions
 */
export function resolveApiUrl(rawUrl?: string): string {
  let url = (rawUrl || '').trim()
  if (!url) {
    url = 'https://api.openai.com/v1'
  }
  url = url.replace(/\/+$/, '')
  if (url.endsWith('/chat/completions')) {
    return url
  }
  if (!url.endsWith('/v1')) {
    url = `${url}/v1`
  }
  return `${url}/chat/completions`
}

/**
 * Builds specialized prompts for translating Theravāda Buddhist Pāḷi literature.
 */
export function buildPrompts(paliText: string, targetLang: 'hi' | 'en'): { system: string; user: string } {
  if (targetLang === 'hi') {
    const system = `You are an expert scholar and translator of Theravāda Buddhist Pāḷi literature (Tipiṭaka, Aṭṭhakathā, and Ṭīkā).
Translate the provided Pāḷi text faithfully into natural, accurate, and scholarly Hindi (Devanagari script).

Strict Guidelines:
1. Maintain authentic Buddhist and Vipassana terminology (VRI style):
   - dukkha -> दुःख
   - anicca -> अनित्य
   - anattā -> अनात्म
   - sati -> स्मृति / सजगता
   - sampajañña -> संप्रजन्य
   - vedanā -> संवेदना
   - saṅkhāra -> संस्कार
   - nibbāna -> निर्वाण
   - upekkhā -> समता / उपेक्षा
   - paññā -> प्रज्ञा
   - sīla -> शील
   - samādhi -> समाधि
   - bhikkhu -> भिक्षु
   - bhagavā -> भगवान / तथागत
2. Clear Structure:
   - Provide a lucid prose translation (गद्यार्थ).
   - If the text is a verse (gāthā / छंद), provide both the prose meaning (गद्यार्थ) and an inspiring rhyming verse/doha (पद्यानुवाद) capturing the essence.
3. Return ONLY the translated output without any conversational preamble or pleasantries.`

    const user = `Please translate the following Pāḷi text into Hindi:\n\n${paliText.trim()}`
    return { system, user }
  } else {
    const system = `You are an expert scholar and translator of Theravāda Buddhist Pāḷi literature (Tipiṭaka, Aṭṭhakathā, and Ṭīkā).
Translate the provided Pāḷi text faithfully into clear, accurate, and scholarly English.

Strict Guidelines:
1. Maintain standard Buddhist canonical terminology with diacritics and parenthetical Pāḷi roots where illuminating (e.g., suffering/unsatisfactoriness [dukkha], impermanence [anicca], non-self [anattā], mindfulness [sati], clear comprehension [sampajañña], sensation [vedanā], volitional formations [saṅkhāra], Nibbāna, equanimity [upekkhā], wisdom [paññā]).
2. Clear Structure:
   - Provide a fluent, readable prose translation.
   - If the text contains verses or gāthās, render them poetically in verse lines followed by explanatory prose if helpful.
3. Return ONLY the translated output without any conversational preamble or pleasantries.`

    const user = `Please translate the following Pāḷi text into English:\n\n${paliText.trim()}`
    return { system, user }
  }
}

/**
 * Translates Pāḷi text using Web2API or an OpenAI-compatible endpoint.
 */
export async function translatePali(
  text: string,
  targetLang: 'hi' | 'en',
  config: AiTranslateConfig,
  signal?: AbortSignal
): Promise<string> {
  const cleanText = text.trim()
  if (!cleanText) {
    throw new Error('No text provided for translation.')
  }

  const apiKey = (config.apiKey || '').trim()
  if (!apiKey) {
    throw new Error('Web2API API Key is missing. Please configure your API key in settings or in the dialog below.')
  }

  const model = (config.model || 'gemini-2.5-flash').trim()
  const cacheKey = getCacheKey(cleanText, targetLang, apiKey, model)
  if (!config.bypassCache && cache.has(cacheKey)) {
    return cache.get(cacheKey)!
  }

  const url = resolveApiUrl(config.apiUrl)
  const { system, user } = buildPrompts(cleanText, targetLang)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 35000)

  // Link external signal if provided
  if (signal) {
    signal.addEventListener('abort', () => controller.abort())
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      let errDetails = ''
      try {
        const errJson = await response.json()
        errDetails = errJson.error?.message || errJson.message || JSON.stringify(errJson)
      } catch {
        errDetails = response.statusText || `HTTP ${response.status}`
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error(`Authentication Error (${response.status}): Invalid or unauthorized API key. Details: ${errDetails}`)
      } else if (response.status === 404) {
        throw new Error(`API Endpoint not found (404) at "${url}". Please verify your Web2API Base URL.`)
      } else if (response.status === 429) {
        throw new Error(`Rate limit exceeded (429). Please wait a moment or check your API quota. Details: ${errDetails}`)
      } else {
        throw new Error(`Web2API error (${response.status}): ${errDetails}`)
      }
    }

    const data = await response.json()

    // Handle standard OpenAI-compatible choice message content
    let resultText = data.choices?.[0]?.message?.content

    // Fallbacks for direct Gemini or Claude endpoints if Web2API routes directly
    if (!resultText && data.candidates?.[0]?.content?.parts?.[0]?.text) {
      resultText = data.candidates[0].content.parts[0].text
    } else if (!resultText && data.content?.[0]?.text) {
      resultText = data.content[0].text
    } else if (!resultText && typeof data.text === 'string') {
      resultText = data.text
    }

    if (!resultText || typeof resultText !== 'string') {
      throw new Error('Received empty or unexpected response format from Web2API.')
    }

    resultText = resultText.trim()
    cache.set(cacheKey, resultText)
    return resultText
  } catch (err: unknown) {
    clearTimeout(timeoutId)
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error('Translation request timed out after 35 seconds. Please try again or check your network/endpoint.')
      }
      throw err
    }
    throw new Error(String(err))
  }
}

/**
 * Tests connection to the Web2API endpoint with the specified API key.
 */
export async function testApiConnection(config: AiTranslateConfig): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await translatePali(
      'Namo tassa bhagavato arahato sammāsambuddhassa.',
      'en',
      { ...config, bypassCache: true }
    )
    return { ok: true, message: `Connected successfully! Response: "${res.slice(0, 70)}..."` }
  } catch (e) {
    return { ok: false, message: (e as Error).message || String(e) }
  }
}

function splitIntoChunks(text: string, maxLen = 1200): string[] {
  const clean = text.trim()
  if (clean.length <= maxLen) return [clean]
  const chunks: string[] = []
  let current = ''
  for (const part of clean.split(/(\n+|(?<=[।.!?])\s+)/)) {
    if ((current + part).length > maxLen && current.trim()) {
      chunks.push(current.trim())
      current = part
    } else {
      current += part
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

/**
 * Zero-key public translation bridge (CORS-enabled) with Google Translate GTX primary and MyMemory fallback.
 */
export async function translatePublic(
  text: string,
  sourceLang: 'hi' | 'en' | 'auto',
  targetLang: 'hi' | 'en',
  signal?: AbortSignal
): Promise<string> {
  const clean = text.trim()
  if (!clean) return ''
  const cKey = `${sourceLang}|${targetLang}|${clean}`
  if (mtCache.has(cKey)) return mtCache.get(cKey)!

  const chunks = splitIntoChunks(clean, 1200)
  const translatedChunks: string[] = []

  for (const chunk of chunks) {
    let translated = ''
    try {
      const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceLang)}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(chunk)}`
      const res = await fetch(gtxUrl, { signal })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data?.[0])) {
          translated = data[0].map((seg: unknown) => (Array.isArray(seg) ? String(seg[0] ?? '') : '')).join('')
        }
      }
    } catch { /* try fallback */ }

    if (!translated && sourceLang !== 'auto') {
      try {
        const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk.slice(0, 480))}&langpair=${sourceLang}|${targetLang}`
        const res = await fetch(mmUrl, { signal })
        if (res.ok) {
          const data = await res.json()
          const candidate = data?.responseData?.translatedText
          if (typeof candidate === 'string' && candidate.trim()) {
            translated = candidate.trim()
          }
        }
      } catch { /* ignore */ }
    }

    if (!translated) {
      throw new Error('Auto-translation network service is currently unreachable.')
    }
    translatedChunks.push(translated.trim())
  }

  const finalOut = translatedChunks.join('\n')
  mtCache.set(cKey, finalOut)
  return finalOut
}

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * Looks up concise Pāḷi word meanings from the built-in DPD / Pāḷi dictionaries.
 */
export async function lookupPaliGlossary(
  text: string,
  api: Api,
  maxWords = 18
): Promise<{ word: string; meaning: string }[]> {
  const roman = toRoman(text)
  const words = [...new Set((roman.match(/[a-zāīūṅñṭḍṇḷṃ]+/g) ?? []).filter(w => w.length >= 2))].slice(0, maxWords)
  if (!words.length) return []

  const results = await Promise.all(
    words.map(async w => {
      try {
        const r = await api.dict(w, undefined, 3)
        let meaning = ''
        if (r.dpd?.length) {
          const d = r.dpd[0]
          meaning = [d.pos ? `(${d.pos})` : '', d.meaning || d.meaningLit || ''].filter(Boolean).join(' ')
        } else if (r.entries?.length) {
          meaning = stripHtml(r.entries[0].meaning).slice(0, 140)
        }
        return meaning ? { word: w, meaning } : null
      } catch {
        return null
      }
    })
  )

  return results.filter((x): x is { word: string; meaning: string } => x !== null)
}

const hasDevanagari = (s: string) => /[\u0900-\u097F]/.test(s)

function formatCorpusTranslations(list: Translation[]): string {
  return list
    .map(tr => {
      const parts: string[] = []
      if (tr.title) parts.push(`【${tr.title}】`)
      if (tr.v) parts.push(`पद्यानुवाद (छंद/दोहा):\n${tr.v}`)
      if (tr.t) parts.push(tr.v ? `गद्यार्थ:\n${tr.t}` : tr.t)
      return parts.join('\n\n')
    })
    .filter(Boolean)
    .join('\n\n──────────\n\n')
}

/**
 * Main entry point used by AiTranslationDialog.
 * Works 100% automatically with zero user setup, and upgrades seamlessly to custom Web2API when a key is provided.
 */
export async function autoTranslateSelection(params: AutoTranslateParams): Promise<AutoTranslateResult> {
  const { text, targetLang, key, para, paraEnd, api, web2apiConfig, signal } = params
  const cleanText = text.trim()
  if (!cleanText) {
    throw new Error('No text provided for translation.')
  }

  // 1. If user explicitly provided a Web2API / OpenAI / Gemini API key, use it first
  if (web2apiConfig?.apiKey?.trim()) {
    const roman = toRoman(cleanText)
    const promptInput = roman && roman !== cleanText.toLowerCase()
      ? `${cleanText}\n\n(Roman Pāḷi: ${roman})`
      : cleanText
    const res = await translatePali(promptInput, targetLang, web2apiConfig, signal)
    return {
      text: res,
      mode: 'web2api',
      sourceLabel: `Web2API (${web2apiConfig.model || 'AI'})`,
    }
  }

  // 2. Zero-Setup Automatic Mode: try VRI Corpus Translation + Dictionary + Auto MT
  const from = para ?? 0
  const count = para !== undefined ? Math.max(1, (paraEnd ?? para) - para + 1) : 1

  let corpusTrs: Translation[] = []
  let isSubPhrase = false

  if (api && key && para !== undefined) {
    try {
      const [trRes, txtRes] = await Promise.all([
        api.translation(key, from, count, targetLang).catch(() => null),
        count === 1 ? api.text(key, from, 1).catch(() => null) : Promise.resolve(null),
      ])

      if (trRes?.translations?.length) {
        corpusTrs = trRes.translations.filter(t => t.i >= from && t.i <= (paraEnd ?? from))
      }

      if (count === 1 && txtRes?.paras?.length) {
        const fullPlain = plainText(txtRes.paras[0].t).trim()
        if (fullPlain.length > 0 && cleanText.length < fullPlain.length * 0.65) {
          isSubPhrase = true
        }
      }
    } catch { /* fallback to dictionary */ }
  }

  // Sub-phrase glossary (for highlighted shorter passages inside a paragraph or standalone text)
  let glossaryLines: string[] = []
  if (api && (isSubPhrase || corpusTrs.length === 0)) {
    const glossary = await lookupPaliGlossary(cleanText, api)
    if (glossary.length) {
      if (targetLang === 'hi') {
        try {
          const joined = glossary.map(g => g.meaning).join('\n')
          const hiMeanings = (await translatePublic(joined, 'en', 'hi', signal)).split('\n')
          glossaryLines = glossary.map((g, idx) => `• ${g.word}: ${hiMeanings[idx]?.trim() || g.meaning}`)
        } catch {
          glossaryLines = glossary.map(g => `• ${g.word}: ${g.meaning}`)
        }
      } else {
        glossaryLines = glossary.map(g => `• ${g.word}: ${g.meaning}`)
      }
    }
  }

  // 2a. Target = Hindi and we have corpus Hindi translations
  if (targetLang === 'hi' && corpusTrs.length > 0) {
    const formatted = formatCorpusTranslations(corpusTrs)
    if (isSubPhrase && glossaryLines.length > 0) {
      return {
        text: `चयनित अंश का शब्दार्थ (Selected Phrase):\n${glossaryLines.join('\n')}\n\n──────────\n\nसम्पूर्ण परिच्छेद अनुवाद:\n${formatted}`,
        mode: 'corpus',
        sourceLabel: 'VRI Corpus + Pāḷi Dictionary (Auto)',
      }
    }
    return {
      text: formatted,
      mode: 'corpus',
      sourceLabel: 'VRI Authentic Hindi (Auto)',
    }
  }

  // 2b. Target = English and corpus has true English translations
  if (targetLang === 'en' && corpusTrs.length > 0 && corpusTrs.every(t => t.lang === 'en' && !hasDevanagari(t.t))) {
    const formatted = corpusTrs
      .map(t => [t.title ? `[${t.title}]` : '', t.v || '', t.t].filter(Boolean).join('\n\n'))
      .join('\n\n──────────\n\n')
    if (isSubPhrase && glossaryLines.length > 0) {
      return {
        text: `Selected Words (Pāḷi Dictionary):\n${glossaryLines.join('\n')}\n\n──────────\n\nFull Paragraph Translation:\n${formatted}`,
        mode: 'corpus',
        sourceLabel: 'Corpus English + Dictionary (Auto)',
      }
    }
    return {
      text: formatted,
      mode: 'corpus',
      sourceLabel: 'Corpus English (Auto)',
    }
  }

  // 2c. Target = English, corpus has Hindi VRI translations -> auto-translate VRI Hindi to fluent English!
  if (targetLang === 'en' && api && key && para !== undefined) {
    const hiRes = corpusTrs.length > 0
      ? { translations: corpusTrs }
      : await api.translation(key, from, count, 'hi').catch(() => null)
    const hiList = hiRes?.translations?.filter(t => t.i >= from && t.i <= (paraEnd ?? from)) ?? []

    if (hiList.length > 0) {
      const hiSource = hiList.map(t => [t.title ? `[${t.title}]` : '', t.t].filter(Boolean).join('\n')).join('\n\n')
      try {
        const enTranslated = await translatePublic(hiSource, 'hi', 'en', signal)
        if (isSubPhrase && glossaryLines.length > 0) {
          return {
            text: `Selected Words (Pāḷi Dictionary):\n${glossaryLines.join('\n')}\n\n──────────\n\nFull Paragraph Translation:\n${enTranslated}`,
            mode: 'corpus+mt',
            sourceLabel: 'VRI Corpus → Auto English',
          }
        }
        return {
          text: enTranslated,
          mode: 'corpus+mt',
          sourceLabel: 'VRI Corpus → Auto English',
        }
      } catch {
        // Offline fallback: show dictionary meanings + Hindi text
        if (glossaryLines.length > 0) {
          return {
            text: `Selected Words (Pāḷi Dictionary):\n${glossaryLines.join('\n')}\n\n(Offline Hindi reference):\n${hiSource}`,
            mode: 'dict',
            sourceLabel: 'Pāḷi Dictionary (Offline)',
          }
        }
      }
    }
  }

  // 3. Standalone Pāḷi passage fallback (dictionary + public translation)
  if (glossaryLines.length > 0) {
    const header = targetLang === 'hi'
      ? 'चयनित पाळि शब्दों का अर्थ (Pāḷi Dictionary):'
      : 'Word-by-Word Pāḷi Meaning (DPD / Dictionary):'
    return {
      text: `${header}\n${glossaryLines.join('\n')}`,
      mode: 'dict+mt',
      sourceLabel: 'Pāḷi Dictionary + Auto Translate',
    }
  }

  // Last resort: direct auto-translate on text
  const direct = await translatePublic(cleanText, 'auto', targetLang, signal)
  return {
    text: direct,
    mode: 'dict+mt',
    sourceLabel: 'Auto Translate',
  }
}
