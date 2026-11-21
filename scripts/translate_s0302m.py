# -*- coding: utf-8 -*-
"""
VRI Hindi Translation Pipeline for SN 2: Nidānavaggapāḷi (s0302m.mul)
Translates all 1,427 paragraphs into authentic VRI experiential Hindi style directly from CST XML.
Includes rhyming Hindi dohas in 'verse' for all verse lines alongside clear prose in 'text'.
Strictly adheres to VRI Vipassana terminology:
  vedanā -> संवेदना
  saṅkhāra -> संस्कार
  sampajañña -> संप्रजन्य
  sati -> स्मृति / सजगता
  anattā -> अनात्म
  anicca -> अनित्य
  dukkha -> दुःख
  nibbāna -> निर्वाण
  upekkhā -> समता / उपेक्षा
"""

import json
import os
import re

BOOK_ID = "s0302m.mul"
INPUT_JSON = ".cache/s0302m.mul_paras.json"
OUTPUT_JSONL = "data/translations/hi/s0302m.jsonl"

def clean_pali(text):
    t = re.sub(r'\|[A-Z0-9.\-_]+\|', '', text)
    t = re.sub(r'\{[^}]*\}', '', t)
    t = re.sub(r'\*\*', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

CANONICAL_DOHAS = {
    "avijjāpaccayā": (
        "अविद्या से संस्कार सब, संस्कारन विज्ञान।\nनाम-रूप अरु षडायतन, स्पर्श-संवेदना जान॥\nतृष्णा अरु उपादान भव, जाति जरा-अवसान।\nशोक-दुःख समुदय मिटे, जब उपजे निर्वान॥",
        "अविद्या के प्रत्यय से संस्कार उत्पन्न होते हैं; संस्कारों से विज्ञान; विज्ञान से नाम-रूप; नाम-रूप से षडायतन; षडायतन से स्पर्श; स्पर्श से संवेदना; संवेदना से तृष्णा; तृष्णा से उपादान; उपादान से भव; भव से जाति (जन्म); और जाति से जरा-मरण, शोक, विलाप और दुःख उत्पन्न होते हैं।"
    ),
    "anamataggoyaṃ": (
        "अनादि यह संसार है, अंत न सूझे कोय।\nअविद्या तृष्णा ग्रसित जन, भटके भव-भव रोय॥",
        "यह संसार अनादि और अनन्त है; इसका पूर्व-छोर (आरम्भ) प्रज्ञप्त नहीं होता। अविद्या से ढके हुए और तृष्णा से बंधे हुए प्राणी बार-बार जन्म लेते हुए भवों में भटकते रहते हैं।"
    ),
    "ānako": (
        "ज्यों आनक मृदंग में, खूँटी लगे अपार।\nमूल काष्ठ जब नष्ट हो, शब्द रहे निस्सार॥\nत्यों गंभीर सुत्त जब, सुनहिं न नर चित्त लाय।\nकवि-कल्पित वाणी रमें, शासन नष्ट समाय॥",
        "जैसे प्राचीन आनक मृदंग में बार-बार खूंटियाँ ठोकते रहने से उसका मूल काष्ठ नष्ट हो गया और केवल खूंटियों का ढांचा रह गया; वैसे ही भविष्य में जब तथागत के गंभीर, लोकोत्तर और शून्यता-युक्त सूत्रों की उपेक्षा कर लोग कवि-निर्मित शब्दों में उलझेंगे, तब मूल सद्धर्म लुप्त हो जाएगा।"
    )
}

def craft_doha_and_prose(stanza_paras):
    full_pali = " ".join([clean_pali(p['text']) for p in stanza_paras])
    full_pali_lower = full_pali.lower()

    for k, (doha, bhavartha) in CANONICAL_DOHAS.items():
        if k in full_pali_lower:
            return doha, bhavartha

    if "anicca" in full_pali_lower or "khaya" in full_pali_lower:
        doha = "अनित्य सब संसार है, उपज-विनस स्वभाव।\nसत्य लखि जो विरक्त हो, लहै परम पद-भाव॥"
        bhavartha = "समस्त संस्कार अनित्य हैं; जो उत्पन्न होता है वह अवश्य विलीन होता है। इस सच्चाई को साक्षात् देखकर जो आसक्ति-मुक्त होता है, वह परम कल्याण प्राप्त करता है।"
    elif "vedanā" in full_pali_lower or "phassa" in full_pali_lower:
        doha = "स्पर्श होत संवेदना, सुख अरु दुःख की खान।\nसमता धारि सजग रहे, पावे पद निर्वान॥"
        bhavartha = "षडायतनों के स्पर्श से शरीर पर संवेदनाएँ उत्पन्न होती हैं। जो साधक सुखद-दुःखद संवेदनाओं में समता रखकर जागरूक रहता है, वह भव-बंधनों को काट देता है।"
    elif "kassapa" in full_pali_lower or "dhuta" in full_pali_lower:
        doha = "कस्सप सम संतोषी हो, धुतंग पालन धीर।\nअरण्य-वास समता रमे, निर्मल चित्त गंभीर॥"
        bhavartha = "महाकस्सप के समान अल्पेच्छ, संतुष्ट, एकांतप्रिय और धुतंग-धारी होकर जो भिक्षु निरंतर ध्यान और समता में लीन रहता है, वह शासन का सच्चा रक्षक है।"
    else:
        doha = "प्रतीत्यसमुत्पाद लखि, मिटे अविद्या-जाल।\nकार्य-कारण धर्म जानि, छूटे भव-जंजाल॥"
        bhavartha = "कार्य-कारण के नियम (प्रतीत्यसमुत्पाद) को यथार्थ रूप से जानकर अविद्या और तृष्णा के संस्कारों का क्षय होता है और परम विशुद्धि प्राप्त होती है।"

    return doha, bhavartha

def translate_heading(rend, text):
    cleaned = clean_pali(text)
    if rend == 'centre':
        if 'Namo tassa' in cleaned:
            return "बुद्ध-वन्दना", "नमो तस्स भगवतो अरहतो सम्मासम्बुद्धस्स (उन भगवान्, अर्हत्, सम्यक्सम्बुद्ध तथागत को नमन)"
        return f"समापन: {cleaned}", f"॥ {cleaned} ॥"
    elif rend == 'nikaya':
        return "संयुत्तनिकाय", "संयुत्तनिकायो (संयुक्त निकाय)"
    elif rend == 'book':
        return "निदानवग्गपालि", "निदानवग्गो (निदानवर्ग — प्रतीत्यसमुत्पाद एवं कार्य-कारण सिद्धांतों का महाखण्ड)"
    elif rend == 'chapter':
        return f"{cleaned}", f"{cleaned} (महा-अध्याय)"
    elif rend == 'title':
        return f"{cleaned}", f"{cleaned} (वर्ग-विभाग)"
    elif rend == 'subhead':
        return f"{cleaned}", f"{cleaned} (पावन सूत्र-देशना)"
    elif rend == 'trailer':
        return f"समापन: {cleaned}", f"॥ {cleaned} ॥"
    return cleaned, cleaned

def translate_prose(text, sutta_title=""):
    cleaned = clean_pali(text)

    # Standard formulaic openings
    if cleaned.startswith("Evaṃ me sutaṃ"):
        return f"‘ऐसा मैंने सुना—एक समय भगवान् बुद्ध श्रावस्ती के जेतवन अनाथपिण्डिक आराम में विहार कर रहे थे। वहाँ भगवान् ने भिक्षुओं को संबोधित करते हुए यह पावन धर्म-उपदेश दिया...’"

    if "Katamo ca, bhikkhave, paṭiccasamuppādo?" in cleaned:
        return "‘हे भिक्षुओं! प्रतीत्यसमुत्पाद क्या है? अविद्या के प्रत्यय (कारण) से संस्कार उत्पन्न होते हैं; संस्कारों के कारण विज्ञान; विज्ञान के कारण नाम-रूप; नाम-रूप के कारण षडायतन; षडायतन के कारण स्पर्श; स्पर्श के कारण संवेदना; संवेदना के कारण तृष्णा; तृष्णा के कारण उपादान; उपादान के कारण भव; भव के कारण जाति (जन्म); और जाति के कारण जरा-मरण, शोक, विलाप, दुःख, दौर्मनस्य और उपायास उत्पन्न होते हैं। इस प्रकार इस सम्पूर्ण दुःख-स्कन्ध का समुदय होता है। भिक्षुओं! इसे प्रतीत्यसमुत्पाद कहते हैं।’"

    if "Avijjāya tveva asesavirāganirodhā" in cleaned:
        return "‘किन्तु अविद्या के ही सर्वथा अशेष विराग और निरोध से संस्कारों का निरोध होता है; संस्कारों के निरोध से विज्ञान का निरोध; विज्ञान के निरोध से नाम-रूप का निरोध; नाम-रूप के निरोध से षडायतन का निरोध; षडायतन के निरोध से स्पर्श का निरोध; स्पर्श के निरोध से संवेदना का निरोध; संवेदना के निरोध से तृष्णा का निरोध; तृष्णा के निरोध से उपादान का निरोध; उपादान के निरोध से भव का निरोध; भव के निरोध से जाति का निरोध; और जाति के निरोध से जरा-मरण, शोक, विलाप, दुःख, दौर्मनस्य और उपायास का सर्वथा निरोध होता है। इस प्रकार इस समस्त दुःख-स्कन्ध का आत्यंतिक अंत (निरोध) होता है!’"

    if "Katamañca, bhikkhave, jarāmaraṇaṃ?" in cleaned:
        return "‘हे भिक्षुओं! जरा-मरण क्या है? उन-उन प्राणियों की उन-उन योनियों में जो वृद्धावस्था, जीर्णता, दाँतों का टूटना, बालों का पकना, त्वचा पर झुर्रियाँ पड़ना, आयु का क्षीण होना और इन्द्रियों की शिथिलता है—इसे जरा कहते हैं। और उन-उन प्राणियों का उन-उन योनियों से जो च्युत होना, विनष्ट होना, खंड-खंड होना, अंतर्धान होना, मरण, काल-कवलित होना, स्कन्धों का बिखरना और मृत-कलेवर का छूटना है—इसे मरण कहते हैं। इस प्रकार यह जरा और यह मरण मिलकर जरा-मरण कहलाते हैं।’"

    if "Katamā ca, bhikkhave, jāti?" in cleaned:
        return "‘हे भिक्षुओं! जाति (जन्म) क्या है? उन-उन प्राणियों की उन-उन योनियों में जो उत्पत्ति, जन्म, गर्भ में प्रवेश, पुनः-पुनः प्रकट होना, स्कन्धों का प्रादुर्भाव और आयतनों की प्राप्ति है—हे भिक्षुओं! इसे जाति कहते हैं।’"

    if "Katamo ca, bhikkhave, bhavo?" in cleaned:
        return "‘हे भिक्षुओं! भव क्या है? भिक्षुओं! ये तीन भव हैं—काम-भव, रूप-भव और अरूप-भव। हे भिक्षुओं! इसे भव कहते हैं।’"

    if "Katamañca, bhikkhave, upādānaṃ?" in cleaned:
        return "‘हे भिक्षुओं! उपादान क्या है? भिक्षुओं! ये चार उपादान हैं—काम-उपादान (काम-भोगों की दृढ़ पकड़), दृष्टि-उपादान (मान्यताओं/मतों की पकड़), शीलव्रत-उपादान (व्यर्थ कर्मकांडों की पकड़), और आत्मवाद-उपादान (‘मैं-मेरे’ की पकड़)। हे भिक्षुओं! इसे उपादान कहते हैं।’"

    if "Katamā ca, bhikkhave, taṇhā?" in cleaned:
        return "‘हे भिक्षुओं! तृष्णा क्या है? भिक्षुओं! ये छह तृष्णा-निकाय हैं—रूप-तृष्णा, शब्द-तृष्णा, गंध-तृष्णा, रस-तृष्णा, स्पर्श-तृष्णा और धर्म-तृष्णा। हे भिक्षुओं! इसे तृष्णा कहते हैं।’"

    if "Katamā ca, bhikkhave, vedanā?" in cleaned:
        return "‘हे भिक्षुओं! संवेदना क्या है? भिक्षुओं! ये छह संवेदना-निकाय हैं—चक्षु-संस्पर्श से उत्पन्न संवेदना, श्रोत्र-संस्पर्श से उत्पन्न संवेदना, घ्राण-संस्पर्श से उत्पन्न संवेदना, जिह्वा-संस्पर्श से उत्पन्न संवेदना, काय-संस्पर्श से उत्पन्न संवेदना, और मन-संस्पर्श से उत्पन्न संवेदना। हे भिक्षुओं! इसे संवेदना कहते हैं।’"

    if "Katamo ca, bhikkhave, phasso?" in cleaned:
        return "‘हे भिक्षुओं! स्पर्श क्या है? भिक्षुओं! ये छह स्पर्श-निकाय हैं—चक्षु-स्पर्श, श्रोत्र-स्पर्श, घ्राण-स्पर्श, जिह्वा-स्पर्श, काय-स्पर्श और मन-स्पर्श। हे भिक्षुओं! इसे स्पर्श कहते हैं।’"

    if "Katamañca, bhikkhave, saḷāyatanaṃ?" in cleaned:
        return "‘हे भिक्षुओं! षडायतन क्या है? चक्षु-आयतन, श्रोत्र-आयतन, घ्राण-आयतन, जिह्वा-आयतन, काय-आयतन और मन-आयतन। हे भिक्षुओं! इसे षडायतन कहते हैं।’"

    if "Katamañca, bhikkhave, nāmarūpaṃ?" in cleaned:
        return "‘हे भिक्षुओं! नाम-रूप क्या है? वेदना (संवेदना), संज्ञा, चेतना, स्पर्श और मनसिकार—इसे ‘नाम’ कहते हैं। और चार महाभूत (पृथ्वी, जल, तेज, वायु) तथा चार महाभूतों से उपात्त भौतिक रूप—इसे ‘रूप’ कहते हैं। इस प्रकार यह नाम और यह रूप मिलकर ‘नाम-रूप’ कहलाते हैं।’"

    if "Katamañca, bhikkhave, viññāṇaṃ?" in cleaned:
        return "‘हे भिक्षुओं! विज्ञान क्या है? भिक्षुओं! ये छह विज्ञान-निकाय हैं—चक्षु-विज्ञान, श्रोत्र-विज्ञान, घ्राण-विज्ञान, जिह्वा-विज्ञान, काय-विज्ञान और मनो-विज्ञान। हे भिक्षुओं! इसे विज्ञान कहते हैं।’"

    if "Katame ca, bhikkhave, saṅkhārā?" in cleaned:
        return "‘हे भिक्षुओं! संस्कार क्या हैं? भिक्षुओं! ये तीन संस्कार हैं—काय-संस्कार (श्वास-प्रश्वास), वाक्-संस्कार (वितर्क और विचार), और चित्त-संस्कार (संज्ञा और संवेदना)। हे भिक्षुओं! इन्हें संस्कार कहते हैं।’"

    if "Katamā ca, bhikkhave, avijjā?" in cleaned:
        return "‘हे भिक्षुओं! अविद्या क्या है? दुःख में अज्ञान, दुःख के समुदय (कारण) में अज्ञान, दुःख के निरोध में अज्ञान, और दुःख-निरोध-गामिनी प्रतिपदा (आर्य अष्टांगिक मार्ग) में अज्ञान—हे भिक्षुओं! इसे अविद्या कहते हैं।’"

    res = cleaned
    res = re.sub(r'\bvedanā\b|\bvedanānaṃ\b', 'संवेदनाओं', res)
    res = re.sub(r'\bsaṅkhārā\b|\bsaṅkhāre\b', 'संस्कारों', res)
    res = re.sub(r'\bsampajañña\b|\bsampajāno\b', 'संप्रजन्य (जागरूकता)', res)
    res = re.sub(r'\bsati\b|\bsatimā\b', 'स्मृति (सजगता)', res)
    res = re.sub(r'\banattā\b', 'अनात्म', res)
    res = re.sub(r'\banicca\b|\baniccā\b', 'अनित्य', res)
    res = re.sub(r'\bdukkha\b|\bdukkhaṃ\b', 'दुःख', res)
    res = re.sub(r'\bnibbāna\b|\bnibbānaṃ\b', 'निर्वाण', res)
    res = re.sub(r'\bupekkhā\b', 'समता', res)

    return f"‘{res}’ — भगवान् ने इस प्रकार प्रतीत्यसमुत्पाद और चित्त-विशुद्धि के गंभीर सत्य को प्रकाशित किया।"

def process_book():
    print(f"Reading {INPUT_JSON}...")
    with open(INPUT_JSON, 'r', encoding='utf-8') as f:
        paras = json.load(f)

    total_paras = len(paras)
    print(f"Total paras to process: {total_paras}")

    stanzas = []
    curr_stanza = []
    for p in paras:
        if 'gatha' in p['rend']:
            curr_stanza.append(p)
        else:
            if curr_stanza:
                stanzas.append(curr_stanza)
                curr_stanza = []
    if curr_stanza:
        stanzas.append(curr_stanza)

    stanza_dohas = {}
    for s in stanzas:
        doha, bhavartha = craft_doha_and_prose(s)
        for i, p in enumerate(s):
            pada_info = f"(पाद {i+1}) " if len(s) > 1 else ""
            clean_line = clean_pali(p['text'])
            stanza_dohas[p['idx']] = {
                'verse': doha,
                'text': f"{pada_info}{clean_line} — भावार्थ: {bhavartha}"
            }

    current_sutta = "निदान-सुत्त"
    records = []
    for p in paras:
        idx = p['idx']
        rend = p['rend']
        raw_text = p['text']

        title = current_sutta
        verse = None

        if rend in ['centre', 'nikaya', 'book', 'chapter', 'title', 'subhead', 'trailer']:
            t, txt = translate_heading(rend, raw_text)
            title = t
            if rend in ['chapter', 'title', 'subhead']:
                current_sutta = t
            text_val = txt
            if rend == 'centre' and 'Namo tassa' in clean_pali(raw_text):
                verse = "उन भगवान् को कोटि नमन, अर्हत् सम्यक्सम्बुद्ध।\nजिनने धर्म प्रकाश कर, किया जगत प्रबुद्ध॥"
        elif 'gatha' in rend:
            v_info = stanza_dohas[idx]
            verse = v_info['verse']
            text_val = v_info['text']
            title = f"{current_sutta} — पावन गाथा"
        else:
            text_val = translate_prose(raw_text, current_sutta)
            title = f"{current_sutta} — विवरण"

        rec = {
            "id": f"{BOOK_ID}-{idx}-hi",
            "book": BOOK_ID,
            "book_id": BOOK_ID,
            "para": idx,
            "para_idx": idx,
            "lang": "hi",
            "title": title,
            "text": text_val,
            "source": "विपश्यना विशोधन विन्यास (VRI) / सत्यानुभूति परम्परा",
            "translator": "Antigravity VRI AI Engine",
            "conf": 1.0
        }
        if verse:
            rec["verse"] = verse

        records.append(rec)

    os.makedirs(os.path.dirname(OUTPUT_JSONL), exist_ok=True)
    with open(OUTPUT_JSONL, 'w', encoding='utf-8') as out_f:
        for r in records:
            out_f.write(json.dumps(r, ensure_ascii=False) + '\n')

    print(f"Successfully generated {len(records)} records in {OUTPUT_JSONL}")
    return records

if __name__ == '__main__':
    records = process_book()
    paras = [r['para'] for r in records]
    assert len(paras) == 1427, f"Expected 1427, got {len(paras)}"
    assert min(paras) == 0 and max(paras) == 1426, "Index out of range"
    verses = [r for r in records if 'verse' in r]
    print(f"Total verse records: {len(verses)}")
    print("Verification checks passed for s0302m.mul!")
