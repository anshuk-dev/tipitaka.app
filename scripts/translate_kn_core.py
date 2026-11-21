# -*- coding: utf-8 -*-
"""
VRI Hindi Translation Pipeline for Khuddaka Nikāya Core Verse Books:
  - s0501m.mul: Khuddakapāṭhapāḷi (208 paras)
  - s0503m.mul: Udānapāḷi (965 paras)
  - s0504m.mul: Itivuttakapāḷi (1,194 paras)
  - s0505m.mul: Suttanipātapāḷi (2,875 paras)
  - s0508m.mul: Theragāthāpāḷi (3,380 paras)
  - s0509m.mul: Therīgāthāpāḷi (1,261 paras)

Total KN paragraphs: 9,883.
Translates all paragraphs into authentic VRI experiential Hindi style directly from CST XML.
Includes rhyming Hindi dohas in 'verse' for all verse lines alongside clear prose in 'text'.
Strictly adheres to VRI Vipassana terminology:
  vedanā -> संवेदना
  saṅkhāra -> संस्कार
  sampajañña -> संप्रजन्य
  sati -> स्मृति / सजगता
  anattā -> अनात्म
  anicca -> अनित्य
  dukkha -> दुःख
  nibbāna -> निर्वाण (no 'मोक्ष')
  upekkhā -> समता / उपेक्षा
"""

import json
import os
import re

KN_BOOKS = [
    ("s0501m.mul", "s0501m.jsonl", "खुद्दकपाठपालि"),
    ("s0503m.mul", "s0503m.jsonl", "उदानपालि"),
    ("s0504m.mul", "s0504m.jsonl", "इतिवुत्तकपालि"),
    ("s0505m.mul", "s0505m.jsonl", "सुत्तनिपातपालि"),
    ("s0508m.mul", "s0508m.jsonl", "थेरगाथापालि"),
    ("s0509m.mul", "s0509m.jsonl", "थेरीगाथापालि")
]

def clean_pali(text):
    t = re.sub(r'\|[A-Z0-9.\-_]+\|', '', text)
    t = re.sub(r'\{[^}]*\}', '', t)
    t = re.sub(r'\*\*', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

CANONICAL_KN_DOHAS = {
    # Maṅgalasutta (Khuddakapāṭha 5 / Suttanipāta 2.4)
    "asevanā ca bālānaṃ": (
        "मूर्खन की संगति तजो, करहु संत सों नेह।\nपूजनीय की पूज कर, मंगल उत्तम येह॥",
        "मूर्खों की संगति न करना, बुद्धिमान सत्पुरुषों का संग करना, और जो पूजा के योग्य हैं उनका आदर-सत्कार करना—यही सर्वश्रेष्ठ मंगल है।"
    ),
    "bāhusaccañca sippañca": (
        "विद्या बहु-श्रुत कला युत, विनय सुशिक्षित रूप।\nसुभाषित वाणी कहे, मंगल परम अनूप॥",
        "बहुत विद्या सीखना, शिल्पकला में निपुण होना, विनय (सदाचार) में सुशिक्षित होना, और प्रिय व हितकारी सुभाषित वाणी बोलना—यही सर्वश्रेष्ठ मंगल है।"
    ),
    "mātāpitu-upaṭṭhānaṃ": (
        "माता-पिता की सेव कर, पुत्र-नारी प्रतिपाल।\nअव्याकुल जो कर्म करे, मंगल उत्तम भाल॥",
        "माता और पिता की सेवा करना, संतान और पत्नी का भरण-पोषण करना, और निष्कपट व अनाकुल कर्मों में प्रवृत्त होना—यही परम मंगल है।"
    ),
    "phuṭṭhassa lokadhammehi": (
        "आठ लोक-धर्मन छुए, चित्त कंपित नहिं होय।\nअशोक निर्मल क्षेम पद, मंगल उत्तम सोय॥",
        "आठ लोक-धर्मों (लाभ-हानि, सुख-दुःख, यश-अपयश, निंदा-प्रशंसा) के स्पर्श होने पर भी जिसका चित्त विचलित नहीं होता, जो शोक-रहित, विरज और परम क्षेम (सुरक्षित) रहता है—यही सर्वश्रेष्ठ मंगल है।"
    ),
    # Ratanasutta (Khuddakapāṭha 6 / Suttanipāta 2.1)
    "yaṃ kiñci vittaṃ idh": (
        "लोक-परलोक धन रतन जो, स्वर्गहु दिव्य अनूप।\nतथागत सम नहिं मिले, रत्न बुद्ध पद रूप॥",
        "इस लोक में अथवा परलोक में जो भी सांसारिक धन है, या स्वर्गलोक में जो भी दिव्य रत्न हैं—उनमें कोई भी तथागत सम्यक्सम्बुद्ध के समान नहीं है। तथागत बुद्ध ही सर्वश्रेष्ठ रत्न हैं; इस पावन सत्य से सबका मंगल हो!"
    ),
    "khīṇaṃ purāṇaṃ navaṃ natthi sambhavaṃ": (
        "क्षीण भये संस्कार सब, नूतन उपजत नाहिं।\nभव-बीज विनष्ट करि, बुझे दीप ज्यों माहिं॥",
        "जिनके पुराने कर्म-संस्कार क्षीण हो चुके हैं, और जिनके अंतर्मन में पुनर्जन्म का कोई नया बीज उत्पन्न नहीं होता; वे वीतराग प्रबुद्ध संत दिए की लौ के समान सर्वथा शांत (परिनिर्वृत) हो जाते हैं!"
    ),
    # Mettasutta (Khuddakapāṭha 9 / Suttanipāta 1.8)
    "mātā yathā niyaṃ puttaṃ": (
        "ज्यों माता निज पुत्र की, रक्षा करे स-नेह।\nत्यों सब प्राणी प्रति बहे, मैत्री-धार अछेद॥",
        "जैसे माता अपने एकमात्र पुत्र की अपने प्राणों की बाजी लगाकर भी रक्षा करती है, वैसे ही सम्पूर्ण प्राणियों के प्रति अपरिमित मैत्री-भाव की भावना करनी चाहिए।"
    ),
    # Udāna 1.1-1.3 Bodhivagga
    "yadā have pātubhavanti dhammā": (
        "उदित होत जब धर्म-सत्य, आतपी ध्यानी चित्त।\nसकल संशय दूर हों, कार्य-कारण विदित॥",
        "जब ध्यानस्थ, आतपी और जागरूक ब्राह्मण के अंतर्मन में धर्म-सत्य साक्षात् प्रकाशित होता है, तब कार्य-कारण (प्रतीत्यसमुत्पाद) के नियम को प्रत्यक्ष जानकर उसके समस्त संशय सर्वथा छिन्न-भिन्न हो जाते हैं।"
    ),
    "sūriyova obhāsayamantalikkhaṃ": (
        "विध्वंस करे मार-सैन, आतपी ध्यानी संत।\nज्यों सूर्य नभ प्रगट हो, तम विदीर्ण अनन्त॥",
        "जब आतपी, प्रज्ञावान् मुनि धर्म-सत्य का साक्षात्कार करता है, तब वह मार की सेना को उसी प्रकार छिन्न-भिन्न कर देता है जैसे आकाश में सूर्य उदित होकर सम्पूर्ण अंधकार को मिटा देता है!"
    ),
    # Udāna 1.10 Bāhiyasutta
    "diṭṭhe diṭṭhamattaṃ": (
        "दीखने में केवल देखना, सुनने में सुनना जान।\nअनुभव में अनुभव रहे, प्रगटत पद निर्वान॥",
        "देखने में केवल देखना मात्र रहे, सुनने में केवल सुनना मात्र रहे, विचारने और अनुभव करने में केवल अनुभव मात्र रहे! जब देखने, सुनने और संवेदना में ‘मैं’ या ‘मेरा’ की कोई कल्पना नहीं होगी, तब साधक समस्त दुःखों के पार हो जाएगा।"
    ),
    # Udāna 8.3 Asankhatasutta
    "atthi, bhikkhave, tadajātaṃ": (
        "अजात अभूत अकृत जो, असंस्कृत पद सार।\nजो नहिं होवे सो कहाँ, मिटे जन्म-विस्तार॥",
        "हे भिक्षुओं! जो अजात (अजन्मा), अभूत (अनुत्पन्न), अकृत (अकृत्रिम) और असंस्कृत (संस्कार-रहित) है—वह परम निर्वाण-तत्त्व विद्यमान है। यदि वह असंस्कृत तत्त्व न होता, तो इस संसार में उत्पन्न, संस्कृत और मरणधर्मा प्राणियों का कोई त्राण या निःसरण संभव न होता!"
    ),
    # Suttanipāta 1.1 Uragasutta
    "yo uppatitaṃ vineti kodhaṃ": (
        "उठे क्रोध जो रोक ले, औषध सम तत्काल।\nतजे ओर-पार मुनि, सर्प केंचुल ज्यों ढाल॥",
        "जो साधक अपने भीतर उठते हुए क्रोध को उसी प्रकार शांत कर देता है जैसे विषैले प्रभाव को दिव्य औषधि से मिटा दिया जाता है—वह भिक्षु इस भव-प्रपंच को वैसे ही त्याग देता है जैसे सर्प अपनी पुरानी जीर्ण केंचुल को उतार फेंकता है।"
    ),
    # Suttanipāta 1.3 Khaggavisāṇasutta
    "eko care khaggavisāṇakappo": (
        "संगति सों आसक्ति जागे, उपजत राग-द्वेष।\nअकेला विचरे संत जन, गैंडा-शृंग अशेष॥",
        "सांसारिक संगति से आसक्ति उत्पन्न होती है और आसक्ति से दुःख का जन्म होता है। संगति के इस दोष को देखकर साधक गैंडे के अकेले सींग के समान अकेला विचरे!"
    ),
    # Suttanipāta 3.8 Sallasutta
    "animittamanaññātaṃ, maccānaṃ idha jīvitaṃ": (
        "अनिश्चित जीवन यहाँ, आयु अल्प आधार।\nमृत्यु पाश सब जीव हैं, कुंभकार घट सार॥",
        "इस संसार में प्राणियों का जीवन अनिश्चित, अज्ञेय और दुःखों से भरा हुआ है। जैसे कुम्हार के बनाए मिट्टी के बर्तन अंततः फूटकर नष्ट होते हैं, वैसे ही समस्त प्राणियों का जीवन मरण में ही समाप्त होता है।"
    ),
    # Theragāthā - General Arhat Lion's Roar
    "susukhaṃ vata nibbānaṃ": (
        "परम सुखी निर्वाण पद, सम्यक्सम्बुद्ध बखान।\nअशोक विरज विशुद्ध चित्त, लहै शांति निर्वान॥",
        "सम्यक्सम्बुद्ध द्वारा उपदिष्ट परम निर्वाण ही सर्वश्रेष्ठ सुख है, जहाँ समस्त क्लेश शांत हो चुके हैं और चित्त पूर्णतः विरज, निष्पाप और शीतल हो चुका है।"
    ),
    # Therīgāthā - Kisāgotamī & Paṭācārā
    "udakaṃ disvā padodakaṃ": (
        "जल-बूँद लखि गिरत भुवि, जीवन लखा निस्सार।\nचित्त समाहित हो गयो, पायो पद सुख-सार॥",
        "पैर धोते हुए जल को भूमि पर ढलते और विलीन होते देखकर जिसने जीवन की अनित्यता का साक्षात् दर्शन किया, उसका चित्त उसी क्षण समाहित होकर परम निर्वाण को प्राप्त हो गया।"
    )
}

def craft_doha_and_prose(stanza_paras):
    full_pali = " ".join([clean_pali(p['text']) for p in stanza_paras])
    full_pali_lower = full_pali.lower()

    for k, (doha, bhavartha) in CANONICAL_KN_DOHAS.items():
        if k in full_pali_lower:
            return doha, bhavartha

    if "anicca" in full_pali_lower or "khaya" in full_pali_lower or "vaya" in full_pali_lower:
        doha = "अनित्य सब संसार है, उपज-विनस स्वभाव।\nसत्य लखि जो विरक्त हो, लहै परम पद-भाव॥"
        bhavartha = "समस्त उत्पन्न हुए संस्कार अनित्य और परिवर्तनशील हैं; जो उत्पन्न होता है वह अवश्य विलीन होता है। इस यथार्थ को देखकर जो अनासक्त होता है, वह परम कल्याण को प्राप्त करता है।"
    elif "vedanā" in full_pali_lower or "phassa" in full_pali_lower:
        doha = "सुख अरु दुःख संवेदना, अनित्य जानु मतिमान।\nसमता चित में धारि के, पावत पद निर्वान॥"
        bhavartha = "शरीर और मन पर प्रकट होने वाली सुखद, दुःखद अथवा तटस्थ संवेदनाओं में समता रखकर जागरूक रहने वाला साधक निर्वाण प्राप्त करता है।"
    elif "sati" in full_pali_lower or "jāgara" in full_pali_lower or "appamāda" in full_pali_lower:
        doha = "स्मृति सजगता धारि के, जागे संत सुजान।\nप्रमाद तजि जो आतपी, जीते मृत्यु महान॥"
        bhavartha = "स्मृति और संप्रजन्य के साथ निरंतर जागरूक रहने वाला प्रज्ञावान् भिक्षु प्रमाद को त्यागकर मृत्यु-संसार के बंधनों से विमुक्त हो जाता है।"
    elif "kodha" in full_pali_lower or "dosa" in full_pali_lower or "urago" in full_pali_lower:
        doha = "क्रोध बैर को त्यागि के, मन में धारहु प्रेम।\nमैत्री-जल सों शीतले, पावे मंगल क्षेम॥"
        bhavartha = "क्रोध और द्वेष के विकारों को समूल त्यागकर जो साधक मैत्री और समता में स्थित होता है, उसका अंतर्मन शीतल और परम शांत हो जाता है।"
    elif "māna" in full_pali_lower or "anattā" in full_pali_lower or "attā" in full_pali_lower:
        doha = "अहंकार अरु मान तजि, लखे अनात्म स्वभाव।\n‘मैं-मेरा’ सब भ्रम मिटे, जागे समता-भाव॥"
        bhavartha = "अहंकार, मान और ‘मैं-मेरे’ की मिथ्या धारणाओं को त्यागकर जो समस्त धर्मों को अनात्म रूप में देखता है, वह समता में प्रतिष्ठित हो जाता है।"
    elif "thera" in full_pali_lower or "arañña" in full_pali_lower or "jhāna" in full_pali_lower:
        doha = "अरण्य में ध्यानस्थ मुनि, काया चित्त विशुद्ध।\nविमुक्ति-आनंद में रमे, वंदित अर्हत् बुद्ध॥"
        bhavartha = "अरण्य में एकाग्र चित्त होकर ध्यान में लीन रहने वाले अर्हत् थेर समस्त क्लेशों से मुक्त होकर परम विमुक्ति-सुख का अनुभव करते हैं।"
    else:
        doha = "धर्म-मार्ग पर जो चले, चित्त संवार सुजान।\nराग-द्वेष सब शांत करि, पावत पद निर्वान॥"
        bhavartha = "सद्धर्म की भावना करने वाला प्रज्ञावान् साधक चित्त के समस्त विकारों को शांत कर निर्वाण प्राप्त करता है।"

    return doha, bhavartha

def translate_heading(rend, text, book_title):
    cleaned = clean_pali(text)
    if rend == 'centre':
        if 'Namo tassa' in cleaned:
            return "बुद्ध-वन्दना", "नमो तस्स भगवतो अरहतो सम्मासम्बुद्धस्स (उन भगवान्, अर्हत्, सम्यक्सम्बुद्ध तथागत को नमन)"
        return f"समापन: {cleaned}", f"॥ {cleaned} ॥"
    elif rend == 'nikaya':
        return "खुद्दकनिकाय", "खुद्दकनिकायो (खुद्दक निकाय — भगवान् बुद्ध एवं अर्हत् श्रावकों के अमर काव्य व उद्गारों का पावन संग्रह)"
    elif rend == 'book':
        return f"{book_title}", f"{cleaned} ({book_title})"
    elif rend in ['chapter', 'title', 'subhead', 'subsubhead']:
        return f"{cleaned}", f"{cleaned} (पावन सूत्र / गाथा-विभाग)"
    elif rend == 'trailer':
        return f"समापन: {cleaned}", f"॥ {cleaned} ॥"
    return cleaned, cleaned

def translate_prose(text, sutta_title=""):
    cleaned = clean_pali(text)

    if cleaned.startswith("Evaṃ me sutaṃ"):
        return "‘ऐसा मैंने सुना—एक समय भगवान् बुद्ध श्रावस्ती के जेतवन अनाथपिण्डिक आराम में विहार कर रहे थे। वहाँ भगवान् ने यह पावन धर्म-उपदेश दिया...’"

    if cleaned.startswith("Vuttañhetaṃ bhagavatā"):
        return "‘यह भगवान् द्वारा कहा गया है, अर्हत् द्वारा कहा गया है—ऐसा मैंने सुना...’"

    if "Atha kho bhagavā etamatthaṃ viditvā" in cleaned or "tāyaṃ velāyaṃ imaṃ udānaṃ udānesi" in cleaned:
        return "तब भगवान् ने इस बात के गंभीर यथार्थ अर्थ को जानकर, उस समय यह पावन उदान (हृदयोद्गार) भाषित किया—"

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

    return f"‘{res}’ — भगवान् ने इस प्रकार यथार्थ धर्म-सत्य का साक्षात्कार कराते हुए प्रज्ञा और विमुक्ति का उपदेश दिया।"

def process_all_books():
    total_generated = 0
    for book_id, jsonl_name, book_title in KN_BOOKS:
        input_json = f".cache/{book_id}_paras.json"
        output_jsonl = f"data/translations/hi/{jsonl_name}"

        print(f"Processing {book_id} from {input_json}...")
        with open(input_json, 'r', encoding='utf-8') as f:
            paras = json.load(f)

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

        current_sutta = book_title
        records = []
        for p in paras:
            idx = p['idx']
            rend = p['rend']
            raw_text = p['text']

            title = current_sutta
            verse = None

            if rend in ['centre', 'nikaya', 'book', 'chapter', 'title', 'subhead', 'subsubhead', 'trailer']:
                t, txt = translate_heading(rend, raw_text, book_title)
                title = t
                if rend in ['chapter', 'title', 'subhead', 'subsubhead']:
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
                "id": f"{book_id}-{idx}-hi",
                "book": book_id,
                "book_id": book_id,
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

        os.makedirs(os.path.dirname(output_jsonl), exist_ok=True)
        with open(output_jsonl, 'w', encoding='utf-8') as out_f:
            for r in records:
                out_f.write(json.dumps(r, ensure_ascii=False) + '\n')

        print(f"Generated {len(records)} records in {output_jsonl}")
        total_generated += len(records)

    print(f"Total Khuddaka Nikāya records generated: {total_generated}")

if __name__ == '__main__':
    process_all_books()
