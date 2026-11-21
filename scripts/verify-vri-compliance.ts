import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFile, type XmlItem } from '../build/xml'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const xmlDir = path.join(repo, '.cache/tipitaka-xml/romn')

export interface VerificationIssue {
  book: string
  para: number
  type: 'error' | 'warning'
  code: string
  message: string
}

export interface VerificationResult {
  totalRecords: number
  totalVerses: number
  totalProse: number
  errors: VerificationIssue[]
  warnings: VerificationIssue[]
}

const PALI_LETTER = '[a-zA-Z\\u00C0-\\u024F]'
const paliBound = (inner: string) => new RegExp(`(?<!${PALI_LETTER})(${inner})(?!${PALI_LETTER})`, 'i')

// Key VRI terminology mappings
// Pali term regex (case-insensitive) -> required Hindi root / keywords
const TERMINOLOGY_RULES = [
  {
    term: 'vedanā',
    paliPattern: paliBound(`vedan[aā]${PALI_LETTER}*`),
    expectedHindi: [/संवेदना/],
    forbiddenHindi: [/^\s*दर्द\s*$/],
    description: 'vedanā -> संवेदना'
  },
  {
    term: 'saṅkhāra',
    paliPattern: paliBound(`sa[ṅn]kh[aā]r${PALI_LETTER}*`),
    expectedHindi: [/संस्कार/],
    forbiddenHindi: [],
    description: 'saṅkhāra -> संस्कार'
  },
  {
    term: 'sampajañña',
    paliPattern: paliBound(`sampaja[ñn][ñn]${PALI_LETTER}*|sampaj[aā]n${PALI_LETTER}*`),
    expectedHindi: [/संप्रजन्य|सजग|सप्रज्ञ|संप्रज्ञान/],
    forbiddenHindi: [],
    description: 'sampajañña -> संप्रजन्य'
  },
  {
    term: 'sati',
    paliPattern: paliBound(`sati|satim[aā]${PALI_LETTER}*|satipa[ṭt][ṭt]h[aā]n${PALI_LETTER}*`),
    expectedHindi: [/स्मृति|सजगता|सचेत|स्मृतिमान/],
    forbiddenHindi: [],
    description: 'sati -> स्मृति / सजगता'
  },
  {
    term: 'anattā',
    paliPattern: paliBound(`anatt[aā]${PALI_LETTER}*`),
    expectedHindi: [/अनात्म/],
    forbiddenHindi: [],
    description: 'anattā -> अनात्म'
  },
  {
    term: 'anicca',
    paliPattern: paliBound(`anicc[aā]${PALI_LETTER}*`),
    expectedHindi: [/अनित्य/],
    forbiddenHindi: [],
    description: 'anicca -> अनित्य'
  },
  {
    term: 'dukkha',
    paliPattern: paliBound(`dukkh[aā]${PALI_LETTER}*`),
    expectedHindi: [/दुःख/],
    forbiddenHindi: [],
    description: 'dukkha -> दुःख'
  },
  {
    term: 'nibbāna',
    paliPattern: paliBound(`nibb[aā]n${PALI_LETTER}*`),
    expectedHindi: [/निर्वाण/],
    forbiddenHindi: [],
    description: 'nibbāna -> निर्वाण'
  },
  {
    term: 'upekkhā',
    paliPattern: paliBound(`upekkh[aā]${PALI_LETTER}*`),
    expectedHindi: [/समता|उपेक्षा/],
    forbiddenHindi: [/उदासीनता/],
    description: 'upekkhā -> समता / उपेक्षा'
  }
]

// Cache parsed XML files
const xmlCache = new Map<string, { paras: { rend: string; text: string; num: string }[] }>()

function getXmlParas(book: string) {
  let cleanBook = book.replace(/\.jsonl$/, '')
  if (!cleanBook.endsWith('.xml')) {
    cleanBook = cleanBook.replace(/\.mul$|\.att$|\.tik$|\.nrf$/, '') + (book.includes('.') ? book.slice(book.indexOf('.')) : '.mul') + '.xml'
  }
  if (xmlCache.has(cleanBook)) return xmlCache.get(cleanBook)!.paras

  const filePath = path.join(xmlDir, cleanBook)
  if (!fs.existsSync(filePath)) {
    return null
  }

  try {
    const items = parseFile(filePath)
    const paras = items.filter(x => x.k === 'p') as { rend: string; text: string; num: string }[]
    xmlCache.set(cleanBook, { paras })
    return paras
  } catch (e) {
    return null
  }
}

export function verifyRecord(rec: any, paliPara?: { rend: string; text: string }): VerificationIssue[] {
  const issues: VerificationIssue[] = []
  const book = rec.book || rec.book_id || 'unknown'
  const para = rec.para ?? rec.para_idx ?? -1

  // 1. Basic validation
  if (!rec.text || typeof rec.text !== 'string' || rec.text.trim().length === 0) {
    issues.push({
      book,
      para,
      type: 'error',
      code: 'MISSING_TEXT',
      message: 'Paragraph translation text is missing or empty'
    })
    return issues
  }

  const combinedHindi = `${rec.verse || ''} ${rec.text}`
  const isGatha = paliPara ? paliPara.rend.startsWith('gatha') : Boolean(rec.verse)

  // 2. Verse dual-layer compliance
  if (isGatha) {
    if (!rec.verse || rec.verse.trim().length === 0) {
      issues.push({
        book,
        para,
        type: 'error',
        code: 'MISSING_DOHA_VERSE',
        message: 'Gāthā verse must include a rhyming Hindi doha in "verse" field'
      })
    } else {
      // Check doha formatting: should have at least 2 lines or poetic punctuation
      const lines = rec.verse.trim().split('\n').map((l: string) => l.trim()).filter(Boolean)
      if (lines.length < 2 && !rec.verse.includes('॥') && !rec.verse.includes('।')) {
        issues.push({
          book,
          para,
          type: 'warning',
          code: 'DOHA_STRUCTURE_WARNING',
          message: 'Doha verse should be structured in rhyming lines (e.g. 2 or 4 lines with punctuation)'
        })
      }
    }

    // Check prose explanation (भावार्थ)
    if (!rec.text || rec.text.trim().length < 15) {
      issues.push({
        book,
        para,
        type: 'error',
        code: 'MISSING_PROSE_EXPLANATION',
        message: 'Gāthā must include a detailed prose explanation (भावार्थ) in "text"'
      })
    } else if (rec.verse && rec.text.trim() === rec.verse.trim()) {
      issues.push({
        book,
        para,
        type: 'error',
        code: 'PROSE_DUPLICATES_VERSE',
        message: 'Gāthā prose explanation must not simply duplicate the doha verse'
      })
    }
  }

  // 3. Terminology compliance
  const paliText = paliPara ? paliPara.text : ''
  for (const rule of TERMINOLOGY_RULES) {
    // Check if Pali source has the term (or if Hindi discusses the Pali term)
    const appearsInPali = paliText && rule.paliPattern.test(paliText)
    if (appearsInPali) {
      const hasExpected = rule.expectedHindi.some(re => re.test(combinedHindi))
      if (!hasExpected) {
        issues.push({
          book,
          para,
          type: 'warning',
          code: 'TERMINOLOGY_MISMATCH',
          message: `Pāḷi contains "${rule.term}", expected VRI standard translation (${rule.description}) in Hindi text/verse`
        })
      }
    }

    // Check forbidden terms
    for (const forbidden of rule.forbiddenHindi) {
      if (forbidden.test(combinedHindi)) {
        issues.push({
          book,
          para,
          type: 'error',
          code: 'FORBIDDEN_TERMINOLOGY',
          message: `Found non-VRI terminology for ${rule.term}: matches forbidden pattern ${forbidden}`
        })
      }
    }
  }

  // Check specific non-VRI patterns in Hindi:
  // e.g. "मोक्ष" used where "निर्वाण" is standard Vipassana usage
  if (/\bमोक्ष\b/.test(combinedHindi) && !/निर्वाण/.test(combinedHindi) && paliText && /nibb[aā]n/i.test(paliText)) {
    issues.push({
      book,
      para,
      type: 'warning',
      code: 'VRI_STYLE_NIBBANA',
      message: 'VRI style recommends "निर्वाण" instead of "मोक्ष" for nibbāna'
    })
  }

  return issues
}

export function verifyFile(filePath: string, range?: { start: number; end: number }): VerificationResult {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(Boolean)
  const result: VerificationResult = {
    totalRecords: 0,
    totalVerses: 0,
    totalProse: 0,
    errors: [],
    warnings: []
  }

  const fileName = path.basename(filePath)
  let bookName = fileName.replace(/\.jsonl$/, '')
  if (!bookName.includes('.')) {
    // Dhammapada or similar
    if (bookName === 'dhammapada') bookName = 's0502m.mul'
  }

  const paliParas = getXmlParas(bookName)

  for (let i = 0; i < lines.length; i++) {
    let rec: any
    try {
      rec = JSON.parse(lines[i])
    } catch (e: any) {
      result.errors.push({
        book: bookName,
        para: i,
        type: 'error',
        code: 'INVALID_JSON',
        message: `Line ${i + 1} is not valid JSON: ${e.message}`
      })
      continue
    }

    const paraIdx = rec.para ?? rec.para_idx ?? i
    if (range && (paraIdx < range.start || paraIdx > range.end)) {
      continue
    }

    result.totalRecords++
    const paliPara = paliParas && paliParas[paraIdx] ? paliParas[paraIdx] : undefined
    const isVerse = paliPara ? paliPara.rend.startsWith('gatha') : Boolean(rec.verse)

    if (isVerse) result.totalVerses++
    else result.totalProse++

    const issues = verifyRecord(rec, paliPara)
    for (const issue of issues) {
      if (issue.type === 'error') result.errors.push(issue)
      else result.warnings.push(issue)
    }
  }

  return result
}

// CLI execution
if (process.argv[1] && process.argv[1].endsWith('verify-vri-compliance.ts')) {
  const args = process.argv.slice(2)
  const fileArg = args.find((_, i) => args[i - 1] === '--file')
  const rangeArg = args.find((_, i) => args[i - 1] === '--range')
  const allFlag = args.includes('--all')

  let range: { start: number; end: number } | undefined
  if (rangeArg) {
    const [start, end] = rangeArg.split('-').map(Number)
    range = { start, end }
  }

  const transDir = path.join(repo, 'data/translations/hi')
  const filesToVerify: string[] = []

  if (fileArg) {
    const full = path.isAbsolute(fileArg) ? fileArg : path.join(repo, fileArg)
    filesToVerify.push(full)
  } else if (allFlag) {
    if (fs.existsSync(transDir)) {
      for (const f of fs.readdirSync(transDir).filter(x => x.endsWith('.jsonl'))) {
        filesToVerify.push(path.join(transDir, f))
      }
    }
  } else {
    console.log('Usage: npx tsx scripts/verify-vri-compliance.ts [--file <path>] [--range <start>-<end>] [--all]')
    process.exit(0)
  }

  let grandTotal = 0
  let totalErrors = 0
  let totalWarnings = 0

  console.log(`\n================ VRI VIPASSANA COMPLIANCE VERIFICATION ================`)
  for (const file of filesToVerify) {
    console.log(`\nVerifying file: ${path.basename(file)}...`)
    const res = verifyFile(file, range)
    grandTotal += res.totalRecords
    totalErrors += res.errors.length
    totalWarnings += res.warnings.length

    console.log(`  Records checked: ${res.totalRecords} (Verses: ${res.totalVerses}, Prose: ${res.totalProse})`)
    console.log(`  Errors: ${res.errors.length}, Warnings: ${res.warnings.length}`)

    if (res.errors.length > 0) {
      console.log('  Top Errors:')
      for (const err of res.errors.slice(0, 10)) {
        console.log(`    [ERR] Para ${err.para}: [${err.code}] ${err.message}`)
      }
      if (res.errors.length > 10) console.log(`    ... and ${res.errors.length - 10} more errors`)
    }

    if (res.warnings.length > 0) {
      console.log('  Top Warnings:')
      for (const w of res.warnings.slice(0, 5)) {
        console.log(`    [WARN] Para ${w.para}: [${w.code}] ${w.message}`)
      }
    }
  }

  console.log(`\n================ SUMMARY ================`)
  console.log(`Total records verified: ${grandTotal}`)
  console.log(`Total Errors: ${totalErrors}`)
  console.log(`Total Warnings: ${totalWarnings}`)

  if (totalErrors > 0) {
    console.log(`STATUS: FAILED ❌`)
    process.exit(1)
  } else {
    console.log(`STATUS: PASSED ✅`)
    process.exit(0)
  }
}
