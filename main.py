"""
Root deployment entrypoint fallback for Render / Vercel / PaaS platforms.
Forwards execution to server/app.py
"""
import os
import sys

_SERVER_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "server")
if _SERVER_DIR not in sys.path:
    sys.path.insert(0, _SERVER_DIR)

from server.app import app
