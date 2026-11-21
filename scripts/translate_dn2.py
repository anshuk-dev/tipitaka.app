# -*- coding: utf-8 -*-
"""
VRI-Style Hindi Translation Pipeline for Dīgha Nikāya 2: Mahāvaggapāḷi (s0102m.mul)
Translates all 1559 paragraphs into authentic, experiential Vipassana Research Institute
(VRI / S.N. Goenka) Hindi style with rhyming dohas for every gāthā.
"""

import json
import os
import re

BOOK_ID = "s0102m.mul"
INPUT_FILE = ".cache/parsed_paras/s0102m.mul.json"
OUTPUT_FILE = "data/translations/hi/s0102m.jsonl"

def clean_pali(text):
    text = re.sub(r'\|[MVPT][\d.]+\|', '', text)
    text = re.sub(r'\{.*?\}', '', text)
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def enforce_vri_terms(text):
    """Ensure strict adherence to VRI Vipassana vocabulary."""
    # Replace non-compliant variants while preserving accurate compound terms
    replacements = [
        (r'\bvedana\b', 'संवेदना'),
        (r'\bvedanā\b', 'संवेदना'),
        (r'सुखद वेदना', 'सुखद संवेदना'),
        (r'दुःखद वेदना', 'दुःखद संवेदना'),
        (r'अदुःख-असुख वेदना', 'अदुःख-असुख (समतामयी) संवेदना'),
        (r'शारीरिक वेदना', 'शारीरिक संवेदना'),
        (r'वेदनाओं', 'संवेदनाओं'),
        (r'संस्कारों', 'संस्कारों'),
        (r'संस्कार', 'संस्कार'),
        (r'संप्रजन्य', 'संप्रजन्य'),
        (r'सम्पजञ्ञ', 'संप्रजन्य'),
        (r'स्मृति और संप्रजन्य', 'स्मृति और संप्रजन्य'),
        (r'सजगता', 'सजगता'),
        (r'अनात्म', 'अनात्म'),
        (r'अनित्य', 'अनित्य'),
        (r'अनिच्च', 'अनित्य'),
        (r'दुःख', 'दुःख'),
        (r'निर्वाण', 'निर्वाण'),
        (r'समता', 'समता'),
        (r'उपेक्षा', 'समता (उपेक्षा)')
    ]
    for pattern, repl in replacements:
        text = re.sub(pattern, repl, text)
    return text

EOF
