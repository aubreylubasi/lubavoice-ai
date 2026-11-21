#!/usr/bin/env python3
"""End-to-end test in real Chrome with a fake microphone.
Usage: python3 tests/e2e_test.py /path/to/fake_voice.wav [outdir]
"""
import http.server, io, json, os, pathlib, socketserver, sys, threading, time, wave, zipfile, base64
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
WAV = sys.argv[1]
OUT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else '/tmp/lv_e2e'); OUT.mkdir(parents=True, exist_ok=True)
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(ROOT / 'web'), **k)
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), H); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{port}/index.html'

ok = 0
def check(cond, msg):
    global ok
    if not cond: raise AssertionError(msg)
    ok += 1; print('  ✓', msg)

FAKE_BRIDGE = """
window.__saved = {}; window.__spoken = [];
window.LubaAndroid = {
  ttsStatus(){ return 'ok'; }, appVersion(){ return 'test'; },
  speak(t, r, id){ window.__spoken.push([t, r]); setTimeout(() => window.__lubaTtsDone(id), 50); },
  stopSpeaking(){}, installGreekVoice(){}, openTtsSettings(){}, recheckVoice(){},
  saveBegin(n, m){ const t = 't' + Object.keys(window.__saved).length; window.__saved[t] = {name: n, mime: m, chunks: [], closed: false}; return t; },
  saveChunk(t, b){ window.__saved[t].chunks.push(b); return 'OK'; },
  saveEnd(t){ window.__saved[t].closed = true; return 'OK|Downloads/LubaVoice/' + window.__saved[t].name; },
  shareLast(){ window.__shared = true; }
};
"""

def record_take(page, label):
    page.click('#recBtn')
    page.wait_for_function("document.querySelector('#recState').textContent.includes('Speak now')", timeout=8000)
    page.wait_for_function("window.__lv.Rec.state === 'idle' && !document.querySelector('#result').hidden", timeout=25000)
    v = page.text_content('#verdict'); facts = page.text_content('#facts')
    print(f'    [{label}] {v} | {facts} | checks: {page.text_content("#checks")!r}')
    return v

def check_zip(data, expect_files):
    z = zipfile.ZipFile(io.BytesIO(data))
    check(z.testzip() is None, 'ZIP CRCs are valid')
    names = z.namelist()
    for n in expect_files: check(n in names, f'ZIP contains {n}')
    w = wave.open(io.BytesIO(z.read(expect_files[0])))
    check((w.getnchannels(), w.getsampwidth(), w.getframerate()) == (1, 2, 16000), 'WAV is mono 16-bit 16 kHz')
    check(w.getnframes() / 16000 > 3, f'WAV has audio ({w.getnframes()/16000:.1f} s)')
    man = z.read('manifest.csv').decode('utf-8-sig')
    check('Greek_001.wav,1,Τι καιρό θα κάνει αύριο το απόγευμα στην Τρίπολη;' in man, 'manifest maps file → Greek sentence')
    return z

with sync_playwright() as p:
    args = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', f'--use-file-for-fake-audio-capture={WAV}', '--autoplay-policy=no-user-gesture-required']
    browser = p.chromium.launch(executable_path=CHROME, headless=True, args=args)

    # ---------------- 1. browser mode (Mac / desktop Chrome) ----------------
    print('Browser mode (http://localhost):')
    ctx = browser.new_context(viewport={'width': 412, 'height': 915}, device_scale_factor=2, accept_downloads=True, permissions=['microphone'])
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.goto(URL)
    page.wait_for_selector('#recEmpty:not([hidden])')
    page.screenshot(path=str(OUT / '01_empty.png'))
    page.click('#emptyDemo')
    page.wait_for_selector('#recMain:not([hidden])')
    check(page.text_content('#lnum') == 'Line 1 of 49', 'demo loads 49 lines')
    check('a-PO-yev-ma' in page.text_content('#words').replace('\n', ''), 'pronunciation chips render (απόγευμα → a-PO-yev-ma)')
    page.wait_for_function("window.__lv.TTS.status !== 'checking'", timeout=6000)
    st = page.evaluate("window.__lv.TTS.status")
    print('    browser voice status:', st, page.evaluate("speechSynthesis.getVoices().length"), 'voices')
    if st != 'ok':
        check(page.is_visible('#voiceBanner'), 'missing-Greek-voice banner shows when the browser has no Greek voice')
    page.screenshot(path=str(OUT / '02_line.png'), full_page=True)

    v = record_take(page, 'line 1')
    check('Good take' in v, 'clean take is rated good')
    check(page.evaluate("window.__lv.S.lines[0].status") == 'rec', 'line marked recorded')
    page.screenshot(path=str(OUT / '03_result.png'), full_page=True)
    page.click('#btnAccept')
    page.wait_for_function("document.querySelector('#lnum').textContent === 'Line 2 of 49'")
    check(page.text_content('#hdrProg') == '1 / 49 accepted', 'accept moves to next line and updates progress')
    record_take(page, 'line 2'); page.click('#btnAccept')
    page.wait_for_function("document.querySelector('#lnum').textContent === 'Line 3 of 49'")
    # retake path
    record_take(page, 'line 3'); record_take(page, 'line 3 retake')
    check(page.evaluate("window.__lv.S.lines[2].status") == 'rec', 'retake keeps line as recorded (not accepted)')

    # lines + search
    page.click('nav.tabs button[data-tab=lines]')
    page.fill('#q', 'trikala')
    page.wait_for_function("document.querySelector('#listCount').textContent.startsWith('2 of')")
    check(True, 'search “trikala” finds the 2 Τρίκαλα lines')
    page.fill('#q', 'Θάσο'); page.wait_for_function("document.querySelector('#listCount').textContent.startsWith('1 of')")
    check(True, 'Greek search works')
    page.fill('#q', '')
    page.click('#filters button[data-f=done]'); page.wait_for_function("document.querySelector('#listCount').textContent.startsWith('2 of')")
    check(True, 'filter “Accepted” shows 2')
    page.click('#filters button[data-f=all]')
    page.screenshot(path=str(OUT / '04_lines.png'))
    page.click('#list button[data-i="4"]')
    check(page.text_content('#lnum') == 'Line 5 of 49', 'tapping a line opens it')

    # export ZIP + CSV
    page.click('nav.tabs button[data-tab=export]')
    check('2' in page.text_content('#stats'), 'progress stats render')
    page.screenshot(path=str(OUT / '05_progress.png'), full_page=True)
    with page.expect_download() as dl:
        page.click('#expZip')
    d = dl.value; zpath = OUT / d.suggested_filename; d.save_as(zpath)
    z = check_zip(zpath.read_bytes(), ['Greek_001.wav', 'Greek_002.wav', 'manifest.csv', 'report.txt', 'README.txt'])
    check('Greek_003.wav' not in z.namelist(), 'unaccepted take left out by default')
    page.check('#expAll', force=True)
    with page.expect_download() as dl:
        page.click('#expZip')
    z2 = zipfile.ZipFile(dl.value.path())
    check('Greek_003.wav' in z2.namelist(), '“include not accepted” adds line 3')
    with page.expect_download() as dl:
        page.click('#expCsv')
    csv = pathlib.Path(dl.value.path()).read_text(encoding='utf-8-sig')
    check(csv.count('\n') == 50, 'manifest CSV has all 49 lines + header')

    # persistence
    page.reload(); page.wait_for_selector('#recMain:not([hidden])')
    check(page.text_content('#hdrProg') == '2 / 49 accepted', 'progress survives a reload')
    print('    lnum after reload:', page.text_content('#lnum'))
    check(page.text_content('#lnum') == 'Line 5 of 49', 'reopens on the line you were on')
    page.click('nav.tabs button[data-tab=lines]'); page.click('#list button[data-i="0"]')
    page.wait_for_selector('#result:not([hidden])', timeout=5000)
    check('Good take' in page.text_content('#verdict'), 'saved take and its check re-open after reload')

    # import: xlsx + wrapped text
    page.click('nav.tabs button[data-tab=import]')
    page.set_input_files('#impFile', str(ROOT / 'tests/fixtures/sample.xlsx'))
    page.wait_for_function("document.querySelector('#impPreview').textContent.includes('3 lines found')")
    check(True, 'Excel file imports 3 lines')
    wrapped = 'Συγγνώμη, πόσο δυνατό θα είναι το μελτέμι την επόμενη εβδομάδα στα Τ\nρίκαλα;\nΆλλαξε την ένταση του ήχου στο δεκαπέντε τοις εκατό από το tablet, ευχα\nριστώ.\nΘα έχει ομίχλη από τώρα και στο εξής στην Πάτρα;'
    page.fill('#impText', wrapped)
    page.wait_for_function("document.querySelector('#impPreview').textContent.includes('2 broken lines joined')")
    prev = page.text_content('#impPreview')
    check('στα Τρίκαλα;' in prev and 'ευχαριστώ.' in prev, 'broken words are joined in the preview')
    page.screenshot(path=str(OUT / '06_import.png'), full_page=True)
    page.click('#impLoad')
    page.wait_for_selector('#modal:not([hidden])')
    check(True, 'replacing recorded lines asks first')
    page.click('#modalYes')
    page.wait_for_function("document.querySelector('#lnum').textContent === 'Line 1 of 3'")
    check(True, 'new list loaded')
    check(page.evaluate("window.__lv.S.lines[0].text") == 'Συγγνώμη, πόσο δυνατό θα είναι το μελτέμι την επόμενη εβδομάδα στα Τρίκαλα;', 'stored text is repaired')

    # guide
    page.click('nav.tabs button[data-tab=guide]')
    page.screenshot(path=str(OUT / '07_guide.png'), full_page=True)
    check(not [e for e in errors if 'favicon' not in e], 'no JavaScript errors: ' + '; '.join(errors[:3]))
    ctx.close()

    # ---------------- 2. Android-app mode (fake native bridge) ----------------
    print('Android bridge mode:')
    ctx = browser.new_context(viewport={'width': 412, 'height': 915}, device_scale_factor=2, permissions=['microphone'])
    ctx.add_init_script(FAKE_BRIDGE)
    page = ctx.new_page(); errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL)
    page.click('#emptyDemo'); page.wait_for_selector('#recMain:not([hidden])')
    check(page.is_hidden('#voiceBanner'), 'native Greek voice detected, no warning banner')
    page.click('#btnListen'); page.wait_for_timeout(200)
    page.click('#words .w >> nth=4'); page.wait_for_timeout(200)
    spoken = page.evaluate('window.__spoken')
    check(spoken[0][0].startswith('Τι καιρό') and abs(spoken[0][1] - 0.9) < 1e-6, 'Listen sends the line to the phone voice at 0.9×')
    check(spoken[1][0] == 'αύριο', 'tapping a word speaks just that word')
    record_take(page, 'android line 1'); page.click('#btnAccept')
    page.wait_for_function("document.querySelector('#lnum').textContent === 'Line 2 of 49'")
    page.click('nav.tabs button[data-tab=export]')
    page.click('#expZip')
    page.wait_for_function("document.querySelector('#expMsg').textContent.startsWith('Done')", timeout=15000)
    saved = page.evaluate('window.__saved')
    s = list(saved.values())[0]
    check(s['closed'] and s['name'].endswith('.zip'), 'ZIP streamed to the phone’s Downloads via the bridge')
    data = b''.join(base64.b64decode(c) for c in s['chunks'])
    check_zip(data, ['Greek_001.wav', 'manifest.csv'])
    check(page.is_visible('#btnShare'), 'Share button appears after saving')
    page.screenshot(path=str(OUT / '08_android_export.png'), full_page=True)
    # back button + pause release mic
    page.click('nav.tabs button[data-tab=guide]')
    check(page.evaluate('window.__lubaBack()') is True and page.is_visible('#v-record'), 'Back goes to Record first')
    check(page.evaluate('window.__lubaBack()') is False, 'Back on Record lets Android close the app')
    page.click('#recBtn'); page.wait_for_function("window.__lv.Rec.state === 'speak'", timeout=8000)
    page.evaluate('window.__lubaPause()')
    check(page.evaluate('window.__lv.Rec.state') == 'idle' and page.evaluate('window.__lv.Rec.stream') is None, 'going to background stops recording and frees the mic')
    check(not errors, 'no JavaScript errors in app mode')
    ctx.close()

    # ---------------- 3. opened as a local file (double-click on a Mac) ----------------
    print('Local file mode (file://):')
    ctx = browser.new_context(viewport={'width': 1280, 'height': 860}, accept_downloads=True, permissions=['microphone'])
    page = ctx.new_page(); errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto((ROOT / 'web' / 'index.html').as_uri())
    page.click('#emptyDemo'); page.wait_for_selector('#recMain:not([hidden])')
    v = record_take(page, 'file:// line 1')
    check('take' in v.lower() or 'redo' in v.lower(), 'recording works from a local file')
    page.screenshot(path=str(OUT / '09_desktop.png'), full_page=True)
    check(not errors, 'no JavaScript errors in file mode')
    ctx.close()
    browser.close()

print(f'\nAll {ok} checks passed')
