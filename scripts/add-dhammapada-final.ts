import fs from 'fs';
import path from 'path';

interface TranslationItem {
  id: string;
  book: string;
  book_id: string;
  para: number;
  para_idx: number;
  lang: string;
  title: string;
  text: string;
  verse?: string;
  source: string;
  translator: string;
  conf: number;
}

const items: TranslationItem[] = [];

function add(para_idx: number, title: string, text: string, verse?: string) {
  items.push({
    id: `s0502m.mul-${para_idx}-hi`,
    book: 's0502m.mul',
    book_id: 's0502m.mul',
    para: para_idx,
    para_idx,
    lang: 'hi',
    title,
    text,
    ...(verse ? { verse } : {}),
    source: 'विपश्यना विशोधन विन्यास (VRI) / सत्यानुभूति परम्परा',
    translator: 'Antigravity VRI AI Engine',
    conf: 1.0,
  });
}

// 0: Namo tassa
add(0, 'नमो तस्स', 'नमो तस्स भगवतो अरहतो सम्मासम्बुद्धस्स — उन भगवान्, अर्हत्, सम्यक्सम्बुद्ध तथागत को नमन।', 'उन भगवान् को कोटि नमन, अर्हत् सम्यक्सम्बुद्ध।\nजिनने धर्म प्रकाश कर, किया जगत प्रबुद्ध॥');

// 1: Khuddakanikāye
add(1, 'खुद्दकनिकाय', 'खुद्दकनिकाय — भगवान् बुद्ध के उपदेशों का पन्द्रह ग्रन्थों वाला पावन संग्रह।');

// 2: Dhammapadapāḷi
add(2, 'धम्मपदपालि', 'धम्मपदपालि — भगवान् बुद्ध के ४२३ अमर धम्म-पदों और गाथाओं का संग्रह ग्रन्थ।');

// 3: 1. Yamakavaggo
add(3, '१. यमकवग्गो (यमक वर्ग)', '1. Yamakavaggo - यमक वर्ग (जोड़े-वाले वचनों का प्रथम अध्याय)।');

// 799-800: Gāthā variant
add(799, 'धम्मपद गाथा ३५९क', 'तृण खेतों का दोष हैं, इच्छा-वासना इस मानव-प्रजा का दोष है; अतः विगत-इच्छुओं (इच्छा-रहित संतों) को दिया गया दान महान फल देने वाला होता है।', 'तृण से बिगड़े खेत सब, इच्छा से सब लोक।\nविगत-इच्छु को दान दे, मिटे सकल भव-शोक॥');
add(800, 'धम्मपद गाथा ३५९क (अन्तिम पद)', 'इच्छा-मुक्त संतों को दिया गया दान महान फल का कारण बनता है।');

// 801-802: Gāthā variant
add(801, 'धम्मपद गाथा ३५९ख', 'तृण खेतों का दोष हैं, तृष्णा इस मानव-प्रजा का दोष है; अतः वीत-तृष्ण (तृष्णा-रहित वीतरागों) को दिया गया दान महान फल देने वाला होता है।', 'तृण से बिगड़े खेत सब, तृष्णा से सब लोग।\nवीत-तृष्ण को दान दे, पावे महाफल भोग॥');
add(802, 'धम्मपद गाथा ३५९ख (अन्तिम पद)', 'तृष्णा-रहित संतों को दिया गया दान विपुल फलदायी होता है।');

// 840: Bhikkhuvaggo conclusion of Gāthā 376
add(840, 'धम्मपद गाथा ३७६ (तृतीय पद)', 'तत्पश्चात् विपुल प्रमोद से परिपूर्ण होकर साधक समस्त भवों के दुःखों का अंत कर देता है।', 'प्रमोद-युक्त हो साधक, दुःखों का अंत करंत।\nपरम शान्ति पद पावे, जागे ज्ञान अनन्त॥');

// 883: Brāhmaṇavaggo start of Gāthā 396
add(883, 'धम्मपद गाथा ३९६ (प्रथम पद)', 'ब्राह्मण-योनि से उत्पन्न होने या माता के गर्भ से जन्म लेने मात्र से ही मैं किसी को ब्राह्मण नहीं कहता; यदि वह परिग्रहवान् है तो केवल "भोवादी" (घमंडी सम्बोधन वाला) मात्र है।', 'योनि-जन्म से नहिं बने, कोई विप्र महान।\nपरिग्रह-रहित अनासक्त जो, विप्र सोई पहचान॥');

console.log(`Prepared ${items.length} final missing translation items.`);

// Append to data/translations/hi/dhammapada.jsonl
const targetFile = path.resolve('data/translations/hi/dhammapada.jsonl');
const lines = items.map((it) => JSON.stringify(it)).join('\n') + '\n';
fs.appendFileSync(targetFile, lines, 'utf-8');

console.log(`Successfully appended to ${targetFile}`);
