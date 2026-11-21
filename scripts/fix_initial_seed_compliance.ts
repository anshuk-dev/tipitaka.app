import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFile } from '../build/xml';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 1. Fix vin01m.jsonl
export function fixVin01m() {
  const file = path.join(repo, 'data/translations/hi/vin01m.jsonl');
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  const outLines: string[] = [];

  const dohas: Record<number, { verse: string; text: string }> = {
    127: {
      verse: 'मर्कटी वज्जिपुत्तक अरु, गृहस्थ नग्न अरु तीर्थिक जान।\nदारिका उत्पलवर्णा लखि, व्यंजन भेद दोउ आन॥',
      text: 'मर्कटी (बंदरिया) का प्रसंग, वज्जिपुत्तक भिक्षुओं का प्रसंग, गृहस्थ, नग्न साधु और तीर्थिकों के प्रसंग।'
    },
    128: {
      verse: 'मर्कटी वज्जिपुत्तक अरु, गृहस्थ नग्न अरु तीर्थिक जान।\nदारिका उत्पलवर्णा लखि, व्यंजन भेद दोउ आन॥',
      text: 'दारिका (बालिका), उत्पलवर्णा भिक्षुणी तथा दो उभयव्यंजक के मैथुन-आपत्ति संबंधी प्रसंगों का संग्रह।'
    },
    129: {
      verse: 'माता दुहिता भगिनी जाया, मृदु लंबिन प्रसंग सु-सार।\nद्वौ व्रण लेप चित्र अरु, काष्ठ-पुत्तलिका विस्तार॥',
      text: 'माता, पुत्री, भगिनी, पूर्व-पत्नी, मृदु और लंबिन अंग संबंधी मैथुन-प्रसंगों का संग्रह।'
    },
    130: {
      verse: 'माता दुहिता भगिनी जाया, मृदु लंबिन प्रसंग सु-सार।\nद्वौ व्रण लेप चित्र अरु, काष्ठ-पुत्तलिका विस्तार॥',
      text: 'दो प्रकार के व्रण (घाव), लेप-चित्र तथा काष्ठ की पुतली आदि के संबंध में उपस्थित मामलों का संग्रह।'
    },
    131: {
      verse: 'सुन्दर सहित सु-पंच जन, पाँच श्मशान सु-अस्थि।\nनागी यक्षी प्रेतिनी, षंढ छुअन भई कत्थ॥',
      text: 'सुंदर भिक्षु के साथ पाँच प्रसंग तथा श्मशान में अस्थि-पंजर के पाँच मैथुन-प्रसंग।'
    },
    132: {
      verse: 'सुन्दर सहित सु-पंच जन, पाँच श्मशान सु-अस्थि।\nनागी यक्षी प्रेतिनी, षंढ छुअन भई कत्थ॥',
      text: 'नागी, यक्षी, प्रेतिनी और नपुंसक के स्पर्श व मैथुन के प्रसंगों का संग्रह।'
    },
    133: {
      verse: 'भद्रिक सोवत अर्हत जन, श्रावस्ती चतु आन।\nवैशाली त्रय मालिनि, स्वप्न भरुकच्छक जान॥',
      text: 'भद्रिक में सोते हुए अर्हत् का प्रसंग तथा श्रावस्ती के चार अन्य प्रसंग।'
    },
    134: {
      verse: 'भद्रिक सोवत अर्हत जन, श्रावस्ती चतु आन।\nवैशाली त्रय मालिनि, स्वप्न भरुकच्छक जान॥',
      text: 'वैशाली के तीन मालाकार प्रसंग तथा भरुकच्छ के स्वप्नावस्था के प्रसंगों का संग्रह।'
    },
    135: {
      verse: 'सुपर्वा श्रद्धा भिक्षुणी, शिक्षमाणा श्रमणेरी संग।\nवेश्या षंढ गृहस्थ अरु, परस्पर वृद्ध विहंग॥',
      text: 'सुपर्वा, श्रद्धावान् भिक्षुणी, शिक्षमाणा तथा श्रमणेरी के प्रसंगों का संग्रह।'
    },
    136: {
      verse: 'सुपर्वा श्रद्धा भिक्षुणी, शिक्षमाणा श्रमणेरी संग।\nवेश्या षंढ गृहस्थ अरु, परस्पर वृद्ध विहंग॥',
      text: 'वेश्या, नपुंसक, गृहस्थ, परस्पर वृद्ध प्रव्रजित तथा मृग-पशु के प्रसंग आदि का संपूर्ण संग्रह।'
    }
  };

  for (const l of lines) {
    const r = JSON.parse(l);
    if (dohas[r.para]) {
      r.verse = dohas[r.para].verse;
      r.text = dohas[r.para].text;
    }
    outLines.push(JSON.stringify(r));
  }
  fs.writeFileSync(file, outLines.join('\n') + '\n', 'utf8');
}

// 2. Fix s0101t.jsonl
export function fixS0101t() {
  const file = path.join(repo, 'data/translations/hi/s0101t.jsonl');
  const xmlItems = parseFile(path.resolve(repo, '.cache/tipitaka-xml/romn/s0101t.tik.xml'));
  const paras = xmlItems.filter(x => x.k === 'p');
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  const outLines: string[] = [];

  let curDoha = '';
  for (let i = 0; i < lines.length; i++) {
    const r = JSON.parse(lines[i]);
    const pIdx = r.para ?? r.para_idx ?? i;
    const xp = paras[pIdx];
    const isGatha = xp && xp.rend.startsWith('gatha');

    if (isGatha) {
      if (r.text.includes('दोहा:')) {
        const parts = r.text.split('दोहा:');
        const dohaAndRest = parts[1].trim();
        const dLines: string[] = [];
        const restLines: string[] = [];
        let inDoha = true;
        for (const line of dohaAndRest.split('\n')) {
          const tr = line.trim();
          if (inDoha && (tr.startsWith('(') || tr.startsWith('अर्थात्') || tr === '')) {
            inDoha = false;
          }
          if (inDoha) dLines.push(tr);
          else restLines.push(tr);
        }
        curDoha = dLines.join('\n');
        const cleanText = restLines.join(' ').replace(/^\s*\(\s*अर्थात्:\s*/, '').replace(/\s*\)\s*$/, '').trim() || parts[0].trim();
        r.verse = curDoha;
        r.text = cleanText || r.text;
      } else if (curDoha) {
        r.verse = curDoha;
      }
    } else {
      curDoha = '';
    }
    outLines.push(JSON.stringify(r));
  }
  fs.writeFileSync(file, outLines.join('\n') + '\n', 'utf8');
}

// 3. Fix s0502a.jsonl
export function fixS0502a() {
  const file = path.join(repo, 'data/translations/hi/s0502a.jsonl');
  const xmlItems = parseFile(path.resolve(repo, '.cache/tipitaka-xml/romn/s0502a.att.xml'));
  const paras = xmlItems.filter(x => x.k === 'p');
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  const outLines: string[] = [];

  let curDoha = '';
  for (let i = 0; i < lines.length; i++) {
    const r = JSON.parse(lines[i]);
    const pIdx = r.para ?? r.para_idx ?? i;
    const xp = paras[pIdx];
    const isGatha = xp && xp.rend.startsWith('gatha');

    if (pIdx === 170) {
      r.text = 'मैं भी आज परम प्रमुदित और प्रसन्न चित्त होकर आज ही भगवान बुद्ध की शरण ग्रहण करता हूँ।';
    }

    if (pIdx === 198) {
      // 198 is bodytext in xml but has the doha for gatha 199
      if (r.text.includes('॥')) {
        const m = r.text.match(/^([\s\S]*?॥)\s*([\s\S]*)$/);
        if (m) {
          curDoha = m[1].trim();
          const prose = m[2].trim().replace(/^\s*\(/, '').replace(/\)\s*$/, '').trim();
          r.verse = curDoha;
          r.text = prose || r.text;
        }
      }
    }

    if (isGatha) {
      if (r.text.includes('॥')) {
        const m = r.text.match(/^([\s\S]*?॥)\s*([\s\S]*)$/);
        if (m) {
          curDoha = m[1].trim();
          const prose = m[2].trim().replace(/^\s*\(/, '').replace(/\)\s*$/, '').trim();
          r.verse = curDoha;
          r.text = prose || r.text;
        }
      } else if (curDoha) {
        r.verse = curDoha;
      }
    } else if (pIdx !== 198) {
      curDoha = '';
    }
    outLines.push(JSON.stringify(r));
  }
  fs.writeFileSync(file, outLines.join('\n') + '\n', 'utf8');
}

// 4. Fix s0101a.jsonl
export function fixS0101a() {
  const file = path.join(repo, 'data/translations/hi/s0101a.jsonl');
  const xmlItems = parseFile(path.resolve(repo, '.cache/tipitaka-xml/romn/s0101a.att.xml'));
  const paras = xmlItems.filter(x => x.k === 'p');
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  const outLines: string[] = [];

  let curDoha = '';
  for (let i = 0; i < lines.length; i++) {
    const r = JSON.parse(lines[i]);
    const pIdx = r.para ?? r.para_idx ?? i;
    const xp = paras[pIdx];
    const isGatha = xp && xp.rend.startsWith('gatha');

    if (isGatha) {
      const explicitProse: Record<number, string> = {
        122: 'विविध और विशेष नयों (विधियों) से युक्त होने के कारण तथा काया और वाणी के संयम व अनुशासन (विनय) कराने के कारण, विनय-तत्त्व के ज्ञाताओं द्वारा इसे \'विनय\' कहा गया है।',
        128: 'समस्त परमार्थ-अर्थों का सूचन करने, सुभाषित होने, स्रवण करने (रस बहाने), रक्षा करने और माला के धागे की भाँति अर्थों को परस्पर पिरोए रखने के कारण इसे \'सूत्र\' कहा गया है।',
        135: 'वृद्धि, स्वलक्षण, पूजित, सुपरिच्छिन्न तथा विशिष्ट व अतिशय धर्मों का विशद विश्लेषण होने के कारण इसे \'अभिधम्म\' (उच्चतर धर्म) कहा जाता है।',
        156: 'देशना-भेद (आणा, वोहार, परमत्थ), शासन-भेद, कथा-भेद, शिक्षा-भेद तथा क्लेश-प्रहाण के भेद के अनुसार त्रिपिटक के तीन भागों का विभाजन सुस्पष्ट किया गया है।',
        159: 'परियत्ति (अध्ययन), पटिपत्ति (साधना) और पटिवेध (अनुभूति) की संपदा और विपदा के भेद को जानकर साधक जिस प्रकार निर्वाण-फल को प्राप्त करता है, उसका विशद वर्णन यहाँ किया गया है।',
        168: 'साधना और आचरण की सिद्धि से भिक्षु तीनों पिटकों के गंभीर ज्ञान को प्रत्यक्ष अनुभव में उतारकर परम विशुद्धि को प्राप्त होता है।'
      };

      if (explicitProse[pIdx]) {
        r.text = explicitProse[pIdx];
      } else if (r.text.includes('दोहा:')) {
        const parts = r.text.split('दोहा:');
        const dohaAndRest = parts[1].trim();
        const dLines: string[] = [];
        const restLines: string[] = [];
        let inDoha = true;
        for (const line of dohaAndRest.split('\n')) {
          const tr = line.trim();
          if (inDoha && (tr.startsWith('(') || tr.startsWith('अर्थात्') || tr === '')) {
            inDoha = false;
          }
          if (inDoha) dLines.push(tr);
          else restLines.push(tr);
        }
        curDoha = dLines.join('\n');
        const cleanText = restLines.join(' ').replace(/^\s*\(\s*अर्थात्:\s*/, '').replace(/\s*\)\s*$/, '').trim() || parts[0].trim();
        r.verse = curDoha;
        r.text = cleanText || r.text;
      } else if (r.text.includes('॥')) {
        const m = r.text.match(/^([\s\S]*?॥)\s*([\s\S]*)$/);
        if (m) {
          curDoha = m[1].trim();
          const prose = m[2].trim().replace(/^\s*\(/, '').replace(/\)\s*$/, '').trim();
          r.verse = curDoha;
          r.text = prose || r.text;
        }
      } else {
        if (pIdx === 217 || pIdx === 218) {
          curDoha = 'श्रद्धा हीन विनाश कर, धर्म-सदा उर लाय।\n\'ऐसा मैंने सुना\' कह, गौतम-शिष्य कहाय॥';
        } else if (pIdx === 220 || pIdx === 221) {
          curDoha = 'समवाय क्षण काल अरु, समूह हेतु लखि दृष्टि।\nलाभ प्रहाण प्रतिवेध में, \'समय\' शब्द की वृष्टि॥';
        }
        if (curDoha) {
          r.verse = curDoha;
        }
      }
    } else {
      curDoha = '';
    }
    outLines.push(JSON.stringify(r));
  }
  fs.writeFileSync(file, outLines.join('\n') + '\n', 'utf8');
}

// 5. Fix dhammapada.jsonl
export function fixDhammapada() {
  const file = path.join(repo, 'data/translations/hi/dhammapada.jsonl');
  const xmlItems = parseFile(path.resolve(repo, '.cache/tipitaka-xml/romn/s0502m.mul.xml'));
  const paras = xmlItems.filter(x => x.k === 'p');
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  const outLines: string[] = [];

  const uddanaDohas: Record<number, string> = {
    944: 'चार सौ तेईस गाथा, चार आर्य-सत्य बखान।\nतीन सौ पाँच कथा युत, धम्मपद मंगल खान॥',
    945: 'चार सौ तेईस गाथा, चार आर्य-सत्य बखान।\nतीन सौ पाँच कथा युत, धम्मपद मंगल खान॥',
    948: 'यमक अप्रमाद चित्त पुष्प, बाल पंडित वर्ग उदार।\nअर्हन्त सहस्र पाप दण्ड, दश वर्ग ये प्रथम सार॥',
    949: 'यमक अप्रमाद चित्त पुष्प, बाल पंडित वर्ग उदार।\nअर्हन्त सहस्र पाप दण्ड, दश वर्ग ये प्रथम सार॥',
    950: 'जरा आत्म लोक बुद्ध सुख, प्रिय क्रोध अरु मल जान।\nधर्मस्थ मार्ग वर्ग युत, बीस वर्ग ये प्रधान॥',
    951: 'जरा आत्म लोक बुद्ध सुख, प्रिय क्रोध अरु मल जान।\nधर्मस्थ मार्ग वर्ग युत, बीस वर्ग ये प्रधान॥',
    952: 'प्रकीर्णक निरय नाग तृष्णा, भिक्षु अरु ब्राह्मण धार।\nछब्बीस वर्ग उपदेशे, बुद्ध सूर्य-बन्धु उदार॥',
    953: 'प्रकीर्णक निरय नाग तृष्णा, भिक्षु अरु ब्राह्मण धार।\nछब्बीस वर्ग उपदेशे, बुद्ध सूर्य-बन्धु उदार॥',
    955: 'बीस गाथा यमक में, अप्रमाद में बारह मान।\nग्यारह चित्त वर्ग में, पुष्प में सोलह जान॥',
    956: 'बीस गाथा यमक में, अप्रमाद में बारह मान।\nग्यारह चित्त वर्ग में, पुष्प में सोलह जान॥',
    957: 'सोलह गाथा बाल में, चौदह पंडित वर्ग।\nदश अर्हन्त वर्ग में, सहस्र में सोलह सर्ग॥',
    958: 'सोलह गाथा बाल में, चौदह पंडित वर्ग।\nदश अर्हन्त वर्ग में, सहस्र में सोलह सर्ग॥',
    959: 'तेरह गाथा पाप में, सत्रह दण्ड मंझार।\nग्यारह जरा वर्ग में, दश आत्म-वर्ग विचार॥',
    960: 'तेरह गाथा पाप में, सत्रह दण्ड मंझार।\nग्यारह जरा वर्ग में, दश आत्म-वर्ग विचार॥',
    961: 'बारह गाथा लोक में, बुद्ध अठारह धार।\nसुख में बारह गाथा, प्रिय बारह विस्तार॥',
    962: 'बारह गाथा लोक में, बुद्ध अठारह धार।\nसुख में बारह गाथा, प्रिय बारह विस्तार॥',
    963: 'चौदह गाथा क्रोध में, इक्कीस मल-वर्ग बखान।\nसत्रह धर्मस्थ में, सत्रह मार्ग प्रधान॥',
    964: 'चौदह गाथा क्रोध में, इक्कीस मल-वर्ग बखान।\nसत्रह धर्मस्थ में, सत्रह मार्ग प्रधान॥',
    965: 'सोलह प्रकीर्णक में, निरय-नाग चौदह जान।\nछब्बीस तृष्णा वर्ग में, तेईस भिक्षु बखान॥',
    966: 'सोलह प्रकीर्णक में, निरय-नाग चौदह जान।\nछब्बीस तृष्णा वर्ग में, तेईस भिक्षु बखान॥',
    967: 'इकतालीस ब्राह्मण वर्ग, उत्तम वर्ग महान।\nचार सौ तेईस गाथा, बुद्ध कथित कल्याण॥',
    968: 'इकतालीस ब्राह्मण वर्ग, उत्तम वर्ग महान।\nचार सौ तेईस गाथा, बुद्ध कथित कल्याण॥',
    969: 'इकतालीस ब्राह्मण वर्ग, उत्तम वर्ग महान।\nचार सौ तेईस गाथा, बुद्ध कथित कल्याण॥'
  };

  let curDoha = '';
  for (let i = 0; i < lines.length; i++) {
    const r = JSON.parse(lines[i]);
    const pIdx = r.para ?? r.para_idx ?? i;
    const xp = paras[pIdx];
    const isGatha = xp && xp.rend.startsWith('gatha');

    if (isGatha) {
      if (uddanaDohas[pIdx]) {
        r.verse = uddanaDohas[pIdx];
      } else if (r.verse) {
        curDoha = r.verse;
      } else if (curDoha) {
        r.verse = curDoha;
      }
    } else {
      curDoha = '';
    }
    outLines.push(JSON.stringify(r));
  }
  fs.writeFileSync(file, outLines.join('\n') + '\n', 'utf8');
}

console.log('Applying fixes to seed files...');
fixVin01m();
fixS0101t();
fixS0502a();
fixS0101a();
fixDhammapada();
console.log('All seed files updated!');
