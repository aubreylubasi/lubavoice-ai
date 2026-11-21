#!/usr/bin/env python3
"""Builds web/index.html (one offline file) from web-src/. Run: python3 tools/build.py"""
import pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
src = root / 'web-src'
html = (src / 'shell.html').read_text(encoding='utf-8')
parts = {'/*STYLE*/': 'style.css', '/*CORE*/': 'core.js', '/*APP*/': 'app.js'}
for marker, name in parts.items():
    text = (src / name).read_text(encoding='utf-8')
    if '</script' in text.lower() or '</style' in text.lower():
        sys.exit(f'{name} contains a closing tag that would break the page')
    assert html.count(marker) == 1, marker
    html = html.replace(marker, text)
out = root / 'web' / 'index.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf-8')
print(f'wrote {out.relative_to(root)} ({len(html.encode()) // 1024} KB)')
