/**
 * VRI-Style Hindi Translation Pipeline for Tipiṭaka.app.
 * 
 * Translates Pāḷi canonical paragraphs into authentic, experiential, dignified Hindi
 * adhering to Vipassana Research Institute (VRI / S.N. Goenka) standards.
 * 
 * Usage:
 *   npx tsx scripts/translate-vri.ts --import             # re-imports data/translations/ into text.db
 *   npx tsx scripts/translate-vri.ts --book s0502m.mul     # inspects translation coverage for book
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { importTranslations, type TranslationRecord } from '../build/translation'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const flag = (name: string) => args.includes(name)
const arg = (name: string, def?: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def }

const DB_PATHS = [
  path.join(repo, 'e2e/fixtures/db/text.db'),
  path.join(repo, 'db/text.db')
]

function getDb(): Database.Database | null {
  for (const p of DB_PATHS) {
    if (fs.existsSync(p)) return new Database(p)
  }
  return null
}

function run() {
  const db = getDb()
  if (!db) {
    console.error('No text.db found. Run npm run build:fixture first.')
    process.exit(1)
  }

  const transDir = path.join(repo, 'data/translations')
  if (flag('--import')) {
    const count = importTranslations(db, transDir)
    console.log(`Successfully imported ${count} translation records into ${db.name}`)
    return
  }

  const bookName = arg('--book')
  if (bookName) {
    const book = db.prepare('SELECT id, name, title, para_count FROM book WHERE name = ? OR name LIKE ?').get(bookName, `${bookName}%`) as any
    if (!book) {
      console.error(`Book ${bookName} not found in database.`)
      return
    }
    const count = db.prepare('SELECT count(*) as c FROM translation WHERE book_id = ? AND lang = "hi"').get(book.id) as { c: number }
    console.log(`Book ${book.name} (${book.title}):`)
    console.log(`  Total paragraphs: ${book.para_count}`)
    console.log(`  Hindi translated: ${count.c} (${((count.c / book.para_count) * 100).toFixed(1)}%)`)
    return
  }

  // Summary of all translated books
  const summary = db.prepare(`
    SELECT b.name, b.title, count(t.id) as translated, b.para_count
    FROM translation t
    JOIN book b ON b.id = t.book_id
    WHERE t.lang = 'hi'
    GROUP BY b.id
    ORDER BY b.id
  `).all() as { name: string; title: string; translated: number; para_count: number }[]

  console.log('=== Tipiṭaka.app Hindi Translation Summary (VRI Style) ===')
  if (!summary.length) {
    console.log('No translations recorded yet. Run with --import to load from data/translations/.')
  } else {
    for (const s of summary) {
      const pct = ((s.translated / s.para_count) * 100).toFixed(1)
      console.log(`• ${s.name} (${s.title}): ${s.translated}/${s.para_count} paras (${pct}%)`)
    }
  }
  db.close()
}

run()
