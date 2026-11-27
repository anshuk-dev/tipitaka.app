import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  resolveApiUrl,
  buildPrompts,
  translatePali,
  testApiConnection,
  translatePublic,
  autoTranslateSelection,
} from './aiTranslate'
import type { Api } from '@/data/api'

describe('aiTranslate', () => {
  describe('resolveApiUrl', () => {
    it('defaults to OpenAI v1 chat completions when empty', () => {
      expect(resolveApiUrl('')).toBe('https://api.openai.com/v1/chat/completions')
      expect(resolveApiUrl(undefined)).toBe('https://api.openai.com/v1/chat/completions')
      expect(resolveApiUrl('   ')).toBe('https://api.openai.com/v1/chat/completions')
    })

    it('handles base URLs without /v1', () => {
      expect(resolveApiUrl('http://localhost:8080')).toBe('http://localhost:8080/v1/chat/completions')
      expect(resolveApiUrl('https://api.web2api.org')).toBe('https://api.web2api.org/v1/chat/completions')
    })

    it('handles base URLs with /v1', () => {
      expect(resolveApiUrl('http://localhost:8080/v1')).toBe('http://localhost:8080/v1/chat/completions')
      expect(resolveApiUrl('https://api.openai.com/v1/')).toBe('https://api.openai.com/v1/chat/completions')
    })

    it('preserves complete endpoints ending in /chat/completions', () => {
      expect(resolveApiUrl('http://localhost:8080/v1/chat/completions')).toBe('http://localhost:8080/v1/chat/completions')
      expect(resolveApiUrl('https://custom.api/v1/chat/completions/')).toBe('https://custom.api/v1/chat/completions')
    })
  })

  describe('buildPrompts', () => {
    it('builds Hindi prompt with canonical Theravāda Buddhist guidelines', () => {
      const { system, user } = buildPrompts('Evaṃ me sutaṃ', 'hi')
      expect(system).toContain('Theravāda')
      expect(system).toContain('गद्यार्थ')
      expect(system).toContain('dukkha -> दुःख')
      expect(system).toContain('anicca -> अनित्य')
      expect(user).toContain('Evaṃ me sutaṃ')
    })

    it('builds English prompt with scholarly Buddhist terminology', () => {
      const { system, user } = buildPrompts('Sabbe saṅkhārā aniccā', 'en')
      expect(system).toContain('scholarly English')
      expect(system).toContain('impermanence [anicca]')
      expect(user).toContain('Sabbe saṅkhārā aniccā')
    })
  })

  describe('translatePali', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    it('throws error when text is blank', async () => {
      await expect(translatePali('   ', 'hi', { apiKey: 'test-key' })).rejects.toThrow(
        'No text provided for translation.'
      )
    })

    it('throws error when apiKey is missing', async () => {
      await expect(translatePali('Dhammo', 'hi', { apiKey: '' })).rejects.toThrow(
        'Web2API API Key is missing'
      )
    })

    it('successfully translates and parses OpenAI / Web2API choices response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'ऐसा मैंने सुना — एक समय भगवान श्रावस्ती में विहार कर रहे थे।',
              },
            },
          ],
        }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const result = await translatePali(
        'Evaṃ me sutaṃ — ekaṃ samayaṃ bhagavā sāvatthiyaṃ viharati.',
        'hi',
        { apiKey: 'sk-web2api-test', model: 'gemini-2.5-flash' }
      )

      expect(result).toBe('ऐसा मैंने सुना — एक समय भगवान श्रावस्ती में विहार कर रहे थे।')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-web2api-test',
          }),
        })
      )
    })

    it('falls back to Gemini candidate parts when response is direct Gemini', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'Thus have I heard — at one time the Blessed One was dwelling at Sāvatthī.',
                  },
                ],
              },
            },
          ],
        }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const result = await translatePali(
        'Evaṃ me sutaṃ unique text 999',
        'en',
        { apiKey: 'sk-test' }
      )

      expect(result).toBe('Thus have I heard — at one time the Blessed One was dwelling at Sāvatthī.')
    })

    it('handles 401 unauthorized errors gracefully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Incorrect API key provided' } }),
      })
      vi.stubGlobal('fetch', mockFetch)

      await expect(
        translatePali('Pali unique 123', 'hi', { apiKey: 'invalid-key' })
      ).rejects.toThrow('Authentication Error (401)')
    })

    it('handles 429 rate limit errors gracefully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ error: { message: 'Rate limit reached' } }),
      })
      vi.stubGlobal('fetch', mockFetch)

      await expect(
        translatePali('Pali unique 456', 'en', { apiKey: 'valid-key' })
      ).rejects.toThrow('Rate limit exceeded (429)')
    })
  })

  describe('testApiConnection', () => {
    it('returns ok: true when connection succeeds', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Homage to the Blessed One, the Worthy One, the Fully Awakened One.' } }],
        }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const res = await testApiConnection({ apiKey: 'test-key' })
      expect(res.ok).toBe(true)
      expect(res.message).toContain('Connected successfully!')
    })

    it('returns ok: false when connection fails', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ message: 'Forbidden' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const res = await testApiConnection({ apiKey: 'bad-key' })
      expect(res.ok).toBe(false)
      expect(res.message).toContain('Authentication Error')
    })
  })

  describe('translatePublic & autoTranslateSelection (Zero-Setup Auto Mode)', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    it('translates via public Google GTX endpoint without an API key', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [[['Thus have I heard.', 'ऐसा मैंने सुना।', null, null]]],
      })
      vi.stubGlobal('fetch', mockFetch)

      const out = await translatePublic('ऐसा मैंने सुना।', 'hi', 'en')
      expect(out).toBe('Thus have I heard.')
    })

    it('auto-translates a corpus paragraph into Hindi without any API key', async () => {
      const mockApi = {
        translation: vi.fn().mockResolvedValue({
          key: 'dn-1-1',
          book: 5,
          from: 5,
          to: 6,
          translations: [
            {
              i: 5,
              title: 'निदानकथा',
              t: 'ऐसा मैंने सुना — एक समय भगवान् राजगृह और नालन्दा के बीच विहार कर रहे थे।',
              lang: 'hi',
              source: 'VRI',
              translator: 'VRI',
              conf: 1,
            },
          ],
        }),
        text: vi.fn().mockResolvedValue({
          paras: [{ i: 5, k: 'dn-1-1', r: 'bodytext', t: 'Evaṃ me sutaṃ — ekaṃ samayaṃ bhagavā antarā ca rājagahaṃ antarā ca nāḷandaṃ.' }],
        }),
        dict: vi.fn().mockResolvedValue({ word: '', entries: [], dpd: [], breakups: [] }),
      } as unknown as Api

      const res = await autoTranslateSelection({
        text: 'Evaṃ me sutaṃ — ekaṃ samayaṃ bhagavā antarā ca rājagahaṃ antarā ca nāḷandaṃ.',
        targetLang: 'hi',
        key: 'dn-1-1',
        para: 5,
        api: mockApi,
      })

      expect(res.mode).toBe('corpus')
      expect(res.text).toContain('ऐसा मैंने सुना')
      expect(res.sourceLabel).toContain('Auto')
    })

    it('auto-translates VRI Hindi corpus into English when native English is absent', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [[['Thus I heard — once the Blessed One was dwelling between Rajagaha and Nalanda.', 'ऐसा मैंने सुना...', null, null]]],
      })
      vi.stubGlobal('fetch', mockFetch)

      const mockApi = {
        translation: vi.fn().mockResolvedValue({
          key: 'dn-1-1',
          book: 5,
          from: 5,
          to: 6,
          translations: [
            {
              i: 5,
              t: 'ऐसा मैंने सुना — एक समय भगवान् राजगृह और नालन्दा के बीच थे।',
              lang: 'hi',
              source: 'VRI',
              translator: 'VRI',
              conf: 1,
            },
          ],
        }),
        text: vi.fn().mockResolvedValue({
          paras: [{ i: 5, k: 'dn-1-1', r: 'bodytext', t: 'Evaṃ me sutaṃ — ekaṃ samayaṃ bhagavā antarā ca rājagahaṃ.' }],
        }),
        dict: vi.fn().mockResolvedValue({ word: '', entries: [], dpd: [], breakups: [] }),
      } as unknown as Api

      const res = await autoTranslateSelection({
        text: 'Evaṃ me sutaṃ — ekaṃ samayaṃ bhagavā antarā ca rājagahaṃ.',
        targetLang: 'en',
        key: 'dn-1-1',
        para: 5,
        api: mockApi,
      })

      expect(res.mode).toBe('corpus+mt')
      expect(res.text).toContain('Thus I heard')
    })

    it('uses Pāḷi dictionary glossary for standalone phrases when no API key is set', async () => {
      const mockApi = {
        dict: vi.fn().mockImplementation(async (w: string) => ({
          word: w,
          entries: [],
          dpd: [{ id: 1, lemma: w, pos: 'masc', grammar: '', meaning: w === 'dhamma' ? 'teaching; truth' : 'impermanent', ebtCount: 10 }],
          breakups: [],
        })),
      } as unknown as Api

      const res = await autoTranslateSelection({
        text: 'dhamma anicca',
        targetLang: 'en',
        api: mockApi,
      })

      expect(res.mode).toBe('dict+mt')
      expect(res.text).toContain('dhamma: (masc) teaching; truth')
      expect(res.text).toContain('anicca: (masc) impermanent')
    })
  })
})
