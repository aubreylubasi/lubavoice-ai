/* LubaVoice AI — app */
(function () {
  'use strict';
  const LV = window.LV;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const ANDROID = typeof window.LubaAndroid !== 'undefined';
  const APP_VERSION = '1.0.0';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtTime = (s) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}h ${m}m` : m ? `${m}m ${String(x).padStart(2, '0')}s` : `${x}s`; };

  const DEMO = [
    'Τι καιρό θα κάνει αύριο το απόγευμα στην Τρίπολη;',
    'Θα έχει παγετό σήμερα το βράδυ στην Ίο;',
    'Γρήγορα, θα βρέξει σήμερα το βράδυ στην Ελευσίνα;',
    'Άκου, θα έχει ομίχλη την Τρίτη στη Θάσο;',
    'Συγγνώμη, πόσο δυνατό θα είναι το μελτέμι την επόμενη εβδομάδα στα Τρίκαλα;',
    'Δείξε μου την πρόγνωση την Κυριακή στις Σέρρες, ευχαριστώ.',
    'Λοιπόν, θα χρειαστώ ομπρέλα αύριο στην Ξάνθη;',
    'Μια στιγμή, δείξε μου την πρόγνωση αύριο το απόγευμα στην Ευρυτανία.',
    'Συγγνώμη, θα φυσήξει μελτέμι από τώρα και στο εξής στη Γλυφάδα;',
    'Συγγνώμη, θα έχει αέρα την Παρασκευή στη Λαμία;',
    'Θα έχει ομίχλη από τώρα και στο εξής στην Πάτρα;',
    'Μια στιγμή, θα έχει χιόνι σήμερα το πρωί στην Ξάνθη;',
    'Συγγνώμη, θα έχει καταιγίδα μεθαύριο στη Μυτιλήνη;',
    'Συγγνώμη, πόση υγρασία θα έχει την Τρίτη στον Άγιο Νικόλαο;',
    'Γρήγορα, θα φυσήξει μελτέμι σήμερα το βράδυ στα Τρίκαλα;',
    'Λοιπόν, θα έχει βροχή σήμερα το απόγευμα στον Άγιο Νικόλαο;',
    'Λοιπόν, θα έχει καταιγίδα σήμερα το απόγευμα στο Κιλκίς;',
    'Θα έχει χαλάζι τον επόμενο μήνα στην Κομοτηνή;',
    'Τι καιρό θα κάνει αύριο το απόγευμα στη Λάρισα;',
    'Άκου, θα έχει αέρα την Τρίτη στη Φθιώτιδα;',
    'Γρήγορα, θα χρειαστώ ομπρέλα από τώρα και στο εξής στην Καβάλα;',
    'Γρήγορα, θα έχει χιόνι σήμερα το πρωί στη Λευκάδα;',
    'Γρήγορα, τι καιρό θα κάνει την Κυριακή στον Βύρωνα;',
    'Αν μπορείς, θύμισέ μου τη συνάντηση με τον προϊστάμενο στις επτά Σεπτεμβρίου.',
    'Κοίτα, θύμισέ μου το ραντεβού με τον γιατρό στις είκοσι πέντε Οκτωβρίου.',
    'Βάλε υπενθύμιση για την παραλαβή του δέματος στις πέντε Αυγούστου, μόλις μπορέσεις.',
    'Μια στιγμή, βάλε υπενθύμιση για την προπόνηση στο γυμναστήριο στις είκοσι τρεις Φεβρουαρίου, μόλις μπορέσεις.',
    'Πρόσθεσε στο ημερολόγιο τη συνάντηση με τον δικηγόρο στις δέκα Οκτωβρίου, μόνο αυτό.',
    'Βάλε υπενθύμιση για την προπόνηση στο γυμναστήριο στις τριάντα Ιουλίου, ευχαριστώ.',
    'Μια στιγμή, στις δύο Ιουλίου στη μία και είκοσι έχω το μάθημα ισπανικών.',
    'Πρόσθεσε στο ημερολόγιο το ραντεβού στο κομμωτήριο στις τριάντα Αυγούστου.',
    'Άκου, θύμισέ μου το ραντεβού στο κομμωτήριο αύριο.',
    'Γρήγορα, πρόσθεσε στο ημερολόγιο την επίσκεψη στον οδοντίατρο στις πέντε Ιουλίου.',
    'Πρόσθεσε στο ημερολόγιο τη συνάντηση με τον προϊστάμενο στις δώδεκα Απριλίου, τώρα αμέσως.',
    'Βοήθησέ με, βάλε υπενθύμιση για το ραντεβού με τον γιατρό στις τρεις Οκτωβρίου, μόλις μπορέσεις.',
    'Χωρίς βιασύνη, θύμισέ μου την προπόνηση στο γυμναστήριο στις οκτώ Νοεμβρίου.',
    'Τώρα, χαμήλωσε την ένταση του ήχου στο τριάντα τοις εκατό από το tablet, σε παρακαλώ.',
    'Συγγνώμη, ανέβασε την ένταση του ήχου στο τριάντα πέντε τοις εκατό από τα ακουστικά, τώρα αμέσως.',
    'Λοιπόν, ανέβασε τη φωτεινότητα της οθόνης στο δεκαπέντε τοις εκατό και χαμήλωσε τη φωτεινότητα στο δεκαπέντε τοις εκατό, μόνο αυτό.',
    'Άλλαξε την ένταση του ήχου στο δεκαπέντε τοις εκατό από το tablet, ευχαριστώ.',
    'Άκου, ανέβασε την ένταση του συναγερμού στο δεκαπέντε τοις εκατό και χαμήλωσε την ένταση της κλήσης στο πενήντα τοις εκατό.',
    'Δυνάμωσε την ένταση των μέσων στο τριάντα πέντε τοις εκατό, ευχαριστώ.',
    'Αν μπορείς, άλλαξε τη φωτεινότητα κατά είκοσι τοις εκατό.',
    'Συγγνώμη, δυνάμωσε την αντίθεση της οθόνης στο πενήντα τοις εκατό, σε παρακαλώ.',
    'Αν μπορείς, ρύθμισε την ένταση του συναγερμού στο ενενήντα τοις εκατό.',
    'Ανέβασε την ένταση του ακουστικού στο εξήντα τοις εκατό από το κινητό, ευχαριστώ.',
    'Συγγνώμη, χαμήλωσε την ένταση των μέσων στο εβδομήντα πέντε τοις εκατό από το κινητό, χωρίς βιασύνη.',
    'Μόλις μπορέσεις, βάλε την ένταση των μέσων στο σαράντα τοις εκατό, σε παρακαλώ.',
    'Βοήθησέ με, βάλε την ένταση των ειδοποιήσεων στο δεκαπέντε τοις εκατό και την ένταση του ακουστικού κατά πέντε τοις εκατό, τώρα αμέσως.'
  ];

  // ================================================================ storage
  const DB = {
    db: null, memState: null, memAudio: new Map(),
    async open() {
      try {
        this.db = await new Promise((res, rej) => {
          const r = indexedDB.open('lubavoice', 1);
          r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('kv'); d.createObjectStore('audio'); };
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
          r.onblocked = () => rej(new Error('blocked'));
        });
      } catch (e) { this.db = null; console.warn('IndexedDB unavailable, progress will not be saved', e); }
    },
    _tx(store, mode, fn) {
      return new Promise((res, rej) => {
        const t = this.db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        t.oncomplete = () => res(req ? req.result : undefined);
        t.onerror = () => rej(t.error);
        t.onabort = () => rej(t.error);
      });
    },
    async get(store, key) { if (!this.db) return store === 'kv' ? this.memState : this.memAudio.get(key); return this._tx(store, 'readonly', (s) => s.get(key)); },
    async put(store, key, val) { if (!this.db) { if (store === 'kv') this.memState = val; else this.memAudio.set(key, val); return; } return this._tx(store, 'readwrite', (s) => s.put(val, key)); },
    async del(store, key) { if (!this.db) { this.memAudio.delete(key); return; } return this._tx(store, 'readwrite', (s) => s.delete(key)); },
    async clear(store) { if (!this.db) { if (store === 'kv') this.memState = null; else this.memAudio.clear(); return; } return this._tx(store, 'readwrite', (s) => s.clear()); }
  };

  // ================================================================ state
  const S = {
    lines: [], idx: 0, nextId: 1, filter: 'all', acceptLog: [],
    settings: { rate: 0.9, slowRate: 0.6, voice: '', autoStop: true, autoListen: false, rawMic: true, sampleRate: 16000, exportAll: false }
  };
  let saveTimer = null;
  function saveNow() {
    clearTimeout(saveTimer); saveTimer = null;
    return DB.put('kv', 'state', { v: 1, lines: S.lines, idx: S.idx, nextId: S.nextId, settings: S.settings, acceptLog: S.acceptLog.slice(-40) }).catch((e) => toast('Could not save progress: ' + e.message));
  }
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 250); }
  const flushSave = () => { if (saveTimer) saveNow(); };
  async function load() {
    const st = await DB.get('kv', 'state');
    if (st && Array.isArray(st.lines)) {
      S.lines = st.lines; S.idx = st.idx || 0; S.nextId = st.nextId || S.lines.length + 1;
      Object.assign(S.settings, st.settings || {}); S.acceptLog = st.acceptLog || [];
    }
  }

  const infoCache = new Map();
  function info(text) {
    let r = infoCache.get(text);
    if (!r) { r = LV.respellLine(text); r.keys = LV.searchKeys(text); infoCache.set(text, r); }
    return r;
  }
  const cur = () => S.lines[S.idx];
  function statusOf(L) {
    if (L.status === 'done') return 'done';
    if (L.status === 'rec') return L.verdict === 'redo' ? 'redo' : 'rec';
    return 'todo';
  }

  // ================================================================ UI helpers
  let toastT = null;
  function toast(msg, ms) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms || 3200);
  }
  function confirmBox(msg, yes) {
    return new Promise((res) => {
      $('#modalMsg').textContent = msg; $('#modalYes').textContent = yes || 'OK';
      $('#modal').hidden = false;
      const done = (v) => { $('#modal').hidden = true; $('#modalYes').onclick = $('#modalNo').onclick = null; res(v); };
      $('#modalYes').onclick = () => done(true); $('#modalNo').onclick = () => done(false);
    });
  }
  let curTab = 'record';
  function showTab(name) {
    curTab = name;
    $$('nav.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
    $$('section.view').forEach((s) => s.classList.toggle('on', s.id === 'v-' + name));
    if (name === 'lines') renderList(true);
    if (name === 'export') renderStats();
    if (name === 'record') renderRecord();
    window.scrollTo(0, 0);
  }

  // ================================================================ text-to-speech
  const TTS = {
    status: 'checking', voices: [], voice: null, speaking: false, token: 0, pending: new Map(), seq: 0,
    init() {
      if (ANDROID) { this.pollNative(0); return; }
      if (!('speechSynthesis' in window)) { this.status = 'unsupported'; renderVoice(); return; }
      const loadV = () => {
        const all = speechSynthesis.getVoices();
        this.voices = all.filter((v) => /^el([-_]|$)/i.test(v.lang));
        this.pick();
        if (this.voice) this.status = 'ok'; else if (all.length) this.status = 'missing';
        renderVoice();
      };
      loadV();
      speechSynthesis.onvoiceschanged = loadV;
      setTimeout(() => { if (this.status === 'checking') { this.status = this.voice ? 'ok' : 'missing'; renderVoice(); } }, 2500);
    },
    pollNative(n) {
      let st = 'error';
      try { st = window.LubaAndroid.ttsStatus(); } catch (e) { /* ignore */ }
      this.status = st === 'init' ? 'checking' : st;
      renderVoice();
      if (st === 'init' && n < 60) setTimeout(() => this.pollNative(n + 1), 250);
    },
    pick() {
      const want = S.settings.voice;
      this.voice = this.voices.find((v) => v.name === want) || this.voices.find((v) => /melina/i.test(v.name)) ||
        this.voices.find((v) => v.localService) || this.voices[0] || null;
    },
    ok() { return this.status === 'ok'; },
    speak(text, rate, onEnd) {
      this.stop();
      if (!this.ok()) { toast(this.status === 'checking' ? 'The Greek voice is still loading…' : 'No Greek voice yet. See Guide → Greek voice.', 4000); if (onEnd) onEnd(); return; }
      const my = ++this.token;
      this.speaking = true; updateListen();
      const done = () => { if (my !== this.token) return; this.speaking = false; updateListen(); if (onEnd) onEnd(); };
      if (ANDROID) {
        const id = 'u' + (++this.seq);
        this.pending.set(id, done);
        try { window.LubaAndroid.speak(text, rate, id); } catch (e) { this.pending.delete(id); done(); }
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = (this.voice && this.voice.lang) || 'el-GR';
      if (this.voice) u.voice = this.voice;
      u.rate = rate;
      u.onend = done; u.onerror = done;
      speechSynthesis.speak(u);
    },
    stop() {
      this.token++;
      if (ANDROID) { try { window.LubaAndroid.stopSpeaking(); } catch (e) { /* ignore */ } this.pending.clear(); }
      else if ('speechSynthesis' in window) speechSynthesis.cancel();
      if (this.speaking) { this.speaking = false; updateListen(); }
      $$('.w.playing').forEach((w) => w.classList.remove('playing'));
    }
  };
  window.__lubaTtsDone = (id) => { const f = TTS.pending.get(id); if (f) { TTS.pending.delete(id); f(); } };

  let listenMode = null;
  function updateListen() {
    const a = $('#btnListen span'), b = $('#btnSlow span');
    if (!a) return;
    a.textContent = TTS.speaking && listenMode === 'n' ? 'Stop' : 'Listen';
    b.textContent = TTS.speaking && listenMode === 's' ? 'Stop' : 'Slow';
  }
  function listen(mode) {
    if (TTS.speaking && listenMode === mode) { TTS.stop(); return; }
    const L = cur(); if (!L || Rec.busy()) return;
    listenMode = mode;
    TTS.speak(L.text, mode === 's' ? S.settings.slowRate : S.settings.rate);
  }

  function renderVoice() {
    const box = $('#voiceStatus'), btns = $('#voiceBtns'), banner = $('#voiceBanner');
    let html = '', cls = 'notice ', showBtns = false, bannerHtml = '';
    const st = TTS.status;
    if (st === 'ok') {
      cls += 'good';
      html = ANDROID ? '✓ Greek voice ready (your phone’s text-to-speech).' : '✓ Greek voice ready: <b>' + esc(TTS.voice ? TTS.voice.name : '') + '</b>';
    } else if (st === 'checking') {
      cls += 'info'; html = 'Checking for a Greek voice…';
    } else if (ANDROID) {
      cls += 'warn'; showBtns = true;
      html = st === 'missing'
        ? 'Your phone’s speech engine needs the <b>Greek</b> voice. Tap <b>Install Greek voice</b>, download Greek, then come back and tap <b>Check again</b>.'
        : 'Your phone’s speech engine can’t speak Greek. Install <b>Speech Services by Google</b> from the Play Store, choose it in <b>Voice settings</b> as the preferred engine, add Greek, then tap <b>Check again</b>.';
      bannerHtml = 'No Greek voice yet, so Listen won’t work. Open <b>Guide</b> to install it (free, 1 minute).';
    } else {
      cls += 'warn';
      html = '<b>No Greek voice found in this browser.</b><br>On a Mac: System Settings → Accessibility → Spoken Content → System voice → <b>Manage Voices…</b> → tick Greek <b>Melina</b>, then reload this page.<br>On Windows: Settings → Time &amp; language → Speech → Add voices → Greek.<br>On Android: use the LubaVoice app, or Chrome with Google Text-to-speech + Greek installed.';
      bannerHtml = 'No Greek voice in this browser yet, so Listen won’t work. See <b>Guide</b> for the 1-minute fix.';
    }
    box.className = cls; box.innerHTML = html;
    btns.hidden = !showBtns;
    banner.hidden = !bannerHtml; banner.innerHTML = bannerHtml;
    // voice picker (browser only)
    const sel = $('#setVoice');
    $('#voiceRow').hidden = ANDROID || TTS.voices.length < 2;
    sel.innerHTML = TTS.voices.map((v) => `<option value="${esc(v.name)}">${esc(v.name)}</option>`).join('');
    if (TTS.voice) sel.value = TTS.voice.name;
  }

  // ================================================================ recorder
  const Rec = {
    state: 'idle', ctx: null, stream: null, src: null, node: null, sink: null, workletReady: false, noWorklet: false,
    chunks: [], len: 0, sr: 48000, acc: 0, accN: 0, noise: [], noiseDb: -60, vRun: 0, sRun: 0, started: false, lineIdx: 0, aborted: false,
    busy() { return this.state !== 'idle'; },
    async start() {
      if (this.state !== 'idle' || !cur()) return;
      TTS.stop(); stopPlayback();
      this.state = 'starting'; this.aborted = false; this.lineIdx = S.idx; recUI();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.state = 'idle'; recUI();
        toast('This browser can’t record here. Use the LubaVoice app, or open the page in Chrome.', 5000);
        return;
      }
      try {
        const raw = !!S.settings.rawMic;
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: !raw, noiseSuppression: !raw, autoGainControl: !raw } });
      } catch (e) {
        this.state = 'idle'; recUI();
        toast(e && e.name === 'NotAllowedError' ? 'Microphone permission was refused. Allow it and try again.' : 'Could not open the microphone: ' + (e && e.message || e), 5000);
        return;
      }
      if (this.aborted) { this.release(); this.state = 'idle'; recUI(); return; }
      try {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        this.sr = this.ctx.sampleRate;
        this.src = this.ctx.createMediaStreamSource(this.stream);
        this.sink = this.ctx.createGain(); this.sink.gain.value = 0; this.sink.connect(this.ctx.destination);
        let node = null;
        if (this.ctx.audioWorklet && !this.noWorklet) {
          try {
            if (!this.workletReady) {
              const code = 'class R extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(1024);this.n=0}' +
                'process(i){const c=i[0]&&i[0][0];if(c){for(let k=0;k<c.length;k++){this.b[this.n++]=c[k];if(this.n===1024){this.port.postMessage(this.b.slice(0));this.n=0}}}return true}}' +
                'registerProcessor("luba-rec",R);';
              await this.ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([code], { type: 'application/javascript' })));
              this.workletReady = true;
            }
            node = new AudioWorkletNode(this.ctx, 'luba-rec', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: 'explicit' });
            node.port.onmessage = (e) => this.onData(e.data);
          } catch (e) { console.warn('AudioWorklet unavailable, using fallback', e); this.noWorklet = true; node = null; }
        }
        if (!node) {
          node = this.ctx.createScriptProcessor(2048, 1, 1);
          node.onaudioprocess = (e) => this.onData(new Float32Array(e.inputBuffer.getChannelData(0)));
        }
        this.node = node;
        this.src.connect(node); node.connect(this.sink);
      } catch (e) {
        this.release(); this.state = 'idle'; recUI();
        toast('Audio error: ' + (e && e.message || e), 5000);
        return;
      }
      this.chunks = []; this.len = 0; this.acc = 0; this.accN = 0; this.noise = []; this.vRun = 0; this.sRun = 0; this.started = false;
      this.state = 'lead'; recUI();
    },
    onData(b) {
      if (this.state !== 'lead' && this.state !== 'speak') return;
      this.chunks.push(b); this.len += b.length;
      const fl = Math.round(this.sr * 0.02);
      for (let i = 0; i < b.length; i++) {
        this.acc += b[i] * b[i];
        if (++this.accN === fl) { const db = 10 * Math.log10(this.acc / fl + 1e-12); this.acc = 0; this.accN = 0; this.onFrame(db); if (this.state !== 'lead' && this.state !== 'speak') return; }
      }
    },
    onFrame(db) {
      meter(db);
      const t = this.len / this.sr;
      if (this.state === 'lead') {
        this.noise.push(db);
        if (t >= 1.0) {
          const s = this.noise.slice(5).sort((a, b) => a - b);
          this.noiseDb = s.length ? s[Math.floor(s.length / 2)] : -60;
          this.state = 'speak'; recUI();
        }
        return;
      }
      const thr = Math.max(this.noiseDb + 12, -50);
      if (db > thr) { this.vRun++; this.sRun = 0; if (this.vRun >= 4) this.started = true; }
      else { this.vRun = 0; this.sRun++; }
      if (S.settings.autoStop && this.started && this.sRun * 0.02 >= 1.3) { this.stop(); return; }
      if (!this.started && t > 12) { this.stop(); return; }
      if (t > 45) this.stop();
    },
    async stop() {
      if (this.state === 'starting') { this.aborted = true; return; }
      if (this.state !== 'lead' && this.state !== 'speak') return;
      this.state = 'saving'; recUI();
      const chunks = this.chunks, len = this.len, sr = this.sr, lineIdx = this.lineIdx;
      this.release();
      const all = new Float32Array(len);
      let o = 0;
      for (const c of chunks) { all.set(c, o); o += c.length; }
      try {
        const target = +S.settings.sampleRate || 16000;
        const samples = await resample(all, sr, target);
        await takeDone(lineIdx, samples, target);
      } catch (e) { toast('Could not save the take: ' + (e && e.message || e), 5000); }
      this.state = 'idle'; recUI();
    },
    abort() {
      if (this.state === 'idle') return;
      this.aborted = true;
      if (this.state === 'lead' || this.state === 'speak') { this.release(); this.state = 'idle'; recUI(); }
    },
    release() {
      try { if (this.src) this.src.disconnect(); } catch (e) { /* ignore */ }
      try { if (this.node) { this.node.disconnect(); if (this.node.port) this.node.port.onmessage = null; else this.node.onaudioprocess = null; } } catch (e) { /* ignore */ }
      try { if (this.sink) this.sink.disconnect(); } catch (e) { /* ignore */ }
      if (this.stream) this.stream.getTracks().forEach((t) => t.stop()); // frees the mic for other apps (FunCrowd)
      this.stream = this.src = this.node = this.sink = null;
      this.chunks = []; this.len = 0;
      meter(-100);
    }
  };

  async function resample(data, from, to) {
    if (from === to || !data.length) return data;
    const len = Math.max(1, Math.round(data.length * to / from));
    try {
      const oc = new OfflineAudioContext(1, len, to);
      const b = oc.createBuffer(1, data.length, from);
      b.copyToChannel(data, 0);
      const s = oc.createBufferSource(); s.buffer = b; s.connect(oc.destination); s.start();
      const r = await oc.startRendering();
      return r.getChannelData(0).slice();
    } catch (e) {
      const out = new Float32Array(len), ratio = from / to;
      for (let i = 0; i < len; i++) { const x = i * ratio, i0 = Math.floor(x), f = x - i0; out[i] = (data[i0] || 0) * (1 - f) + (data[i0 + 1] || 0) * f; }
      return out;
    }
  }

  function meter(db) {
    const el = $('#meter'); if (!el) return;
    el.style.width = clamp((db + 60) / 60 * 100, 0, 100) + '%';
  }

  function recUI() {
    const b = $('#recBtn'), st = $('#recState'), hint = $('#recHint');
    b.className = 'recbtn';
    const s = Rec.state;
    if (s === 'starting') { b.classList.add('busy'); st.textContent = 'Opening microphone…'; }
    else if (s === 'lead') { b.classList.add('lead'); st.textContent = 'Stay quiet… 1'; }
    else if (s === 'speak') { b.classList.add('speak'); st.textContent = 'Speak now'; }
    else if (s === 'saving') { b.classList.add('busy'); st.textContent = 'Checking your take…'; }
    else st.textContent = takes.has(cur() && cur().id) ? 'Tap to record again' : 'Tap to record';
    hint.textContent = s === 'speak' ? (S.settings.autoStop ? 'Read the whole line, then stay quiet. It stops by itself (or tap to stop).' : 'Read the whole line, wait a second, then tap to stop.')
      : 'Stay quiet for the 1-second countdown, read the line, then stay quiet. It stops by itself.';
    b.setAttribute('aria-label', s === 'idle' ? 'Record' : 'Stop');
    const lock = s !== 'idle';
    ['#btnPrev', '#btnNext', '#btnNextTodo', '#btnListen', '#btnSlow', '#btnPlay', '#btnRetake', '#btnAccept'].forEach((id) => { const e = $(id); if (e) e.disabled = lock; });
  }

  // ================================================================ takes
  const takes = new Map(); // id → {wav:Blob, sr, qc, samples}
  async function getTake(id) {
    if (takes.has(id)) return takes.get(id);
    const t = await DB.get('audio', id);
    if (!t) return null;
    try { const d = LV.decodeWav(new Uint8Array(await t.wav.arrayBuffer())); t.samples = d.samples; } catch (e) { t.samples = null; }
    takes.set(id, t);
    return t;
  }

  async function takeDone(lineIdx, samples, sr) {
    const L = S.lines[lineIdx];
    if (!L) return;
    const qc = LV.analyze(samples, sr, info(L.text).syllables);
    const wav = new Blob([LV.encodeWav(samples, sr)], { type: 'audio/wav' });
    const take = { wav, sr, qc, at: Date.now() };
    await DB.put('audio', L.id, take);
    takes.set(L.id, Object.assign({ samples }, take));
    L.status = 'rec'; L.verdict = qc.verdict; L.dur = qc.duration; L.speech = qc.speech; L.notes = qc.checks.map((c) => c.code);
    save();
    if (S.idx === lineIdx) { renderRecordHead(); showResult(take, samples); }
    renderHeader();
    if (qc.verdict === 'good') setTimeout(() => { const a = $('#btnAccept'); if (a && !a.disabled) a.focus(); }, 50);
  }

  let player = null;
  function stopPlayback() { if (player) { player.pause(); player = null; const s = $('#btnPlay span'); if (s) s.textContent = 'Play my take'; } }
  async function playTake() {
    if (player) { stopPlayback(); return; }
    const L = cur(); if (!L) return;
    const t = await getTake(L.id); if (!t) return;
    TTS.stop();
    const url = URL.createObjectURL(t.wav);
    player = new Audio(url);
    $('#btnPlay span').textContent = 'Stop';
    player.onended = () => { URL.revokeObjectURL(url); stopPlayback(); };
    player.play().catch(() => { stopPlayback(); toast('Could not play the take.'); });
  }

  function showResult(t, samples) {
    const box = $('#result');
    if (!t) { box.hidden = true; return; }
    box.hidden = false;
    const qc = t.qc, v = $('#verdict');
    v.className = 'verdict ' + qc.verdict;
    v.textContent = qc.verdict === 'good' ? '✓ Good take' : qc.verdict === 'check' ? '⚠ Usable, but check the tips' : '✗ Please redo this one';
    $('#facts').textContent = qc.checks.some((c) => c.code === 'no_voice') ? `Length ${qc.duration.toFixed(1)} s`
      : `Length ${qc.duration.toFixed(1)} s · speaking ${qc.speech.toFixed(1)} s · quiet before ${qc.lead.toFixed(1)} s / after ${qc.trail.toFixed(1)} s`;
    $('#checks').innerHTML = qc.checks.map((c) => `<li class="${c.level}"><span class="ic">${c.level === 'fail' ? '✗' : '!'}</span><span>${esc(c.msg)}</span></li>`).join('');
    const acc = $('#btnAccept span');
    const L = cur();
    acc.textContent = L && L.status === 'done' ? 'Accepted ✓ · next' : qc.verdict === 'redo' ? 'Accept anyway & next' : 'Accept & next';
    drawWave(samples || t.samples, t.sr, qc);
  }

  function drawWave(samples, sr, qc) {
    const c = $('#wave'); if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth || 600, h = c.clientHeight || 70;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    if (!samples || !samples.length) return;
    const dur = samples.length / sr;
    const css = getComputedStyle(document.documentElement);
    if (qc && qc.speech > 0) {
      g.fillStyle = 'rgba(14,124,116,0.12)';
      g.fillRect(qc.start / dur * w, 0, (qc.end - qc.start) / dur * w, h);
    }
    const env = LV.envelope(samples, Math.max(50, Math.floor(w)));
    g.fillStyle = css.getPropertyValue('--brand2').trim() || '#3b33a3';
    for (let i = 0; i < env.length; i++) {
      const a = Math.min(1, env[i]) * (h / 2 - 2);
      g.fillRect(i * (w / env.length), h / 2 - a, Math.max(1, w / env.length - 0.3), a * 2 || 1);
    }
    if (qc && qc.clipEvents) { g.fillStyle = 'rgba(198,40,40,.8)'; g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2); }
  }

  // ================================================================ record view
  function renderHeader() {
    const n = S.lines.length, done = S.lines.filter((l) => l.status === 'done').length;
    $('#hdrProg').textContent = n ? `${done} / ${n} accepted` : 'No lines yet';
    $('#hdrBar').style.width = n ? (done / n * 100) + '%' : '0';
  }

  function renderRecordHead() {
    const L = cur(); if (!L) return;
    $('#lnum').textContent = `Line ${S.idx + 1} of ${S.lines.length}`;
    const st = statusOf(L), chip = $('#lchip');
    chip.className = 'chip ' + st;
    chip.textContent = { done: 'Accepted', rec: 'Recorded', redo: 'Needs redo', todo: 'To do' }[st];
  }

  function renderRecord() {
    renderHeader();
    const empty = !S.lines.length;
    $('#recEmpty').hidden = !empty; $('#recMain').hidden = empty;
    if (empty) return;
    S.idx = clamp(S.idx, 0, S.lines.length - 1);
    const L = cur();
    renderRecordHead();
    $('#greek').textContent = L.text;
    const inf = info(L.text);
    $('#words').innerHTML = inf.items.map((it, i) => {
      const ph = it.r.greek ? it.r.syl.map((s) => (s.s ? '<b>' + esc(s.txt.toUpperCase()) + '</b>' : esc(s.txt))).join('-') : esc(it.r.text);
      return `<button class="w" data-i="${i}" lang="el"><span class="gk">${esc(it.word)}</span><span class="ph">${ph || '&nbsp;'}</span></button>`;
    }).join('');
    updateListen();
    $('#result').hidden = true;
    const id = L.id;
    getTake(id).then((t) => { if (cur() && cur().id === id) { showResult(t, t && t.samples); recUI(); } });
    recUI();
  }

  function go(i) {
    if (Rec.busy() || !S.lines.length) return;
    TTS.stop(); stopPlayback();
    S.idx = clamp(i, 0, S.lines.length - 1);
    save(); renderRecord();
    if (S.settings.autoListen) setTimeout(() => listen('n'), 250);
  }
  function nextTodo(from) {
    const n = S.lines.length;
    for (let k = 1; k <= n; k++) { const i = (from + k) % n; if (S.lines[i].status !== 'done') return i; }
    return -1;
  }
  async function accept() {
    const L = cur(); if (!L || Rec.busy()) return;
    if (!(await getTake(L.id))) { toast('Record this line first.'); return; }
    if (L.status !== 'done') {
      L.status = 'done';
      S.acceptLog.push(Date.now()); if (S.acceptLog.length > 40) S.acceptLog.shift();
      save();
    }
    renderHeader();
    const nx = nextTodo(S.idx);
    if (nx < 0) { renderRecord(); toast('🎉 All lines accepted! Export them from Progress.', 5000); return; }
    go(nx);
  }

  // ================================================================ lines view
  let listTimer = null;
  function renderList(now) {
    clearTimeout(listTimer);
    const run = () => {
      const q = $('#q').value.trim();
      const f = S.filter;
      const rows = [];
      let shown = 0;
      S.lines.forEach((L, i) => {
        const st = statusOf(L);
        if (f === 'todo' && st !== 'todo') return;
        if (f === 'rec' && st !== 'rec' && st !== 'redo') return;
        if (f === 'redo' && st !== 'redo') return;
        if (f === 'done' && st !== 'done') return;
        if (q) {
          if (/^#?\d+$/.test(q)) { if (String(i + 1) !== q.replace('#', '')) return; }
          else if (!LV.matches(info(L.text).keys, q)) return;
        }
        shown++;
        if (rows.length < 800) {
          const icon = { done: '✓', rec: '●', redo: '✗', todo: '○' }[st];
          rows.push(`<li><button data-i="${i}" class="${i === S.idx ? 'cur' : ''}"><span class="n">#${i + 1}</span><span class="st ${st}">${icon}</span><span><div class="t" lang="el">${esc(L.text)}</div><div class="p">${esc(info(L.text).text)}</div></span></button></li>`);
        }
      });
      $('#list').innerHTML = rows.join('');
      $('#listCount').textContent = S.lines.length ? `${shown} of ${S.lines.length} lines` : 'No lines yet. Import some first.';
    };
    if (now) run(); else listTimer = setTimeout(run, 120);
  }

  // ================================================================ import
  let impEntries = [];
  async function readFile(file) {
    const name = (file.name || '').toLowerCase();
    const buf = new Uint8Array(await file.arrayBuffer());
    if (name.endsWith('.xlsx') || (buf[0] === 0x50 && buf[1] === 0x4b)) {
      const r = await LV.entriesFromXLSX(buf);
      return { text: r.entries.join('\n'), join: 'lines' };
    }
    let text = new TextDecoder('utf-8').decode(buf).replace(/^﻿/, '');
    if (name.endsWith('.csv') || name.endsWith('.tsv')) {
      const r = LV.entriesFromCSV(text);
      return { text: r.entries.join('\n'), join: 'lines' };
    }
    return { text, join: 'auto' };
  }
  function impPreview() {
    const raw = $('#impText').value;
    const p = $('#impPreview');
    if (!raw.trim()) { impEntries = []; p.textContent = 'Nothing to import yet.'; $('#impLoad').disabled = true; return; }
    const r = LV.splitEntries(raw, { join: $('#impJoin').value });
    let entries = r.entries;
    const dups = LV.findDuplicates(entries);
    if ($('#impDedupe').checked && dups.length) { const drop = new Set(dups.map((d) => d.index)); entries = entries.filter((_, i) => !drop.has(i)); }
    impEntries = entries;
    const notGreek = entries.filter((e) => !LV.hasGreek(e)).length;
    const bits = [`<b>${entries.length}</b> line${entries.length === 1 ? '' : 's'} found`];
    if (r.mode === 'join' && r.joined) bits.push(`${r.joined} broken line${r.joined === 1 ? '' : 's'} joined`);
    if (dups.length) bits.push(`${dups.length} duplicate${dups.length === 1 ? '' : 's'} ${$('#impDedupe').checked ? 'skipped' : 'kept'}`);
    if (notGreek) bits.push(`${notGreek} without Greek letters`);
    const sample = entries.slice(0, 6).map((e) => `<li lang="el">${esc(e)}</li>`).join('');
    p.innerHTML = bits.join(' · ') + (sample ? `<ol>${sample}</ol>` : '') + (entries.length > 6 ? `<div class="muted small">…and ${entries.length - 6} more</div>` : '');
    $('#impLoad').disabled = !entries.length;
  }
  async function loadEntries(entries) {
    if (Rec.busy()) return;
    const byKey = new Map(S.lines.map((L) => [LV.dupKey(L.text), L]));
    const kept = new Set();
    const lines = entries.map((text) => {
      const old = byKey.get(LV.dupKey(text));
      if (old && !kept.has(old.id)) { kept.add(old.id); return Object.assign({}, old, { text }); }
      return { id: 'L' + (S.nextId++), text, status: 'todo', verdict: null, dur: 0, speech: 0, notes: [] };
    });
    const removed = S.lines.filter((L) => !kept.has(L.id));
    const removedWithAudio = removed.filter((L) => L.status !== 'todo').length;
    if (removedWithAudio && !(await confirmBox(`${removedWithAudio} recorded line${removedWithAudio === 1 ? ' is' : 's are'} not in the new list and will be deleted. Continue?`, 'Replace'))) return;
    for (const L of removed) { takes.delete(L.id); await DB.del('audio', L.id).catch(() => {}); }
    S.lines = lines; S.idx = Math.max(0, nextTodo(-1)); save();
    toast(`Loaded ${lines.length} lines${kept.size ? ` (kept progress on ${kept.size})` : ''}.`);
    showTab('record');
  }

  // ================================================================ progress & export
  function renderStats() {
    const n = S.lines.length;
    const c = { done: 0, rec: 0, redo: 0, todo: 0 };
    let audio = 0;
    S.lines.forEach((L) => { c[statusOf(L)]++; if (L.status !== 'todo') audio += L.dur || 0; });
    const pct = n ? Math.round(c.done / n * 100) : 0;
    $('#dBar').style.width = pct + '%';
    const remaining = n - c.done;
    let eta = '—';
    const log = S.acceptLog.slice(-15);
    if (log.length >= 3) {
      const gaps = []; for (let i = 1; i < log.length; i++) { const g = (log[i] - log[i - 1]) / 1000; if (g < 600) gaps.push(g); }
      if (gaps.length) { gaps.sort((a, b) => a - b); eta = fmtTime(gaps[Math.floor(gaps.length / 2)] * remaining); }
    }
    $('#dPct').textContent = n ? `${pct}% accepted` : 'Import lines to start.';
    const cell = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
    $('#stats').innerHTML = cell(n, 'Total lines') + cell(c.done, 'Accepted') + cell(c.rec + c.redo, 'Recorded, not accepted') + cell(c.todo, 'Not recorded') +
      cell(c.redo, 'Need a redo') + cell(pct + '%', 'Progress') + cell(fmtTime(audio), 'Your recorded audio') + cell(eta, 'Time left at your pace');
    $('#expAll').checked = !!S.settings.exportAll;
  }

  const stamp = () => { const d = new Date(), p = (x) => String(x).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };
  function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }

  // A sink writes a file: straight to Downloads on Android, or as a browser download
  function makeSink(name, mime) {
    if (ANDROID && window.LubaAndroid.saveBegin) {
      const tok = window.LubaAndroid.saveBegin(name, mime);
      if (!tok || tok.startsWith('ERR')) throw new Error(tok || 'could not create file');
      let n = 0;
      return {
        async write(parts) {
          for (const p of parts) {
            for (let o = 0; o < p.length; o += 393216) {
              const r = window.LubaAndroid.saveChunk(tok, b64(p.subarray(o, o + 393216)));
              if (r !== 'OK') throw new Error(r);
              if (++n % 6 === 0) await sleep(0);
            }
          }
        },
        async close() {
          const r = window.LubaAndroid.saveEnd(tok);
          if (!r.startsWith('OK')) throw new Error(r);
          const where = r.split('|')[1] || 'Downloads';
          $('#savedWhere').textContent = 'Saved to ' + where;
          $('#shareRow').hidden = false;
          return where;
        }
      };
    }
    const parts = [];
    return {
      async write(ps) { for (const p of ps) parts.push(p); },
      async close() {
        const blob = new Blob(parts, { type: mime });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 60000);
        window.__lastDownload = { name, size: blob.size };
        return 'Downloads';
      }
    };
  }

  function manifestRows(selected) {
    const rows = [['file', 'line', 'text', 'pronunciation', 'status', 'check_result', 'duration_s', 'speaking_s', 'notes'].join(',')];
    for (const { L, i, file } of selected) {
      rows.push([file, i + 1, L.text, info(L.text).text, { done: 'accepted', rec: 'recorded', todo: 'not recorded' }[L.status] || L.status,
        L.verdict || '', L.dur ? L.dur.toFixed(2) : '', L.speech ? L.speech.toFixed(2) : '', (L.notes || []).join(' ')].map(LV.csvCell).join(','));
    }
    return '﻿' + rows.join('\r\n') + '\r\n';
  }

  async function exportZip() {
    if (Rec.busy()) return;
    const all = $('#expAll').checked;
    const total = S.lines.length;
    const sel = [];
    S.lines.forEach((L, i) => { if (L.status === 'done' || (all && L.status === 'rec')) sel.push({ L, i, file: LV.fileNameFor(i, total) }); });
    if (!sel.length) { toast(all ? 'No recordings yet.' : 'No accepted takes yet. Accept some, or switch on “Include takes not yet accepted”.', 4500); return; }
    const btn = $('#expZip'); btn.disabled = true;
    $('#expBusy').hidden = false; $('#shareRow').hidden = true;
    const bar = $('#expBar'), msg = $('#expMsg');
    try {
      const name = `LubaVoice_Greek_${stamp()}.zip`;
      const sink = makeSink(name, 'application/zip');
      const zw = new LV.ZipWriter();
      const done = [];
      let sr = S.settings.sampleRate, secs = 0;
      for (let k = 0; k < sel.length; k++) {
        const { L } = sel[k];
        const t = await DB.get('audio', L.id);
        if (!t) continue;
        const u8 = new Uint8Array(await t.wav.arrayBuffer());
        await sink.write(zw.add(sel[k].file, u8));
        sr = t.sr; secs += (u8.length - 44) / 2 / t.sr;
        done.push(sel[k]);
        bar.style.width = ((k + 1) / sel.length * 100) + '%';
        msg.textContent = `Adding ${k + 1} of ${sel.length}…`;
        if (k % 10 === 0) await sleep(0);
      }
      await sink.write(zw.add('manifest.csv', manifestRows(done)));
      await sink.write(zw.add('report.txt', report(done, secs)));
      await sink.write(zw.add('README.txt',
        'LubaVoice AI export\r\n\r\nThese are your own practice recordings made with LubaVoice AI.\r\n' +
        `Format: WAV, 16-bit PCM, mono, ${sr} Hz. File numbers match the line numbers in your list.\r\n` +
        'manifest.csv maps each file to its Greek sentence (open it in Excel or Google Sheets).\r\n\r\n' +
        'FunCrowd records inside its own app, so final takes for a FunCrowd task are made there.\r\n'));
      await sink.write(zw.finish());
      const where = await sink.close();
      msg.textContent = `Done: ${done.length} recordings, ${fmtTime(secs)} of audio. ${ANDROID ? 'Saved to ' + where + '.' : ''}`;
      bar.style.width = '100%';
      toast(`Exported ${done.length} recordings.`);
    } catch (e) {
      msg.textContent = 'Export failed: ' + (e && e.message || e);
      toast('Export failed: ' + (e && e.message || e), 5000);
    } finally { btn.disabled = false; }
  }

  function report(done, secs) {
    const c = { done: 0, rec: 0, redo: 0, todo: 0 };
    S.lines.forEach((L) => c[statusOf(L)]++);
    const lines = [
      'LubaVoice AI report — ' + new Date().toLocaleString(), '',
      `Lines in list:        ${S.lines.length}`, `Accepted:             ${c.done}`, `Recorded, not accepted: ${c.rec + c.redo}`, `Not recorded:         ${c.todo}`,
      `Files in this export: ${done.length} (${fmtTime(secs)} of audio)`, ''
    ];
    const flagged = done.filter(({ L }) => L.verdict && L.verdict !== 'good');
    if (flagged.length) {
      lines.push('Exported takes that had warnings:');
      flagged.forEach(({ L, file }) => lines.push(`  ${file}  [${L.verdict}] ${(L.notes || []).map((n) => LV.CHECK_TEXT[n] || n).join(' ')}`));
      lines.push('');
    }
    const missing = S.lines.map((L, i) => ({ L, i })).filter(({ L }) => L.status !== 'done');
    if (missing.length) {
      lines.push('Lines not accepted yet:');
      missing.forEach(({ L, i }) => lines.push(`  #${i + 1}  ${L.text}`));
    }
    return lines.join('\r\n') + '\r\n';
  }

  async function exportCsv() {
    const total = S.lines.length;
    if (!total) { toast('No lines yet.'); return; }
    const sel = S.lines.map((L, i) => ({ L, i, file: LV.fileNameFor(i, total) }));
    try {
      const sink = makeSink(`LubaVoice_manifest_${stamp()}.csv`, 'text/csv');
      await sink.write([new TextEncoder().encode(manifestRows(sel))]);
      await sink.close();
      toast('Manifest saved.');
    } catch (e) { toast('Could not save: ' + (e && e.message || e), 5000); }
  }

  async function saveBackup() {
    const data = JSON.stringify({ app: 'LubaVoice AI', v: 1, savedAt: new Date().toISOString(), lines: S.lines, nextId: S.nextId, settings: S.settings }, null, 1);
    try {
      const sink = makeSink(`LubaVoice_backup_${stamp()}.json`, 'application/json');
      await sink.write([new TextEncoder().encode(data)]);
      await sink.close();
      toast('Backup saved.');
    } catch (e) { toast('Could not save: ' + (e && e.message || e), 5000); }
  }
  async function restoreBackup(file) {
    try {
      const d = JSON.parse(await file.text());
      if (!d || d.app !== 'LubaVoice AI' || !Array.isArray(d.lines)) throw new Error('not a LubaVoice backup');
      if (S.lines.length && !(await confirmBox('Replace your current list with this backup? Recordings on this device for lines in the backup are kept.', 'Restore'))) return;
      S.lines = d.lines.map((L) => Object.assign({ status: 'todo', notes: [] }, L));
      S.nextId = Math.max(d.nextId || 1, S.lines.length + 1);
      Object.assign(S.settings, d.settings || {});
      // lines whose audio isn't on this device go back to "to do"
      for (const L of S.lines) if (L.status !== 'todo' && !(await DB.get('audio', L.id))) { L.status = 'todo'; L.verdict = null; }
      S.idx = Math.max(0, nextTodo(-1)); save(); applySettings();
      toast(`Restored ${S.lines.length} lines.`);
      showTab('record');
    } catch (e) { toast('Could not restore: ' + (e && e.message || e), 5000); }
  }

  // ================================================================ settings
  function applySettings() {
    const st = S.settings;
    $('#setRate').value = st.rate; $('#rateLbl').textContent = st.rate.toFixed(2) + '×';
    $('#setSlow').value = st.slowRate; $('#slowLbl').textContent = st.slowRate.toFixed(2) + '×';
    $('#setAuto').checked = !!st.autoStop; $('#setAutoListen').checked = !!st.autoListen; $('#setRaw').checked = !!st.rawMic;
    $('#setRate2').value = String(st.sampleRate);
    $('#expAll').checked = !!st.exportAll;
  }

  // ================================================================ events
  function bind() {
    $$('nav.tabs button').forEach((b) => b.addEventListener('click', () => { if (!Rec.busy()) showTab(b.dataset.tab); }));
    $$('[data-go]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.go)));
    $('#emptyDemo').onclick = () => loadEntries(DEMO);
    $('#impDemo').onclick = () => { $('#impText').value = DEMO.join('\n'); $('#impJoin').value = 'auto'; impPreview(); };

    $('#btnListen').onclick = () => listen('n');
    $('#btnSlow').onclick = () => listen('s');
    $('#words').addEventListener('click', (e) => {
      const b = e.target.closest('.w'); if (!b || Rec.busy()) return;
      const it = info(cur().text).items[+b.dataset.i]; if (!it) return;
      listenMode = null;
      $$('.w.playing').forEach((w) => w.classList.remove('playing'));
      b.classList.add('playing');
      TTS.speak(it.word.replace(/[^\p{L}\p{N}'-]+/gu, ' ').trim(), S.settings.slowRate + 0.1, () => b.classList.remove('playing'));
    });
    $('#recBtn').onclick = () => { if (Rec.state === 'idle') Rec.start(); else Rec.stop(); };
    $('#btnRetake').onclick = () => Rec.start();
    $('#btnPlay').onclick = playTake;
    $('#btnAccept').onclick = accept;
    $('#btnPrev').onclick = () => go(S.idx - 1);
    $('#btnNext').onclick = () => go(S.idx + 1);
    $('#btnNextTodo').onclick = () => { const n = nextTodo(S.idx); if (n < 0) toast('Everything is accepted.'); else go(n); };

    $('#q').addEventListener('input', () => renderList(false));
    $('#filters').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      S.filter = b.dataset.f;
      $$('#filters button').forEach((x) => x.classList.toggle('on', x === b));
      renderList(true);
    });
    $('#list').addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (!b) return; S.idx = +b.dataset.i; save(); showTab('record'); });

    let joinFromFile = false; // a file sets "every line is separate"; typing or pasting new text goes back to Auto
    $('#impText').addEventListener('input', () => {
      if (joinFromFile) { $('#impJoin').value = 'auto'; joinFromFile = false; }
      clearTimeout(impPreview.t); impPreview.t = setTimeout(impPreview, 200);
    });
    $('#impJoin').onchange = () => { joinFromFile = false; impPreview(); }; $('#impDedupe').onchange = impPreview;
    $('#impClear').onclick = () => { $('#impText').value = ''; impPreview(); };
    $('#impFile').onchange = async (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      try { const r = await readFile(f); $('#impText').value = r.text; $('#impJoin').value = r.join; joinFromFile = r.join !== 'auto'; impPreview(); toast(`Read “${f.name}”.`); }
      catch (err) { toast('Could not read that file: ' + (err && err.message || err), 5000); }
      e.target.value = '';
    };
    $('#impLoad').onclick = () => { if (impEntries.length) loadEntries(impEntries); };

    $('#expZip').onclick = exportZip;
    $('#expCsv').onclick = exportCsv;
    $('#expAll').onchange = (e) => { S.settings.exportAll = e.target.checked; save(); };
    $('#bkSave').onclick = saveBackup;
    $('#bkLoad').onchange = (e) => { const f = e.target.files && e.target.files[0]; if (f) restoreBackup(f); e.target.value = ''; };
    $('#btnShare').onclick = () => { try { window.LubaAndroid.shareLast(); } catch (e) { toast('Sharing is not available.'); } };

    $('#setRate').oninput = (e) => { S.settings.rate = +e.target.value; applySettings(); save(); };
    $('#setSlow').oninput = (e) => { S.settings.slowRate = +e.target.value; applySettings(); save(); };
    $('#setVoice').onchange = (e) => { S.settings.voice = e.target.value; TTS.pick(); renderVoice(); save(); };
    $('#setAuto').onchange = (e) => { S.settings.autoStop = e.target.checked; save(); };
    $('#setAutoListen').onchange = (e) => { S.settings.autoListen = e.target.checked; save(); };
    $('#setRaw').onchange = (e) => { S.settings.rawMic = e.target.checked; save(); };
    $('#setRate2').onchange = (e) => { S.settings.sampleRate = +e.target.value; save(); };
    $('#btnReset').onclick = async () => {
      if (!(await confirmBox('Delete all lines and all recordings on this device? This cannot be undone.', 'Delete all'))) return;
      await DB.clear('audio'); takes.clear();
      S.lines = []; S.idx = 0; S.acceptLog = []; save();
      toast('Everything was deleted.'); showTab('record');
    };

    if (ANDROID) {
      $('#btnInstallVoice').onclick = () => { try { window.LubaAndroid.installGreekVoice(); } catch (e) { /* ignore */ } };
      $('#btnTtsSettings').onclick = () => { try { window.LubaAndroid.openTtsSettings(); } catch (e) { /* ignore */ } };
      $('#btnRecheck').onclick = () => { try { window.LubaAndroid.recheckVoice(); } catch (e) { /* ignore */ } TTS.status = 'checking'; renderVoice(); setTimeout(() => TTS.pollNative(0), 400); };
    }

    document.addEventListener('keydown', (e) => {
      if (curTab !== 'record' || e.target.closest('input, textarea, select') || !$('#modal').hidden || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === ' ') { e.preventDefault(); $('#recBtn').click(); }
      else if (Rec.busy()) return;
      else if (k === 'l') listen('n');
      else if (k === 's') listen('s');
      else if (k === 'p') playTake();
      else if (k === 'r') Rec.start();
      else if (k === 'enter') { e.preventDefault(); accept(); }
      else if (k === 'arrowright') go(S.idx + 1);
      else if (k === 'arrowleft') go(S.idx - 1);
    });

    const pause = () => { if (Rec.busy()) { Rec.abort(); toast('Recording stopped because the app went to the background.'); } TTS.stop(); stopPlayback(); };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { pause(); flushSave(); }
      else if (ANDROID && TTS.status !== 'ok') { try { window.LubaAndroid.recheckVoice(); } catch (e) { /* ignore */ } setTimeout(() => TTS.pollNative(0), 400); }
    });
    window.addEventListener('pagehide', flushSave);
    window.__lubaPause = () => { pause(); flushSave(); };
    window.__lubaBack = () => {
      if (!$('#modal').hidden) { $('#modalNo').click(); return true; }
      if (Rec.busy()) { Rec.abort(); return true; }
      if (curTab !== 'record') { showTab('record'); return true; }
      return false;
    };
    window.addEventListener('resize', () => { const L = cur(); if (L && takes.has(L.id) && !$('#result').hidden) { const t = takes.get(L.id); drawWave(t.samples, t.sr, t.qc); } });
  }

  // ================================================================ start
  async function main() {
    await DB.open();
    await load();
    applySettings();
    bind();
    TTS.init();
    renderVoice();
    let ver = 'LubaVoice AI ' + APP_VERSION;
    if (ANDROID) { try { ver += ' · app ' + window.LubaAndroid.appVersion(); } catch (e) { /* ignore */ } }
    $('#appVer').textContent = ver + (DB.db ? '' : ' · progress is not being saved on this device');
    renderRecord();
    window.__lv = { S, DB, Rec, TTS, takes, info, loadEntries, DEMO }; // for testing
  }
  main();
})();
