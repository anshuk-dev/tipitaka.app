import fs from 'node:fs'
import path from 'node:path'
import type Database from 'better-sqlite3'

export interface TranslationRecord {
  book?: number | string
  book_id?: number | string
  para?: number
  para_idx?: number
  lang?: string
  title?: string
  text: string
  verse?: string
  source?: string
  translator?: string
  conf?: number
}

/**
 * Loads translations from data/translations/<lang>/*.jsonl and inserts them into text.db.
 */
export function importTranslations(db: Database.Database, dir: string) {
  if (!fs.existsSync(dir)) return 0
  const booksByName = new Map<string, number>()
  for (const b of db.prepare('SELECT id, name FROM book').all() as { id: number; name: string }[]) {
    booksByName.set(b.name, b.id)
    // also stem: e.g. 's0502m' -> id
    const stem = b.name.replace(/\..*$/, '')
    booksByName.set(stem, b.id)
  }

  const ins = db.prepare(`
    INSERT OR REPLACE INTO translation (book_id, para_idx, lang, title, text, verse, source, translator, conf)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  let count = 0
  const langDirs = fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory())
  const dirs = langDirs.length > 0 ? langDirs.map(d => ({ lang: d.name, path: path.join(dir, d.name) })) : [{ lang: 'hi', path: dir }]

  for (const { lang, path: lpath } of dirs) {
    if (!fs.existsSync(lpath)) continue
    for (const file of fs.readdirSync(lpath).filter(f => f.endsWith('.jsonl'))) {
      const fullPath = path.join(lpath, file)
      const lines = fs.readFileSync(fullPath, 'utf-8').split('\n').filter(Boolean)
      for (const line of lines) {
        try {
          const rec: TranslationRecord = JSON.parse(line)
          const bookRef = rec.book ?? rec.book_id
          const paraRef = rec.para ?? rec.para_idx
          if (paraRef === undefined) continue
          let bId = typeof bookRef === 'number' ? bookRef : (bookRef ? booksByName.get(bookRef) : undefined)
          if (bId === undefined && typeof bookRef === 'string') {
            bId = booksByName.get(bookRef.toLowerCase())
          }
          if (bId === undefined && typeof bookRef === 'string') {
            const stem = bookRef.toLowerCase().replace(/\..*$/, '')
            bId = booksByName.get(stem)
          }
          if (bId === undefined) continue
          const textContent = rec.text ?? (rec as any).translation ?? ''
          if (!textContent) continue
          ins.run(
            bId,
            paraRef,
            rec.lang ?? lang ?? 'hi',
            rec.title ?? '',
            textContent,
            rec.verse ?? '',
            rec.source ?? 'vri-ai',
            rec.translator ?? 'Tipiṭaka.app VRI Translation Project',
            rec.conf ?? 1.0
          )
          count++
        } catch {}
      }
    }
  }
  return count
}
