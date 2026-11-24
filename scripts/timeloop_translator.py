#!/usr/bin/env python3
"""
Timeloop Translation Engine
Tracks, translates, verifies, and synchronizes Sutta-by-Sutta translations
with persistent checkpointing.
"""

import sys
import os
import json
import sqlite3
from datetime import datetime, timezone

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DB_PATH = os.path.join(BASE_DIR, 'db', 'text.db')
CHECKPOINT_PATH = os.path.join(BASE_DIR, 'data', 'translations', 'timeloop_checkpoint.json')
JSONL_DIR = os.path.join(BASE_DIR, 'data', 'translations', 'hi')
BOOKS_DIR = os.path.join(BASE_DIR, 'web', 'public', 'books')

def load_checkpoint():
    with open(CHECKPOINT_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_checkpoint(cp):
    cp["stats"]["last_checkpoint_utc"] = datetime.now(timezone.utc).isoformat()
    with open(CHECKPOINT_PATH, 'w', encoding='utf-8') as f:
        json.dump(cp, f, ensure_ascii=False, indent=2)

def get_pali_paras(book_id, start_idx, end_idx):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "SELECT idx, rend, num, text FROM para WHERE book_id = ? AND idx >= ? AND idx <= ? ORDER BY idx",
        (book_id, start_idx, end_idx)
    )
    rows = c.fetchall()
    conn.close()
    return [{"idx": r[0], "rend": r[1], "num": r[2], "text": r[3]} for r in rows]

def apply_translations(book_id, book_file, translations):
    """
    translations: list of dicts with:
    para_idx, title, text, verse (optional), source (optional), translator (optional)
    """
    jsonl_path = os.path.join(JSONL_DIR, f"{book_file.replace('.mul', '')}.jsonl")
    if not os.path.exists(jsonl_path):
        jsonl_path = os.path.join(JSONL_DIR, f"{book_file}.jsonl")
    
    # 1. Read existing jsonl
    records = []
    with open(jsonl_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line))
    
    # Map by para_idx
    record_map = {r.get('para_idx', r.get('para')): r for r in records}
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    updated_indices = []
    for t in translations:
        idx = t["para_idx"]
        title = t.get("title", "")
        text = t.get("text", "")
        verse = t.get("verse", None)
        source = t.get("source", "विपश्यना विशोधन विन्यास (VRI) / सत्यानुभूति परम्परा")
        translator = t.get("translator", "Tipiṭaka.app VRI Scholarly Translation Project")
        conf = t.get("conf", 1.0)
        
        # Validation: check for bad boilerplate
        if "भगवान् बुद्ध ने इस प्रकार शील, समाधि, प्रज्ञा और विपश्यना-साधना द्वारा सत्य का साक्षात्कार करने का पावन उपदेश दिया" in text:
            raise ValueError(f"Para {idx} contains rejected boilerplate template text!")
        if len(text.strip()) < 5:
            raise ValueError(f"Para {idx} text is too short ({len(text.strip())} chars)!")
            
        # Update or create record in jsonl map
        if idx in record_map:
            rec = record_map[idx]
            rec["title"] = title
            rec["text"] = text
            if verse:
                rec["verse"] = verse
            elif "verse" in rec and not verse:
                # keep existing verse if not provided, or clean if empty
                pass
            rec["source"] = source
            rec["translator"] = translator
            rec["conf"] = conf
        else:
            rec = {
                "id": f"{book_file}-{idx}-hi",
                "book": book_file,
                "book_id": book_file,
                "para": idx,
                "para_idx": idx,
                "lang": "hi",
                "title": title,
                "text": text,
                "source": source,
                "translator": translator,
                "conf": conf
            }
            if verse:
                rec["verse"] = verse
            record_map[idx] = rec
            
        # Update SQLite translation table
        c.execute("""
            INSERT INTO translation (book_id, para_idx, lang, title, text, verse, source, translator, conf)
            VALUES (?, ?, 'hi', ?, ?, ?, ?, ?, ?)
            ON CONFLICT(book_id, para_idx, lang) DO UPDATE SET
                title = excluded.title,
                text = excluded.text,
                verse = excluded.verse,
                source = excluded.source,
                translator = excluded.translator,
                conf = excluded.conf
        """, (book_id, idx, title, text, verse, source, translator, conf))
        updated_indices.append(idx)
        
    conn.commit()
    conn.close()
    
    # 2. Re-write jsonl maintaining idx order
    max_idx = max(record_map.keys())
    sorted_records = [record_map[i] for i in range(max_idx + 1) if i in record_map]
    with open(jsonl_path, 'w', encoding='utf-8') as f:
        for r in sorted_records:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
            
    # 3. Update public books trans chunk
    trans_chunk_path = os.path.join(BOOKS_DIR, f"{book_id}-trans.json")
    if os.path.exists(trans_chunk_path):
        with open(trans_chunk_path, 'r', encoding='utf-8') as f:
            chunk = json.load(f)
        chunk_map = {item["i"]: item for item in chunk}
        for t in translations:
            idx = t["para_idx"]
            chunk_map[idx] = {
                "i": idx,
                "title": t.get("title", ""),
                "t": t.get("text", ""),
                "v": t.get("verse", None),
                "lang": "hi",
                "source": t.get("source", "विपश्यना विशोधन विन्यास (VRI) / सत्यानुभूति परम्परा"),
                "translator": t.get("translator", "Tipiṭaka.app VRI Scholarly Translation Project"),
                "conf": t.get("conf", 1.0)
            }
        sorted_chunk = [chunk_map[i] for i in sorted(chunk_map.keys())]
        with open(trans_chunk_path, 'w', encoding='utf-8') as f:
            json.dump(sorted_chunk, f, ensure_ascii=False)
            
    # 4. Update Checkpoint
    cp = load_checkpoint()
    cp["stats"]["last_batch_saved_idx"] = max(updated_indices)
    cp["current_para_idx"] = max(updated_indices) + 1
    
    # Recalculate bad count
    bad = 0
    with open(jsonl_path, 'r', encoding='utf-8') as f:
        for line in f:
            if "भगवान् बुद्ध ने इस प्रकार शील, समाधि, प्रज्ञा और विपश्यना-साधना द्वारा सत्य का साक्षात्कार करने का पावन उपदेश दिया" in line:
                bad += 1
    cp["stats"]["total_templated_paras_remaining"] = bad
    save_checkpoint(cp)
    
    print(f"Successfully applied {len(translations)} scholarly translations (indices {min(updated_indices)}..{max(updated_indices)}). Templated remaining: {bad}")
    return len(translations)

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--status':
        cp = load_checkpoint()
        print(json.dumps(cp, ensure_ascii=False, indent=2))
    elif len(sys.argv) > 1 and sys.argv[1] == '--inspect':
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        cp = load_checkpoint()
        start = cp["current_para_idx"]
        end = start + count - 1
        paras = get_pali_paras(cp["book_id"], start, end)
        for p in paras:
            print(f"=== Para {p['idx']} (rend={p['rend']}, num={p['num']}) ===")
            print(p['text'])
            print()
    else:
        print("Usage: python3 scripts/timeloop_translator.py [--status | --inspect [count]]")
