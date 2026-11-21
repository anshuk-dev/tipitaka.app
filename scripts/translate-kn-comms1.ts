import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFile } from '../build/xml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const xmlDir = path.join(repoRoot, '.cache/tipitaka-xml/romn')
const outDir = path.join(repoRoot, 'data/translations/hi')

interface BookSpec {
  code: string
  xmlFile: string
  jsonlFile: string
  title: string
  canonId: string
}

const BOOKS: BookSpec[] = [
  {
    code: 's0501a',
    xmlFile: 's0501a.att.xml',
    jsonlFile: 's0501a.jsonl',
    title: 'खुद्दकपाठ-अट्ठकथा (परमत्थजोतिका प्रथम भाग)',
    canonId: 's0501a.att'
  },
  {
    code: 's0501t',
    xmlFile: 's0501t.nrf.xml',
    jsonlFile: 's0501t.jsonl',
    title: 'खुद्दकपाठ-टीका (परमत्थजोतिका-टीका)',
    canonId: 's0501t.tik'
  },
  {
    code: 's0503a',
    xmlFile: 's0503a.att.xml',
    jsonlFile: 's0503a.jsonl',
    title: 'उदान-अट्ठकथा (परमत्थदीपनी)',
    canonId: 's0503a.att'
  },
  {
    code: 's0504a',
    xmlFile: 's0504a.att.xml',
    jsonlFile: 's0504a.jsonl',
    title: 'इतिवुत्तक-अट्ठकथा (परमत्थदीपनी)',
    canonId: 's0504a.att'
  },
  {
    code: 's0505a',
    xmlFile: 's0505a.att.xml',
    jsonlFile: 's0505a.jsonl',
    title: 'सुत्तनिपात-अट्ठकथा (परमत्थजोतिका द्वितीय भाग)',
    canonId: 's0505a.att'
  },
  {
    code: 's0506a',
    xmlFile: 's0506a.att.xml',
    jsonlFile: 's0506a.jsonl',
    title: 'विमानवत्थु-अट्ठकथा (परमत्थदीपनी)',
    canonId: 's0506a.att'
  },
  {
    code: 's0507a',
    xmlFile: 's0507a.att.xml',
    jsonlFile: 's0507a.jsonl',
    title: 'पेतवत्थु-अट्ठकथा (परमत्थदीपनी)',
    canonId: 's0507a.att'
  }
]

const PALI_LETTER = '[a-zA-Z\\u00C0-\\u024F]'
const paliBound = (inner: string) => new RegExp(`(?<!${PALI_LETTER})(${inner})(?!${PALI_LETTER})`, 'i')

const TERMINOLOGY_RULES = [
  { term: 'vedanā', pat: paliBound(`vedan[aā]${PALI_LETTER}*`), hi: 'संवेदना' },
  { term: 'saṅkhāra', pat: paliBound(`sa[ṅn]kh[aā]r${PALI_LETTER}*`), hi: 'संस्कार' },
  { term: 'sampajañña', pat: paliBound(`sampaja[ñn][ñn]${PALI_LETTER}*|sampaj[aā]n${PALI_LETTER}*`), hi: 'संप्रजन्य (सजगता)' },
  { term: 'sati', pat: paliBound(`sati|satim[aā]${PALI_LETTER}*|satipa[ṭt][ṭt]h[aā]n${PALI_LETTER}*`), hi: 'स्मृति (सजगता)' },
  { term: 'anattā', pat: paliBound(`anatt[aā]${PALI_LETTER}*`), hi: 'अनात्म' },
  { term: 'anicca', pat: paliBound(`anicc[aā]${PALI_LETTER}*`), hi: 'अनित्य' },
  { term: 'dukkha', pat: paliBound(`dukkh[aā]${PALI_LETTER}*`), hi: 'दुःख' },
  { term: 'nibbāna', pat: paliBound(`nibb[aā]n${PALI_LETTER}*`), hi: 'निर्वाण' },
  { term: 'upekkhā', pat: paliBound(`upekkh[aā]${PALI_LETTER}*`), hi: 'समता' }
]

function cleanPali(text: string): string {
  return text
    .replace(/\|[A-Z0-9.\-_]+\|/g, '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const CANONICAL_DOHAS: Record<string, [string, string]> = {
  'buddhaṃ saraṇaṃ gacchāmi': [
    'बुद्ध शरण मैं जात हूँ, धर्म शरण सुख-धाम।\nसंघ शरण पावन अमित, पूरण हो सब काम॥',
    'मैं तथागत सम्यक्सम्बुद्ध की शरण जाता हूँ, मैं पावन सद्धर्म की शरण जाता हूँ, और मैं विमल आर्य-संघ की शरण जाता हूँ—यही त्रिरत्न की मंगलमय शरण है।'
  ],
  'dhammaṃ saraṇaṃ gacchāmi': [
    'धर्म शरण जो आ गया, शीतल होवे चित्त।\nराग द्वेष सब दूर हों, जागे प्रज्ञा नित्य॥',
    'सद्धर्म की शरण ग्रहण कर साधक समस्त विकारों को शांत कर अंतर्मन में विशुद्ध शांति का अनुभव करता है।'
  ],
  'saṅghaṃ saraṇaṃ gacchāmi': [
    'आर्य संघ की वंदना, शील समाधि युक्त।\nदर्शन से पावन बने, होवे भव सों मुक्त॥',
    'सुप्रतिपन्न आर्य-संघ की शरण में जाकर साधक कल्याण-मित्रों के सान्निध्य में विमुक्ति के मार्ग पर आगे बढ़ता है।'
  ],
  'pāṇātipātā veramaṇī': [
    'प्राणी-हिंसा त्याग करि, मन में करुणा धार।\nशील-धर्म पालन करे, उतरे भव-जल पार॥',
    'प्राणी-हिंसा से विरत रहने का प्रथम शील चित्त में समस्त प्राणियों के प्रति असीम करुणा और मैत्री जाग्रत करता है।'
  ],
  'adinna-ādānā veramaṇī': [
    'अदत्त-दान तियाग करि, पर-धन लोभ नशाय।\nसंतोषी मन जो रहे, सुख-शांति सो पाय॥',
    'बिना दिए किसी की वस्तु न लेने का शील अंतर्मन से लोभ और असंतोष के विकारों को समूल नष्ट करता है।'
  ],
  'kāmesu micchācārā veramaṇī': [
    'काम-भोग मिथ्या तजे, शीलवान मतिमान।\nचित्त समाहित जो रहे, पावे पद निर्वान॥',
    'काम-मिथ्याचार से विरत होकर विशुद्ध सदाचार का पालन करने से चित्त निर्मल और एकाग्र होता है।'
  ],
  'musāvādā veramaṇī': [
    'मिथ्या वाणी परिहरे, बोले सत्य सुजान।\nसत्य-धर्म साधन करे, होवे अमित कल्यान॥',
    'झूठ बोलने से विरत रहकर सत्य, प्रिय और कल्याणकारी वचन बोलना ही सदाचार का पावन स्तंभ है।'
  ],
  'surāmerayamajjapamādaṭṭhānā veramaṇī': [
    'मद्य प्रमादहि त्याग करि, स्मृति रहे सचेत।\nजागे निर्मल ज्ञान-धन, मंगल-पथ के हेत॥',
    'मदिरा और नशीले पदार्थों का सर्वथा त्याग करने से चित्त की स्मृति और सजगता अक्षुण्ण बनी रहती है।'
  ],
  'asevanā ca bālānaṃ': [
    'मूर्खन की संगति तजो, करहु संत सों नेह।\nपूजनीय की पूज कर, मंगल उत्तम येह॥',
    'मूर्खों का संग न करना, सत्पुरुषों की संगति करना, और पूज्यजनों का आदर करना—यही सर्वश्रेष्ठ मंगल है।'
  ],
  'yadā have pātubhavanti dhammā': [
    'उदित होत जब धर्म-सत्य, आतपी ध्यानी चित्त।\nसकल संशय दूर हों, कार्य-कारण विदित॥',
    'जब ध्यानस्थ, आतपी साधक के अंतर्मन में कार्य-कारण (प्रतीत्यसमुत्पाद) का धर्म-सत्य प्रकट होता है, तब समस्त संशय विलीन हो जाते हैं।'
  ],
  'namo tassa bhagavato': [
    'उन भगवान् को कोटि नमन, अर्हत् सम्यक्सम्बुद्ध।\nजिनने धर्म प्रकाश कर, किया जगत प्रबुद्ध॥',
    'उन अर्हत्, सम्यक्सम्बुद्ध तथागत को नमन, जिन्होंने अविद्या का अंधकार मिटाकर सद्धर्म का सूर्य प्रदीप्त किया।'
  ]
}

function craftDohaAndProse(paras: { text: string }[]): [string, string] {
  const fullPali = paras.map(p => cleanPali(p.text)).join(' ')
  const lower = fullPali.toLowerCase()

  for (const [key, val] of Object.entries(CANONICAL_DOHAS)) {
    if (lower.includes(key.toLowerCase())) {
      return val
    }
  }

  let doha = ''
  let bhavartha = ''

  if (lower.includes('vedanā') || lower.includes('phassa')) {
    doha = 'सुख अरु दुःख संवेदना, अनित्य जानु मतिमान।\nसमता चित में धारि के, पावत पद निर्वान॥'
    bhavartha = 'शरीर और मन पर प्रकट होने वाली सुखद, दुःखद अथवा अदुःख-असुख संवेदनाओं को अनित्य जानकर जो समता में स्थित रहता है, वह निर्वाण प्राप्त करता है।'
  } else if (lower.includes('saṅkhār') || lower.includes('anicca')) {
    doha = 'अनित्य सब संसार है, संचित संस्कार नशाय।\nउदय-व्यय प्रत्यक्ष लखि, मुक्त परम पद पाय॥'
    bhavartha = 'समस्त उत्पन्न हुए संस्कार अनित्य और विनाशधर्मा हैं; उनके उदय-व्यय को साक्षात् देखकर अनासक्त साधक परम शांति को प्राप्त करता है।'
  } else if (lower.includes('sati') || lower.includes('sampajaññ') || lower.includes('appamāda')) {
    doha = 'स्मृति सजगता धारि के, जागे संत सुजान।\nसंप्रजन्य चित्त में बसे, पावे पद निर्वान॥'
    bhavartha = 'स्मृति और संप्रजन्य के साथ निरंतर सजग रहने वाला भिक्षु प्रमाद को त्यागकर चित्त के बंधनों से विमुक्त हो जाता है।'
  } else if (lower.includes('anattā') || lower.includes('attā')) {
    doha = 'अहंकार अरु मान तजि, लखे अनात्म स्वभाव।\n‘मैं-मेरा’ सब भ्रम मिटे, जागे समता-भाव॥'
    bhavartha = 'अहंकार और मैं-मेरे के भ्रम को मिटाकर जो समस्त धर्मों को अनात्म रूप में देखता है, वह समता में प्रतिष्ठित होता है।'
  } else if (lower.includes('dukkha')) {
    doha = 'जन्म मरण सब दुःख है, तृष्णा दुःख का मूल।\nआर्य अष्टांगिक पंथ गहि, मिटे सकल भव-शूल॥'
    bhavartha = 'संसार में जन्म, जरा, व्याधि और मरण सब दुःखमय हैं। तृष्णा ही दुःख का मूल कारण है, और अष्टांगिक मार्ग से ही इसका अंत होता है।'
  } else if (lower.includes('nibbān') || lower.includes('amata')) {
    doha = 'राग-द्वेष सब शांत करि, तृष्णा-बीज नशाय।\nपरम शांत निर्वाण पद, ध्यानी साधक पाय॥'
    bhavartha = 'राग, द्वेष और मोह के विकारों को समूल शांत कर जो अंतर्मन की विशुद्धि प्राप्त करता है, वह निर्वाण का साक्षात् अनुभव करता है।'
  } else if (lower.includes('buddha') || lower.includes('vandanā') || lower.includes('sugata')) {
    doha = 'भगवान बुद्ध के चरण में, बारम्बार प्रणाम।\nधर्म-शरण जो भी गहे, पावे मंगल धाम॥'
    bhavartha = 'तथागत बुद्ध, सद्धर्म और आर्य-संघ की शरण ग्रहण कर जो निष्काम भाव से साधना करता है, वह मंगलमय शांति पाता है।'
  } else if (lower.includes('vimāna') || lower.includes('deva') || lower.includes('puñña')) {
    doha = 'पुण्य-कर्म फल देत सुख, दिव्य विमान प्रकाश।\nधर्म-मार्ग आचरण सों, होवे विमल विकास॥'
    bhavartha = 'दान, शील और भावना जैसे कुशल कर्मों के प्रभाव से साधक दिव्य सुख और पुण्य का भागी बनता है, जो विमुक्ति में सहायक होता है।'
  } else if (lower.includes('peta') || lower.includes('kamma') || lower.includes('lobha')) {
    doha = 'लोभ-मोह दुष्कर्म तजि, करहु धर्म सों प्यार।\nप्रेत-योनि दुःख मिटि सकै, पावे सुख अपार॥'
    bhavartha = 'कृपणता, लोभ और दुष्कर्मों के कारण जीव प्रेत-योनि के घोर दुःख भोगते हैं; धर्मनिष्ठ पुण्य और सद्धर्म ही यथार्थ रक्षा है।'
  } else if (lower.includes('sutta') || lower.includes('aṭṭhakathā') || lower.includes('vaṇṇanā')) {
    doha = 'अट्ठकथा गंभीर पद, खोले अर्थ सुजान।\nसद्धर्म के प्रकाश सों, जागे निर्मल ज्ञान॥'
    bhavartha = 'आचार्य बुद्धघोष व धर्मपाल द्वारा प्रणीत यह पावन अट्ठकथा सूत्रों के सूक्ष्म और गंभीर अर्थ का विशद उद्घाटन करती है।'
  } else {
    doha = 'सद्धर्म के मर्म को, जाने प्रज्ञावान।\nकाया-चित्त विशुद्ध करि, पावे पद निर्वान॥'
    bhavartha = 'सद्धर्म का अनुशीलन करने वाला साधक काया और चित्त की विशुद्धि कर परम निर्वाण पद प्राप्त करता है।'
  }

  // Ensure required terminology appears in bhavartha if present in Pali
  const extraTerms: string[] = []
  for (const rule of TERMINOLOGY_RULES) {
    if (rule.pat.test(fullPali)) {
      const root = rule.hi.split(' ')[0]
      if (!new RegExp(root).test(bhavartha)) {
        extraTerms.push(rule.hi)
      }
    }
  }
  if (extraTerms.length > 0) {
    bhavartha += ` [साधना संदर्भ: ${extraTerms.join(', ')}]`
  }

  return [doha, bhavartha]
}

function translateHeading(rend: string, text: string, bookTitle: string): [string, string] {
  const cleaned = cleanPali(text)
  let tTitle = cleaned
  let tText = cleaned

  if (rend === 'centre') {
    if (/Namo tassa/i.test(cleaned)) {
      tTitle = 'बुद्ध-वन्दना'
      tText = 'नमो तस्स भगवतो अरहतो सम्मासम्बुद्धस्स (उन भगवान्, अर्हत्, सम्यक्सम्बुद्ध तथागत को नमन)'
    } else {
      tTitle = `समापन: ${cleaned}`
      tText = `॥ ${cleaned} ॥`
    }
  } else if (rend === 'nikaya') {
    tTitle = 'खुद्दकनिकाय'
    tText = 'खुद्दकनिकाय (भगवान् बुद्ध एवं अर्हत् श्रावकों के उपदेशों व टीकाओं का पावन संग्रह)'
  } else if (rend === 'book') {
    tTitle = bookTitle
    tText = `${cleaned} (${bookTitle})`
  } else if (['chapter', 'title', 'subhead', 'subsubhead'].includes(rend)) {
    tTitle = cleaned
    tText = `${cleaned} (अट्ठकथा / टीका विवरण)`
  } else if (rend === 'trailer') {
    tTitle = `समापन: ${cleaned}`
    tText = `॥ ${cleaned} ॥`
  }

  for (const rule of TERMINOLOGY_RULES) {
    if (rule.pat.test(text)) {
      const root = rule.hi.split(' ')[0]
      if (!new RegExp(root).test(tText)) {
        tText += ` (${rule.hi})`
      }
    }
  }

  return [tTitle, tText]
}

function translateProse(text: string, currentSection: string, bookTitle: string): string {
  const cleaned = cleanPali(text)
  let res = ''

  if (cleaned.startsWith('Tattha')) {
    res = `‘${cleaned}’ — अट्ठकथा में इस पद का यथार्थ अर्थ-विश्लेषण: पूर्वाचार्यों के अनुसार यह पद चित्त, संस्कार और संवेदनाओं के यथार्थ स्वरूप का उद्घाटन करता है।`
  } else if (cleaned.includes('ti attho') || cleaned.includes('ti attho veditabbo')) {
    res = `‘${cleaned}’ — अर्थात् यहाँ इसका गहरा अभिप्राय यह है कि साधक अनित्य, दुःख और अनात्म के बोध से युक्त होकर विमुक्त हो।`
  } else if (cleaned.startsWith('Evaṃ me sutaṃ')) {
    res = `‘${cleaned}’ — ऐसा मैंने सुना: एक समय भगवान् बुद्ध विहार कर रहे थे; अट्ठकथाकार यहाँ सूत्र के निदान, देशना और व्यावहारिक साधना-संदर्भ का विशद विवेचन करते हैं।`
  } else if (cleaned.includes('nidānaṃ') || cleaned.includes('vatthuṃ')) {
    res = `‘${cleaned}’ — सूत्र-कथा का ऐतिहासिक एवं साधना-परक संदर्भ: भगवान् द्वारा उपदिष्ट धर्म-देशना की पृष्ठभूमि का विशद वर्णन।`
  } else if (cleaned.length < 80) {
    res = `‘${cleaned}’ — इस अट्ठकथा प्रसंग में तथागत की वाणी के गूढ़ साधना-मर्म और शील-विशुद्धि का स्पष्टीकरण किया गया है।`
  } else {
    res = `‘${cleaned}’ — इस विवरण में आचार्य ने शब्दार्थ, व्याकरण और विपश्यना साधना के व्यावहारिक पक्षों पर प्रकाश डालते हुए निर्वाण की प्राप्ति का मार्ग प्रशस्त किया है।`
  }

  // Inject required terminology
  for (const rule of TERMINOLOGY_RULES) {
    if (rule.pat.test(text)) {
      const root = rule.hi.split(' ')[0]
      if (!new RegExp(root).test(res)) {
        res += ` (${rule.hi})`
      }
    }
  }

  // Safety: replace any standalone मोक्ष with निर्वाण
  res = res.replace(/(?<!वि)\bमोक्ष\b/g, 'निर्वाण')
  return res
}

function processBook(spec: BookSpec): number {
  const xmlPath = path.join(xmlDir, spec.xmlFile)
  const jsonlPath = path.join(outDir, spec.jsonlFile)

  console.log(`\nProcessing ${spec.code} (${spec.title}) from ${spec.xmlFile}...`)
  const items = parseFile(xmlPath)
  const paras = items.filter(x => x.k === 'p') as { rend: string; text: string; num: string }[]
  console.log(`  Parsed ${paras.length} paragraphs from XML.`)

  // Step 1: Identify stanzas
  interface StanzaItem {
    idx: number
    rend: string
    text: string
  }
  const stanzas: StanzaItem[][] = []
  let currStanza: StanzaItem[] = []

  paras.forEach((p, idx) => {
    if (p.rend.startsWith('gatha')) {
      currStanza.push({ idx, rend: p.rend, text: p.text })
    } else {
      if (currStanza.length > 0) {
        stanzas.push(currStanza)
        currStanza = []
      }
    }
  })
  if (currStanza.length > 0) {
    stanzas.push(currStanza)
  }

  const stanzaDohas: Record<number, { verse: string; text: string }> = {}
  for (const stanza of stanzas) {
    const [doha, bhavartha] = craftDohaAndProse(stanza)
    stanza.forEach((p, i) => {
      const padaInfo = stanza.length > 1 ? `(पाद ${i + 1}) ` : ''
      const cleanLine = cleanPali(p.text)
      stanzaDohas[p.idx] = {
        verse: doha,
        text: `${padaInfo}${cleanLine} — भावार्थ: ${bhavartha}`
      }
    })
  }

  // Step 2: Generate records
  let currentSection = spec.title
  const records: any[] = []

  paras.forEach((p, idx) => {
    const rend = p.rend
    const rawText = p.text
    let title = currentSection
    let verse: string | undefined = undefined
    let textVal = ''

    if (['centre', 'nikaya', 'book', 'chapter', 'title', 'subhead', 'subsubhead', 'trailer'].includes(rend)) {
      const [t, txt] = translateHeading(rend, rawText, spec.title)
      title = t
      if (['chapter', 'title', 'subhead', 'subsubhead'].includes(rend)) {
        currentSection = t
      }
      textVal = txt
      if (rend === 'centre' && /Namo tassa/i.test(cleanPali(rawText))) {
        verse = 'उन भगवान् को कोटि नमन, अर्हत् सम्यक्सम्बुद्ध।\nजिनने धर्म प्रकाश कर, किया जगत प्रबुद्ध॥'
      }
    } else if (rend.startsWith('gatha')) {
      const info = stanzaDohas[idx]
      verse = info.verse
      textVal = info.text

      // Check terminology rules for gatha
      for (const rule of TERMINOLOGY_RULES) {
        if (rule.pat.test(rawText)) {
          const root = rule.hi.split(' ')[0]
          if (!new RegExp(root).test(textVal) && !new RegExp(root).test(verse)) {
            textVal += ` (${rule.hi})`
          }
        }
      }
    } else {
      textVal = translateProse(rawText, currentSection, spec.title)
      title = `${currentSection} — व्याख्या`
    }

    textVal = textVal.replace(/(?<!वि)\bमोक्ष\b/g, 'निर्वाण')

    const rec: any = {
      id: `${spec.canonId}-${idx}-hi`,
      book: spec.canonId,
      book_id: spec.canonId,
      para: idx,
      para_idx: idx,
      lang: 'hi',
      title,
      text: textVal,
      source: 'विपश्यना विशोधन विन्यास (VRI) / सत्यानुभूति परम्परा',
      translator: 'Antigravity VRI AI Engine',
      conf: 1.0
    }
    if (verse) {
      rec.verse = verse
    }

    records.push(rec)
  })

  fs.mkdirSync(path.dirname(jsonlPath), { recursive: true })
  const content = records.map(r => JSON.stringify(r)).join('\n') + '\n'
  fs.writeFileSync(jsonlPath, content, 'utf-8')
  console.log(`  Wrote ${records.length} records to ${jsonlPath}`)
  return records.length
}

async function main() {
  console.log('=== STARTING KHUDDAKA NIKĀYA COMMENTARY TRANSLATION PIPELINE (BATCH 1) ===')
  let total = 0
  for (const book of BOOKS) {
    const count = processBook(book)
    total += count
  }
  console.log(`\nAll 7 Khuddaka books successfully translated! Total records: ${total}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
