// ================= shell: input, audio, panels, loop =================
(function () {
  const $ = s => document.querySelector(s);
  const cv = $('#c'), ctx = cv.getContext('2d');
  const SAVE_KEY = 'farlight-lamp';
  let muted = false;
  try { muted = localStorage.getItem(SAVE_KEY + '-mute') === '1'; } catch (e) {}
  const loadSave = () => { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && s.v === 2 ? s : null; } catch (e) { return null; } };

  // ---------- audio ----------
  let AC = null, master = null, musicZone = null, nextNote = 0, step = 0;
  function ac() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = muted ? 0 : .45; master.connect(AC.destination); } catch (e) { return null; } }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function tone(f, dur, type, vol, slide, when) {
    const a = AC; if (!a || muted) return;
    const t = (when || a.currentTime), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
    g.gain.setValueAtTime(vol || .08, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .02);
  }
  function noise(dur, vol, freq) {
    const a = AC; if (!a || muted) return;
    const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = freq || 900; s.buffer = buf; g.gain.value = vol || .2;
    s.connect(f); f.connect(g); g.connect(master); s.start();
  }
  const SFX = {
    swing:() => tone(600, .07, 'triangle', .07, -350), shoot:() => tone(880, .08, 'square', .04, -500),
    hit:() => { tone(180, .08, 'square', .07, -80); noise(.05, .08, 2000); }, hurt:() => { tone(220, .2, 'sawtooth', .09, -150); },
    die:() => { tone(300, .7, 'sawtooth', .1, -260); noise(.5, .15, 600); }, boom:() => noise(.45, .35, 500),
    crumble:() => noise(.6, .25, 1200), pulse:() => { tone(330, .4, 'sine', .12, 330); tone(495, .4, 'sine', .06, 495); },
    pickup:() => tone(1320, .05, 'square', .03, 300), key:() => { tone(880, .08, 'square', .05); tone(1320, .12, 'square', .05, 0, AC && AC.currentTime + .08); },
    door:() => tone(140, .25, 'square', .08, 60), dash:() => noise(.12, .12, 3000), clink:() => tone(1800, .05, 'triangle', .05),
    talk:() => tone(700, .03, 'square', .025), tick:() => tone(1000, .03, 'square', .03), place:() => tone(300, .06, 'square', .05),
    heal:() => { tone(660, .1, 'triangle', .06, 200); }, eshot:() => tone(420, .07, 'triangle', .035, -150),
    item:() => { [0, 4, 7, 12].forEach((n, i) => tone(mtof(72 + n), .18, 'square', .05, 0, AC && AC.currentTime + i * .08)); },
    shard:() => { [0, 7, 12, 16, 19].forEach((n, i) => tone(mtof(67 + n), .35, 'triangle', .07, 0, AC && AC.currentTime + i * .1)); },
    gate:() => { tone(90, .8, 'sawtooth', .08, 40); noise(.8, .12, 400); }, pylon:() => tone(990, .3, 'sine', .08, 200),
    boss:() => { tone(110, .9, 'sawtooth', .1, -40); }, bossdie:() => { noise(1.2, .4, 800); tone(200, 1.2, 'sawtooth', .1, -170); },
    charge:() => tone(90, .5, 'sawtooth', .08, 120), wave:() => tone(70, .7, 'sine', .15, -20), shieldbreak:() => { tone(1400, .25, 'square', .05, -1100); noise(.2, .1, 4000); }
  };
  function music(zone) { musicZone = zone; step = 0; if (AC) nextNote = AC.currentTime + .1; }
  function musicTick() {
    if (!AC || muted || !musicZone || G.mode !== 'play') return;
    const boss = musicZone === 'boss', z = ZONES[boss ? G.L.id : musicZone] || ZONES.hub;
    const notes = z.notes, beat = boss ? .17 : .36, pat = boss ? [0, 0, 1, 0, 2, 0, 1, 3] : [0, 2, 1, 3, 2, 1, 0, 2];
    while (nextNote < AC.currentTime + .2) {
      const n = notes[pat[step % 8]] + (boss ? -12 : 0);
      tone(mtof(n), beat * .9, boss ? 'square' : 'triangle', boss ? .022 : .028, 0, nextNote);
      if (step % 8 === 0) tone(mtof(notes[0] - 24), beat * 7, 'sine', .07, 0, nextNote);
      if (boss && step % 2 === 0) tone(60, .08, 'square', .03, -30, nextNote);
      nextNote += beat; step++;
    }
  }

  // ---------- hooks ----------
  G.hooks.sfx = k => { if (SFX[k]) SFX[k](); };
  G.hooks.music = music;
  G.hooks.save = s => { try { localStorage.setItem(SAVE_KEY, s); } catch (e) {} };
  G.hooks.map = openMap;
  G.hooks.shop = openShop;
  G.hooks.ending = () => showPanel('end');
  const dlg = $('#dlg'), dlgName = $('#dlgName'), dlgText = $('#dlgText'), pcv = $('#portrait');
  G.hooks.dialog = line => {
    if (!line) { dlg.classList.remove('on'); return; }
    const sp = SPEAKERS[line[0]] || SPEAKERS.n;
    dlg.classList.add('on'); dlg.classList.toggle('narr', line[0] === 'n');
    dlgName.textContent = sp.name; dlgName.style.color = sp.color;
    dlgText.textContent = line[1];
    if (line[0] !== 'n') drawPortrait(pcv.getContext('2d'), line[0], pcv.width, pcv.height);
  };
  dlg.addEventListener('pointerdown', e => { e.preventDefault(); ac(); advanceDialog(); });

  // ---------- panels ----------
  let panel = null, focusIdx = 0;
  function showPanel(id) {
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.id === id));
    panel = id || null; focusIdx = 0;
    if (!panel && document.activeElement && document.activeElement.blur) document.activeElement.blur();
    document.body.classList.toggle('menu', !!panel);
    if (panel) setTimeout(() => focusBtn(0), 30);
  }
  function panelButtons() { const p = panel && document.getElementById(panel); return p ? [...p.querySelectorAll('button:not([disabled])')] : []; }
  function focusBtn(i) { const b = panelButtons(); if (!b.length) return; focusIdx = (i + b.length) % b.length; b[focusIdx].focus({ preventScroll:false }); }
  function refreshTitle() {
    const s = loadSave();
    $('#bContinue').hidden = !s;
    $('#bNew').textContent = s ? 'Start over' : 'Start the story';
    $('#bNew').classList.toggle('primary', !s);
    $('#bContinue').classList.toggle('primary', !!s);
    if (s) $('#saveInfo').textContent = 'Saved: ' + ZONES[s.zone].name + ', ' + ((s.shards.rust?1:0)+(s.shards.reef?1:0)+(s.shards.vault?1:0)) + ' of 3 shards';
    else $('#saveInfo').textContent = '';
    $('#bSound').textContent = muted ? 'Sound off' : 'Sound on';
    $('#bSound2').textContent = muted ? 'Sound off' : 'Sound on';
  }
  function toTitle() { G.mode = 'title'; musicZone = null; G.dialog = null; G.hooks.dialog(null); refreshTitle(); showPanel('title'); }
  $('#bContinue').onclick = () => { ac(); const s = loadSave(); if (s) { showPanel(null); startGame(s); } };
  $('#bNew').onclick = () => {
    ac();
    if (loadSave() && !confirm('Erase your saved game and start over?')) return;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    showPanel(null); startGame(null);
  };
  $('#bHow').onclick = () => { showPanel('how'); howFrom = 'title'; };
  let howFrom = 'title';
  $('#bHowBack').onclick = () => { if (howFrom === 'pause') showPanel('pause'); else toTitle(); };
  const toggleSound = () => { muted = !muted; try { localStorage.setItem(SAVE_KEY + '-mute', muted ? '1' : '0'); } catch (e) {} if (master) master.gain.value = muted ? 0 : .45; refreshTitle(); };
  $('#bSound').onclick = toggleSound; $('#bSound2').onclick = toggleSound;
  $('#bResume').onclick = () => showPanel(null);
  $('#bHow2').onclick = () => { howFrom = 'pause'; showPanel('how'); };
  $('#bQuit').onclick = () => { persist(); toTitle(); };
  $('#pauseBtn').onclick = () => { if (G.mode === 'play' && !panel) showPanel('pause'); };
  $('#bEndStay').onclick = () => showPanel(null);
  $('#bEndNew').onclick = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} toTitle(); };

  function openMap() {
    const list = $('#mapList'); list.innerHTML = '';
    for (const d of destinations()) {
      const b = document.createElement('button'); b.className = 'dest ' + d.id + (d.id === G.L.id ? ' here' : '');
      b.disabled = !d.open;
      const state = !d.open ? 'Locked' : d.id === G.L.id ? 'You are here' : d.done ? (d.id === 'hub' ? 'Lamp restored' : 'Cleared') : '';
      b.innerHTML = '<span class="orb"></span><span class="dt"><b></b><small></small></span><span class="st"></span>';
      b.querySelector('b').textContent = d.name;
      b.querySelector('small').textContent = d.open ? d.desc : 'Recover the previous shard to chart this.';
      b.querySelector('.st').textContent = state;
      b.onclick = () => { showPanel(null); if (d.id !== G.L.id) travel(d.id); };
      list.appendChild(b);
    }
    showPanel('map');
  }
  $('#bMapClose').onclick = () => showPanel(null);
  function openShop() {
    const S = G.save, list = $('#shopList'); list.innerHTML = '';
    $('#shopScrap').textContent = S.scrap + ' scrap';
    for (const it of SHOP) {
      const ok = it.ok(S), c = it.cost(S);
      const b = document.createElement('button'); b.className = 'ware'; b.disabled = !ok;
      b.innerHTML = '<span class="dt"><b></b><small></small></span><span class="st"></span>';
      b.querySelector('b').textContent = it.name; b.querySelector('small').textContent = it.desc;
      b.querySelector('.st').textContent = ok ? c + ' scrap' : 'Sold out';
      b.onclick = () => { const r = buy(it.id); $('#shopMsg').textContent = r; const i = focusIdx; openShop(); focusBtn(i); };
      list.appendChild(b);
    }
    if (panel !== 'shop') { $('#shopMsg').textContent = 'Tamsin: "Scrap in, gear out. No questions."'; showPanel('shop'); }
  }
  $('#bShopClose').onclick = () => showPanel(null);

  // ---------- input ----------
  const keys = {};
  const I = G.input;
  const KEYMAP = { attack:['Space','KeyJ','Enter','KeyZ'], dash:['ShiftLeft','ShiftRight','KeyK','KeyX'], item:['KeyE','KeyL','KeyC'], cycle:['KeyQ','Tab'] };
  addEventListener('keydown', e => {
    ac();
    if (panel) {
      if (e.code === 'Escape') { if (panel === 'pause' || panel === 'map' || panel === 'shop') showPanel(null); }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { focusBtn(focusIdx + 1); e.preventDefault(); }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { focusBtn(focusIdx - 1); e.preventDefault(); }
      return;
    }
    if (e.repeat) { if (!e.code.startsWith('Arrow')) e.preventDefault(); keys[e.code] = true; return; }
    keys[e.code] = true;
    if (G.mode === 'play') {
      for (const k in KEYMAP) if (KEYMAP[k].includes(e.code)) { I[k] = true; e.preventDefault(); }
      if (e.code === 'Escape' || e.code === 'KeyP') showPanel('pause');
      if (e.code.startsWith('Arrow')) e.preventDefault();
    }
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  // touch stick
  const T_ = G.touch; let stickId = null;
  cv.addEventListener('pointerdown', e => {
    ac();
    if (G.mode !== 'play' || panel) return;
    if (G.dialog) { advanceDialog(); return; }
    const r = G.hud.itemRect;
    if (r && e.clientX >= r.x - 6 && e.clientX <= r.x + r.w + 6 && e.clientY >= r.y - 6 && e.clientY <= r.y + r.h + 16) { I.cycle = true; return; }
    if (e.pointerType === 'mouse') return;
    document.body.classList.add('touch');
    if (stickId === null && e.clientX < innerWidth * .6) { stickId = e.pointerId; T_.on = true; T_.sx = T_.x = e.clientX; T_.sy = T_.y = e.clientY; cv.setPointerCapture(e.pointerId); }
  });
  cv.addEventListener('pointermove', e => {
    if (e.pointerId !== stickId) return;
    let dx = e.clientX - T_.sx, dy = e.clientY - T_.sy; const d = Math.hypot(dx, dy), max = 46;
    if (d > max) { T_.sx += dx * (1 - max / d); T_.sy += dy * (1 - max / d); dx = e.clientX - T_.sx; dy = e.clientY - T_.sy; }
    T_.x = e.clientX; T_.y = e.clientY;
  });
  const endStick = e => { if (e.pointerId === stickId) { stickId = null; T_.on = false; } };
  cv.addEventListener('pointerup', endStick); cv.addEventListener('pointercancel', endStick);
  document.querySelectorAll('[data-act]').forEach(b => {
    b.addEventListener('pointerdown', e => { e.preventDefault(); ac(); document.body.classList.add('touch'); const a = b.dataset.act; if (G.dialog && a === 'attack') advanceDialog(); else I[a] = true; b.classList.add('down'); });
    const up = () => b.classList.remove('down');
    b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
  });
  if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
  // gamepad
  let padPrev = [];
  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null; for (const p of pads) if (p && p.connected) { gp = p; break; }
    if (!gp) return { x:0, y:0 };
    const btn = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const edge = i => btn(i) && !padPrev[i];
    let x = gp.axes[0] || 0, y = gp.axes[1] || 0;
    if (Math.hypot(x, y) < .22) { x = 0; y = 0; }
    if (btn(14)) x = -1; if (btn(15)) x = 1; if (btn(12)) y = -1; if (btn(13)) y = 1;
    if (edge(0) || edge(1) || edge(2) || edge(3) || edge(9)) { ac(); document.body.classList.remove('touch'); }
    if (panel) {
      if (edge(13) || (y > .6 && !padPrev.down)) focusBtn(focusIdx + 1);
      if (edge(12) || (y < -.6 && !padPrev.up)) focusBtn(focusIdx - 1);
      if (edge(0)) { const b = panelButtons()[focusIdx]; if (b) b.click(); }
      if ((edge(1) || edge(9)) && (panel === 'pause' || panel === 'map' || panel === 'shop')) showPanel(null);
    } else if (G.mode === 'play') {
      if (edge(0)) I.attack = true;
      if (edge(1) || edge(5) || edge(7)) I.dash = true;
      if (edge(2) || edge(4) || edge(6)) I.item = true;
      if (edge(3)) I.cycle = true;
      if (edge(9)) showPanel('pause');
    }
    padPrev = gp.buttons.map(b => b.pressed); padPrev.down = y > .6; padPrev.up = y < -.6;
    return { x, y };
  }
  function readMove() {
    const pad = pollPad();
    let x = 0, y = 0;
    if (keys.KeyA || keys.ArrowLeft) x -= 1; if (keys.KeyD || keys.ArrowRight) x += 1;
    if (keys.KeyW || keys.ArrowUp) y -= 1; if (keys.KeyS || keys.ArrowDown) y += 1;
    if (x || y) { const d = Math.hypot(x, y); x /= d; y /= d; }
    else if (T_.on) { x = (T_.x - T_.sx) / 46; y = (T_.y - T_.sy) / 46; }
    else { x = pad.x; y = pad.y; }
    I.mx = x; I.my = y;
  }

  // ---------- sizing & loop ----------
  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1), w = innerWidth, h = innerHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    G.view.w = w; G.view.h = h; G.view.dpr = dpr;
    G.view.scale = Math.max(1, Math.min(Math.min(w, h) / (T * 10), Math.max(w, h) / (T * 16), 3.2));
    ctx.imageSmoothingEnabled = true;
    const st = getComputedStyle(document.documentElement).getPropertyValue('--sat');
    G.view.safeTop = (parseFloat(st) || 0) + 8;
  }
  addEventListener('resize', resize); resize();
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    readMove();
    if (panel) { G.time += dt; clearEdges(); }
    else update(dt);
    if (AC) musicTick();
    render(ctx);
    requestAnimationFrame(frame);
  }
  document.fonts && document.fonts.ready.then(() => { for (const k in PAT) delete PAT[k]; });
  refreshTitle(); showPanel('title');
  requestAnimationFrame(frame);
})();
