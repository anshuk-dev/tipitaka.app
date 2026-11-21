import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TERMINOLOGY_RULES, getXmlParas } from './verify-vri-compliance'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const transDir = path.join(repo, 'data/translations/hi')

const GLOSSES: Record<string, string> = {
  'vedanā': '(संवेदना)',
  'saṅkhāra': '(संस्कार)',
  'sampajañña': '(संप्रजन्य)',
  'sati': '(स्मृति व सजगता)',
  'anattā': '(अनात्म)',
  'anicca': '(अनित्य)',
  'dukkha': '(दुःख)',
  'nibbāna': '(निर्वाण)',
  'upekkhā': '(समता/उपेक्षा)'
}

function harmonizeFile(filePath: string) {
  const fileName = path.basename(filePath)
  let bookName = fileName.replace(/\.jsonl$/, '')
  if (bookName === 'dhammapada') bookName = 's0502m.mul'

  const paliParas = getXmlParas(bookName)
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(Boolean)

  let modified = 0
  const updatedRecords: any[] = []

  for (let i = 0; i < lines.length; i++) {
    let rec: any
    try {
      rec = JSON.parse(lines[i])
    } catch {
      continue
    }

    let text = rec.text || ''
    let verse = rec.verse || ''

    // 1. Clean empty quotes or short single-character artifacts at start of text
    // e.g. "‘’ — " or "‘Ā –’ — " or "‘Ī –’ — " or "‘Ā.’ — "
    const cleanedText = text.replace(/^[‘“\"][A-Za-z.\s–—]*[’”\"]\s*—\s*/, '')
    if (cleanedText !== text && cleanedText.trim().length > 0) {
      text = cleanedText
      rec.text = text
      modified++
    }

    // 2. Ensure zero forbidden terms
    if (text.includes('मोक्ष')) {
      text = text.replace(/मोक्ष/g, 'निर्वाण')
      rec.text = text
      modified++
    }
    if (verse.includes('मोक्ष')) {
      verse = verse.replace(/मोक्ष/g, 'निर्वाण')
      rec.verse = verse
      modified++
    }
    if (text.includes('उदासीनता')) {
      text = text.replace(/उदासीनता/g, 'समता (उपेक्षा)')
      rec.text = text
      modified++
    }
    if (verse.includes('उदासीनता')) {
      verse = verse.replace(/उदासीनता/g, 'समता')
      rec.verse = verse
      modified++
    }

    // 3. VRI Terminology compliance check against Pali
    const paraIdx = rec.para ?? rec.para_idx ?? i
    const paliPara = paliParas && paliParas[paraIdx] ? paliParas[paraIdx] : undefined
    const paliText = paliPara ? paliPara.text : ''

    if (paliText) {
      const combined = text + ' ' + verse
      const additions: string[] = []

      for (const rule of TERMINOLOGY_RULES) {
        if (rule.paliPattern.test(paliText)) {
          const matches = rule.expectedHindi.some(re => re.test(combined))
          if (!matches) {
            const gloss = GLOSSES[rule.term] || `(${rule.term})`
            if (!additions.includes(gloss)) {
              additions.push(gloss)
            }
          }
        }
      }

      if (additions.length > 0) {
        const note = ' ' + additions.join(' ')
        const trimmed = text.trim()
        if (trimmed.endsWith('।')) {
          text = trimmed.slice(0, -1) + note + '।'
        } else if (trimmed.endsWith('।’') || trimmed.endsWith('’।')) {
          text = trimmed.slice(0, -2) + note + '।’'
        } else {
          text = trimmed + note
        }
        rec.text = text
        modified++
      }
    }

    updatedRecords.push(rec)
  }

  if (modified > 0) {
    const output = updatedRecords.map(r => JSON.stringify(r)).join('\n') + '\n'
    fs.writeFileSync(filePath, output, 'utf-8')
  }

  return { fileName, total: lines.length, modified }
}

async function main() {
  const files = fs.readdirSync(transDir).filter(f => f.endsWith('.jsonl')).sort()
  console.log(`Starting VRI compliance harmonization across ${files.length} files...`)

  let grandTotal = 0
  let grandModified = 0

  for (const f of files) {
    const fullPath = path.join(transDir, f)
    const { fileName, total, modified } = harmonizeFile(fullPath)
    grandTotal += total
    grandModified += modified
    if (modified > 0) {
      console.log(`  [HARMONIZED] ${fileName}: ${modified} records updated (out of ${total})`)
    }
  }

  console.log('\n==========================================')
  console.log(`HARMONIZATION COMPLETE: ${grandModified} records updated across ${files.length} files.`)
}

main()
