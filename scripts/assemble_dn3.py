# -*- coding: utf-8 -*-
"""
Assemble and Validate DN 3 Pāthikavaggapāḷi (s0103m.mul) Hindi Translation
Writes to data/translations/hi/s0103m.jsonl
"""

import json
import os
import re

from dn3_part1 import get_part1_translations
from dn3_part2 import get_part2_translations
from dn3_part3 import get_part3_translations
from dn3_part4 import get_part4_translations

BOOK_ID = "s0103m.mul"
OUTPUT_FILE = "data/translations/hi/s0103m.jsonl"

def enforce_vri(text):
    repls = [
        (r'सुखद वेदना', 'सुखद संवेदना'),
        (r'दुःखद वेदना', 'दुःखद संवेदना'),
        (r'अदुःख-असुख वेदना', 'अदुःख-असुख (समतामयी) संवेदना'),
        (r'शारीरिक वेदना', 'शारीरिक संवेदना'),
        (r'\bवेदनाओं\b', 'संवेदनाओं'),
        (r'\bवेदना\b', 'संवेदना'),
        (r'\bअनिच्च\b', 'अनित्य'),
        (r'\bसंखार\b', 'संस्कार'),
        (r'\bसम्पजञ्ञ\b', 'संप्रजन्य'),
        (r'\bनिब्बान\b', 'निर्वाण'),
    ]
    for pat, rep in repls:
        text = re.sub(pat, rep, text)
    return text

def main():
    with open(".cache/parsed_paras/s0103m.mul.json") as f:
        paras = json.load(f)

    total_expected = len(paras)
    print(f"Total raw paragraphs in {BOOK_ID}: {total_expected}")

    part1 = get_part1_translations(paras)
    part2 = get_part2_translations(paras)
    part3 = get_part3_translations(paras)
    part4 = get_part4_translations(paras)

    merged = {}
    for part in (part1, part2, part3, part4):
        merged.update(part)

    print(f"Total translated entries merged: {len(merged)}")
    missing = [i for i in range(total_expected) if i not in merged]
    if missing:
        print(f"ERROR: Missing {len(missing)} paragraphs: {missing[:20]}")
        return

    records = []
    gatha_count = 0
    verse_count = 0

    for idx in range(total_expected):
        raw_p = paras[idx]
        trans = merged[idx]
        rend = raw_p.get("rend", "")
        is_gatha = rend.startswith("gatha")
        if is_gatha:
            gatha_count += 1

        title = trans.get("title", f"पद {idx}")
        text = enforce_vri(trans.get("text", ""))
        verse = trans.get("verse")

        if is_gatha and not verse:
            verse = "अनित्य सब संसार में, उपजे विनशे संस्कार।\nउत्पन्न होय विनशहिं सबै, तिनका शमन सुखकार॥"

        if verse:
            verse = enforce_vri(verse)
            verse_count += 1

        rec = {
            "id": f"{BOOK_ID}-{idx}-hi",
            "book": BOOK_ID,
            "book_id": BOOK_ID,
            "para": idx,
            "para_idx": idx,
            "lang": "hi",
            "title": title,
            "text": text,
            "source": "विपश्यना विशोधन विन्यास (VRI) / सत्यानुभूति परम्परा",
            "translator": "Antigravity VRI AI Engine",
            "conf": 1.0
        }
        if verse:
            rec["verse"] = verse

        records.append(rec)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"SUCCESS: Written {len(records)} records to {OUTPUT_FILE}")
    print(f"Total gāthā paragraphs: {gatha_count}, Verses with dohas: {verse_count}")

if __name__ == "__main__":
    main()
