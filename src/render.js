// ================= renderer =================
const PAT = {};
let grainPat = null;
function mkCanvas(w, h) {
  if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  return { width:w, height:h, getContext:() => stubCtx() };
}
function stubCtx() { return new Proxy({}, { get:(t, k) => (k in t ? t[k] : () => ({ addColorStop(){} })), set:(t, k, v) => { t[k] = v; return true; } }); }
function halftone(ctx, color, size, rad) {
  const key = color + size + rad; if (PAT[key]) return PAT[key];
  const c = mkCanvas(size, size), x = c.getContext('2d');
  x.fillStyle = color;
  const dot = (px, py) => { x.beginPath(); x.arc(px, py, rad, 0, TAU); x.fill(); };
  dot(size / 4, size / 4); dot(size * 3 / 4, size * 3 / 4);
  return (PAT[key] = ctx.createPattern(c, 'repeat'));
}
function grain(ctx) {
  if (grainPat) return grainPat;
  const c = mkCanvas(128, 128), x = c.getContext('2d');
  if (typeof document !== 'undefined' && x.createImageData) {
    const d = x.createImageData(128, 128);
    for (let i = 0; i < d.data.length; i += 4) { const v = 120 + Math.random() * 135; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = Math.random() < .35 ? 12 : 0; }
    x.putImageData(d, 0, 0);
  }
  return (grainPat = ctx.createPattern(c, 'repeat'));
}
const FONT_D = '"Bungee", Impact, "Arial Black", sans-serif';
const FONT_B = '"Chivo", "Segoe UI", system-ui, sans-serif';
const OUT = '#0a0912';
let LIGHTS = [];
function light(x, y, r, c, a) { LIGHTS.push({ x, y, r, c, a:a === undefined ? .55 : a }); }

function render(ctx) {
  const V = G.view; ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
  if (G.mode !== 'play' || !G.L) { renderTitle(ctx); return; }
  const L = G.L, z = L.z, s = V.scale;
  LIGHTS = [];
  ctx.fillStyle = z.bg; ctx.fillRect(0, 0, V.w, V.h);
  const sx = G.shake ? (Math.random() - .5) * G.shake : 0, sy = G.shake ? (Math.random() - .5) * G.shake : 0;
  ctx.save();
  ctx.scale(s, s);
  ctx.translate(-(G.cam.x + sx), -(G.cam.y + sy));
  drawTiles(ctx, L, z);
  for (const r of G.rings) drawRing(ctx, r);
  for (const k of G.pickups) drawPickup(ctx, k);
  for (const n of G.npcs) drawNpc(ctx, n);
  for (const b of G.bombs) drawBomb(ctx, b);
  const ents = G.enemies.filter(e => e.alive); ents.sort((a, b) => a.y - b.y);
  for (const f of G.fx) if (f.k === 'ghost' || f.k === 'kghost') drawGhost(ctx, f);
  for (const e of ents) drawEnemy(ctx, e);
  if (G.boss && !G.boss.dead) drawBoss(ctx, G.boss);
  if (G.dead <= 0) drawPlayer(ctx);
  for (const sh of G.shots) drawShot(ctx, sh);
  for (const f of G.fx) if (f.k !== 'ghost' && f.k !== 'kghost') drawFx(ctx, f);
  if (G.nearPrompt && !G.dialog) drawPrompt(ctx, G.nearPrompt);
  ctx.restore();
  drawLighting(ctx, V, z, sx, sy);
  ctx.fillStyle = grain(ctx); ctx.fillRect(0, 0, V.w, V.h);
  drawHud(ctx, V);
  if (G.dead > 0) {
    ctx.fillStyle = 'rgba(8,9,22,' + clamp(1 - G.dead / 1.6, 0, .88) + ')'; ctx.fillRect(0, 0, V.w, V.h);
    riText(ctx, 'Down, not out', V.w / 2, V.h / 2, 30, INK.cream, z.detail, 'center');
  }
}
function drawLighting(ctx, V, z, sx, sy) {
  const s = V.scale, px = (G.p.x - G.cam.x - sx) * s, py = (G.p.y - G.cam.y - sy) * s, m = Math.max(V.w, V.h);
  const amb = G.L.id === 'hub' ? .38 : G.L.id === 'finale' ? .74 : .6;
  const g = ctx.createRadialGradient(px, py, m * .1, px, py, m * .78);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.55, 'rgba(4,5,14,' + amb * .45 + ')'); g.addColorStop(1, 'rgba(4,5,14,' + amb + ')');
  ctx.fillStyle = g; ctx.fillRect(0, 0, V.w, V.h);
  if (!LIGHTS.length) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const li of LIGHTS) {
    const lx = (li.x - G.cam.x - sx) * s, ly = (li.y - G.cam.y - sy) * s, lr = li.r * s;
    if (lx < -lr || ly < -lr || lx > V.w + lr || ly > V.h + lr) continue;
    const rg = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr);
    rg.addColorStop(0, hexA(li.c, li.a)); rg.addColorStop(.5, hexA(li.c, li.a * .35)); rg.addColorStop(1, hexA(li.c, 0));
    ctx.fillStyle = rg; ctx.fillRect(lx - lr, ly - lr, lr * 2, lr * 2);
  }
  ctx.restore();
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a.toFixed(3) + ')';
}
function riText(ctx, text, x, y, size, c1, c2, align, font) {
  ctx.font = size + 'px ' + (font || FONT_D); ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = OUT; ctx.fillText(text, x + size * .05, y + size * .05);
  ctx.fillStyle = c2; ctx.fillText(text, x + size * .022, y + size * .022);
  ctx.fillStyle = c1; ctx.fillText(text, x, y);
}
function isWall(ch) { return ch === '#' || ch === 'C' || ch === ' '; }
const CAP = 11;
function drawTiles(ctx, L, z) {
  const V = G.view, s = V.scale, tm = G.time;
  const x0 = Math.max(0, Math.floor(G.cam.x / T) - 1), y0 = Math.max(0, Math.floor(G.cam.y / T) - 1);
  const x1 = Math.min(L.W - 1, Math.ceil((G.cam.x + V.w / s) / T) + 1), y1 = Math.min(L.H - 1, Math.ceil((G.cam.y + V.h / s) / T) + 2);
  // --- floors ---
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const ch = L.g[ty * L.W + tx], px = tx * T, py = ty * T;
    if (isWall(ch)) continue;
    if (ch === '~') { drawVoid(ctx, px, py, tx, ty, z, tm); continue; }
    const h = hash(tx, ty);
    ctx.fillStyle = h < .5 ? z.floor : z.floor2; ctx.fillRect(px, py, T, T);
    // seams
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(px, py + T - 1, T, 1); ctx.fillRect(px + T - 1, py, 1, T);
    // speckle
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    for (let i = 0; i < 3; i++) { const a = hash(tx * 5 + i, ty * 11 + i), b = hash(tx * 13 + i, ty * 7 + i); ctx.fillRect(px + a * 30, py + b * 30, 1 + (a > .8 ? 1 : 0), 1); }
    floorMotif(ctx, L.id, px, py, tx, ty, z, h, tm);
  }
  // --- shadow the floor beneath walls ---
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const ch = L.g[ty * L.W + tx]; if (ch !== '#' && ch !== 'C') continue;
    if (!isWall(tileAt(tx, ty + 1))) { const g = ctx.createLinearGradient(0, ty * T + T, 0, ty * T + T + 12); g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(tx * T, ty * T + T, T, 12); }
  }
  // --- walls ---
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const ch = L.g[ty * L.W + tx], px = tx * T, py = ty * T;
    if (ch === ' ') { ctx.fillStyle = z.bg; ctx.fillRect(px, py, T, T); continue; }
    if (ch !== '#' && ch !== 'C') continue;
    const openUp = !isWall(tileAt(tx, ty - 1)), openDown = !isWall(tileAt(tx, ty + 1));
    const openL = !isWall(tileAt(tx - 1, ty)), openR = !isWall(tileAt(tx + 1, ty));
    ctx.fillStyle = z.wall; ctx.fillRect(px, py, T, T);
    if (openUp) {
      ctx.fillStyle = z.wallHi; ctx.fillRect(px, py, T, CAP);
      ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(px, py, T, 2);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(px, py + CAP - 2, T, 2);
    } else { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(px, py, T, 6); }
    // body grading
    const g = ctx.createLinearGradient(0, py + CAP, 0, py + T); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.32)');
    ctx.fillStyle = g; ctx.fillRect(px, py + (openUp ? CAP : 0), T, T - (openUp ? CAP : 0));
    // panel detail
    const h = hash(tx + 3, ty + 9);
    if (ch === '#' && h < .38) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(px + 5, py + (openUp ? CAP + 5 : 8), T - 10, 2); if (h < .14) { ctx.fillStyle = z.detail; ctx.globalAlpha = .5; ctx.fillRect(px + 13, py + T - 9, 6, 3); ctx.globalAlpha = 1; } }
    ctx.fillStyle = z.wallEdge;
    if (openL) ctx.fillRect(px, py, 2, T);
    if (openR) ctx.fillRect(px + T - 2, py, 2, T);
    if (openDown) ctx.fillRect(px, py + T - 2, T, 2);
    if (openUp) ctx.fillRect(px, py, T, 1.5);
    if (ch === 'C') drawCrack(ctx, px, py, z, tm);
  }
  // --- objects ---
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const ch = L.g[ty * L.W + tx], px = tx * T, py = ty * T;
    if (ch === 'D') drawDoor(ctx, px, py, z);
    else if (ch === 'G') drawGate(ctx, px, py, z);
    else if (ch === 'P' || ch === 'Q') drawPylon(ctx, px, py, z, ch === 'Q', tm);
    else if (ch === 'L') drawLaser(ctx, px, py, z, tm, tx);
    else if (ch === 'E') drawPad(ctx, px, py, z, tm);
    else if (ch === 'O' && tileAt(tx - 1, ty) !== 'O' && tileAt(tx, ty - 1) !== 'O') drawLamp(ctx, px, py);
  }
}
function floorMotif(ctx, id, px, py, tx, ty, z, h, tm) {
  if (id === 'rust') {
    if (h > .82) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(px + 9, py + 10, 2, 0, TAU); ctx.arc(px + 23, py + 22, 2, 0, TAU); ctx.fill(); }
    else if (h < .12) { ctx.fillStyle = 'rgba(255,138,61,.12)'; ctx.fillRect(px + 4, py + 6, 24, 7); }
  } else if (id === 'reef') {
    if (h > .72) { ctx.strokeStyle = 'rgba(139,255,233,.11)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px + 3, py + 24); ctx.lineTo(px + 15, py + 10); ctx.lineTo(px + 29, py + 20); ctx.stroke(); }
  } else if (id === 'vault') {
    if (h > .6) { ctx.fillStyle = 'rgba(255,206,61,.08)'; for (let i = 0; i < 3; i++) ctx.fillRect(px + 6, py + 9 + i * 7, 20, 1); }
  } else if (id === 'hub') {
    if (h > .88) { ctx.fillStyle = 'rgba(255,174,67,.16)'; ctx.fillRect(px + 6, py + 14, 20, 3); ctx.fillRect(px + 6, py + 20, 12, 3); }
  } else if (id === 'finale') {
    if (h > .7) { ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(px + 2, py + 6 + h * 8); ctx.lineTo(px + 13, py + 16); ctx.lineTo(px + 30, py + 12 + h * 6); ctx.stroke(); }
  }
}
function drawVoid(ctx, px, py, tx, ty, z, tm) {
  ctx.fillStyle = '#04050e'; ctx.fillRect(px, py, T, T);
  for (let i = 0; i < 3; i++) {
    const a = hash(tx * 7 + i, ty * 13 + i), b = hash(ty * 3 + i, tx * 17 + i);
    ctx.globalAlpha = .25 + .6 * Math.abs(Math.sin(tm * 1.5 + a * 20)); ctx.fillStyle = i ? '#FFF1C9' : z.detail;
    ctx.fillRect(px + a * 29, py + b * 29, 1.4, 1.4);
  }
  ctx.globalAlpha = 1;
  if (tileAt(tx, ty - 1) !== '~') {
    const g = ctx.createLinearGradient(0, py, 0, py + 12); g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(px, py, T, 12);
  }
  if (tileAt(tx, ty + 1) !== '~') { ctx.fillStyle = hexA(z.detail, .18); ctx.fillRect(px, py + T - 2, T, 2); }
}
function drawCrack(ctx, px, py, z, tm) {
  ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.lineWidth = 2.4; ctx.beginPath();
  ctx.moveTo(px + 6, py + 4); ctx.lineTo(px + 15, py + 14); ctx.lineTo(px + 11, py + 21); ctx.lineTo(px + 21, py + 29);
  ctx.moveTo(px + 15, py + 14); ctx.lineTo(px + 26, py + 10); ctx.moveTo(px + 11, py + 21); ctx.lineTo(px + 3, py + 27); ctx.stroke();
  ctx.strokeStyle = hexA(z.glow, .35); ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = z.glow; ctx.globalAlpha = .4 + .3 * Math.sin(tm * 3 + px); ctx.fillRect(px + 14, py + 13, 2.5, 2.5); ctx.globalAlpha = 1;
}
function drawDoor(ctx, px, py, z) {
  ctx.fillStyle = z.wallEdge; ctx.fillRect(px, py, T, T);
  ctx.fillStyle = z.wall; ctx.fillRect(px + 2, py + 2, T - 4, T - 4);
  ctx.fillStyle = hexA(z.detail, .9); ctx.fillRect(px + 5, py + 5, T - 10, T - 10);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(px + 5, py + 15, T - 10, 2);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(px + 16, py + 12, 3.5, 0, TAU); ctx.fill(); ctx.fillRect(px + 14.5, py + 13, 3, 7);
  light(px + 16, py + 16, 42, z.glow, .3);
}
function drawGate(ctx, px, py, z) {
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(px, py, T, T);
  ctx.fillStyle = z.wallEdge; ctx.fillRect(px, py + 2, T, 5); ctx.fillRect(px, py + T - 7, T, 5);
  for (let i = 0; i < 4; i++) { ctx.fillStyle = z.wallHi; ctx.fillRect(px + 3 + i * 7, py, 4, T); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(px + 6 + i * 7, py, 1.5, T); }
  ctx.fillStyle = hexA(z.detail, .8); ctx.fillRect(px, py + 3, T, 2);
}
function drawPylon(ctx, px, py, z, lit, tm) {
  const cx = px + 16;
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(cx, py + 28, 11, 4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = OUT; roundRect(ctx, cx - 9, py + 3, 18, 26, 3); ctx.fill();
  ctx.fillStyle = lit ? z.wallHi : '#2a2740'; roundRect(ctx, cx - 7.5, py + 4.5, 15, 23, 3); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(cx + 2, py + 5, 5, 22);
  const c = lit ? z.glow : '#4a4770';
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, py + 12, lit ? 4.6 + Math.sin(tm * 4) * .6 : 4, 0, TAU); ctx.fill();
  ctx.fillStyle = lit ? INK.cream : '#5c5988'; ctx.fillRect(cx - 5, py + 20, 10, 2); ctx.fillRect(cx - 5, py + 24, 10, 2);
  if (lit) light(cx, py + 14, 90, z.glow, .55);
}
function drawLaser(ctx, px, py, z, tm, tx) {
  ctx.fillStyle = OUT; ctx.fillRect(px + 1, py, 6, T); ctx.fillRect(px + T - 7, py, 6, T);
  ctx.fillStyle = z.wallHi; ctx.fillRect(px + 2, py + 1, 4, T - 2); ctx.fillRect(px + T - 6, py + 1, 4, T - 2);
  const fl = .75 + .25 * Math.sin(tm * 26 + tx);
  ctx.globalAlpha = fl;
  for (let i = 0; i < 4; i++) { const y = py + 5 + i * 8;
    ctx.fillStyle = hexA(INK.pink, .8); ctx.fillRect(px + 6, y - 1.6, T - 12, 3.2);
    ctx.fillStyle = INK.cream; ctx.fillRect(px + 6, y - .5, T - 12, 1.2); }
  ctx.globalAlpha = 1;
  light(px + 16, py + 16, 46, INK.pink, .4);
}
function drawPad(ctx, px, py, z, tm) {
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(px + 2, py, T - 4, T);
  ctx.strokeStyle = hexA(z.glow, .9); ctx.lineWidth = 2.5;
  const o = (tm * 14) % 10;
  for (let i = 0; i < 2; i++) { const yy = py + 6 + ((i * 10 + o) % 20); ctx.globalAlpha = .85 - i * .35; ctx.beginPath(); ctx.moveTo(px + 8, yy); ctx.lineTo(px + 16, yy + 6); ctx.lineTo(px + 24, yy); ctx.stroke(); }
  ctx.globalAlpha = 1; light(px + 16, py + 16, 56, z.glow, .35);
}
function drawLamp(ctx, px, py) {
  const lit = G.save.lamp, n = shardCount(), cx = px + T, cy = py + T, tm = G.time;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(cx, cy + 26, 30, 9, 0, 0, TAU); ctx.fill();
  if (lit) {
    ctx.save(); ctx.translate(cx, cy - 8); ctx.rotate(tm * .25); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 8; i++) { ctx.rotate(TAU / 8); const g = ctx.createLinearGradient(0, 0, 0, -140);
      g.addColorStop(0, 'rgba(255,211,107,.2)'); g.addColorStop(1, 'rgba(255,211,107,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-11, -140); ctx.lineTo(11, -140); ctx.fill(); }
    ctx.restore();
  }
  ctx.fillStyle = OUT; roundRect(ctx, px + 4, py + 2, T * 2 - 8, T * 2 - 4, 6); ctx.fill();
  ctx.fillStyle = '#2c3068'; roundRect(ctx, px + 6, py + 4, T * 2 - 12, T * 2 - 8, 5); ctx.fill();
  const g2 = ctx.createLinearGradient(px, py, px, py + T * 2); g2.addColorStop(0, 'rgba(255,255,255,.12)'); g2.addColorStop(1, 'rgba(0,0,0,.35)');
  ctx.fillStyle = g2; roundRect(ctx, px + 6, py + 4, T * 2 - 12, T * 2 - 8, 5); ctx.fill();
  ctx.fillStyle = '#47407f'; ctx.fillRect(px + 6, py + 6, T * 2 - 12, 5); ctx.fillRect(px + 6, py + T * 2 - 13, T * 2 - 12, 5);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(cx, cy - 2, 15, 0, TAU); ctx.fill();
  ctx.fillStyle = lit ? '#FFD36B' : '#141634'; ctx.beginPath(); ctx.arc(cx, cy - 2, 13, 0, TAU); ctx.fill();
  if (lit) { ctx.fillStyle = INK.cream; ctx.beginPath(); ctx.arc(cx, cy - 2, 6 + Math.sin(tm * 5) * 1.5, 0, TAU); ctx.fill(); light(cx, cy - 2, 260, '#FFD36B', .75); }
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + i * TAU / 3, x = cx + Math.cos(a) * 19, y = cy - 2 + Math.sin(a) * 19, on = lit || i < n;
    ctx.fillStyle = OUT; diamondPath(ctx, x, y, 6); ctx.fill();
    ctx.fillStyle = on ? INK.cream : '#3a3f7a'; diamondPath(ctx, x, y, 4.5); ctx.fill();
    if (on) light(x, y, 40, '#FFF1C9', .4);
  }
}
function diamondPath(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * .72, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * .72, y); ctx.closePath(); }
function diamond(ctx, x, y, r, c) { ctx.fillStyle = c; diamondPath(ctx, x, y, r); ctx.fill(); }
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function poly(ctx, x, y, r, n, rot) { ctx.beginPath(); for (let i = 0; i < n; i++) { const a = rot + i * TAU / n; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
function ink(ctx, w) { ctx.strokeStyle = OUT; ctx.lineWidth = w || 2; ctx.lineJoin = 'round'; ctx.stroke(); }
function shadeTop(ctx, x, y, w, h) { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,.16)'); g.addColorStop(.55, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.3)'); ctx.fillStyle = g; ctx.fill(); }
// ---------- figures ----------
function dirOf(face) { const a = ((face % TAU) + TAU) % TAU;
  if (a > Math.PI * .25 && a <= Math.PI * .75) return 'down';
  if (a > Math.PI * .75 && a <= Math.PI * 1.25) return 'left';
  if (a > Math.PI * 1.25 && a <= Math.PI * 1.75) return 'up';
  return 'right'; }
function figure(ctx, x, y, o) {
  const d = dirOf(o.face || Math.PI / 2), w = o.walk || 0, sc = o.scale || 1, moving = o.moving;
  const sw = moving ? Math.sin(w) * 3.2 : 0, bob = moving ? Math.abs(Math.sin(w)) * 1.3 : 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(0, 10, 10, 3.6, 0, 0, TAU); ctx.fill();
  // legs
  ctx.fillStyle = o.legs; roundRect(ctx, -6.5, 1 - bob, 5.5, 9 + sw, 2); ctx.fill(); ink(ctx, 1.6);
  roundRect(ctx, 1, 1 - bob, 5.5, 9 - sw, 2); ctx.fill(); ink(ctx, 1.6);
  // cape / pack behind
  if (o.cape) { ctx.fillStyle = o.cape; roundRect(ctx, -9, -9 - bob, 18, 15, 5); ctx.fill(); ink(ctx, 1.8); }
  // torso
  ctx.fillStyle = o.body; roundRect(ctx, -8, -9 - bob, 16, 14, 5); ctx.fill(); shadeTop(ctx, -8, -9 - bob, 16, 14); ink(ctx, 2);
  if (o.mark) { ctx.fillStyle = o.mark; roundRect(ctx, -2.5, -6 - bob, 5, 5, 1.5); ctx.fill(); }
  // arms
  ctx.fillStyle = o.body; roundRect(ctx, -10.5, -7 - bob + (d === 'right' ? sw * .3 : 0), 4, 10, 2); ctx.fill(); ink(ctx, 1.5);
  roundRect(ctx, 6.5, -7 - bob - (d === 'left' ? sw * .3 : 0), 4, 10, 2); ctx.fill(); ink(ctx, 1.5);
  // head
  const hy = -15 - bob;
  ctx.fillStyle = o.head; ctx.beginPath(); ctx.arc(0, hy, 7, 0, TAU); ctx.fill();
  const hg = ctx.createLinearGradient(0, hy - 7, 0, hy + 7); hg.addColorStop(0, 'rgba(255,255,255,.18)'); hg.addColorStop(1, 'rgba(0,0,0,.28)');
  ctx.fillStyle = hg; ctx.fill(); ink(ctx, 2);
  // hair / helmet cap
  ctx.fillStyle = o.hair || o.legs; ctx.beginPath(); ctx.arc(0, hy, 7, Math.PI * 1.08, Math.PI * 1.92); ctx.fill();
  if (d !== 'up') {
    const ox = d === 'left' ? -2 : d === 'right' ? 2 : 0;
    ctx.fillStyle = o.visor; roundRect(ctx, -4.5 + ox, hy - 1.5, 9, 3.6, 1.6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-3.5 + ox, hy - 1, 3, 1.2);
  }
  ctx.restore();
}
function drawPlayer(ctx) {
  const p = G.p;
  light(p.x, p.y - 4, 150, G.L.z.glow, .22);
  if (p.inv > 0 && p.dash <= 0 && Math.floor(G.time * 16) % 2) return;
  if (p.atkT > 0) {
    const k = 1 - p.atkT / .18, a1 = p.atkAng - 1.15 + k * 2.3, a0 = Math.max(p.atkAng - 1.15, a1 - 1.0);
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = hexA(INK.cream, .25); ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(p.x, p.y - 4, 29, a0, a1); ctx.stroke();
    ctx.strokeStyle = INK.cream; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(p.x, p.y - 4, 30, a0, a1); ctx.stroke();
    ctx.strokeStyle = G.L.z.glow; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(p.x, p.y - 4, 26, a0, a1); ctx.stroke();
    ctx.restore();
  }
  figure(ctx, p.x, p.y, { face:p.face, walk:p.walk, moving:p.moving, body:'#E9622B', legs:'#23255c', head:'#F3C9A0', hair:'#2a2340', visor:'#7FE9D8', mark:'#FFD36B' });
  if (p.phase) { ctx.strokeStyle = hexA('#7FE9D8', .8); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y - 4, 17, 0, TAU); ctx.stroke(); }
}
function drawGhost(ctx, f) {
  ctx.globalAlpha = f.t / f.max * .45;
  if (f.k === 'kghost') { ctx.fillStyle = '#FF3B3B'; ctx.beginPath(); ctx.arc(f.x, f.y - 5, 12, 0, TAU); ctx.fill(); }
  else { ctx.fillStyle = f.phase ? '#7FE9D8' : '#E9622B'; roundRect(ctx, f.x - 8, f.y - 19, 16, 27, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
}
const NPC_LOOK = {
  bekele:{ body:'#D9A63A', legs:'#3a2a10', head:'#8a5a3c', hair:'#241a12', visor:'#FFF1C9' },
  tamsin:{ body:'#2C8F86', legs:'#14303f', head:'#f1c7a3', hair:'#7a3d22', visor:'#101430' },
  yara:{ body:'#7C63C9', legs:'#241a55', head:'#cdeee4', hair:'#2b2060', visor:'#101430' },
  mira:{ body:'#C7488C', legs:'#3b103a', head:'#b8e3ff', hair:'#2a1040', visor:'#7FE9D8' },
  clerk:{ body:'#C86A2E', legs:'#3a1d0c', head:'#f7e7a0', hair:'#402a12', visor:'#3B2C73' }
};
function drawNpc(ctx, n) {
  const look = NPC_LOOK[n.id];
  if (n.id === 'tamsin') {
    ctx.fillStyle = OUT; roundRect(ctx, n.x - 20, n.y + 2, 40, 12, 3); ctx.fill();
    ctx.fillStyle = '#8a5a2a'; roundRect(ctx, n.x - 19, n.y + 3, 38, 8, 2); ctx.fill();
    ctx.fillStyle = '#FFCE3D'; ctx.fillRect(n.x - 14, n.y + 4, 6, 4); ctx.fillRect(n.x + 2, n.y + 4, 9, 4);
  }
  figure(ctx, n.x, n.y + Math.sin(G.time * 2 + n.x) * .7, Object.assign({ face:Math.PI / 2 }, look));
  light(n.x, n.y - 6, 70, G.L.z.glow, .18);
}
function drawPrompt(ctx, pr) {
  const bob = Math.sin(G.time * 5) * 2;
  ctx.font = '700 9px ' + FONT_B; const w = ctx.measureText(pr.text).width + 14;
  ctx.fillStyle = OUT; roundRect(ctx, pr.x - w / 2 - 1.5, pr.y - 8 + bob, w + 3, 16, 7); ctx.fill();
  ctx.fillStyle = INK.cream; roundRect(ctx, pr.x - w / 2, pr.y - 7 + bob, w, 14, 6); ctx.fill();
  ctx.fillStyle = '#14163F'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(pr.text, pr.x, pr.y + bob);
  ctx.beginPath(); ctx.moveTo(pr.x - 4, pr.y + 7 + bob); ctx.lineTo(pr.x + 4, pr.y + 7 + bob); ctx.lineTo(pr.x, pr.y + 12 + bob); ctx.fill();
}
function drawEnemy(ctx, e) {
  const fl = e.flash > 0, x = e.x, y = e.y, z = G.L.z;
  if (e.kind === 'r') {
    figure(ctx, x, y, { face:e.face, walk:e.t * 12, moving:true, body:fl ? INK.cream : '#8c3145', legs:'#2a1018', head:fl ? INK.cream : '#C2683C', hair:'#3a1a1a', visor:'#FFB93D' });
    ctx.save(); ctx.translate(x, y - 5); ctx.rotate(e.face);
    ctx.fillStyle = '#b9bdd6'; ctx.beginPath(); ctx.moveTo(7, -2.5); ctx.lineTo(20, -1); ctx.lineTo(20, 1); ctx.lineTo(7, 2.5); ctx.closePath(); ctx.fill(); ink(ctx, 1.6); ctx.restore();
  } else if (e.kind === 'g') {
    figure(ctx, x, y, { face:e.face, walk:e.t * 8, moving:true, body:fl ? INK.cream : '#C2682E', legs:'#2a1018', head:fl ? INK.cream : '#d9b98f', hair:'#33210f', visor:'#FF6A5E' });
    ctx.save(); ctx.translate(x, y - 4); ctx.rotate(e.face);
    ctx.fillStyle = '#2b2d45'; roundRect(ctx, 5, -2.5, 14, 5, 2); ctx.fill(); ink(ctx, 1.6);
    if (e.cd < .35) { ctx.fillStyle = '#FFC46B'; ctx.beginPath(); ctx.arc(19, 0, 2.5, 0, TAU); ctx.fill(); }
    ctx.restore();
  } else if (e.kind === 'w') {
    const yy = y - 7 + Math.sin(e.t * 3) * 3, r = 10 + Math.sin(e.t * 6) * 1.1;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y + 8, 7, 3, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(x, yy); ctx.rotate(Math.sin(e.t) * .4);
    ctx.fillStyle = fl ? INK.cream : '#63D7E8'; diamondPath(ctx, 0, 0, r); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * .72, 0); ctx.lineTo(0, 0); ctx.fill();
    diamondPath(ctx, 0, 0, r); ink(ctx, 2);
    ctx.fillStyle = INK.cream; ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, TAU); ctx.fill(); ctx.restore();
    light(x, yy, 60, '#63D7E8', .35);
  } else if (e.kind === 't') {
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(x, y + 10, 13, 4.5, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = fl ? INK.cream : '#C9A63A'; poly(ctx, 0, 0, 14, 8, 0); ctx.fill(); shadeTop(ctx, -14, -14, 28, 28); poly(ctx, 0, 0, 14, 8, 0); ink(ctx, 2);
    ctx.rotate(e.t); ctx.fillStyle = '#20223f'; for (let i = 0; i < 6; i++) { ctx.rotate(TAU / 6); roundRect(ctx, 8, -2, 8, 4, 1.5); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = e.cd < .5 ? '#FF6A5E' : '#4a3f7a'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); ink(ctx, 1.6);
    if (e.cd < .5) light(x, y, 50, '#FF6A5E', .4);
  } else if (e.kind === 's') {
    const ex = e.exposed > 0, yy = y - 6 + Math.sin(e.t * 2) * 3;
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) { const a = i / 18 * TAU, rr = 12 + Math.sin(a * 3 + e.t * 5) * 2.5; ctx.lineTo(x + Math.cos(a) * rr, yy + Math.sin(a) * rr * (a > 0 && a < Math.PI ? 1.25 : 1)); }
    ctx.closePath();
    ctx.fillStyle = ex ? (fl ? INK.cream : '#B14E9E') : '#0b0a16'; ctx.fill();
    if (ex) { ctx.fillStyle = halftone(ctx, '#05060f', 4, 1); ctx.fill(); light(x, yy, 70, '#FF7ACF', .4); }
    ctx.strokeStyle = ex ? hexA('#FF9BD0', .7) : 'rgba(255,255,255,.08)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = fl ? INK.cream : '#7FE9D8'; ctx.fillRect(x - 5, yy - 3, 3, 3.4); ctx.fillRect(x + 2, yy - 3, 3, 3.4);
    light(x, yy, 34, '#7FE9D8', .3);
  }
  if (e.stun > 0 && e.kind !== 's') { ctx.fillStyle = '#FFE08A'; for (let i = 0; i < 3; i++) { const a = G.time * 6 + i * 2.1; ctx.fillRect(x + Math.cos(a) * 9 - 1, y - 26 + Math.sin(a) * 3, 2.5, 2.5); } }
  if (e.hp < e.max && e.kind !== 's') {
    ctx.fillStyle = 'rgba(8,9,18,.85)'; ctx.fillRect(x - 10, y + 13, 20, 4);
    ctx.fillStyle = e.hp / e.max > .5 ? '#7ED47A' : '#FF8A3D'; ctx.fillRect(x - 9, y + 14, 18 * e.hp / e.max, 2);
  }
}
function drawBoss(ctx, b) {
  const fl = b.flash > 0, x = b.x, y = b.y, tm = G.time, z = G.L.z;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(x, y + b.r * .72, b.r, b.r * .34, 0, 0, TAU); ctx.fill();
  if (b.kind === 'maw') {
    const shake = b.state === 'wind' ? Math.sin(tm * 60) * 2 : 0, a = b.state === 'idle' ? Math.atan2(G.p.y - y, G.p.x - x) : b.ang;
    ctx.save(); ctx.translate(x + shake, y);
    ctx.fillStyle = '#241017'; roundRect(ctx, -27, -20, 54, 11, 4); ctx.fill(); ink(ctx, 2); roundRect(ctx, -27, 9, 54, 11, 4); ctx.fill(); ink(ctx, 2);
    ctx.fillStyle = fl ? INK.cream : '#8a4530'; roundRect(ctx, -23, -19, 46, 38, 8); ctx.fill(); shadeTop(ctx, -23, -19, 46, 38); roundRect(ctx, -23, -19, 46, 38, 8); ink(ctx, 2.4);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; roundRect(ctx, -16, -12, 32, 10, 3); ctx.fill();
    ctx.fillStyle = b.state === 'wind' ? '#FF6A5E' : '#FFC46B'; ctx.beginPath(); ctx.arc(-8, -7, 4, 0, TAU); ctx.arc(6, -7, 4, 0, TAU); ctx.fill();
    ctx.rotate(a);
    ctx.fillStyle = '#20141a'; roundRect(ctx, 9, -13, 18, 26, 4); ctx.fill(); ink(ctx, 2);
    ctx.fillStyle = '#cfd3e6'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(12, -11 + i * 6.5); ctx.lineTo(24, -8 + i * 6.5); ctx.lineTo(12, -5 + i * 6.5); ctx.fill(); }
    ctx.restore();
    light(x, y, 120, b.state === 'wind' ? '#FF6A5E' : '#FFC46B', .35);
    if (b.state === 'stun') for (let i = 0; i < 4; i++) { const q = tm * 5 + i * 1.6; diamond(ctx, x + Math.cos(q) * 20, y - 34 + Math.sin(q) * 5, 4, '#FFE08A'); }
  } else if (b.kind === 'warden') {
    const half = b.hp < b.max / 2, n = half ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const a = b.ang + i * TAU / n, x2 = x + Math.cos(a) * 120, y2 = y + Math.sin(a) * 120;
      ctx.lineCap = 'round';
      ctx.strokeStyle = hexA('#FF48B0', .3); ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = hexA('#FF9BD0', .8); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = INK.cream; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(-b.ang * .5);
    ctx.fillStyle = fl ? INK.cream : '#2F8F8E'; poly(ctx, 0, 0, 23, 6, 0); ctx.fill(); shadeTop(ctx, -23, -23, 46, 46); poly(ctx, 0, 0, 23, 6, 0); ink(ctx, 2.4);
    ctx.fillStyle = hexA('#8BFFE9', .5); poly(ctx, 0, 0, 14, 6, Math.PI / 6); ctx.fill();
    ctx.fillStyle = INK.cream; poly(ctx, 0, 0, 7, 6, Math.PI / 6); ctx.fill();
    ctx.restore();
    light(x, y, 170, '#8BFFE9', .28);
  } else if (b.kind === 'auditor') {
    ctx.save(); ctx.translate(x, y + Math.sin(tm * 3) * 1.5);
    ctx.fillStyle = fl ? INK.cream : '#C9A63A'; roundRect(ctx, -18, -30, 36, 48, 7); ctx.fill(); shadeTop(ctx, -18, -30, 36, 48); roundRect(ctx, -18, -30, 36, 48, 7); ink(ctx, 2.4);
    ctx.fillStyle = '#2a2050'; ctx.beginPath(); ctx.arc(0, -14, 11, 0, TAU); ctx.fill(); ink(ctx, 2);
    ctx.fillStyle = '#FFE79A'; ctx.font = '13px ' + FONT_D; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('¢', 0, -13);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 3; i++) ctx.fillRect(-12, 1 + i * 5, 24, 2);
    ctx.restore();
    light(x, y, 130, '#FFE79A', .22);
    drawShield(ctx, b, '#FFCE3D');
  } else if (b.kind === 'kessa') {
    const lunge = b.state === 'lunge' || b.state === 'wind';
    const a = b.state === 'idle' || b.state === 'throw' ? Math.atan2(G.p.y - y, G.p.x - x) : b.ang;
    figure(ctx, x, y, { face:a, walk:tm * 12, moving:true, scale:1.4, body:fl ? INK.cream : '#C8303A', legs:'#1a0610', head:'#e8b48f', hair:'#2a0d14', visor:'#FFC46B', cape:'#6d1226', mark:'#FFF1C9' });
    ctx.save(); ctx.translate(x, y - 8); ctx.rotate(a);
    ctx.fillStyle = lunge ? INK.cream : '#d6dae8'; ctx.beginPath(); ctx.moveTo(10, -3.5); ctx.lineTo(34, -1.5); ctx.lineTo(34, 1.5); ctx.lineTo(10, 3.5); ctx.closePath(); ctx.fill(); ink(ctx, 1.8);
    ctx.restore();
    if (b.state === 'wind') { ctx.strokeStyle = hexA('#FF3B3B', .55); ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 130, y + Math.sin(a) * 130); ctx.stroke(); ctx.setLineDash([]); }
    light(x, y, 120, '#FF6A5E', .3);
  } else if (b.kind === 'heart') {
    const pu = 1 + Math.sin(tm * 3) * .06;
    ctx.save(); ctx.translate(x, y); ctx.scale(pu, pu);
    for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + tm * .4, rr = 52 + Math.sin(tm * 2 + i) * 9;
      ctx.strokeStyle = '#07060f'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.cos(a + .5) * 40, Math.sin(a + .5) * 40, Math.cos(a) * rr, Math.sin(a) * rr); ctx.stroke(); }
    ctx.fillStyle = fl ? INK.cream : '#0b0a1c'; ctx.beginPath(); ctx.arc(0, 0, 28, 0, TAU); ctx.fill();
    ctx.strokeStyle = hexA('#7FE9D8', .6); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = halftone(ctx, '#2F8F8E', 5, 1.1); ctx.beginPath(); ctx.arc(0, 0, 28, 0, TAU); ctx.fill();
    ctx.fillStyle = INK.cream; ctx.beginPath(); ctx.arc(0, 0, 7 + Math.sin(tm * 6) * 2, 0, TAU); ctx.fill();
    ctx.restore();
    light(x, y, 200, '#7FE9D8', .3);
    drawShield(ctx, b, '#7FE9D8');
  }
}
function drawShield(ctx, b, c) {
  if (b.shieldOff > 0) { if (b.shieldOff < 1.2 && Math.floor(G.time * 10) % 2) { ctx.strokeStyle = hexA(c, .5); ctx.lineWidth = 1; poly(ctx, b.x, b.y - 4, b.r + 10, 6, G.time); ctx.stroke(); } return; }
  ctx.save(); ctx.translate(b.x, b.y - 4); ctx.rotate(G.time * .8);
  ctx.fillStyle = hexA(c, .12); poly(ctx, 0, 0, b.r + 12, 6, 0); ctx.fill();
  ctx.strokeStyle = c; ctx.lineWidth = 2.5; poly(ctx, 0, 0, b.r + 12, 6, 0); ctx.stroke();
  ctx.strokeStyle = hexA(INK.cream, .5); ctx.lineWidth = 1; poly(ctx, 0, 0, b.r + 8, 6, .5); ctx.stroke();
  ctx.restore();
}
function drawPickup(ctx, k) {
  const bob = Math.sin(k.t * 4) * 2, x = k.x, y = k.y + bob, z = G.L.z;
  if (k.life !== undefined && k.life < 2 && Math.floor(k.t * 10) % 2) return;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, k.y + 8, k.type === 'I' ? 14 : 6, 3, 0, 0, TAU); ctx.fill();
  if (k.type === 'k') { ctx.fillStyle = '#FFD36B'; keyShape(ctx, x, y); ink(ctx, 1.6); light(x, y, 44, '#FFD36B', .35); }
  else if (k.type === '$' || k.type === 'scrap') { const r = k.type === '$' ? 7 : 3.6; cog(ctx, x, y, r, '#C9C2A8'); if (k.type === '$') { ink(ctx, 1.6); light(x, y, 40, '#FFE79A', .25); } }
  else if (k.type === 'h' || k.type === 'heart') { const s = k.type === 'h' ? 1.15 : .8; heartShape(ctx, x, y, s, '#FF5A6E'); ink(ctx, 1.6); light(x, y, 44, '#FF5A6E', .3); }
  else if (k.type === 'I') {
    ctx.fillStyle = '#3a2a1a'; roundRect(ctx, x - 14, y - 10, 28, 20, 3); ctx.fill(); ink(ctx, 2.2);
    ctx.fillStyle = '#8a6a2e'; roundRect(ctx, x - 14, y - 10, 28, 8, 3); ctx.fill();
    ctx.fillStyle = z.detail; ctx.fillRect(x - 3, y - 6, 6, 9); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x - 12, y - 8, 24, 2);
    light(x, y, 90, z.glow, .3 + .12 * Math.sin(k.t * 4));
  } else if (k.type === 'shard') {
    diamond(ctx, x, y, 14, INK.cream); diamondPath(ctx, x, y, 14); ink(ctx, 2);
    diamond(ctx, x, y, 7, '#FFD36B');
    light(x, y, 150, '#FFD36B', .55 + .15 * Math.sin(k.t * 4));
  }
}
function keyShape(ctx, x, y) { ctx.beginPath(); ctx.arc(x - 4, y, 4.5, 0, TAU); ctx.rect(x - 1, y - 1.5, 10, 3); ctx.rect(x + 5, y, 2, 4); ctx.rect(x + 8, y, 2, 3); ctx.fill(); }
function cog(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = i * TAU / 12, rr = i % 2 ? r : r * 1.32; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
function heartShape(ctx, x, y, s, c) {
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y + 6 * s);
  ctx.bezierCurveTo(x - 10 * s, y - 1 * s, x - 6 * s, y - 9 * s, x, y - 4 * s);
  ctx.bezierCurveTo(x + 6 * s, y - 9 * s, x + 10 * s, y - 1 * s, x, y + 6 * s); ctx.closePath(); ctx.fill();
}
function drawBomb(ctx, b) {
  const blink = b.t < .4 ? Math.floor(G.time * 20) % 2 : Math.floor(G.time * 6) % 2, c = b.owner === 'e' ? '#FF3B3B' : '#FF8A3D';
  const tx = b.owner === 'e' ? b.tx : b.x, ty = b.owner === 'e' ? b.ty : b.y, rad = b.owner === 'e' ? 50 : 56;
  ctx.strokeStyle = hexA(c, .4); ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(tx, ty, rad, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = hexA(c, .1); ctx.fill();
  ctx.fillStyle = '#16141f'; ctx.beginPath(); ctx.arc(b.x, b.y, 7.5, 0, TAU); ctx.fill(); ink(ctx, 1.8);
  ctx.fillStyle = blink ? INK.cream : c; ctx.beginPath(); ctx.arc(b.x, b.y - 1, 3, 0, TAU); ctx.fill();
  if (blink) light(b.x, b.y, 60, c, .4);
}
function drawShot(ctx, s) {
  const a = Math.atan2(s.vy, s.vx), c = s.from === 'p' ? '#FFD36B' : (s.c || '#FF7ACF');
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
  if (s.from === 'p') {
    ctx.fillStyle = hexA(c, .3); roundRect(ctx, -16, -3.5, 22, 7, 3); ctx.fill();
    ctx.fillStyle = c; roundRect(ctx, -10, -2.5, 15, 5, 2.5); ctx.fill();
    ctx.fillStyle = INK.cream; roundRect(ctx, -2, -1.5, 7, 3, 1.5); ctx.fill();
  } else {
    ctx.fillStyle = hexA(c, .25); ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 4.4, 0, TAU); ctx.fill();
    ctx.fillStyle = INK.cream; ctx.beginPath(); ctx.arc(-.6, -.6, 1.8, 0, TAU); ctx.fill();
  }
  ctx.restore();
  light(s.x, s.y, 34, c, .3);
}
function drawRing(ctx, r) {
  if (r.kind === 'pulse') {
    const a = 1 - r.rad / r.max;
    ctx.strokeStyle = hexA('#7FE9D8', a); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(r.x, r.y, r.rad, 0, TAU); ctx.stroke();
    ctx.strokeStyle = hexA(INK.cream, a * .8); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(r.x, r.y, r.rad * .82, 0, TAU); ctx.stroke();
    light(r.x, r.y, r.rad + 30, '#7FE9D8', a * .3);
  } else {
    ctx.strokeStyle = hexA('#7FE9D8', .3 * (1 - r.rad / r.max) + .2); ctx.lineWidth = 13; ctx.beginPath(); ctx.arc(r.x, r.y, r.rad, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(5,6,15,.85)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(r.x, r.y, r.rad, 0, TAU); ctx.stroke();
  }
}
function drawFx(ctx, f) {
  const k = f.t / f.max;
  if (f.k === 'dot') { ctx.globalAlpha = Math.min(1, k * 2); ctx.fillStyle = f.c; ctx.fillRect(f.x - f.s / 2, f.y - f.s / 2, f.s, f.s); ctx.globalAlpha = 1; }
  else if (f.k === 'txt') { ctx.globalAlpha = Math.min(1, k * 2); ctx.font = '800 10px ' + FONT_B; ctx.textAlign = 'center'; ctx.fillStyle = OUT; ctx.fillText(f.text, f.x + 1, f.y + 1); ctx.fillStyle = f.c; ctx.fillText(f.text, f.x, f.y); ctx.globalAlpha = 1; }
  else if (f.k === 'blast') {
    ctx.globalAlpha = k; ctx.fillStyle = '#FFE79A'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.2 - k * .6), 0, TAU); ctx.fill();
    ctx.fillStyle = hexA('#FF8A3D', .7); ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.35 - k * .7), 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    light(f.x, f.y, f.r * 3, '#FFC46B', k * .8);
  }
}
// ---------- HUD ----------
function drawHud(ctx, V) {
  const S = G.save, z = G.L.z, pad = 14, top = Math.max(pad, G.view.safeTop || 0);
  const plate = (x, y, w, h) => { ctx.fillStyle = 'rgba(8,9,22,.55)'; roundRect(ctx, x, y, w, h, 8); ctx.fill(); ctx.strokeStyle = 'rgba(255,241,201,.18)'; ctx.lineWidth = 1; ctx.stroke(); };
  const hearts = S.maxhp / 2;
  plate(pad - 6, top - 4, 22 + hearts * 24, 30);
  for (let i = 0; i < hearts; i++) {
    const x = pad + 12 + i * 24, y = top + 11, v = S.hp - i * 2;
    heartShape(ctx, x, y, 1.15, v > 0 ? '#FF5A6E' : 'rgba(255,255,255,.14)');
    if (v > 0) { ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.5; ctx.stroke(); }
    if (v === 1) { ctx.save(); ctx.beginPath(); ctx.rect(x, y - 12, 13, 24); ctx.clip(); heartShape(ctx, x, y, 1.15, 'rgba(10,9,18,.75)'); ctx.restore(); }
  }
  let y2 = top + 38;
  plate(pad - 6, y2 - 13, 150, 26);
  cog(ctx, pad + 8, y2, 5.5, '#FFD36B');
  ctx.font = '800 14px ' + FONT_B; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = INK.cream; ctx.fillText(S.scrap, pad + 20, y2 + 1);
  let xx = pad + 34 + ctx.measureText(String(S.scrap)).width;
  const keys = S.keys[G.L.id] || 0;
  if (keys) { ctx.fillStyle = '#FFD36B'; keyShape(ctx, xx + 6, y2); ctx.fillStyle = INK.cream; ctx.fillText('×' + keys, xx + 16, y2 + 1); xx += 42; }
  for (let i = 0; i < 3; i++) { const has = [S.shards.rust, S.shards.reef, S.shards.vault][i], x = xx + 8 + i * 14;
    diamond(ctx, x, y2, 6, has ? INK.cream : 'rgba(255,255,255,.16)'); if (has) { ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke(); } }
  // item slot
  const sel = selectable(), sz = 52, ix = V.w - pad - sz, iy = top;
  G.hud.itemRect = { x:ix, y:iy, w:sz, h:sz };
  ctx.fillStyle = 'rgba(8,9,22,.72)'; roundRect(ctx, ix, iy, sz, sz, 10); ctx.fill();
  ctx.strokeStyle = sel.length ? hexA(z.detail, .85) : 'rgba(255,241,201,.2)'; ctx.lineWidth = 2; ctx.stroke();
  if (sel.length) {
    const it = sel[S.sel % sel.length];
    itemIcon(ctx, it, ix + sz / 2, iy + sz / 2 - 4);
    if (G.p.itemCd > 0) { ctx.fillStyle = 'rgba(8,9,22,.72)'; ctx.save(); roundRect(ctx, ix, iy, sz, sz, 10); ctx.clip(); ctx.fillRect(ix, iy, sz, sz * clamp(G.p.itemCd / 1.2, 0, 1)); ctx.restore(); }
    ctx.font = '700 9px ' + FONT_B; ctx.textAlign = 'center'; ctx.fillStyle = INK.cream; ctx.fillText(ITEM_INFO[it].name, ix + sz / 2, iy + sz - 8);
    if (sel.length > 1) { ctx.fillStyle = hexA(z.detail, .9); ctx.fillText('tap to switch', ix + sz / 2, iy + sz + 11); }
  } else { ctx.font = '700 9px ' + FONT_B; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,241,201,.45)'; ctx.fillText('No item', ix + sz / 2, iy + sz / 2); }
  if (S.items.includes('phase')) { ctx.font = '700 9px ' + FONT_B; ctx.textAlign = 'right'; ctx.fillStyle = '#7FE9D8'; ctx.fillText('Phase dash', ix - 10, iy + 12); }
  const b = G.boss;
  if (b && b.active && !b.dead) {
    const bw = Math.min(360, V.w - 150), bx = (V.w - bw) / 2, by = top + 74;
    ctx.font = '13px ' + FONT_D; ctx.textAlign = 'center';
    ctx.fillStyle = OUT; ctx.fillText(b.name, V.w / 2 + 1.5, by - 9 + 1.5); ctx.fillStyle = INK.cream; ctx.fillText(b.name, V.w / 2, by - 9);
    ctx.fillStyle = 'rgba(8,9,22,.8)'; roundRect(ctx, bx - 3, by - 3, bw + 6, 14, 4); ctx.fill();
    const shielded = b.shielded && b.shieldOff <= 0;
    ctx.fillStyle = shielded ? '#7FE9D8' : '#FF5A6E'; roundRect(ctx, bx, by, bw * b.hp / b.max, 8, 3); ctx.fill();
    if (shielded) { ctx.font = '700 9px ' + FONT_B; ctx.fillStyle = '#7FE9D8'; ctx.fillText('shield up — use the resonator', V.w / 2, by + 22); }
  }
  if (G.banner) {
    const bn = G.banner, a = Math.min(1, bn.t / .5, (3.2 - bn.t) / .3), sz2 = Math.min(40, V.w / 11);
    ctx.globalAlpha = clamp(a, 0, 1);
    riText(ctx, bn.title, V.w / 2, V.h * .3, sz2, INK.cream, z.detail, 'center');
    ctx.font = 'italic 15px ' + FONT_B; ctx.textAlign = 'center'; ctx.fillStyle = hexA(z.glow, .95); ctx.fillText(bn.sub, V.w / 2, V.h * .3 + sz2 * .92);
    ctx.globalAlpha = 1;
  }
  if (G.msg && !G.dialog) {
    ctx.font = '700 14px ' + FONT_B; const w = Math.min(V.w - 30, ctx.measureText(G.msg.text).width + 28), my = V.h * .62;
    ctx.globalAlpha = clamp(G.msg.t / .3, 0, 1);
    ctx.fillStyle = 'rgba(8,9,22,.9)'; roundRect(ctx, V.w / 2 - w / 2, my - 16, w, 32, 8); ctx.fill();
    ctx.strokeStyle = hexA(z.detail, .7); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = INK.cream; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(G.msg.text, V.w / 2, my, V.w - 44);
    ctx.globalAlpha = 1;
  }
  const tc = G.touch;
  if (tc.on) {
    ctx.strokeStyle = 'rgba(255,241,201,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tc.sx, tc.sy, 46, 0, TAU); ctx.stroke();
    ctx.fillStyle = hexA(z.detail, .55); ctx.beginPath(); ctx.arc(tc.x, tc.y, 22, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,241,201,.6)'; ctx.stroke();
  }
}
function itemIcon(ctx, it, x, y) {
  if (it === 'arc') {
    ctx.fillStyle = '#16141f'; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#FF8A3D'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#FFD36B'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x - 4, y - 6); ctx.lineTo(x + 2, y - 1); ctx.lineTo(x - 2, y + 1); ctx.lineTo(x + 4, y + 6); ctx.stroke();
  } else if (it === 'reso') {
    ctx.strokeStyle = '#7FE9D8'; ctx.lineWidth = 2.2;
    for (let i = 1; i < 4; i++) { ctx.globalAlpha = 1 - i * .22; ctx.beginPath(); ctx.arc(x, y, i * 4.6, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.fillStyle = INK.cream; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
  }
}
function drawPortrait(ctx, spk, w, h) {
  ctx.clearRect(0, 0, w, h);
  const look = spk === 'ines' ? { body:'#E9622B', head:'#F3C9A0', hair:'#2a2340', visor:'#7FE9D8', legs:'#23255c' }
    : spk === 'kessa' ? { body:'#C8303A', head:'#e8b48f', hair:'#2a0d14', visor:'#FFC46B', legs:'#1a0610' }
    : NPC_LOOK[spk];
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b1f4a'); g.addColorStop(1, '#0a0c22');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = halftone(ctx, spk === 'choir' ? '#2F8F8E' : '#3c3f7d', 6, 1.4); ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h * .58, r = w * .27;
  if (!look) {
    if (spk === 'choir') { ctx.fillStyle = '#07060f'; ctx.beginPath(); ctx.arc(cx, cy, r * 1.25, 0, TAU); ctx.fill(); ctx.fillStyle = '#7FE9D8'; ctx.fillRect(cx - 10, cy - 5, 6, 6); ctx.fillRect(cx + 4, cy - 5, 6, 6); }
    else { diamond(ctx, cx, cy, r, INK.cream); diamondPath(ctx, cx, cy, r); ink(ctx, 3); diamond(ctx, cx, cy, r * .5, '#FFD36B'); }
    return;
  }
  ctx.fillStyle = look.body; roundRect(ctx, cx - r * 1.35, cy + r * .55, r * 2.7, r * 1.7, 12); ctx.fill(); ink(ctx, 3);
  ctx.fillStyle = look.head; ctx.beginPath(); ctx.arc(cx, cy - r * .18, r, 0, TAU); ctx.fill();
  const hg = ctx.createLinearGradient(0, cy - r, 0, cy + r); hg.addColorStop(0, 'rgba(255,255,255,.2)'); hg.addColorStop(1, 'rgba(0,0,0,.3)');
  ctx.fillStyle = hg; ctx.fill(); ink(ctx, 3);
  ctx.fillStyle = look.hair || look.legs; ctx.beginPath(); ctx.arc(cx, cy - r * .18, r, Math.PI * 1.06, Math.PI * 1.94); ctx.fill();
  ctx.fillStyle = look.visor; roundRect(ctx, cx - r * .72, cy - r * .35, r * 1.44, r * .44, 5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(cx - r * .6, cy - r * .3, r * .4, r * .12);
}
// ---------- title backdrop ----------
const STARS = Array.from({ length:110 }, () => ({ x:Math.random(), y:Math.random(), s:Math.random() * 1.7 + .4, p:Math.random() * 6 }));
function renderTitle(ctx) {
  const V = G.view, w = V.w, h = V.h, t = G.time, m = Math.min(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0a0c24'); g.addColorStop(.6, '#12123a'); g.addColorStop(1, '#1d1340');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (const s of STARS) { ctx.globalAlpha = .35 + .6 * Math.abs(Math.sin(t * .8 + s.p)); ctx.fillStyle = s.p > 5 ? '#FFD36B' : '#FFF1C9'; ctx.fillRect((s.x * w + t * 3 * s.s) % w, s.y * h, s.s, s.s); }
  ctx.globalAlpha = 1;
  const planet = (x, y, r, c1, c2) => {
    ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    const pg = ctx.createRadialGradient(x - r * .4, y - r * .45, r * .1, x, y, r * 1.4);
    pg.addColorStop(0, 'rgba(255,255,255,.28)'); pg.addColorStop(.55, 'rgba(0,0,0,0)'); pg.addColorStop(1, 'rgba(0,0,0,.65)');
    ctx.fillStyle = pg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = hexA(c2, .5); ctx.fillRect(x - r, y + r * .1, r * 2, r * .16); ctx.fillRect(x - r, y - r * .5, r * 2, r * .1);
    ctx.restore();
  };
  planet(w * .84 + Math.sin(t * .1) * 5, h * .19, m * .17, '#C2682E', '#7a2f1f');
  planet(w * .1, h * .82 + Math.cos(t * .12) * 5, m * .09, '#1c5f66', '#0a2b33');
  // the Lamp tower
  const bx = w * .5, by = h + m * .04, tw = m * .1;
  ctx.save(); ctx.translate(bx, by - m * .46); ctx.globalCompositeOperation = 'lighter';
  const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, m * .55);
  bg.addColorStop(0, 'rgba(255,211,107,.5)'); bg.addColorStop(1, 'rgba(255,211,107,0)');
  ctx.fillStyle = bg; ctx.fillRect(-m * .55, -m * .55, m * 1.1, m * 1.1);
  ctx.rotate(t * .22);
  for (let i = 0; i < 6; i++) { ctx.rotate(TAU / 6); const lg = ctx.createLinearGradient(0, 0, 0, -m * 1.1);
    lg.addColorStop(0, 'rgba(255,211,107,.16)'); lg.addColorStop(1, 'rgba(255,211,107,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-m * .05, -m * 1.1); ctx.lineTo(m * .05, -m * 1.1); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = '#171a45'; ctx.beginPath(); ctx.moveTo(bx - tw, by); ctx.lineTo(bx - tw * .62, by - m * .42); ctx.lineTo(bx + tw * .62, by - m * .42); ctx.lineTo(bx + tw, by); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.moveTo(bx - tw * .1, by); ctx.lineTo(bx + tw * .2, by - m * .42); ctx.lineTo(bx + tw * .62, by - m * .42); ctx.lineTo(bx + tw, by); ctx.fill();
  ctx.fillStyle = '#2c3068'; ctx.fillRect(bx - tw * .8, by - m * .45, tw * 1.6, m * .035);
  ctx.fillStyle = '#FFD36B'; ctx.beginPath(); ctx.arc(bx, by - m * .48, m * .045, 0, TAU); ctx.fill();
  ctx.fillStyle = '#FFF1C9'; ctx.beginPath(); ctx.arc(bx, by - m * .48, m * .022 + Math.sin(t * 4) * 1.5, 0, TAU); ctx.fill();
  ctx.fillStyle = grain(ctx); ctx.fillRect(0, 0, w, h);
}
