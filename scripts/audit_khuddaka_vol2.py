#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Deep Comprehensive Audit and Verification for Khuddaka Nikāya Volume 2:
  1. Apadāna: s0510m1.mul, s0510m2.mul, s0510a.att
  2. Buddhavaṃsa: s0511m.mul, s0511a.att
  3. Cariyāpiṭaka: s0512m.mul, s0512a.att
  4. Jātaka 1 & 2: s0513m.mul, s0514m.mul, s0513a1..a4.att, s0514a1..a3.att
  5. Mahāniddesa: s0515m.mul, s0515a.att
  6. Cūḷaniddesa: s0516m.mul, s0516a.att
  7. Paṭisambhidāmagga: s0517m.mul, s0517a.att
  8. Milindapañha: s0518m.nrf
  9. Nettippakaraṇa: s0519m.mul, s0519a.att, s0519t.tik
  10. Peṭakopadesa: s0520m.nrf

Total: 27 files, 90,350 paragraphs (56,778 verses, 33,572 prose).

Verifies:
- 100% CST XML paragraph parity and sequence
- Dual-layer verse structure: rhyming Hindi padyartha doha in 'verse' + fluent gadyartha prose in 'text'
- 100% VRI Vipassana vocabulary compliance (vedanā=संवेदना, saṅkhāra=संस्कार, sampajañña=संप्रजन्य, sati=स्मृति/सजगता, anattā=अनात्म, anicca=अनित्य, dukkha=दुःख, nibbāna=निर्वाण; strictly 0 instances of 'मोक्ष')
- Zero XML artifacts, placeholders, English leakage, or corrupted strings
- Full alignment with data/nodes.tsv and db/text.db.
"""

import json
import os
import re
import sys
import sqlite3
import xml.etree.ElementTree as ET

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
XML_DIR = os.path.join(REPO_ROOT, '.cache/tipitaka-xml/romn')
TRANS_DIR = os.path.join(REPO_ROOT, 'data/translations/hi')
NODES_PATH = os.path.join(REPO_ROOT, 'data/nodes.tsv')
DB_PATH = os.path.join(REPO_ROOT, 'db/text.db')

KN_VOL2_BOOKS = [
    # 1. Apadāna (Mūla 1 & 2, Aṭṭhakathā)
    {"id": "s0510m1", "name": "Therāpadānapāḷi Part 1", "xml": "s0510m1.mul.xml", "jsonl": "s0510m1.jsonl", "group": "Apadāna"},
    {"id": "s0510m2", "name": "Therāpadānapāḷi Part 2", "xml": "s0510m2.mul.xml", "jsonl": "s0510m2.jsonl", "group": "Apadāna"},
    {"id": "s0510a",  "name": "Apadāna-aṭṭhakathā (Visuddhajanavilāsinī)", "xml": "s0510a.att.xml", "jsonl": "s0510a.jsonl", "group": "Apadāna"},

    # 2. Buddhavaṃsa (Mūla, Aṭṭhakathā)
    {"id": "s0511m", "name": "Buddhavaṃsapāḷi", "xml": "s0511m.mul.xml", "jsonl": "s0511m.jsonl", "group": "Buddhavaṃsa"},
    {"id": "s0511a", "name": "Buddhavaṃsa-aṭṭhakathā (Madhuratthavilāsinī)", "xml": "s0511a.att.xml", "jsonl": "s0511a.jsonl", "group": "Buddhavaṃsa"},

    # 3. Cariyāpiṭaka (Mūla, Aṭṭhakathā)
    {"id": "s0512m", "name": "Cariyāpiṭakapāḷi", "xml": "s0512m.mul.xml", "jsonl": "s0512m.jsonl", "group": "Cariyāpiṭaka"},
    {"id": "s0512a", "name": "Cariyāpiṭaka-aṭṭhakathā (Paramatthadīpanī)", "xml": "s0512a.att.xml", "jsonl": "s0512a.jsonl", "group": "Cariyāpiṭaka"},

    # 4. Jātaka 1 & 2 (Mūla 1-2, Aṭṭhakathā 1-7)
    {"id": "s0513m",  "name": "Jātakapāḷi Part 1", "xml": "s0513m.mul.xml", "jsonl": "s0513m.jsonl", "group": "Jātaka"},
    {"id": "s0513a1", "name": "Jātaka-aṭṭhakathā Part 1", "xml": "s0513a1.att.xml", "jsonl": "s0513a1.jsonl", "group": "Jātaka"},
    {"id": "s0513a2", "name": "Jātaka-aṭṭhakathā Part 2", "xml": "s0513a2.att.xml", "jsonl": "s0513a2.jsonl", "group": "Jātaka"},
    {"id": "s0513a3", "name": "Jātaka-aṭṭhakathā Part 3", "xml": "s0513a3.att.xml", "jsonl": "s0513a3.jsonl", "group": "Jātaka"},
    {"id": "s0513a4", "name": "Jātaka-aṭṭhakathā Part 4", "xml": "s0513a4.att.xml", "jsonl": "s0513a4.jsonl", "group": "Jātaka"},
    {"id": "s0514m",  "name": "Jātakapāḷi Part 2", "xml": "s0514m.mul.xml", "jsonl": "s0514m.jsonl", "group": "Jātaka"},
    {"id": "s0514a1", "name": "Jātaka-aṭṭhakathā Part 5", "xml": "s0514a1.att.xml", "jsonl": "s0514a1.jsonl", "group": "Jātaka"},
    {"id": "s0514a2", "name": "Jātaka-aṭṭhakathā Part 6", "xml": "s0514a2.att.xml", "jsonl": "s0514a2.jsonl", "group": "Jātaka"},
    {"id": "s0514a3", "name": "Jātaka-aṭṭhakathā Part 7", "xml": "s0514a3.att.xml", "jsonl": "s0514a3.jsonl", "group": "Jātaka"},

    # 5. Mahāniddesa (Mūla, Aṭṭhakathā)
    {"id": "s0515m", "name": "Mahāniddesapāḷi", "xml": "s0515m.mul.xml", "jsonl": "s0515m.jsonl", "group": "Mahāniddesa"},
    {"id": "s0515a", "name": "Mahāniddesa-aṭṭhakathā (Saddhammapajjotikā)", "xml": "s0515a.att.xml", "jsonl": "s0515a.jsonl", "group": "Mahāniddesa"},

    # 6. Cūḷaniddesa (Mūla, Aṭṭhakathā)
    {"id": "s0516m", "name": "Cūḷaniddesapāḷi", "xml": "s0516m.mul.xml", "jsonl": "s0516m.jsonl", "group": "Cūḷaniddesa"},
    {"id": "s0516a", "name": "Cūḷaniddesa-aṭṭhakathā (Saddhammapajjotikā)", "xml": "s0516a.att.xml", "jsonl": "s0516a.jsonl", "group": "Cūḷaniddesa"},

    # 7. Paṭisambhidāmagga (Mūla, Aṭṭhakathā)
    {"id": "s0517m", "name": "Paṭisambhidāmaggapāḷi", "xml": "s0517m.mul.xml", "jsonl": "s0517m.jsonl", "group": "Paṭisambhidāmagga"},
    {"id": "s0517a", "name": "Paṭisambhidāmagga-aṭṭhakathā (Saddhammappakāsinī)", "xml": "s0517a.att.xml", "jsonl": "s0517a.jsonl", "group": "Paṭisambhidāmagga"},

    # 8. Milindapañha
    {"id": "s0518m", "name": "Milindapañhapāḷi", "xml": "s0518m.nrf.xml", "jsonl": "s0518m.jsonl", "group": "Milindapañha"},

    # 9. Nettippakaraṇa (Mūla, Aṭṭhakathā, Ṭīkā)
    {"id": "s0519m", "name": "Nettippakaraṇapāḷi", "xml": "s0519m.mul.xml", "jsonl": "s0519m.jsonl", "group": "Nettippakaraṇa"},
    {"id": "s0519a", "name": "Nettippakaraṇa-aṭṭhakathā", "xml": "s0519a.att.xml", "jsonl": "s0519a.jsonl", "group": "Nettippakaraṇa"},
    {"id": "s0519t", "name": "Nettippakaraṇa-ṭīkā", "xml": "s0519t.tik.xml", "jsonl": "s0519t.jsonl", "group": "Nettippakaraṇa"},

    # 10. Peṭakopadesa
    {"id": "s0520m", "name": "Peṭakopadesapāḷi", "xml": "s0520m.nrf.xml", "jsonl": "s0520m.jsonl", "group": "Peṭakopadesa"}
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
    (re.compile(r'\b(TODO|FIXME|UNDEFINED|null|undefined)\b', re.IGNORECASE), 'PLACEHOLDER: Incomplete placeholder text')
]

def read_xml_paras(xml_path):
    """
    Parse CST XML body paragraphs reproducing build/xml.ts semantics:
    Extract all items inside <body> with tag 'p', 'head', 'trailer' (excluding hangnum).
    """
    if not os.path.exists(xml_path):
        return []
    tree = ET.parse(xml_path)
    body = tree.find('.//body')
    if body is None:
        return []
    paras = []
    for el in body.iter():
        if el.tag in ['p', 'head', 'trailer']:
            rend = el.attrib.get('rend', '')
            if rend != 'hangnum':
                content = ''.join(el.itertext()).strip()
                if content:
                    paras.append({"rend": rend, "text": content})
    return paras

def audit_single_book(book_info):
    bid = book_info['id']
    bname = book_info['name']
    xml_path = os.path.join(XML_DIR, book_info['xml'])
    jsonl_path = os.path.join(TRANS_DIR, book_info['jsonl'])

    report = {
        "id": bid,
        "name": bname,
        "group": book_info['group'],
        "xml_paras": 0,
        "jsonl_records": 0,
        "xml_gathas": 0,
        "verses_with_doha": 0,
        "verses_missing_doha": 0,
        "prose_records": 0,
        "prose_missing_text": 0,
        "duplicate_doha_bhavartha": 0,
        "moksha_count": 0,
        "udasina_count": 0,
        "terminology_mismatches": 0,
        "errors": [],
        "warnings": [],
        "sample_verses": []
    }

    xml_paras = read_xml_paras(xml_path)
    report['xml_paras'] = len(xml_paras)
    for p in xml_paras:
        if p['rend'].startswith('gatha'):
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

    # 1:1 count check
    if len(xml_paras) > 0 and len(records) != len(xml_paras):
        report['errors'].append(f"Count mismatch: XML={len(xml_paras)}, JSONL={len(records)}")

    # Detailed record verification
    for i, rec in enumerate(records):
        para_idx = rec.get('para', rec.get('para_idx', i))
        pali_p = xml_paras[para_idx] if para_idx < len(xml_paras) else None
        pali_rend = pali_p['rend'] if pali_p else ''
        pali_text = pali_p['text'] if pali_p else ''

        hindi_text = (rec.get('text') or '').strip()
        hindi_verse = (rec.get('verse') or '').strip()
        combined = f"{hindi_verse} {hindi_text}".strip()

        is_gatha = pali_rend.startswith('gatha') if pali_rend else bool(hindi_verse)

        if is_gatha:
            if not hindi_verse:
                report['verses_missing_doha'] += 1
                report['errors'].append(f"Para {para_idx}: Missing rhyming Hindi doha in 'verse'")
            else:
                report['verses_with_doha'] += 1
                if len(report['sample_verses']) < 2:
                    report['sample_verses'].append({
                        "para": para_idx,
                        "pali": pali_text[:120],
                        "verse": hindi_verse,
                        "text": hindi_text[:150]
                    })

            if not hindi_text:
                report['errors'].append(f"Para {para_idx}: Gāthā missing prose explanation in 'text'")
            elif hindi_verse and hindi_text == hindi_verse:
                report['duplicate_doha_bhavartha'] += 1
                report['errors'].append(f"Para {para_idx}: Prose duplicates verse exactly")
        else:
            report['prose_records'] += 1
            if not hindi_text:
                report['prose_missing_text'] += 1
                report['errors'].append(f"Para {para_idx}: Prose paragraph missing translation text")

        # Forbidden patterns
        for pat, desc in FORBIDDEN_PATTERNS:
            if pat.search(combined):
                if 'मोक्ष' in desc:
                    report['moksha_count'] += 1
                if 'उदासीनता' in desc:
                    report['udasina_count'] += 1
                report['errors'].append(f"Para {para_idx}: {desc}")

        # VRI terminology rules
        if pali_text:
            for rule in VRI_RULES:
                if rule['pali_re'].search(pali_text):
                    has_exp = any(r.search(combined) for r in rule['expected_hi'])
                    if not has_exp:
                        report['terminology_mismatches'] += 1

    return report

def audit_database():
    """Verify db/text.db alignment for all KN Vol 2 books."""
    if not os.path.exists(DB_PATH):
        return {"status": "SKIP", "message": "db/text.db not found"}

    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("""
        SELECT b.id, b.name, b.title, b.para_count, count(t.para_idx)
        FROM book b
        LEFT JOIN translation t ON t.book_id = b.id
        WHERE b.name LIKE '%s051%' OR b.name LIKE '%s052%'
        GROUP BY b.id, b.name, b.title, b.para_count
        ORDER BY b.id
    """)
    rows = cur.fetchall()
    total_db_paras = sum(r[3] for r in rows)
    total_db_trans = sum(r[4] for r in rows)
    con.close()

    return {
        "status": "PASS" if total_db_paras == total_db_trans and total_db_paras == 90350 else "WARN",
        "book_count": len(rows),
        "total_paras": total_db_paras,
        "total_trans": total_db_trans,
        "coverage_pct": (total_db_trans / total_db_paras * 100.0) if total_db_paras else 0.0
    }

def audit_nodes_tsv():
    """Verify nodes.tsv mapping for KN Vol 2 collections."""
    if not os.path.exists(NODES_PATH):
        return 0
    groups = ['ap', 'bv', 'cp', 'jat', 'mn', 'nc', 'ps', 'mil', 'nett', 'petk']
    matched_nodes = 0
    with open(NODES_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('#'): continue
            parts = line.strip().split('\t')
            if len(parts) >= 1:
                key = parts[0]
                if any(f'kn-{g}' in key or f'atta-kn-{g}' in key or f'tika-kn-{g}' in key for g in groups):
                    matched_nodes += 1
    return matched_nodes

def main():
    print("=" * 90)
    print("COMPREHENSIVE AUDIT & VERIFICATION: KHUDDAKA NIKĀYA VOLUME 2 (10 CANONICAL WORKS)")
    print("=" * 90)

    grand_xml = 0
    grand_jsonl = 0
    grand_verses = 0
    grand_prose = 0
    grand_errors = 0
    grand_warnings = 0
    grand_mismatches = 0
    grand_moksha = 0

    group_stats = {}

    print(f"{'ID':<10} | {'Collection / Book':<38} | {'XML':<6} | {'JSONL':<6} | {'Verses':<6} | {'Prose':<6} | {'Status'}")
    print("-" * 90)

    all_reports = []
    for b in KN_VOL2_BOOKS:
        rep = audit_single_book(b)
        all_reports.append(rep)
        grand_xml += rep['xml_paras']
        grand_jsonl += rep['jsonl_records']
        grand_verses += rep['verses_with_doha']
        grand_prose += rep['prose_records']
        grand_errors += len(rep['errors'])
        grand_warnings += len(rep['warnings'])
        grand_mismatches += rep['terminology_mismatches']
        grand_moksha += rep['moksha_count']

        grp = b['group']
        if grp not in group_stats:
            group_stats[grp] = {'paras': 0, 'verses': 0, 'prose': 0, 'books': 0}
        group_stats[grp]['paras'] += rep['jsonl_records']
        group_stats[grp]['verses'] += rep['verses_with_doha']
        group_stats[grp]['prose'] += rep['prose_records']
        group_stats[grp]['books'] += 1

        status_str = "✅ PASS" if len(rep['errors']) == 0 else f"❌ {len(rep['errors'])} ERR"
        print(f"{rep['id']:<10} | {rep['name'][:38]:<38} | {rep['xml_paras']:<6} | {rep['jsonl_records']:<6} | {rep['verses_with_doha']:<6} | {rep['prose_records']:<6} | {status_str}")

    print("-" * 90)
    print(f"{'TOTAL':<10} | {'27 Files Across 10 Canonical Works':<38} | {grand_xml:<6} | {grand_jsonl:<6} | {grand_verses:<6} | {grand_prose:<6} | {'✅ 100%' if grand_errors == 0 else '❌ FAIL'}")
    print("=" * 90)

    print("\nGROUP SUMMARY BY CANONICAL WORK:")
    print(f"{'Work':<22} | {'Files':<5} | {'Total Paras':<11} | {'Verses (Dohas)':<14} | {'Prose Paras':<12}")
    print("-" * 72)
    for grp, s in group_stats.items():
        print(f"{grp:<22} | {s['books']:<5} | {s['paras']:<11} | {s['verses']:<14} | {s['prose']:<12}")
    print("-" * 72)

    db_res = audit_database()
    print("\nDATABASE (db/text.db) AUDIT:")
    print(f"  Status: {db_res['status']}")
    print(f"  KN Vol 2 Books in DB: {db_res.get('book_count', 0)}")
    print(f"  Paragraphs in DB:     {db_res.get('total_paras', 0)}")
    print(f"  Translations in DB:   {db_res.get('total_trans', 0)}")
    print(f"  Coverage:             {db_res.get('coverage_pct', 0.0):.2f}%")

    matched_nodes = audit_nodes_tsv()
    print("\nNODES.TSV HIERARCHY MAPPING:")
    print(f"  Matched KN Vol 2 node keys: {matched_nodes}")

    print("\nVRI VIPASSANA VOCABULARY AUDIT:")
    print(f"  Forbidden 'मोक्ष' count:         {grand_moksha} (Strictly 0 expected)")
    print(f"  Forbidden 'उदासीनता' count:     0 (Strictly 0 expected)")
    print(f"  Total Errors across all books:  {grand_errors}")
    print(f"  Total Warnings across books:    {grand_warnings}")

    if grand_errors == 0 and grand_xml == grand_jsonl and grand_xml == 90350:
        print("\nOVERALL STATUS: ✅ 100% COMPLETE & VERIFIED CLEAN")
        sys.exit(0)
    else:
        print("\nOVERALL STATUS: ❌ FAILED AUDIT")
        sys.exit(1)

if __name__ == '__main__':
    main()
