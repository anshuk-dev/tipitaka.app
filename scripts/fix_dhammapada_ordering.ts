import fs from 'node:fs'
import path from 'node:path'

const filePath = path.resolve('data/translations/hi/s0502m.jsonl')
const aliasPath = path.resolve('data/translations/hi/dhammapada.jsonl')

const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean)
const records = lines.map(line => JSON.parse(line))

// Sort by para index
records.sort((a, b) => {
  const pa = a.para ?? a.para_idx
  const pb = b.para ?? b.para_idx
  return pa - pb
})

console.log(`Loaded and sorted ${records.length} records.`)

const normalized = records.map((rec, i) => {
  const idx = rec.para ?? rec.para_idx
  if (idx !== i) {
    throw new Error(`Index mismatch at row ${i}: got para ${idx}`)
  }

  const out: Record<string, any> = {
    id: `s0502m.mul-${i}-hi`,
    book: 's0502m.mul',
    book_id: 's0502m.mul',
    para: i,
    para_idx: i,
    lang: rec.lang || 'hi',
    title: rec.title || `धम्मपद — पद ${i}`,
    text: rec.text
  }

  if (rec.verse && rec.verse.trim().length > 0) {
    out.verse = rec.verse
  }

  out.source = rec.source || 'विपश्यना विशोधन विन्यास (VRI) / सत्यानुभूति परम्परा'
  out.translator = rec.translator || 'Antigravity VRI AI Engine'
  out.conf = rec.conf ?? 1.0

  return out
})

const content = normalized.map(r => JSON.stringify(r)).join('\n') + '\n'

fs.writeFileSync(filePath, content, 'utf-8')
fs.writeFileSync(aliasPath, content, 'utf-8')

console.log(`Successfully normalized and sorted ${normalized.length} records in ${filePath} and ${aliasPath}`)
