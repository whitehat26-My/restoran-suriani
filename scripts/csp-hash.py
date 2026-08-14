#!/usr/bin/env python3
"""Print the CSP sha256- hash of every inline <script> in public/index.html.

The site's Content-Security-Policy is hash-based rather than using
'unsafe-inline'. The only inline script is the JSON-LD structured-data block,
which browsers subject to script-src even though it is a data block and never
executed. Re-run this after editing that block and paste the value into the
script-src directive in public/_headers.
"""
import base64, hashlib, pathlib, re, sys

html = pathlib.Path("public/index.html").read_text(encoding="utf-8")
blocks = re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", html, re.S)

if not blocks:
    print("No inline <script> blocks found.")
    sys.exit(0)

for body in blocks:
    digest = hashlib.sha256(body.encode("utf-8")).digest()
    print("'sha256-" + base64.b64encode(digest).decode("ascii") + "'")
