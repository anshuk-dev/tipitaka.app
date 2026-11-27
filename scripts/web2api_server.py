#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Local Web2API Bridge Server for Tipitaka.app
Provides an OpenAI-compatible REST endpoint (/v1/chat/completions) with CORS enabled.
Supports Google Gemini, OpenAI, Groq, OpenRouter, and offline fallback translation.
Zero external dependencies (uses standard Python 3 http.server & urllib).
"""

import sys
import os
import json
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = int(os.environ.get("PORT", 8787))
DEFAULT_KEY = os.environ.get("WEB2API_KEY", "")

# Upstream endpoint mappings
GEMINI_OPENAI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
OPENAI_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1/chat/completions")

class Web2ApiHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        self._send_cors_headers()
        if self.path in ["/", "/health", "/v1"]:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            resp = {
                "status": "online",
                "service": "Tipitaka Web2API Local Bridge",
                "endpoints": {
                    "chat": "http://localhost:%d/v1/chat/completions" % PORT,
                    "health": "http://localhost:%d/health" % PORT
                }
            }
            self.wfile.write(json.dumps(resp, indent=2).encode("utf-8"))
        else:
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "not_found"}).encode("utf-8"))

    def do_POST(self):
        if not self.path.rstrip("/").endswith("/v1/chat/completions") and not self.path.rstrip("/").endswith("/chat/completions"):
            self.send_response(404)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Not Found. Use /v1/chat/completions"}).encode("utf-8"))
            return

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        try:
            req_data = json.loads(body.decode("utf-8"))
        except Exception as e:
            self.send_response(400)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Invalid JSON: %s" % str(e)}).encode("utf-8"))
            return

        # Extract Authorization header
        auth_header = self.headers.get("Authorization", "")
        api_key = DEFAULT_KEY
        if auth_header.startswith("Bearer "):
            api_key = auth_header[7:].strip()

        # Target upstream selection based on API key prefix or model
        model = req_data.get("model", "gemini-2.5-flash")
        upstream_url = OPENAI_URL

        # Google Gemini API keys typically start with AIza
        if api_key.startswith("AIza") or "gemini" in model.lower():
            upstream_url = GEMINI_OPENAI_URL
            if "gemini" not in req_data.get("model", ""):
                req_data["model"] = "gemini-2.5-flash"

        if not api_key:
            # Fallback offline response if no API key provided
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            offline_reply = {
                "id": "chatcmpl-offline-demo",
                "object": "chat.completion",
                "model": "offline-fallback",
                "choices": [{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "नमो तस्स भगवतो अरहतो सम्मासम्बुद्धस्स — उन अर्हत्, सम्यक्सम्बुद्ध तथागत को नमन।\n\n(Local Web2API Server is active! Paste your Google Gemini or OpenAI API Key in Settings for live neural translations.)"
                    },
                    "finish_reason": "stop"
                }]
            }
            self.wfile.write(json.dumps(offline_reply).encode("utf-8"))
            return

        # Forward request to upstream
        try:
            forward_headers = {
                "Content-Type": "application/json",
                "Authorization": "Bearer %s" % api_key
            }
            upstream_req = urllib.request.Request(
                upstream_url,
                data=json.dumps(req_data).encode("utf-8"),
                headers=forward_headers,
                method="POST"
            )
            with urllib.request.urlopen(upstream_req, timeout=40) as response:
                resp_data = response.read()
                self.send_response(response.status)
                self._send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(resp_data)
        except urllib.error.HTTPError as he:
            err_body = he.read()
            self.send_response(he.code)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(err_body)
        except Exception as ge:
            self.send_response(500)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": {"message": str(ge)}}).encode("utf-8"))

    def log_message(self, format, *args):
        # Clean logging
        sys.stderr.write("[Web2API Bridge] %s\n" % (format % args))

def run():
    server_address = ("127.0.0.1", PORT)
    httpd = HTTPServer(server_address, Web2ApiHandler)
    print("=" * 60)
    print(" Tipitaka Web2API Local Server Running")
    print(" URL: http://localhost:%d/v1/chat/completions" % PORT)
    print(" Health check: http://localhost:%d/health" % PORT)
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Web2API server...")
        httpd.server_close()

if __name__ == "__main__":
    run()
