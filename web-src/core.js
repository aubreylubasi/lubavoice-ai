/* LubaVoice AI — core engine (no dependencies, works in browsers and Node).
 * - Greek → English-sounds respelling with the stressed syllable in CAPITALS
 * - Text import: TXT / CSV / XLSX, repairs words broken across lines
 * - Recording quality checks
 * - WAV encode/decode, ZIP write/read
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- Greek letters
  const ACC = { 'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω', 'ΐ': 'ι', 'ΰ': 'υ', 'ϊ': 'ι', 'ϋ': 'υ' };
  const STRESS = new Set([...'άέήίόύώΐΰ']);
  const DIA = new Set([...'ϊϋΐΰ']);
  const VOWELS = new Set([...'αεηιουω']);
  const VOICED = new Set([...'βγδζλμνρ']);
  const base = (c) => ACC[c] || c;
  const isGreekChar = (c) => /[Ͱ-Ͽἀ-῿]/.test(c);
  const hasGreek = (s) => /[Ͱ-Ͽἀ-῿]/.test(s);

  // Does the vowel sound starting at ch[j] sound like "e" or "ee"?
  function frontAt(ch, j) {
    const c = ch[j];
    if (!c) return false;
    const b = base(c);
    if (b === 'ε' || b === 'η' || b === 'ι' || b === 'υ') return true;
    const n = ch[j + 1];
    if ((b === 'α' || b === 'ο') && n && base(n) === 'ι' && !DIA.has(n) && !STRESS.has(c)) return true;
    return false;
  }

  // Word → list of sound units {t:'V'|'C', p:'spelling', s:stressed, iS:is "ee" sound that may glide}
  function soundUnits(word) {
    const ch = [...word.normalize('NFC').toLowerCase().replace(/ς/g, 'σ')].filter(isGreekChar);
    const U = [];
    const V = (p, s, iS) => U.push({ t: 'V', p, s: !!s, iS: !!iS });
    const C = (p) => U.push({ t: 'C', p });
    const n = ch.length;
    let i = 0;
    while (i < n) {
      const c = ch[i], b = base(c), nx = ch[i + 1], nb = nx ? base(nx) : '';
      if (VOWELS.has(b)) {
        const canPair = nx && !DIA.has(nx) && !STRESS.has(c) && !DIA.has(c);
        if (canPair) {
          if (b === 'α' && nb === 'ι') { V('e', STRESS.has(nx)); i += 2; continue; }
          if ((b === 'ε' || b === 'ο' || b === 'υ') && nb === 'ι') { V('ee', STRESS.has(nx), true); i += 2; continue; }
          if (b === 'ο' && nb === 'υ') { V('oo', STRESS.has(nx)); i += 2; continue; }
          if ((b === 'α' || b === 'ε' || b === 'η') && nb === 'υ') {
            const af = ch[i + 2];
            const voiced = af ? (VOWELS.has(base(af)) || VOICED.has(af)) : false;
            V(b === 'α' ? 'a' : b === 'ε' ? 'e' : 'ee', STRESS.has(nx));
            C(voiced ? 'v' : 'f');
            i += 2; continue;
          }
        }
        V({ α: 'a', ε: 'e', η: 'ee', ι: 'ee', ο: 'o', υ: 'ee', ω: 'o' }[b], STRESS.has(c), b === 'ι');
        i++; continue;
      }
      const atStart = U.length === 0;
      const two = c + (nx || '');
      if (two === 'μπ') { if (atStart) C('b'); else { C('m'); C('b'); } i += 2; continue; }
      if (two === 'ντ') { if (atStart) C('d'); else { C('n'); C('d'); } i += 2; continue; }
      if (two === 'γκ') { if (atStart) C('g'); else { C('n'); C('g'); } i += 2; continue; }
      if (two === 'γγ') {
        if (ch[i + 2] === 'ν') { C('gh'); i += 2; continue; } // Συγγνώμη → see-GHNO-mee
        C('n'); C('g'); i += 2; continue;
      }
      if (c === 'γ' && (nx === 'χ' || nx === 'ξ')) { C('n'); i++; continue; }
      if (two === 'τσ') { C('ts'); i += 2; continue; }
      if (two === 'τζ') { C('dz'); i += 2; continue; }
      if (nx === c) { i++; continue; } // double consonant sounds single
      let p = '';
      switch (c) {
        case 'β': p = 'v'; break;
        case 'γ': p = frontAt(ch, i + 1) ? 'y' : 'gh'; break;
        case 'δ': p = 'dh'; break;
        case 'ζ': p = 'z'; break;
        case 'θ': p = 'th'; break;
        case 'κ': p = 'k'; break;
        case 'λ': p = 'l'; break;
        case 'μ': p = 'm'; break;
        case 'ν': p = 'n'; break;
        case 'ξ': p = 'ks'; break;
        case 'π': p = 'p'; break;
        case 'ρ': p = 'r'; break;
        case 'σ': p = nx && VOICED.has(nx) ? 'z' : 's'; break;
        case 'τ': p = 't'; break;
        case 'φ': p = 'f'; break;
        case 'χ': p = frontAt(ch, i + 1) ? 'h' : 'kh'; break;
        case 'ψ': p = 'ps'; break;
        default: p = '';
      }
      if (p) C(p);
      i++;
    }
    // Glides: unstressed "ee" squeezed before another vowel (μια → mya, χιόνι → HYO-nee, Άγιο → A-yo)
    const hasStress = ch.some((c) => STRESS.has(c));
    const out = [];
    for (let k = 0; k < U.length; k++) {
      const u = U[k];
      if (u.t === 'V' && u.iS && !u.s) {
        const prev = out[out.length - 1], next = U[k + 1];
        if (prev && prev.t === 'C' && next && next.t === 'V' && next.p !== 'ee') {
          if (prev.p === 'y') continue;
          if (next.s || !hasStress) { out.push({ t: 'C', p: 'y' }); continue; }
        }
      }
      out.push(u);
    }
    return out;
  }

  // Consonant groups kept together at the start of a syllable (kept small so it reads easily in English)
  const ONSETS = new Set(('pr br tr dr kr gr ghr fr vr thr dhr khr hr pl bl kl gl ghl fl vl thl khl sl zl ' +
    'st sp sk str spr skr spl skl').split(' '));

  function syllabify(U) {
    const syl = [];
    let pend = [];
    for (const u of U) {
      if (u.t === 'C') { pend.push(u.p); continue; }
      if (!syl.length) { syl.push({ c: pend.concat(u.p), s: u.s }); pend = []; continue; }
      const k = pend.length;
      let on = 0;
      if (k === 1) on = 1;
      else if (k >= 2) {
        on = 1;
        for (let L = Math.min(3, k); L >= 2; L--) {
          if (ONSETS.has(pend.slice(k - L).join(''))) { on = L; break; }
        }
        // a "y" glide stays with the consonant before it (δουλειά → dhoo-LYA)
        if (pend[k - 1] === 'y') on = k >= 3 && ONSETS.has(pend.slice(k - 3, k - 1).join('')) ? 3 : 2;
      }
      syl[syl.length - 1].c.push(...pend.slice(0, k - on));
      syl.push({ c: pend.slice(k - on).concat(u.p), s: u.s });
      pend = [];
    }
    if (pend.length) {
      if (syl.length) syl[syl.length - 1].c.push(...pend);
      else syl.push({ c: pend, s: false });
    }
    return syl.map((x) => ({ txt: x.c.join(''), s: x.s }));
  }

  // Respell one word. Returns {text, syl:[{txt,s}], count, greek:boolean}
  function respellWord(word) {
    const core = word.replace(/[^\p{L}\p{N}]+/gu, '');
    if (!core) return { text: '', syl: [], count: 0, greek: false };
    if (!hasGreek(core)) {
      const groups = core.toLowerCase().match(/[aeiouy]+/g);
      return { text: core, syl: [{ txt: core, s: false }], count: Math.max(1, groups ? groups.length : 1), greek: false };
    }
    const syl = syllabify(soundUnits(core));
    const text = syl.map((x) => (x.s ? x.txt.toUpperCase() : x.txt)).join('-');
    return { text, syl, count: Math.max(1, syl.length), greek: true };
  }

  // Respell a full line → [{word, respell}] plus total syllables
  function respellLine(line) {
    const words = String(line || '').trim().split(/\s+/).filter(Boolean);
    let syllables = 0;
    const items = words.map((w) => {
      const r = respellWord(w);
      syllables += r.count;
      return { word: w, r };
    });
    return { items, syllables, text: items.map((x) => x.r.text).filter(Boolean).join(' ') };
  }

  // ---------------------------------------------------------------- search
  function stripMarks(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC'); }
  function fuzzy(s) {
    let t = stripMarks(String(s).toLowerCase()).replace(/[^a-z]/g, '');
    const reps = [['kh', 'h'], ['ch', 'h'], ['gh', 'g'], ['dh', 'd'], ['th', 't'], ['ph', 'f'], ['sh', 's'],
      ['eu', 'ef'], ['au', 'af'], ['ee', 'i'], ['oo', 'u'], ['ou', 'u'], ['y', 'i'], ['w', 'o'], ['v', 'f'],
      ['x', 'ks'], ['c', 'k'], ['q', 'k'], ['j', 'i'], ['b', 'mp'], ['d', 'nt']];
    for (const [a, b] of reps) t = t.split(a).join(b);
    return t.replace(/(.)\1+/g, '$1');
  }
  function greekKey(s) { return stripMarks(String(s).toLowerCase().replace(/ς/g, 'σ')).replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim(); }
  function searchKeys(line) {
    const r = respellLine(line);
    return { g: greekKey(line), l: r.items.map((x) => fuzzy(x.r.text)).join(' ') };
  }
  function matches(keys, query) {
    const q = String(query || '').trim();
    if (!q) return true;
    if (hasGreek(q)) return greekKey(q).split(' ').every((w) => keys.g.includes(w));
    if (/^\d+$/.test(q)) return false;
    return q.split(/\s+/).map(fuzzy).filter(Boolean).every((w) => keys.l.split(' ').join('').includes(w) || keys.l.includes(w));
  }

  // ---------------------------------------------------------------- text import
  const END_PUNCT = /[.;!?…»"')\]]\s*$/;
  const FUNC = new Set(('ο η το τα οι τη την τον της του των τις τους στο στη στην στον στα στις στους σε με θα να ' +
    'και κι για που μου σου μας σας τοις ενα μια μα αν ας δε δεν μη μην ως εν ναι πιο πια τρεις δυο ' +
    'tablet').split(' '));
  const hasAccent = (s) => [...s].some((c) => STRESS.has(c));
  const letters = (s) => s.replace(/[^\p{L}]/gu, '');

  function joinPieces(a, b) {
    if (/\s$/.test(a) || /^\s/.test(b)) return a.trimEnd() + ' ' + b.trim();
    const lastTok = (a.match(/(\S+)$/) || ['', ''])[1];
    const firstTok = (b.match(/^(\S+)/) || ['', ''])[1];
    const lf = letters(lastTok).toLowerCase(), ff = letters(firstTok).toLowerCase();
    const sep = a + ' ' + b, glue = a + b;
    if (/[,·:]$/.test(lastTok)) return sep;
    if (/^\p{Lu}/u.test(letters(firstTok))) return sep;
    if (hasAccent(lf) && hasAccent(ff)) return sep;
    if (FUNC.has(lf) && (hasAccent(ff) || FUNC.has(ff))) return sep;
    if (FUNC.has(ff) && hasAccent(lf)) return sep;
    return glue;
  }

  // Split pasted text / TXT file into entries.
  // join: 'auto' | 'join' | 'lines'
  function splitEntries(raw, opts) {
    const o = Object.assign({ join: 'auto', stripNumbers: 'auto' }, opts || {});
    let lines = String(raw || '').normalize('NFC').replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/ /g, ' '));
    const numRe = /^\s*(?:\d{1,4}\s*[.):\-–]|\d{1,4}\t|#\d+)\s*/;
    const nonEmpty = lines.filter((l) => l.trim());
    if (o.stripNumbers === 'auto' && nonEmpty.length) {
      const withNum = nonEmpty.filter((l) => numRe.test(l)).length;
      if (withNum / nonEmpty.length > 0.6) lines = lines.map((l) => l.replace(numRe, ''));
    } else if (o.stripNumbers === true) lines = lines.map((l) => l.replace(numRe, ''));
    let mode = o.join;
    if (mode === 'auto') {
      const ended = nonEmpty.filter((l) => END_PUNCT.test(l.trim())).length;
      mode = nonEmpty.length && ended / nonEmpty.length >= 0.3 && ended < nonEmpty.length ? 'join' : 'lines';
    }
    const out = [];
    let buf = '';
    let joined = 0;
    const flush = () => { const t = buf.replace(/\s+/g, ' ').trim(); if (t) out.push(t); buf = ''; };
    for (const line of lines) {
      if (!line.trim()) { flush(); continue; }
      if (mode === 'lines') { buf = line; flush(); continue; }
      if (!buf) buf = line; else { buf = joinPieces(buf, line); joined++; }
      if (END_PUNCT.test(buf) || buf.length > 400) flush();
    }
    flush();
    return { entries: out, mode, joined };
  }

  function detectDelimiter(text) {
    const sample = text.split('\n').slice(0, 50).filter((l) => l.trim());
    if (!sample.length) return ',';
    let best = ',', bestScore = -1;
    for (const d of ['\t', ',', ';']) {
      const split = sample.map((l) => parseCSV(l, d)[0]);
      // a ";" that only ends the line is a Greek question mark, not a column break
      const real = split.filter((cells) => cells.filter((c) => c.trim()).length >= 2).length;
      if (real < sample.length * 0.5) continue;
      const counts = split.map((c) => c.length);
      const freq = {};
      counts.forEach((c) => { freq[c] = (freq[c] || 0) + 1; });
      let mode = 1, modeN = 0;
      for (const k in freq) if (freq[k] > modeN || (freq[k] === modeN && +k > mode)) { mode = +k; modeN = freq[k]; }
      const score = mode > 1 ? modeN / sample.length + (d === '\t' ? 0.05 : 0) : 0;
      if (score > bestScore) { bestScore = score; best = d; }
    }
    return bestScore > 0.5 ? best : null;
  }

  function parseCSV(text, delim) {
    const rows = [];
    let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"' && f === '') q = true;
      else if (c === delim) { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(f); rows.push(row); row = []; f = '';
      } else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows;
  }

  // Pick the text column from a table (rows of cells)
  function entriesFromRows(rows) {
    rows = rows.filter((r) => r.some((c) => String(c).trim()));
    if (!rows.length) return { entries: [], column: -1 };
    const width = Math.max(...rows.map((r) => r.length));
    const head = rows[0].map((c) => String(c).trim().toLowerCase());
    let col = head.findIndex((h) => /^(text|sentence|sentences|prompt|prompts|utterance|transcript|content|κείμενο|πρόταση|φράση)$/.test(h));
    let start = col >= 0 ? 1 : 0;
    if (col < 0) {
      let bestN = -1;
      for (let j = 0; j < width; j++) {
        let n = 0;
        for (const r of rows) n += (String(r[j] || '').match(/[Ͱ-Ͽἀ-῿]/g) || []).length;
        if (n > bestN) { bestN = n; col = j; }
      }
      if (bestN <= 0) { // no Greek anywhere: take the longest column
        let bestL = -1;
        for (let j = 0; j < width; j++) {
          const L = rows.reduce((a, r) => a + String(r[j] || '').length, 0);
          if (L > bestL) { bestL = L; col = j; }
        }
      }
      if (rows.length > 1 && !hasGreek(String(rows[0][col] || '')) && hasGreek(String(rows[1][col] || ''))) start = 1;
    }
    const entries = rows.slice(start).map((r) => String(r[col] == null ? '' : r[col]).normalize('NFC').replace(/\s+/g, ' ').trim()).filter(Boolean);
    return { entries, column: col };
  }

  function entriesFromCSV(text) {
    text = String(text).replace(/^﻿/, '');
    const d = detectDelimiter(text);
    if (!d) return Object.assign(splitEntries(text, { join: 'lines' }), { column: 0 });
    return entriesFromRows(parseCSV(text, d));
  }

  function dupKey(s) { return greekKey(s).replace(/\s+/g, ' '); }
  function findDuplicates(entries) {
    const seen = new Map(), dups = [];
    entries.forEach((e, i) => {
      const k = dupKey(e);
      if (seen.has(k)) dups.push({ index: i, firstIndex: seen.get(k) });
      else seen.set(k, i);
    });
    return dups;
  }

  // ---------------------------------------------------------------- quality checks
  const CHECK_TEXT = {
    no_voice: 'No voice heard. Check the microphone is allowed, then speak closer.',
    clipping: 'Distorted: too loud or too close. Hold the phone a bit further away.',
    very_quiet: 'Very quiet. Move closer and speak up.',
    quiet: 'A little quiet. Speak up or move closer.',
    very_noisy: 'Too much background noise. Find a quieter spot.',
    noisy: 'Some background noise. A quieter spot will help.',
    early_start: 'Started too soon. Wait about 1 second before speaking.',
    late_start: 'Long wait before speaking.',
    cut_end: 'Stopped too soon. Wait about 1 second after the last word.',
    long_pause: 'Long pause in the middle. Read the whole line in one go.',
    too_short: 'Too short for this line. Some words may be missing.',
    fast: 'Very fast. Slow down a little.',
    slow: 'Quite slow. Aim for a natural, steady pace.'
  };

  function analyze(samples, sr, syllables) {
    const frame = Math.max(1, Math.round(sr * 0.02));
    const nF = Math.floor(samples.length / frame);
    const duration = samples.length / sr;
    const res = { duration, checks: [], verdict: 'redo', lead: 0, trail: 0, speech: 0, pause: 0, peakDb: -120, levelDb: -120, noiseDb: -120, clipEvents: 0, start: 0, end: 0 };
    if (nF < 5) { res.checks.push({ level: 'fail', code: 'no_voice', msg: CHECK_TEXT.no_voice }); return res; }
    const db = new Float32Array(nF);
    let peak = 0, run = 0, clipEvents = 0;
    for (let f = 0; f < nF; f++) {
      let s = 0;
      for (let i = f * frame, e = i + frame; i < e; i++) {
        const x = samples[i];
        s += x * x;
        const a = x < 0 ? -x : x;
        if (a > peak) peak = a;
        if (a >= 0.985) { run++; if (run === 3) clipEvents++; } else run = 0;
      }
      db[f] = 10 * Math.log10(s / frame + 1e-12);
    }
    const sorted = Array.from(db).sort((a, b) => a - b);
    const pct = (p) => sorted[Math.min(nF - 1, Math.max(0, Math.floor(p * nF)))];
    const noise = pct(0.1), level = pct(0.95);
    const thr = Math.max(noise + 10, level - 30, -55);
    const voiced = Array.from(db, (d) => d > thr);
    let first = -1, last = -1;
    for (let f = 0; f + 2 < nF; f++) if (voiced[f] && voiced[f + 1] && voiced[f + 2]) { first = f; break; }
    for (let f = nF - 1; f >= 2; f--) if (voiced[f] && voiced[f - 1] && voiced[f - 2]) { last = f; break; }
    res.peakDb = 20 * Math.log10(peak + 1e-12);
    res.levelDb = level;
    res.noiseDb = noise;
    res.clipEvents = clipEvents;
    const add = (level, code) => res.checks.push({ level, code, msg: CHECK_TEXT[code] });
    if (first < 0 || level < -50 || level - noise < 6) {
      add('fail', 'no_voice');
      res.verdict = 'redo';
      return res;
    }
    const fs = frame / sr;
    res.start = first * fs;
    res.end = (last + 1) * fs;
    res.lead = res.start;
    res.trail = Math.max(0, duration - res.end);
    res.speech = res.end - res.start;
    let longest = 0, cur = 0;
    for (let f = first; f <= last; f++) { if (!voiced[f]) { cur++; if (cur > longest) longest = cur; } else cur = 0; }
    res.pause = longest * fs;

    if (clipEvents > 0) add('fail', 'clipping');
    if (level < -38) add('fail', 'very_quiet'); else if (level < -30) add('warn', 'quiet');
    if (noise > -38) add('fail', 'very_noisy'); else if (noise > -48 || level - noise < 20) add('warn', 'noisy');
    if (res.lead < 0.4) add('warn', 'early_start'); else if (res.lead > 4) add('warn', 'late_start');
    if (res.trail < 0.4) add('warn', 'cut_end');
    if (res.pause > 1.6) add('warn', 'long_pause');
    const syl = Math.max(1, syllables || 1);
    if (res.speech < syl * 0.08) add('fail', 'too_short');
    else if (res.speech < syl * 0.12) add('warn', 'fast');
    else if (res.speech > syl * 0.5 + 1.5) add('warn', 'slow');
    res.verdict = res.checks.some((c) => c.level === 'fail') ? 'redo' : res.checks.length ? 'check' : 'good';
    return res;
  }

  // Envelope for drawing (max abs per bucket)
  function envelope(samples, buckets) {
    const n = samples.length, out = new Float32Array(buckets);
    const step = n / buckets;
    for (let b = 0; b < buckets; b++) {
      let m = 0;
      for (let i = Math.floor(b * step), e = Math.min(n, Math.floor((b + 1) * step)); i < e; i++) { const a = Math.abs(samples[i]); if (a > m) m = a; }
      out[b] = m;
    }
    return out;
  }

  // ---------------------------------------------------------------- WAV
  function encodeWav(samples, sr) {
    const n = samples.length;
    const buf = new ArrayBuffer(44 + n * 2);
    const v = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE');
    str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * 2, true);
    let o = 44;
    for (let i = 0; i < n; i++, o += 2) {
      let s = samples[i];
      s = s > 1 ? 1 : s < -1 ? -1 : s;
      v.setInt16(o, s < 0 ? Math.round(s * 32768) : Math.round(s * 32767), true);
    }
    return new Uint8Array(buf);
  }

  function decodeWav(u8) {
    const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const tag = (o) => String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3]);
    if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('Not a WAV file');
    let o = 12, sr = 0, ch = 1, bits = 16, data = null;
    while (o + 8 <= u8.length) {
      const id = tag(o), size = v.getUint32(o + 4, true);
      if (id === 'fmt ') { ch = v.getUint16(o + 10, true); sr = v.getUint32(o + 12, true); bits = v.getUint16(o + 22, true); }
      if (id === 'data') { data = [o + 8, Math.min(size, u8.length - o - 8)]; break; }
      o += 8 + size + (size & 1);
    }
    if (!data || bits !== 16) throw new Error('Unsupported WAV');
    const frames = Math.floor(data[1] / (2 * ch));
    const out = new Float32Array(frames);
    for (let i = 0; i < frames; i++) out[i] = v.getInt16(data[0] + i * 2 * ch, true) / 32768;
    return { sr, samples: out, channels: ch };
  }

  // ---------------------------------------------------------------- ZIP (store) writer + reader
  const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  const utf8 = (s) => new TextEncoder().encode(s);

  class ZipWriter {
    constructor() { this.offset = 0; this.entries = []; const d = new Date(); this.time = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF; this.date = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF; }
    // returns [header, data] parts to write in order
    add(name, data) {
      if (typeof data === 'string') data = utf8(data);
      const nb = utf8(name), crc = crc32(data);
      const h = new Uint8Array(30 + nb.length), v = new DataView(h.buffer);
      v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true);
      v.setUint16(10, this.time, true); v.setUint16(12, this.date, true);
      v.setUint32(14, crc, true); v.setUint32(18, data.length, true); v.setUint32(22, data.length, true);
      v.setUint16(26, nb.length, true); v.setUint16(28, 0, true); h.set(nb, 30);
      this.entries.push({ nb, crc, size: data.length, offset: this.offset });
      this.offset += h.length + data.length;
      return [h, data];
    }
    finish() {
      const parts = [];
      let cdSize = 0;
      for (const e of this.entries) {
        const c = new Uint8Array(46 + e.nb.length), v = new DataView(c.buffer);
        v.setUint32(0, 0x02014b50, true); v.setUint16(4, 20, true); v.setUint16(6, 20, true); v.setUint16(8, 0x0800, true); v.setUint16(10, 0, true);
        v.setUint16(12, this.time, true); v.setUint16(14, this.date, true);
        v.setUint32(16, e.crc, true); v.setUint32(20, e.size, true); v.setUint32(24, e.size, true);
        v.setUint16(28, e.nb.length, true); v.setUint32(42, e.offset, true); c.set(e.nb, 46);
        parts.push(c); cdSize += c.length;
      }
      const end = new Uint8Array(22), v = new DataView(end.buffer);
      v.setUint32(0, 0x06054b50, true); v.setUint16(8, this.entries.length, true); v.setUint16(10, this.entries.length, true);
      v.setUint32(12, cdSize, true); v.setUint32(16, this.offset, true);
      parts.push(end);
      return parts;
    }
  }

  async function inflateRaw(u8) {
    const ds = new DecompressionStream('deflate-raw');
    const out = new Response(new Blob([u8]).stream().pipeThrough(ds));
    return new Uint8Array(await out.arrayBuffer());
  }

  // Read a ZIP (XLSX) → Map(name → async () => Uint8Array)
  function unzip(u8) {
    const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('Not a ZIP/XLSX file');
    const count = v.getUint16(eocd + 10, true);
    let p = v.getUint32(eocd + 16, true);
    const files = new Map();
    const dec = new TextDecoder();
    for (let k = 0; k < count; k++) {
      if (v.getUint32(p, true) !== 0x02014b50) break;
      const method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true);
      const nlen = v.getUint16(p + 28, true), xlen = v.getUint16(p + 30, true), clen = v.getUint16(p + 32, true);
      const loff = v.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
      files.set(name, async () => {
        const ln = v.getUint16(loff + 26, true), lx = v.getUint16(loff + 28, true);
        const start = loff + 30 + ln + lx;
        const raw = u8.subarray(start, start + csize);
        if (method === 0) return raw;
        if (method === 8) return inflateRaw(raw);
        throw new Error('Unsupported compression');
      });
      p += 46 + nlen + xlen + clen;
    }
    return files;
  }

  // XLSX → rows (first worksheet). Uses a small regex XML reader (no DOM needed).
  function xmlUnescape(s) { return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&'); }
  function colIndex(ref) { const m = /^([A-Z]+)/.exec(ref || ''); if (!m) return -1; let n = 0; for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; }
  async function xlsxRows(u8) {
    const files = unzip(u8);
    const dec = new TextDecoder();
    const read = async (n) => (files.has(n) ? dec.decode(await files.get(n)()) : null);
    const shared = [];
    const ss = await read('xl/sharedStrings.xml');
    if (ss) {
      const re = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
      let m;
      while ((m = re.exec(ss))) {
        const ts = [];
        const tr = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
        let t;
        // skip phonetic runs
        const body = m[1].replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
        while ((t = tr.exec(body))) ts.push(xmlUnescape(t[1]));
        shared.push(ts.join(''));
      }
    }
    let sheetName = 'xl/worksheets/sheet1.xml';
    const wb = await read('xl/workbook.xml'), rels = await read('xl/_rels/workbook.xml.rels');
    if (wb && rels) {
      const first = /<sheet\b[^>]*r:id="([^"]+)"/.exec(wb);
      if (first) {
        const rel = new RegExp('<Relationship\\b[^>]*Id="' + first[1] + '"[^>]*/?>').exec(rels);
        const tgt = rel && /Target="([^"]+)"/.exec(rel[0]);
        if (tgt) sheetName = tgt[1].startsWith('/') ? tgt[1].slice(1) : 'xl/' + tgt[1].replace(/^\.\//, '');
      }
    }
    if (!files.has(sheetName)) sheetName = [...files.keys()].filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0];
    const sheet = await read(sheetName);
    if (!sheet) throw new Error('No worksheet found');
    const rows = [];
    const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
    let r;
    while ((r = rowRe.exec(sheet))) {
      const row = [];
      const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
      let c, auto = 0;
      while ((c = cellRe.exec(r[1]))) {
        const attrs = c[1], inner = c[2] || '';
        const ref = (/\br="([A-Z]+\d+)"/.exec(attrs) || [])[1];
        const t = (/\bt="([^"]+)"/.exec(attrs) || [])[1];
        let idx = ref ? colIndex(ref) : auto;
        auto = idx + 1;
        let val = '';
        if (t === 's') { const vv = /<v>([\s\S]*?)<\/v>/.exec(inner); val = vv ? shared[+vv[1]] || '' : ''; }
        else if (t === 'inlineStr') { const ts = []; const tr = /<t\b[^>]*>([\s\S]*?)<\/t>/g; let x; while ((x = tr.exec(inner))) ts.push(xmlUnescape(x[1])); val = ts.join(''); }
        else { const vv = /<v>([\s\S]*?)<\/v>/.exec(inner); val = vv ? xmlUnescape(vv[1]) : ''; }
        row[idx] = val;
      }
      for (let i = 0; i < row.length; i++) if (row[i] == null) row[i] = '';
      rows.push(row);
    }
    return rows;
  }

  async function entriesFromXLSX(u8) { return entriesFromRows(await xlsxRows(u8)); }

  // ---------------------------------------------------------------- misc
  function csvCell(s) { s = String(s == null ? '' : s); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function pad(n, w) { return String(n).padStart(w, '0'); }
  function fileNameFor(index, total, prefix) { return (prefix || 'Greek') + '_' + pad(index + 1, Math.max(3, String(total).length)) + '.wav'; }

  const LV = {
    respellWord, respellLine, soundUnits, syllabify, fuzzy, greekKey, searchKeys, matches,
    splitEntries, joinPieces, parseCSV, detectDelimiter, entriesFromCSV, entriesFromRows, entriesFromXLSX, xlsxRows,
    findDuplicates, dupKey, analyze, envelope, encodeWav, decodeWav, crc32, ZipWriter, unzip, inflateRaw,
    csvCell, fileNameFor, hasGreek, CHECK_TEXT
  };
  root.LV = LV;
  if (typeof module !== 'undefined' && module.exports) module.exports = LV;
})(typeof window !== 'undefined' ? window : globalThis);
