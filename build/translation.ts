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

  interface FileTarget {
    bookId: number
    offset: number
  }
  const fileTargetMap = new Map<string, FileTarget>()

  // Map each book and its files (handling multi-file books and offsets)
  const books = db.prepare('SELECT id, name, files FROM book').all() as { id: number; name: string; files: string }[]
  for (const b of books) {
    const flist = b.files.split(' ').filter(Boolean)
    let offset = 0
    for (const f of flist) {
      const stemWithExt = f.replace(/\.xml$/, '')
      const stem = stemWithExt.replace(/\..*$/, '')
      fileTargetMap.set(stemWithExt.toLowerCase(), { bookId: b.id, offset })
      fileTargetMap.set(stem.toLowerCase(), { bookId: b.id, offset })

      // Determine paragraph count for offset calculation from hi translation file
      const candidatePaths = [
        path.join(dir, 'hi', `${stem}.jsonl`),
        path.join(dir, `${stem}.jsonl`),
        path.join(dir, 'hi', `${stemWithExt}.jsonl`),
        path.join(dir, `${stemWithExt}.jsonl`),
      ]
      for (const cp of candidatePaths) {
        if (fs.existsSync(cp)) {
          const lines = fs.readFileSync(cp, 'utf-8').split('\n').filter(Boolean)
          offset += lines.length
          break
        }
      }
    }
    fileTargetMap.set(b.name.toLowerCase(), { bookId: b.id, offset: 0 })
    fileTargetMap.set(b.name.replace(/\..*$/, '').toLowerCase(), { bookId: b.id, offset: 0 })
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
      const fileStem = file.replace(/\.jsonl$/, '').toLowerCase()
      const lines = fs.readFileSync(fullPath, 'utf-8').split('\n').filter(Boolean)
      for (const line of lines) {
        try {
          const rec: TranslationRecord = JSON.parse(line)
          const bookRef = rec.book ?? rec.book_id
          const rawPara = rec.para ?? rec.para_idx
          if (rawPara === undefined) continue

          let target: FileTarget | undefined
          if (typeof bookRef === 'number') {
            target = { bookId: bookRef, offset: 0 }
          } else if (typeof bookRef === 'string') {
            const bClean = bookRef.toLowerCase()
            const bStem = bClean.replace(/\..*$/, '')
            target = fileTargetMap.get(bClean) ?? fileTargetMap.get(bStem)
          }
          if (!target) {
            target = fileTargetMap.get(fileStem) ?? fileTargetMap.get(fileStem.replace(/\..*$/, ''))
          }
          if (!target) continue

          const finalParaIdx = rawPara + target.offset
          const textContent = rec.text ?? (rec as any).translation ?? ''
          if (!textContent) continue

          ins.run(
            target.bookId,
            finalParaIdx,
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
