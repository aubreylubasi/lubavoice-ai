# LubaVoice AI

A Greek pronunciation coach and recording-practice app. Built for people who **don't speak Greek** but need to read Greek sentences aloud clearly, like voice-data tasks.

Everything runs on your device and works offline. There are no accounts, no paid services and no servers.

## Download

**Android:** open the [latest release](../../releases/latest) on your phone and install **LubaVoice-AI.apk**.
**Computer:** download **LubaVoice-AI.html** from the same page and open it in Chrome.

## What it does

| | |
|---|---|
| **Import** | Paste text or load TXT, CSV or Excel (.xlsx). It repairs words split across lines (`Τ` / `ρίκαλα` → `Τρίκαλα`), removes numbering and flags duplicates. It handles 600+ lines easily. |
| **Pronunciation guide** | Every word is respelled in English sounds with the stressed syllable in CAPITALS: `ευχαριστώ` → **ef-kha-ree-STO**, `απόγευμα` → **a-PO-yev-ma**. A sounds key is in the Guide tab. |
| **Listen** | Plays the line in a native Greek voice, at normal or slow speed. You can also tap any single word. Android uses the phone's text-to-speech, and Mac uses the free "Melina" voice. |
| **Record** | One tap. A 1-second quiet countdown, then speak. It stops by itself about a second after you finish. |
| **Automatic checks** | Flags no voice, distortion, too quiet, background noise, starting or stopping too soon, long pauses, and takes too short for the sentence (missing words). Then Retake or Accept. |
| **Prompter search** | Type `trikala` or `Τρίκαλα` to jump to a line. |
| **Progress** | Shows accepted, recorded, to-do and needs-redo counts, total audio and estimated time left. It survives restarts. |
| **Export** | A ZIP of your takes (`Greek_001.wav` …, 16-bit mono), plus `manifest.csv` (file → sentence) and `report.txt`. On Android it saves to Downloads/LubaVoice. |

The microphone is released as soon as each take ends, so other apps can record. In split screen on Android you can keep LubaVoice open next to your recording app.

> **FunCrowd users:** FunCrowd records inside its own app, so your final takes are made there. Use LubaVoice to learn and rehearse each line until the checks are green.

## How it's built

```
web-src/      the app (plain HTML/CSS/JS, no libraries)
  core.js     Greek respelling, text import, quality checks, WAV + ZIP
  app.js      screens, recorder, text-to-speech, storage (IndexedDB)
tools/build.py  bundles web-src/ into web/index.html (one offline file)
android/      small Java WebView app: Greek TTS, mic permission, file import, save to Downloads
tests/        core tests (Node) and end-to-end tests (Chrome + fake microphone)
.github/workflows/android.yml  builds the APK and publishes it to Releases on every push
```

Develop: edit `web-src/`, run `python3 tools/build.py`, then `node tests/core.test.js`.
End-to-end: `python3 tests/e2e_test.py some_voice.wav` (needs Playwright and Chrome).

The APK is signed with `android/app/lubavoice.keystore` (password `lubavoice`), so every new build installs over the previous one. That key is public, which is fine for a personal sideloaded app. For a Play Store release, use a private key instead.

## Privacy

Everything stays on your device: your text, recordings and progress. The app has no internet permission, no accounts and no tracking. Full policy: [aubreylubasi.dev/privacy.html](https://aubreylubasi.dev/privacy.html#lubavoice-ai). Terms: [aubreylubasi.dev/terms.html](https://aubreylubasi.dev/terms.html).
