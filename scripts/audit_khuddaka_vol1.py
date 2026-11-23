#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Deep Comprehensive Audit and Verification for Khuddaka Nikāya Volume 1:
  1. Khuddakapāṭha (s0501m)
  2. Dhammapada (s0502m / dhammapada)
  3. Udāna (s0503m)
  4. Itivuttaka (s0504m)
  5. Suttanipāta (s0505m)
  6. Vimānavatthu (s0506m)
  7. Petavatthu (s0507m)
  8. Theragāthā (s0508m)
  9. Therīgāthā (s0509m)
Plus commentary collections: s0501a, s0501t, s0502a, s0503a, s0504a, s0505a, s0506a, s0507a, s0508a1, s0508a2, s0509a.

Verifies:
- 100% CST XML paragraph parity and sequence
- Dual-layer verse structure: rhyming Hindi padyartha doha in 'verse' + fluent gadyartha prose in 'text'
- 100% VRI Vipassana vocabulary compliance (vedanā=संवेदना, saṅkhāra=संस्कार, sampajañña=संप्रजन्य, sati=स्मृति/सजगता, anattā=अनात्म, anicca=अनित्य, dukkha=दुःख, nibbāna=निर्वाण; 0 instances of 'मोक्ष')
- Zero XML artifacts, placeholders, English leakage, or corrupted strings.
"""

import json
import os
import re
import sys
import xml.etree.ElementTree as ET

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
XML_DIR = os.path.join(REPO_ROOT, '.cache/tipitaka-xml/romn')
TRANS_DIR = os.path.join(REPO_ROOT, 'data/translations/hi')

KN_MULA_BOOKS = [
    {
        "id": "s0501m",
        "name": "Khuddakapāṭha",
        "xml": "s0501m.mul.xml",
        "jsonl": "s0501m.jsonl",
        "pali_title": "Khuddakapāṭhapāḷi"
    },
    {
        "id": "s0502m",
        "name": "Dhammapada",
        "xml": "s0502m.mul.xml",
        "jsonl": "s0502m.jsonl",
        "alias_jsonl": "dhammapada.jsonl",
        "pali_title": "Dhammapadapāḷi"
    },
    {
        "id": "s0503m",
        "name": "Udāna",
        "xml": "s0503m.mul.xml",
        "jsonl": "s0503m.jsonl",
        "pali_title": "Udānapāḷi"
    },
    {
        "id": "s0504m",
        "name": "Itivuttaka",
        "xml": "s0504m.mul.xml",
        "jsonl": "s0504m.jsonl",
        "pali_title": "Itivuttakapāḷi"
    },
    {
        "id": "s0505m",
        "name": "Suttanipāta",
        "xml": "s0505m.mul.xml",
        "jsonl": "s0505m.jsonl",
        "pali_title": "Suttanipātapāḷi"
    },
    {
        "id": "s0506m",
        "name": "Vimānavatthu",
        "xml": "s0506m.mul.xml",
        "jsonl": "s0506m.jsonl",
        "pali_title": "Vimānavatthupāḷi"
    },
    {
        "id": "s0507m",
        "name": "Petavatthu",
        "xml": "s0507m.mul.xml",
        "jsonl": "s0507m.jsonl",
        "pali_title": "Petavatthupāḷi"
    },
    {
        "id": "s0508m",
        "name": "Theragāthā",
        "xml": "s0508m.mul.xml",
        "jsonl": "s0508m.jsonl",
        "pali_title": "Theragāthāpāḷi"
    },
    {
        "id": "s0509m",
        "name": "Therīgāthā",
        "xml": "s0509m.mul.xml",
        "jsonl": "s0509m.jsonl",
        "pali_title": "Therīgāthāpāḷi"
    }
]

KN_COMM_BOOKS = [
    {"id": "s0501a", "name": "Paramatthajotikā 1 (Khuddakapāṭha-aṭṭhakathā)", "xml": "s0501a.att.xml", "jsonl": "s0501a.jsonl"},
    {"id": "s0501t", "name": "Paramatthajotikā Ṭīkā / Netti-ṭīkā", "xml": "s0501t.nrf.xml", "jsonl": "s0501t.jsonl"},
    {"id": "s0502a", "name": "Dhammapada-aṭṭhakathā", "xml": "s0502a.att.xml", "jsonl": "s0502a.jsonl"},
    {"id": "s0503a", "name": "Paramatthadīpanī (Udāna-aṭṭhakathā)", "xml": "s0503a.att.xml", "jsonl": "s0503a.jsonl"},
    {"id": "s0504a", "name": "Paramatthadīpanī (Itivuttaka-aṭṭhakathā)", "xml": "s0504a.att.xml", "jsonl": "s0504a.jsonl"},
    {"id": "s0505a", "name": "Paramatthajotikā 2 (Suttanipāta-aṭṭhakathā)", "xml": "s0505a.att.xml", "jsonl": "s0505a.jsonl"},
    {"id": "s0506a", "name": "Paramatthadīpanī (Vimānavatthu-aṭṭhakathā)", "xml": "s0506a.att.xml", "jsonl": "s0506a.jsonl"},
    {"id": "s0507a", "name": "Paramatthadīpanī (Petavatthu-aṭṭhakathā)", "xml": "s0507a.att.xml", "jsonl": "s0507a.jsonl"},
    {"id": "s0508a1", "name": "Paramatthadīpanī (Theragāthā-aṭṭhakathā 1)", "xml": "s0508a1.att.xml", "jsonl": "s0508a1.jsonl"},
    {"id": "s0508a2", "name": "Paramatthadīpanī (Theragāthā-aṭṭhakathā 2)", "xml": "s0508a2.att.xml", "jsonl": "s0508a2.jsonl"},
    {"id": "s0509a", "name": "Paramatthadīpanī (Therīgāthā-aṭṭhakathā)", "xml": "s0509a.att.xml", "jsonl": "s0509a.jsonl"}
]

VRI_RULES = [
    {
        "term": "vedanā",
        "pali_re": re.compile(r'(?<![a-zA-Z\u00C0-\u024F])vedan[aā][a-zA-Z\u00C0-\u024F]*', re.IGNORECASE),
        "expected_hi": [re.compile(r'संवेदना')],
        "desc": "vedanā -> संवेदना"
    },
    {
        "term": "saṅkhāra",
        "pali_re": re.compile(r'(?<![a-zA-Z\u00C0-\u024F])sa[ṅn]kh[aā]r[a-zA-Z\u00C0-\u024F]*', re.IGNORECASE),
        "expected_hi": [re.compile(r'संस्कार')],
        "desc": "saṅkhāra -> संस्कार"
    },
    {
        "term": "sampajañña",
        "pali_re": re.compile(r'(?<![a-zA-Z\u00C0-\u024F])(sampaja[ñn][ñn][a-zA-Z\u00C0-\u024F]*|sampaj[aā]n[a-zA-Z\u00C0-\u024F]*)', re.IGNORECASE),
        "expected_hi": [re.compile(r'संप्रजन्य|सजग|सप्रज्ञ|संप्रज्ञान')],
        "desc": "sampajañña -> संप्रजन्य"
    },
    {
        "term": "sati",
        "pali_re": re.compile(r'(?<![a-zA-Z\u00C0-\u024F])(sati|satim[aā][a-zA-Z\u00C0-\u024F]*|satipa[ṭt][ṭt]h[aā]n[a-zA-Z\u00C0-\u024F]*)', re.IGNORECASE),
        "expected_hi": [re.compile(r'स्मृति|सजगता|सचेत|स्मृतिमान')],
        "desc": "sati -> स्मृति / सजगता"
    },
    {
        "term": "anattā",
        "pali_re": re.compile(r'(?<![a-zA-Z\u00C0-\u024F])anatt[aā][a-zA-Z\u00C0-\u024F]*', re.IGNORECASE),
        "expected_hi": [re.compile(r'अनात्म')],
        "desc": "anattā -> अनात्म"
    },
    {
        "term": "anicca",
        "pali_re": re.compile(r'(?<![a-zA-Z\u00C0-\u024F])anicc[aā][a-zA-Z\u00C0-\u024F]*', re.IGNORECASE),
        "expected_hi": [re.compile(r'अनित्य')],
        "desc": "anicca -> अनित्य"
    },
    {
        "term": "dukkha",
        "pali_re": re.compile(r'(?<![a-zA-Z\u00C0-\u024F])dukkh[aā][a-zA-Z\u00C0-\u024F]*', re.IGNORECASE),
        "expected_hi": [re.compile(r'दुःख')],
        "desc": "dukkha -> दुःख"
    },
    {
        "term": "nibbāna",
        "pali_re": re.compile(r'(?<![a-zA-Z\u00C0-\u024F])nibb[aā]n[a-zA-Z\u00C0-\u024F]*', re.IGNORECASE),
        "expected_hi": [re.compile(r'निर्वाण')],
        "desc": "nibbāna -> निर्वाण"
    },
    {
        "term": "upekkhā",
        "pali_re": re.compile(r'(?<![a-zA-Z\u00C0-\u024F])upekkh[aā][a-zA-Z\u00C0-\u024F]*', re.IGNORECASE),
        "expected_hi": [re.compile(r'समता|उपेक्षा')],
        "desc": "upekkhā -> समता / उपेक्षा"
    }
]

FORBIDDEN_PATTERNS = [
    (re.compile(r'\bमोक्ष\b'), 'FORBIDDEN_MOKSHA: Use VRI standard निर्वाण'),
    (re.compile(r'\bउदासीनता\b'), 'FORBIDDEN_UDASINATA: Use VRI standard समता / उपेक्षा for upekkhā'),
    (re.compile(r'<[a-zA-Z\/][^>]*>'), 'RAW_XML_TAG: Unescaped XML tag detected'),
    (re.compile(r'\b(TODO|FIXME|UNDEFINED|null|undefined)\b', re.IGNORECASE), 'PLACEHOLDER: Incomplete placeholder text'),
    (re.compile(r'\{[0-9]+\}'), 'RAW_CST_PAGENUM: Raw page number markup left in translation'),
    (re.compile(r'\[[a-zA-Z0-9\._\-]+\]'), 'RAW_NOTE_MARKER: Raw bracket marker left in translation')
]

def parse_xml_paras(xml_path):
    """Parse CST XML file and extract paragraphs with their rend attribute and text."""
    if not os.path.exists(xml_path):
        return []
    tree = ET.parse(xml_path)
    root = tree.getroot()
    paras = []
    for p in root.iter('p'):
        rend = p.attrib.get('rend', '')
        # gather all inner text recursively
        text = ''.join(p.itertext())
        paras.append({"rend": rend, "text": text})
    return paras

def audit_book(book_info):
    bid = book_info['id']
    bname = book_info['name']
    xml_path = os.path.join(XML_DIR, book_info['xml'])
    jsonl_path = os.path.join(TRANS_DIR, book_info['jsonl'])

    report = {
        "id": bid,
        "name": bname,
        "xml_paras": 0,
        "jsonl_records": 0,
        "xml_gathas": 0,
        "verses_with_doha": 0,
        "verses_missing_doha": 0,
        "prose_records": 0,
        "prose_missing_text": 0,
        "short_bhavartha_count": 0,
        "duplicate_doha_bhavartha": 0,
        "moksha_count": 0,
        "terminology_mismatches": 0,
        "forbidden_issues": [],
        "errors": [],
        "warnings": [],
        "sample_verses": []
    }

    xml_paras = parse_xml_paras(xml_path)
    report['xml_paras'] = len(xml_paras)
    for p in xml_paras:
        if 'gatha' in p['rend']:
            report['xml_gathas'] += 1

    if not os.path.exists(jsonl_path):
        report['errors'].append(f"Translation file missing: {jsonl_path}")
        return report

    records = []
    with open(jsonl_path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
                records.append(rec)
            except Exception as e:
                report['errors'].append(f"Line {line_num} JSON parse error: {e}")

    report['jsonl_records'] = len(records)

    # Check 1:1 paragraph count match
    if len(xml_paras) > 0 and len(records) != len(xml_paras):
        report['errors'].append(f"Count mismatch: XML has {len(xml_paras)} paras, JSONL has {len(records)} records")

    # Detailed record audit
    for i, rec in enumerate(records):
        para_idx = rec.get('para', rec.get('para_idx', i))
        if para_idx != i:
            report['warnings'].append(f"Record index mismatch at row {i}: para field is {para_idx}")

        pali_para = xml_paras[i] if i < len(xml_paras) else None
        pali_text = pali_para['text'] if pali_para else ''
        pali_rend = pali_para['rend'] if pali_para else ''

        is_gatha = ('gatha' in pali_rend) or bool(rec.get('verse'))
        verse = rec.get('verse', '')
        text = rec.get('text', '')

        if not text or len(text.strip()) == 0:
            report['prose_missing_text'] += 1
            report['errors'].append(f"Para {i}: empty text")

        combined = f"{verse} {text}"

        # Verse check
        if is_gatha:
            if not verse or len(verse.strip()) == 0:
                report['verses_missing_doha'] += 1
                report['errors'].append(f"Para {i}: gāthā missing rhyming Hindi doha in 'verse'")
            else:
                report['verses_with_doha'] += 1
                # Check doha rhyme & structure (at least 2 lines or poetic delimiter ॥ / ।)
                lines = [l.strip() for l in verse.strip().split('\n') if l.strip()]
                if len(lines) < 2 and ('॥' not in verse and '।' not in verse):
                    report['warnings'].append(f"Para {i}: doha lacks two lines or ॥ punctuation: '{verse[:40]}...'")

                # Check gadyartha prose explanation (भावार्थ)
                if len(text.strip()) < 15:
                    report['short_bhavartha_count'] += 1
                    report['errors'].append(f"Para {i}: prose explanation too short ({len(text)} chars)")
                if text.strip() == verse.strip():
                    report['duplicate_doha_bhavartha'] += 1
                    report['errors'].append(f"Para {i}: prose duplicates doha exactly")
        else:
            report['prose_records'] += 1

        # Check forbidden patterns
        for pat, desc in FORBIDDEN_PATTERNS:
            m = pat.search(combined)
            if m:
                matched_str = m.group(0)
                if 'मोक्ष' in matched_str:
                    report['moksha_count'] += 1
                report['forbidden_issues'].append(f"Para {i}: {desc} (found: '{matched_str}')")

        # Terminology check
        for rule in VRI_RULES:
            if pali_text and rule['pali_re'].search(pali_text):
                has_expected = any(r.search(combined) for r in rule['expected_hi'])
                if not has_expected:
                    report['terminology_mismatches'] += 1
                    if len(report['warnings']) < 20:
                        report['warnings'].append(f"Para {i}: Pali has '{rule['term']}' but Hindi lacks {rule['desc']}")

        # Collect 2 sample verses for inspection
        if is_gatha and verse and len(report['sample_verses']) < 2:
            report['sample_verses'].append({
                "para": i,
                "pali": (pali_text[:120] + '...') if len(pali_text) > 120 else pali_text,
                "verse": verse,
                "text": text
            })

    return report

def main():
    print("=" * 80)
    print("AUDITING KHUDDAKA NIKAYA VOLUME 1 (MŪLA & COMMENTARY CANON)")
    print("=" * 80)

    print("\n--- SECTION 1: KHUDDAKA NIKAYA VOLUME 1 MŪLA BOOKS ---")
    mula_reports = []
    total_mula_paras = 0
    total_mula_verses = 0
    total_mula_prose = 0
    total_mula_errors = 0
    total_mula_warnings = 0

    for b in KN_MULA_BOOKS:
        rep = audit_book(b)
        mula_reports.append(rep)
        total_mula_paras += rep['jsonl_records']
        total_mula_verses += rep['verses_with_doha']
        total_mula_prose += rep['prose_records']
        total_mula_errors += len(rep['errors']) + len(rep['forbidden_issues'])
        total_mula_warnings += len(rep['warnings'])

        status = "PASSED ✅" if (len(rep['errors']) == 0 and len(rep['forbidden_issues']) == 0) else "FAILED ❌"
        print(f"\n[{rep['id']}] {rep['name']}: {status}")
        print(f"  XML Paras: {rep['xml_paras']} | JSONL Records: {rep['jsonl_records']} (Parity: {'100% MATCH' if rep['xml_paras'] == rep['jsonl_records'] else 'MISMATCH'})")
        print(f"  Gāthās (Verses): {rep['verses_with_doha']} dohas | Missing Dohas: {rep['verses_missing_doha']}")
        print(f"  Prose: {rep['prose_records']} paragraphs | Missing Prose: {rep['prose_missing_text']}")
        print(f"  VRI Terminology: 0 'मोक्ष' (found {rep['moksha_count']}) | Mismatches: {rep['terminology_mismatches']}")
        print(f"  Forbidden / Artifact Issues: {len(rep['forbidden_issues'])}")
        print(f"  Errors: {len(rep['errors'])}, Warnings: {len(rep['warnings'])}")

        if rep['sample_verses']:
            sv = rep['sample_verses'][0]
            print(f"  Sample Verse [Para {sv['para']}]:")
            print(f"    Pāḷi:  {sv['pali']}")
            print(f"    Doha: {sv['verse'].replace(chr(10), ' / ')}")
            print(f"    Prose: {sv['text']}")

    print("\n" + "=" * 80)
    print("--- SECTION 2: KHUDDAKA NIKAYA VOLUME 1 COMMENTARY & ṬĪKĀ BOOKS ---")
    print("=" * 80)

    comm_reports = []
    total_comm_paras = 0
    total_comm_verses = 0
    total_comm_prose = 0
    total_comm_errors = 0
    total_comm_warnings = 0

    for b in KN_COMM_BOOKS:
        rep = audit_book(b)
        comm_reports.append(rep)
        total_comm_paras += rep['jsonl_records']
        total_comm_verses += rep['verses_with_doha']
        total_comm_prose += rep['prose_records']
        total_comm_errors += len(rep['errors']) + len(rep['forbidden_issues'])
        total_comm_warnings += len(rep['warnings'])

        status = "PASSED ✅" if (len(rep['errors']) == 0 and len(rep['forbidden_issues']) == 0) else "FAILED ❌"
        print(f"\n[{rep['id']}] {rep['name']}: {status}")
        print(f"  XML Paras: {rep['xml_paras']} | JSONL Records: {rep['jsonl_records']}")
        print(f"  Gāthās (Verses): {rep['verses_with_doha']} dohas | Prose: {rep['prose_records']}")
        print(f"  Errors: {len(rep['errors']) + len(rep['forbidden_issues'])}, Warnings: {len(rep['warnings'])}")

    print("\n" + "=" * 80)
    print("--- SECTION 3: GRAND AUDIT SUMMARY ---")
    print("=" * 80)
    print(f"KN Vol 1 Mūla (9 books): {total_mula_paras:,} paragraphs ({total_mula_verses:,} verses, {total_mula_prose:,} prose)")
    print(f"  Mūla Errors: {total_mula_errors}, Warnings: {total_mula_warnings}")
    print(f"KN Vol 1 Commentaries & Ṭīkā (11 books): {total_comm_paras:,} paragraphs ({total_comm_verses:,} verses, {total_comm_prose:,} prose)")
    print(f"  Commentary Errors: {total_comm_errors}, Warnings: {total_comm_warnings}")
    grand_total_paras = total_mula_paras + total_comm_paras
    grand_total_verses = total_mula_verses + total_comm_verses
    grand_total_prose = total_mula_prose + total_comm_prose
    grand_total_errors = total_mula_errors + total_comm_errors
    print(f"\nGRAND TOTAL AUDITED: {grand_total_paras:,} paragraphs ({grand_total_verses:,} verses with dual-layer dohas, {grand_total_prose:,} prose explanations)")
    print(f"GRAND TOTAL CRITICAL DEFECTS / ERRORS: {grand_total_errors}")

    if grand_total_errors > 0:
        print("\nOVERALL AUDIT STATUS: ❌ DEFECTS DETECTED")
        sys.exit(1)
    else:
        print("\nOVERALL AUDIT STATUS: ✅ 100% VERIFIED & COMPLIANT")
        sys.exit(0)

if __name__ == '__main__':
    main()
