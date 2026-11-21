// Run: node tests/core.test.js   (Node 18+)
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const LV = require('../web-src/core.js');

let passed = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('respelling: stress in capitals, common Greek sounds', () => {
  const cases = {
    'Τρίκαλα': 'TREE-ka-la', 'ευχαριστώ': 'ef-kha-ree-STO', 'απόγευμα': 'a-PO-yev-ma', 'ομπρέλα': 'om-BRE-la',
    'χιόνι': 'HYO-nee', 'μια': 'mya', 'Άγιο': 'A-yo', 'γιατρό': 'ya-TRO', 'ραντεβού': 'ran-de-VOO',
    'μπορείς': 'bo-REES', 'Γρήγορα': 'GHREE-gho-ra', 'Ξάνθη': 'KSAN-thee', 'προϊστάμενο': 'pro-ee-STA-me-no',
    'ειδοποιήσεων': 'ee-dho-pee-EE-se-on', 'δουλειά': 'dhoo-LYA', 'κόσμος': 'KOZ-mos', 'γεια': 'ya'
  };
  for (const [w, exp] of Object.entries(cases)) assert.strictEqual(LV.respellWord(w).text, exp, w);
});

test('respelling: punctuation stripped, Latin words kept, syllables counted', () => {
  const r = LV.respellLine('Τώρα, χαμήλωσε την ένταση από το tablet, σε παρακαλώ.');
  assert.strictEqual(r.items[0].r.text, 'TO-ra');
  assert.strictEqual(r.items[6].r.text, 'tablet');
  assert.ok(r.syllables >= 18 && r.syllables <= 24, 'syllables ' + r.syllables);
});

const WRAPPED = [
  'Αν μπορείς, θύμισέ μου τη συνάντηση με τον προϊστάμενο στις επτά Σεπτε',
  'μβρίου.',
  'Κοίτα, θύμισέ μου το ραντεβού με τον γιατρό στις είκοσι πέντε Οκτωβρίο',
  'υ.',
  'Μια στιγμή, βάλε υπενθύμιση για την προπόνηση στο γυμναστήριο στις εί',
  'κοσι τρεις Φεβρουαρίου, μόλις μπορέσεις.',
  'Πρόσθεσε στο ημερολόγιο τη συνάντηση με τον προϊστάμενο στις δώδεκ',
  'α Απριλίου, τώρα αμέσως.',
  'Τώρα, χαμήλωσε την ένταση του ήχου στο τριάντα τοις εκατό από το tabl',
  'et, σε παρακαλώ.',
  'Λοιπόν, ανέβασε τη φωτεινότητα της οθόνης στο δεκαπέντε τοις εκατό κ',
  'αι χαμήλωσε τη φωτεινότητα στο δεκαπέντε τοις εκατό, μόνο αυτό.',
  'Αν μπορείς, άλλαξε τη φωτεινότητα κατά είκοσι τοις εκατό.',
  'Συγγνώμη, πόσο δυνατό θα είναι το μελτέμι την επόμενη εβδομάδα στα Τ',
  'ρίκαλα;',
  'Βοήθησέ με, βάλε υπενθύμιση για το ραντεβού με τον γιατρό στις τρεις Οκ',
  'τωβρίου, μόλις μπορέσεις.'
].join('\n');

test('import: repairs words broken across lines', () => {
  const { entries, mode } = LV.splitEntries(WRAPPED);
  assert.strictEqual(mode, 'join');
  assert.strictEqual(entries.length, 9);
  assert.strictEqual(entries[0], 'Αν μπορείς, θύμισέ μου τη συνάντηση με τον προϊστάμενο στις επτά Σεπτεμβρίου.');
  assert.ok(entries[1].endsWith('είκοσι πέντε Οκτωβρίου.'));
  assert.ok(entries[2].includes('στις είκοσι τρεις Φεβρουαρίου'));
  assert.ok(entries[3].includes('στις δώδεκα Απριλίου'));
  assert.ok(entries[4].includes('από το tablet, σε παρακαλώ.'));
  assert.ok(entries[5].includes('εκατό και χαμήλωσε'));
  assert.ok(entries[7].endsWith('στα Τρίκαλα;'));
  assert.ok(entries[8].includes('τρεις Οκτωβρίου,'));
});

test('import: one entry per line when lines have no punctuation (word lists)', () => {
  const { entries, mode } = LV.splitEntries('ομπρέλα\nχιόνι\n\nβροχή\n');
  assert.strictEqual(mode, 'lines');
  assert.deepStrictEqual(entries, ['ομπρέλα', 'χιόνι', 'βροχή']);
});

test('import: numbered lines get their numbers removed', () => {
  const { entries } = LV.splitEntries('1. Θα έχει ομίχλη;\n2. Θα βρέξει;\n3) Άκου, θα έχει αέρα;');
  assert.deepStrictEqual(entries, ['Θα έχει ομίχλη;', 'Θα βρέξει;', 'Άκου, θα έχει αέρα;']);
});

test('CSV: Greek question marks do not confuse the column split', () => {
  const csv = 'id,text\n1,"Τι καιρό θα κάνει αύριο;"\n2,"Θα έχει χιόνι σήμερα, το πρωί;"\n3,Δείξε μου την πρόγνωση.\n';
  const { entries, column } = LV.entriesFromCSV(csv);
  assert.strictEqual(column, 1);
  assert.deepStrictEqual(entries, ['Τι καιρό θα κάνει αύριο;', 'Θα έχει χιόνι σήμερα, το πρωί;', 'Δείξε μου την πρόγνωση.']);
});

test('CSV: single column file', () => {
  const { entries } = LV.entriesFromCSV('Τι καιρό θα κάνει αύριο;\nΘα βρέξει;\n');
  assert.deepStrictEqual(entries, ['Τι καιρό θα κάνει αύριο;', 'Θα βρέξει;']);
});

test('duplicates are found (accents and spacing ignored)', () => {
  const d = LV.findDuplicates(['Θα βρέξει;', 'Θα έχει χιόνι;', 'θα  βρεξει;']);
  assert.deepStrictEqual(d, [{ index: 2, firstIndex: 0 }]);
});

test('search: Latin letters find Greek lines', () => {
  const k = LV.searchKeys('Συγγνώμη, θα φυσήξει μελτέμι σήμερα το βράδυ στα Τρίκαλα;');
  assert.ok(LV.matches(k, 'trikala'));
  assert.ok(LV.matches(k, 'meltemi trikala'));
  assert.ok(LV.matches(k, 'Τρικαλα'));
  assert.ok(!LV.matches(k, 'larisa'));
  assert.ok(LV.matches(LV.searchKeys('ευχαριστώ'), 'efharisto'));
  assert.ok(LV.matches(LV.searchKeys('στη Γλυφάδα;'), 'glyfada'));
});

// synthetic "speech": silence + noise bursts shaped like syllables
function fakeTake({ sr = 16000, lead = 1.0, speech = 2.5, trail = 1.0, amp = 0.3, noise = 0.001, clip = false, seed = 1 }) {
  let x = seed;
  const rnd = () => { x = (x * 16807) % 2147483647; return x / 2147483647 - 0.5; };
  const n = Math.round((lead + speech + trail) * sr);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let s = noise * rnd();
    if (t >= lead && t < lead + speech) {
      const env = 0.55 + 0.45 * Math.sin(2 * Math.PI * 5 * (t - lead));
      s += amp * env * (Math.sin(2 * Math.PI * 180 * t) * 0.6 + rnd() * 0.8);
    }
    out[i] = clip ? Math.max(-1, Math.min(1, s * 6)) : s;
  }
  return out;
}

test('QC: a clean take passes', () => {
  const r = LV.analyze(fakeTake({}), 16000, 16);
  assert.strictEqual(r.verdict, 'good', JSON.stringify(r.checks));
  assert.ok(Math.abs(r.lead - 1.0) < 0.15, 'lead ' + r.lead);
  assert.ok(Math.abs(r.trail - 1.0) < 0.15, 'trail ' + r.trail);
});

test('QC: silence, clipping, early start, cut end, missing words', () => {
  assert.strictEqual(LV.analyze(new Float32Array(16000 * 3), 16000, 10).checks[0].code, 'no_voice');
  const codes = (o, syl = 16) => LV.analyze(fakeTake(o), 16000, syl).checks.map((c) => c.code);
  assert.ok(codes({ clip: true }).includes('clipping'));
  assert.ok(codes({ lead: 0.1 }).includes('early_start'));
  assert.ok(codes({ trail: 0.1 }).includes('cut_end'));
  assert.ok(codes({ speech: 0.6 }, 30).includes('too_short'));
  assert.ok(codes({ noise: 0.08 }).some((c) => c === 'noisy' || c === 'very_noisy'));
  assert.ok(codes({ amp: 0.01, noise: 0.0001 }).some((c) => c === 'quiet' || c === 'very_quiet'));
});

test('WAV: encode/decode round trip, 16-bit mono', () => {
  const s = fakeTake({ speech: 0.5, lead: 0.1, trail: 0.1 });
  const wav = LV.encodeWav(s, 16000);
  assert.strictEqual(wav.length, 44 + s.length * 2);
  const d = LV.decodeWav(wav);
  assert.strictEqual(d.sr, 16000);
  assert.strictEqual(d.samples.length, s.length);
  for (let i = 0; i < s.length; i += 997) assert.ok(Math.abs(d.samples[i] - s[i]) < 1e-4);
});

test('ZIP: writer output can be read back with correct CRCs', async () => {
  const zw = new LV.ZipWriter();
  const parts = [];
  parts.push(...zw.add('Greek_001.wav', LV.encodeWav(new Float32Array(800), 16000)));
  parts.push(...zw.add('manifest.csv', '﻿file,text\nGreek_001.wav,Τι καιρό θα κάνει;\n'));
  parts.push(...zw.finish());
  const total = parts.reduce((a, p) => a + p.length, 0);
  const u8 = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { u8.set(p, o); o += p.length; }
  const files = LV.unzip(u8);
  assert.deepStrictEqual([...files.keys()], ['Greek_001.wav', 'manifest.csv']);
  const csv = new TextDecoder().decode(await files.get('manifest.csv')());
  assert.ok(csv.includes('Τι καιρό θα κάνει;'));
  const wav = await files.get('Greek_001.wav')();
  assert.strictEqual(LV.decodeWav(wav).samples.length, 800);
  // also verify with system unzip if present (CRC check)
  try {
    const tmp = path.join(require('os').tmpdir(), 'lv_test.zip');
    fs.writeFileSync(tmp, u8);
    require('child_process').execFileSync('unzip', ['-tq', tmp]);
  } catch (e) { if (e.code !== 'ENOENT') throw e; }
});

test('XLSX: reads the text column from a real Excel file', async () => {
  const u8 = new Uint8Array(fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.xlsx')));
  const { entries } = await LV.entriesFromXLSX(u8);
  assert.deepStrictEqual(entries, ['Τι καιρό θα κάνει αύριο το απόγευμα στην Τρίπολη;', 'Θα έχει παγετό σήμερα το βράδυ στην Ίο;', 'Γρήγορα, θα βρέξει σήμερα το βράδυ στην Ελευσίνα;']);
});

test('file names are numbered and padded', () => {
  assert.strictEqual(LV.fileNameFor(0, 600), 'Greek_001.wav');
  assert.strictEqual(LV.fileNameFor(599, 600), 'Greek_600.wav');
  assert.strictEqual(LV.fileNameFor(9, 1200), 'Greek_0010.wav');
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); passed++; console.log('  ✓ ' + name); }
    catch (e) { console.error('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; }
  }
  console.log(`\n${passed}/${tests.length} passed`);
})();
