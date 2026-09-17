// ================= renderer: two-ink risograph look =================
const PAT = {};
let grainPat = null;
function halftone(ctx, color, size, rad) {
  const key = color + size + rad; if (PAT[key]) return PAT[key];
  const c = mkCanvas(size, size), x = c.getContext('2d');
  x.fillStyle = color;
  const dot = (px, py) => { x.beginPath(); x.arc(px, py, rad, 0, TAU); x.fill(); };
  dot(size / 4, size / 4); dot(size * 3 / 4, size * 3 / 4);
  return (PAT[key] = ctx.createPattern(c, 'repeat'));
}
function mkCanvas(w, h) {
  if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  return { width:w, height:h, getContext:() => stubCtx() };
}
function stubCtx() { return new Proxy({}, { get:(t, k) => (k in t ? t[k] : () => ({ addColorStop(){} })), set:(t, k, v) => { t[k] = v; return true; } }); }
function grain(ctx) {
  if (grainPat) return grainPat;
  const c = mkCanvas(128, 128), x = c.getContext('2d');
  if (typeof document !== 'undefined' && x.createImageData) {
    const d = x.createImageData(128, 128);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = Math.random() < .5 ? 22 : 0; }
    x.putImageData(d, 0, 0);
  }
  return (grainPat = ctx.createPattern(c, 'repeat'));
}
const FONT_D = '"Bungee", Impact, "Arial Black", sans-serif';
const FONT_B = '"Chivo", "Segoe UI", system-ui, sans-serif';

function render(ctx) {
  const V = G.view; ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
  if (G.mode !== 'play' || !G.L) { renderTitle(ctx); return; }
  const L = G.L, z = L.z, s = V.scale;
  ctx.fillStyle = z.bg; ctx.fillRect(0, 0, V.w, V.h);
  const sx = G.shake ? (Math.random() - .5) * G.shake : 0, sy = G.shake ? (Math.random() - .5) * G.shake : 0;
  ctx.save();
  ctx.scale(s, s);
  ctx.translate(-Math.round((G.cam.x + sx) * s) / s, -Math.round((G.cam.y + sy) * s) / s);
  drawTiles(ctx, L, z);
  for (const r of G.rings) drawRing(ctx, r);
  for (const k of G.pickups) drawPickup(ctx, k);
  for (const n of G.npcs) drawNpc(ctx, n);
  for (const b of G.bombs) drawBomb(ctx, b);
  const ents = G.enemies.filter(e => e.alive);
  ents.sort((a, b) => a.y - b.y);
  for (const f of G.fx) if (f.k === 'ghost' || f.k === 'kghost') drawGhost(ctx, f);
  for (const e of ents) drawEnemy(ctx, e);
  if (G.boss && !G.boss.dead) drawBoss(ctx, G.boss);
  if (G.dead <= 0) drawPlayer(ctx);
  for (const sh of G.shots) drawShot(ctx, sh);
  for (const f of G.fx) if (f.k !== 'ghost' && f.k !== 'kghost') drawFx(ctx, f);
  if (G.nearPrompt && !G.dialog) drawPrompt(ctx, G.nearPrompt);
  ctx.restore();
  // print texture
  ctx.globalAlpha = .9; ctx.fillStyle = grain(ctx); ctx.fillRect(0, 0, V.w, V.h); ctx.globalAlpha = 1;
  vignette(ctx, V, z.bg);
  drawHud(ctx, V);
  if (G.dead > 0) { ctx.fillStyle = 'rgba(20,22,63,' + clamp(1 - G.dead / 1.6, 0, .85) + ')'; ctx.fillRect(0, 0, V.w, V.h);
    riText(ctx, 'Down, not out', V.w / 2, V.h / 2, 30, INK.orange, INK.pink, 'center'); }
}
function vignette(ctx, V, bg) {
  const g = ctx.createRadialGradient(V.w / 2, V.h / 2, Math.min(V.w, V.h) * .35, V.w / 2, V.h / 2, Math.max(V.w, V.h) * .75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(5,6,20,.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, V.w, V.h);
}
function riText(ctx, text, x, y, size, c1, c2, align, font) {
  ctx.font = size + 'px ' + (font || FONT_D); ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = c2; ctx.fillText(text, x + size * .07, y + size * .06);
  ctx.fillStyle = c1; ctx.fillText(text, x, y);
}
function isWall(ch) { return ch === '#' || ch === 'C' || ch === ' '; }
function drawTiles(ctx, L, z) {
  const V = G.view, s = V.scale;
  const x0 = Math.max(0, Math.floor(G.cam.x / T) - 1), y0 = Math.max(0, Math.floor(G.cam.y / T) - 1);
  const x1 = Math.min(L.W - 1, Math.ceil((G.cam.x + V.w / s) / T) + 1), y1 = Math.min(L.H - 1, Math.ceil((G.cam.y + V.h / s) / t0()) + 1);
  const tm = G.time;
  // floor pass
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const ch = L.g[ty * L.W + tx], px = tx * T, py = ty * T;
    if (isWall(ch)) continue;
    if (ch === '~') {
      ctx.fillStyle = z.bg; ctx.fillRect(px, py, T, T);
      for (let i = 0; i < 3; i++) { const h = hash(tx * 7 + i, ty * 13 + i); ctx.fillStyle = i ? 'rgba(255,241,201,.35)' : z.detail;
        const tw = .5 + .5 * Math.sin(tm * 2 + h * 20); ctx.globalAlpha = tw; ctx.fillRect(px + h * 28, py + hash(ty, tx + i) * 28, 1.5, 1.5); ctx.globalAlpha = 1; }
      const up = tileAt(tx, ty - 1);
      if (up !== '~') { ctx.fillStyle = z.floor; ctx.fillRect(px, py, T, 4); ctx.fillStyle = z.shade; ctx.fillRect(px, py + 4, T, 3); }
      continue;
    }
    ctx.fillStyle = ((tx + ty) & 1) ? z.floor : z.floor2; ctx.fillRect(px, py, T, T);
    const h = hash(tx, ty);
    if (h < .22) { ctx.fillStyle = z.detail; ctx.globalAlpha = .28; ctx.fillRect(px + 6 + h * 60, py + 10 + h * 40, 5, 1.5); ctx.globalAlpha = 1; }
    else if (h > .9) { ctx.strokeStyle = z.wallHi; ctx.globalAlpha = .18; ctx.lineWidth = 1; ctx.strokeRect(px + 4, py + 4, T - 8, T - 8); ctx.globalAlpha = 1; }
  }
  // halftone wash over the floor
  ctx.globalAlpha = .16; ctx.fillStyle = halftone(ctx, '#000', 6, 1.2);
  ctx.fillRect(x0 * T, y0 * T, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T); ctx.globalAlpha = 1;
  // wall misregistration shadow
  ctx.fillStyle = z.shade;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const ch = L.g[ty * L.W + tx]; if (ch !== '#' && ch !== 'C') continue;
    if (!isWall(tileAt(tx, ty + 1)) || !isWall(tileAt(tx + 1, ty))) ctx.fillRect(tx * T + 3, ty * T + 5, T, T);
  }
  // walls
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const ch = L.g[ty * L.W + tx], px = tx * T, py = ty * T;
    if (ch === ' ') { ctx.fillStyle = z.bg; ctx.fillRect(px, py, T, T); continue; }
    if (ch !== '#' && ch !== 'C') continue;
    ctx.fillStyle = z.wall; ctx.fillRect(px, py, T, T);
    if (!isWall(tileAt(tx, ty - 1))) { ctx.fillStyle = z.wallHi; ctx.fillRect(px, py, T, 5); }
    if (!isWall(tileAt(tx, ty + 1))) { ctx.globalAlpha = .45; ctx.fillStyle = halftone(ctx, z.bg, 5, 1.3); ctx.fillRect(px, py + 18, T, 14); ctx.globalAlpha = 1; }
    const h = hash(tx + 3, ty + 9);
    if (ch === '#' && h < .3) { ctx.fillStyle = z.bg; ctx.globalAlpha = .25; ctx.fillRect(px + 5, py + 12, 10 + h * 20, 2); ctx.fillRect(px + 8, py + 18, 6, 2); ctx.globalAlpha = 1; }
    if (ch === 'C') {
      ctx.strokeStyle = z.bg; ctx.lineWidth = 2.2; ctx.beginPath();
      ctx.moveTo(px + 6, py + 7); ctx.lineTo(px + 14, py + 15); ctx.lineTo(px + 11, py + 21); ctx.lineTo(px + 20, py + 28);
      ctx.moveTo(px + 14, py + 15); ctx.lineTo(px + 25, py + 11); ctx.moveTo(px + 11, py + 21); ctx.lineTo(px + 4, py + 26); ctx.stroke();
      ctx.fillStyle = INK.cream; ctx.globalAlpha = .5 + .3 * Math.sin(tm * 3); ctx.fillRect(px + 13, py + 14, 2, 2); ctx.globalAlpha = 1;
    }
  }
  // objects
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const ch = L.g[ty * L.W + tx], px = tx * T, py = ty * T;
    if (ch === 'D') {
      ctx.fillStyle = z.shade; ctx.fillRect(px + 5, py + 4, T - 6, T - 4);
      ctx.fillStyle = z.detail; ctx.fillRect(px + 3, py + 2, T - 6, T - 4);
      ctx.fillStyle = z.bg; ctx.beginPath(); ctx.arc(px + 16, py + 14, 4, 0, TAU); ctx.fill(); ctx.fillRect(px + 14, py + 16, 4, 8);
    } else if (ch === 'G') {
      ctx.fillStyle = z.shade; for (let i = 0; i < 4; i++) ctx.fillRect(px + 4 + i * 7 + 2, py + 2, 3, T - 2);
      ctx.fillStyle = z.detail; for (let i = 0; i < 4; i++) ctx.fillRect(px + 4 + i * 7, py, 3, T);
      ctx.fillRect(px, py + 6, T, 3); ctx.fillRect(px, py + 22, T, 3);
    } else if (ch === 'P' || ch === 'Q') {
      const lit = ch === 'Q';
      if (lit) { ctx.globalAlpha = .25 + .15 * Math.sin(tm * 4); ctx.fillStyle = z.detail; ctx.beginPath(); ctx.arc(px + 16, py + 16, 22, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.fillStyle = z.shade; ctx.fillRect(px + 10, py + 6, 14, 24);
      ctx.fillStyle = lit ? z.detail : '#2a2640'; ctx.fillRect(px + 8, py + 4, 14, 24);
      ctx.fillStyle = lit ? INK.cream : z.detail; ctx.globalAlpha = lit ? 1 : .35;
      ctx.beginPath(); ctx.arc(px + 15, py + 11, 4, 0, TAU); ctx.fill(); ctx.fillRect(px + 11, py + 18, 8, 2); ctx.fillRect(px + 11, py + 22, 8, 2); ctx.globalAlpha = 1;
    } else if (ch === 'L') {
      ctx.fillStyle = '#111'; ctx.fillRect(px + 2, py, 5, T); ctx.fillRect(px + T - 7, py, 5, T);
      const fl = .6 + .4 * Math.sin(tm * 30 + tx);
      ctx.globalAlpha = fl; ctx.fillStyle = INK.pink;
      for (let i = 0; i < 4; i++) ctx.fillRect(px + 4, py + 4 + i * 8, T - 8, 2.5);
      ctx.fillStyle = INK.cream; for (let i = 0; i < 4; i++) ctx.fillRect(px + 4, py + 4.6 + i * 8, T - 8, 1);
      ctx.globalAlpha = 1;
    } else if (ch === 'E') {
      ctx.strokeStyle = z.detail; ctx.lineWidth = 2.5;
      const o = (tm * 16) % 10;
      for (let i = 0; i < 2; i++) { const yy = py + 8 + ((i * 10 + o) % 20); ctx.globalAlpha = .9 - i * .3; ctx.beginPath(); ctx.moveTo(px + 8, yy); ctx.lineTo(px + 16, yy + 6); ctx.lineTo(px + 24, yy); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else if (ch === 'O' && tileAt(tx - 1, ty) !== 'O' && tileAt(tx, ty - 1) !== 'O') drawLamp(ctx, px, py);
  }
}
function t0() { return T; }
function drawLamp(ctx, px, py) {
  const lit = G.save.lamp, n = shardCount(), cx = px + T, cy = py + T, tm = G.time;
  if (lit) {
    ctx.save(); ctx.translate(cx, cy - 10); ctx.rotate(tm * .3);
    ctx.fillStyle = INK.yellow; ctx.globalAlpha = .18;
    for (let i = 0; i < 8; i++) { ctx.rotate(TAU / 8); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10, -120); ctx.lineTo(10, -120); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  ctx.fillStyle = INK.pink; ctx.fillRect(px + 10, py + 8, T * 2 - 14, T * 2 - 10);
  ctx.fillStyle = '#1f2270'; ctx.fillRect(px + 7, py + 5, T * 2 - 14, T * 2 - 10);
  ctx.fillStyle = INK.orange; ctx.fillRect(px + 7, py + 5, T * 2 - 14, 6); ctx.fillRect(px + 7, py + T * 2 - 11, T * 2 - 14, 6);
  ctx.beginPath(); ctx.arc(cx, cy - 2, 13, 0, TAU); ctx.fillStyle = lit ? INK.yellow : '#0d0f33'; ctx.fill();
  if (lit) { ctx.fillStyle = INK.cream; ctx.beginPath(); ctx.arc(cx, cy - 2, 6 + Math.sin(tm * 5) * 1.5, 0, TAU); ctx.fill(); }
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + i * TAU / 3, x = cx + Math.cos(a) * 18, y = cy - 2 + Math.sin(a) * 18;
    ctx.fillStyle = (lit || i < n) ? INK.cream : '#3b3f8f';
    ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 3, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 3, y); ctx.fill();
  }
}
// ---------- figures ----------
function figure(ctx, x, y, o) {
  const face = o.face || 0, w = o.walk || 0, sc = o.scale || 1, moving = o.moving;
  const sw = moving ? Math.sin(w) * 3 : 0, bob = moving ? Math.abs(Math.sin(w)) * 1.4 : 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 9, 10, 4, 0, 0, TAU); ctx.fill();
  const body = (off, solid) => {
    const c = k => solid ? o[k] : o.ink2;
    ctx.save(); ctx.translate(off, off);
    ctx.fillStyle = c('legs'); ctx.fillRect(-6, 2 - bob, 4, 7 + sw); ctx.fillRect(2, 2 - bob, 4, 7 - sw);
    ctx.fillStyle = c('body'); roundRect(ctx, -8, -8 - bob, 16, 13, 4); ctx.fill();
    if (o.cape && solid) { ctx.fillStyle = o.cape; ctx.fillRect(-9, -7 - bob, 3, 13); ctx.fillRect(6, -7 - bob, 3, 13); }
    ctx.fillStyle = c('head'); ctx.beginPath(); ctx.arc(0, -13 - bob, 6.5, 0, TAU); ctx.fill();
    ctx.restore();
  };
  body(2, false); body(0, true);
  // face/visor
  const fx = Math.cos(face) * 3, fy = Math.sin(face) * 1.5;
  if (Math.sin(face) > -.3) { ctx.fillStyle = o.visor; roundRect(ctx, -4 + fx, -15 + fy - bob, 8, 3.5, 1.5); ctx.fill(); }
  if (o.mark) { ctx.fillStyle = o.mark; ctx.fillRect(-2, -5 - bob, 4, 4); }
  ctx.restore();
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawPlayer(ctx) {
  const p = G.p;
  if (p.inv > 0 && p.dash <= 0 && Math.floor(G.time * 16) % 2) return;
  if (p.atkT > 0) {
    const k = 1 - p.atkT / .18, a0 = p.atkAng - 1.2 + k * 2.4;
    ctx.strokeStyle = INK.pink; ctx.lineWidth = 7; ctx.globalAlpha = .6; ctx.beginPath(); ctx.arc(p.x + 2, p.y - 2, 30, p.atkAng - 1.2, a0); ctx.stroke();
    ctx.strokeStyle = INK.cream; ctx.lineWidth = 3; ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(p.x, p.y - 4, 30, Math.max(p.atkAng - 1.2, a0 - .9), a0); ctx.stroke();
  }
  figure(ctx, p.x, p.y, { face:p.face, walk:p.walk, moving:p.moving, body:INK.orange, legs:'#1d2070', head:INK.cream, visor:INK.teal, ink2:INK.pink, mark:INK.yellow });
  if (p.phase) { ctx.strokeStyle = INK.teal; ctx.globalAlpha = .7; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y - 4, 16, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
}
function drawGhost(ctx, f) {
  ctx.globalAlpha = f.t / f.max * .5;
  if (f.k === 'kghost') { ctx.fillStyle = INK.red; ctx.beginPath(); ctx.arc(f.x, f.y - 4, 12, 0, TAU); ctx.fill(); }
  else { ctx.fillStyle = f.phase ? INK.teal : INK.pink; roundRect(ctx, f.x - 8, f.y - 20, 16, 28, 6); ctx.fill(); }
  ctx.globalAlpha = 1;
}
const NPC_LOOK = {
  bekele:{ body:INK.yellow, legs:'#3a2a10', head:'#8a5a3c', visor:INK.cream, ink2:INK.orange, mark:INK.blue },
  tamsin:{ body:INK.teal, legs:'#10304a', head:'#f1c7a3', visor:INK.night, ink2:INK.pink, mark:INK.orange },
  yara:{ body:'#9a7cf2', legs:'#2b2060', head:'#c9f0e6', visor:INK.night, ink2:INK.teal, mark:INK.yellow },
  mira:{ body:INK.pink, legs:'#3b103a', head:'#b8e3ff', visor:INK.teal, ink2:INK.teal, mark:INK.cream },
  clerk:{ body:INK.orange, legs:'#40210c', head:'#f7e7a0', visor:INK.violet, ink2:INK.yellow, mark:INK.cream }
};
function drawNpc(ctx, n) {
  n.t += 1 / 60;
  const look = NPC_LOOK[n.id];
  figure(ctx, n.x, n.y + Math.sin(G.time * 2 + n.x) * .8, Object.assign({ face:Math.PI / 2 }, look));
  if (n.id === 'tamsin') { ctx.fillStyle = INK.yellow; ctx.fillRect(n.x - 16, n.y + 4, 32, 5); ctx.fillStyle = INK.orange; ctx.fillRect(n.x - 16, n.y + 9, 32, 3); }
}
function drawPrompt(ctx, pr) {
  const bob = Math.sin(G.time * 5) * 2;
  ctx.font = '600 9px ' + FONT_B; const w = ctx.measureText(pr.text).width + 12;
  ctx.fillStyle = INK.pink; roundRect(ctx, pr.x - w / 2 + 1.5, pr.y - 7 + bob + 1.5, w, 13, 6); ctx.fill();
  ctx.fillStyle = INK.cream; roundRect(ctx, pr.x - w / 2, pr.y - 7 + bob, w, 13, 6); ctx.fill();
  ctx.fillStyle = INK.night; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(pr.text, pr.x, pr.y + bob);
}
function drawEnemy(ctx, e) {
  const fl = e.flash > 0, x = e.x, y = e.y;
  if (e.kind === 'r') {
    figure(ctx, x, y, { face:e.face, walk:e.t * 12, moving:true, body:fl ? INK.cream : '#8c2f4f', legs:'#2a0f22', head:fl ? INK.cream : INK.orange, visor:INK.yellow, ink2:INK.orange });
    ctx.strokeStyle = INK.yellow; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + Math.cos(e.face) * 8, y - 4 + Math.sin(e.face) * 8); ctx.lineTo(x + Math.cos(e.face) * 17, y - 4 + Math.sin(e.face) * 17); ctx.stroke();
  } else if (e.kind === 'g') {
    figure(ctx, x, y, { face:e.face, walk:e.t * 8, moving:true, body:fl ? INK.cream : INK.orange, legs:'#2a0f22', head:fl ? INK.cream : '#c7b08a', visor:INK.red, ink2:INK.pink });
    ctx.fillStyle = INK.night; ctx.save(); ctx.translate(x, y - 3); ctx.rotate(e.face); ctx.fillRect(4, -2, 13, 4); ctx.restore();
  } else if (e.kind === 'w') {
    const r = 9 + Math.sin(e.t * 6) * 1.2, yy = y - 6 + Math.sin(e.t * 3) * 3;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y + 8, 7, 3, 0, 0, TAU); ctx.fill();
    diamond(ctx, x + 2, yy + 2, r, INK.teal); diamond(ctx, x, yy, r, fl ? INK.cream : INK.pink);
    ctx.fillStyle = INK.cream; ctx.fillRect(x - 2, yy - 2, 4, 4);
  } else if (e.kind === 't') {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = INK.orange; poly(ctx, 2, 2, 13, 8, 0); ctx.fill();
    ctx.fillStyle = fl ? INK.cream : INK.yellow; poly(ctx, 0, 0, 13, 8, 0); ctx.fill();
    ctx.rotate(e.t); ctx.fillStyle = INK.night; for (let i = 0; i < 6; i++) { ctx.rotate(TAU / 6); ctx.fillRect(8, -2, 7, 4); }
    ctx.fillStyle = e.cd < .5 ? INK.red : INK.violet; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
    ctx.restore();
  } else if (e.kind === 's') {
    const ex = e.exposed > 0, yy = y - 6 + Math.sin(e.t * 2) * 3;
    ctx.globalAlpha = ex ? 1 : .78;
    ctx.fillStyle = ex ? INK.pink : '#05060f';
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) { const a = i / 16 * TAU, rr = 12 + Math.sin(a * 3 + e.t * 5) * 2.5; ctx.lineTo(x + Math.cos(a) * rr, yy + Math.sin(a) * rr * (a > 0 && a < Math.PI ? 1.3 : 1)); }
    ctx.fill();
    if (ex) { ctx.fillStyle = halftone(ctx, INK.night, 4, .9); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = fl ? INK.cream : INK.teal; ctx.fillRect(x - 5, yy - 3, 3, 3); ctx.fillRect(x + 2, yy - 3, 3, 3);
  }
  if (e.stun > 0 && e.kind !== 's') { ctx.fillStyle = INK.yellow; for (let i = 0; i < 3; i++) { const a = G.time * 6 + i * 2.1; ctx.fillRect(x + Math.cos(a) * 9 - 1, y - 24 + Math.sin(a) * 3, 2.5, 2.5); } }
  if (e.hp < e.max && e.kind !== 's') { ctx.fillStyle = INK.night; ctx.fillRect(x - 9, y + 12, 18, 3); ctx.fillStyle = INK.yellow; ctx.fillRect(x - 9, y + 12, 18 * e.hp / e.max, 3); }
}
function diamond(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * .7, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * .7, y); ctx.fill(); }
function poly(ctx, x, y, r, n, rot) { ctx.beginPath(); for (let i = 0; i < n; i++) { const a = rot + i * TAU / n; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
function drawBoss(ctx, b) {
  const fl = b.flash > 0, x = b.x, y = b.y, tm = G.time;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y + b.r * .7, b.r, b.r * .35, 0, 0, TAU); ctx.fill();
  if (b.kind === 'maw') {
    const shake = b.state === 'wind' ? Math.sin(tm * 60) * 2 : 0, a = b.state === 'idle' ? Math.atan2(G.p.y - y, G.p.x - x) : b.ang;
    ctx.save(); ctx.translate(x + shake, y);
    ctx.fillStyle = '#2a0f22'; roundRect(ctx, -26, -18, 52, 10, 3); ctx.fill(); roundRect(ctx, -26, 10, 52, 10, 3); ctx.fill();
    ctx.fillStyle = INK.pink; roundRect(ctx, -20, -18, 44, 38, 8); ctx.fill();
    ctx.fillStyle = fl ? INK.cream : INK.orange; roundRect(ctx, -23, -21, 44, 38, 8); ctx.fill();
    ctx.fillStyle = halftone(ctx, '#2a0f22', 5, 1.2); roundRect(ctx, -23, 0, 44, 17, 6); ctx.fill();
    ctx.rotate(a);
    ctx.fillStyle = INK.night; ctx.fillRect(10, -12, 16, 22);
    ctx.fillStyle = INK.yellow; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(12, -11 + i * 6); ctx.lineTo(22, -8 + i * 6); ctx.lineTo(12, -5 + i * 6); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = b.state === 'wind' ? INK.red : INK.yellow; ctx.beginPath(); ctx.arc(x - 6, y - 10, 4, 0, TAU); ctx.fill();
    if (b.state === 'stun') { ctx.fillStyle = INK.yellow; for (let i = 0; i < 4; i++) { const q = tm * 5 + i * 1.6; diamond(ctx, x + Math.cos(q) * 20, y - 32 + Math.sin(q) * 5, 4, INK.yellow); } }
  } else if (b.kind === 'warden') {
    const half = b.hp < b.max / 2, n = half ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const a = b.ang + i * TAU / n, x2 = x + Math.cos(a) * 120, y2 = y + Math.sin(a) * 120;
      ctx.lineCap = 'round';
      ctx.strokeStyle = INK.pink; ctx.lineWidth = 9; ctx.globalAlpha = .45 + .15 * Math.sin(tm * 20); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = INK.cream; ctx.lineWidth = 2.5; ctx.globalAlpha = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(-b.ang * .5);
    ctx.fillStyle = INK.teal; poly(ctx, 3, 3, 22, 6, 0); ctx.fill();
    ctx.fillStyle = fl ? INK.cream : INK.pink; poly(ctx, 0, 0, 22, 6, 0); ctx.fill();
    ctx.fillStyle = halftone(ctx, INK.deep, 4, 1); poly(ctx, 0, 0, 22, 6, 0); ctx.fill();
    ctx.fillStyle = INK.cream; poly(ctx, 0, 0, 9, 6, Math.PI / 6); ctx.fill();
    ctx.restore();
  } else if (b.kind === 'auditor') {
    ctx.save(); ctx.translate(x, y + Math.sin(tm * 3) * 1.5);
    ctx.fillStyle = INK.orange; roundRect(ctx, -15, -27, 34, 46, 6); ctx.fill();
    ctx.fillStyle = fl ? INK.cream : INK.yellow; roundRect(ctx, -18, -30, 34, 46, 6); ctx.fill();
    ctx.fillStyle = INK.violet; ctx.beginPath(); ctx.arc(-1, -14, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = INK.orange; ctx.font = '12px ' + FONT_D; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('¢', -1, -13);
    ctx.fillStyle = INK.violet; for (let i = 0; i < 3; i++) ctx.fillRect(-12, 0 + i * 5, 22, 2);
    ctx.restore();
    drawShield(ctx, b, INK.orange);
  } else if (b.kind === 'kessa') {
    const lunge = b.state === 'lunge' || b.state === 'wind';
    figure(ctx, x, y, { face:Math.atan2(G.p.y - y, G.p.x - x), walk:tm * 12, moving:true, scale:1.35, body:fl ? INK.cream : INK.red, legs:'#1a0610', head:'#e8b48f', visor:INK.yellow, ink2:INK.orange, cape:'#7a1030', mark:INK.cream });
    const a = b.state === 'idle' || b.state === 'throw' ? Math.atan2(G.p.y - y, G.p.x - x) : b.ang;
    ctx.strokeStyle = lunge ? INK.cream : INK.yellow; ctx.lineWidth = 3.5; ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 10, y - 6 + Math.sin(a) * 10); ctx.lineTo(x + Math.cos(a) * 30, y - 6 + Math.sin(a) * 30); ctx.stroke();
    if (b.state === 'wind') { ctx.strokeStyle = INK.red; ctx.globalAlpha = .5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 130, y + Math.sin(a) * 130); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
  } else if (b.kind === 'heart') {
    const pu = 1 + Math.sin(tm * 3) * .06;
    ctx.save(); ctx.translate(x, y); ctx.scale(pu, pu);
    for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + tm * .4; ctx.strokeStyle = '#05060f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.cos(a + .5) * 40, Math.sin(a + .5) * 40, Math.cos(a) * (50 + Math.sin(tm * 2 + i) * 8), Math.sin(a) * (50 + Math.sin(tm * 2 + i) * 8)); ctx.stroke(); }
    ctx.fillStyle = INK.teal; ctx.beginPath(); ctx.arc(3, 3, 28, 0, TAU); ctx.fill();
    ctx.fillStyle = fl ? INK.cream : '#05060f'; ctx.beginPath(); ctx.arc(0, 0, 28, 0, TAU); ctx.fill();
    ctx.fillStyle = halftone(ctx, INK.teal, 5, 1.1); ctx.beginPath(); ctx.arc(0, 0, 28, 0, TAU); ctx.fill();
    ctx.fillStyle = INK.cream; ctx.beginPath(); ctx.arc(0, 0, 7 + Math.sin(tm * 6) * 2, 0, TAU); ctx.fill();
    ctx.restore();
    drawShield(ctx, b, INK.teal);
  }
}
function drawShield(ctx, b, c) {
  if (b.shieldOff > 0) { if (b.shieldOff < 1.2 && Math.floor(G.time * 10) % 2) { ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(b.x, b.y - 4, b.r + 10, 0, TAU); ctx.stroke(); } return; }
  ctx.save(); ctx.translate(b.x, b.y - 4); ctx.rotate(G.time * .8);
  ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.globalAlpha = .85; poly(ctx, 0, 0, b.r + 11, 6, 0); ctx.stroke();
  ctx.strokeStyle = INK.cream; ctx.lineWidth = 1; ctx.globalAlpha = .6; poly(ctx, 0, 0, b.r + 8, 6, .5); ctx.stroke();
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawPickup(ctx, k) {
  const bob = Math.sin(k.t * 4) * 2, x = k.x, y = k.y + bob;
  if (k.life !== undefined && k.life < 2 && Math.floor(k.t * 10) % 2) return;
  if (k.type === 'k') { ctx.fillStyle = INK.pink; keyShape(ctx, x + 1.5, y + 1.5); ctx.fillStyle = INK.yellow; keyShape(ctx, x, y); }
  else if (k.type === '$' || k.type === 'scrap') { const r = k.type === '$' ? 7 : 3.5; cog(ctx, x + 1, y + 1, r, INK.pink); cog(ctx, x, y, r, INK.yellow); }
  else if (k.type === 'h' || k.type === 'heart') { const s = k.type === 'h' ? 1.1 : .75; heartShape(ctx, x + 1.5, y + 1.5, s, INK.pink); heartShape(ctx, x, y, s, INK.orange); }
  else if (k.type === 'I') {
    ctx.fillStyle = INK.pink; ctx.fillRect(x - 11, y - 7, 24, 18);
    ctx.fillStyle = INK.yellow; ctx.fillRect(x - 13, y - 9, 24, 18);
    ctx.fillStyle = INK.night; ctx.fillRect(x - 13, y - 3, 24, 3); ctx.fillStyle = INK.orange; ctx.fillRect(x - 3, y - 5, 5, 7);
    ctx.globalAlpha = .4 + .3 * Math.sin(k.t * 5); ctx.fillStyle = INK.cream; ctx.beginPath(); ctx.arc(x, y, 20, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  } else if (k.type === 'shard') {
    ctx.globalAlpha = .3; ctx.fillStyle = INK.yellow; ctx.beginPath(); ctx.arc(x, y, 24 + Math.sin(k.t * 4) * 4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    diamond(ctx, x + 2, y + 2, 13, INK.pink); diamond(ctx, x, y, 13, INK.cream); diamond(ctx, x, y, 6, INK.yellow);
  }
}
function keyShape(ctx, x, y) { ctx.beginPath(); ctx.arc(x - 4, y, 4.5, 0, TAU); ctx.fill(); ctx.fillRect(x - 1, y - 1.5, 10, 3); ctx.fillRect(x + 5, y, 2, 4); ctx.fillRect(x + 8, y, 2, 3); }
function cog(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = i * TAU / 12, rr = i % 2 ? r : r * 1.3; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.fill(); }
function heartShape(ctx, x, y, s, c) {
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y + 6 * s);
  ctx.bezierCurveTo(x - 10 * s, y - 1 * s, x - 6 * s, y - 9 * s, x, y - 4 * s);
  ctx.bezierCurveTo(x + 6 * s, y - 9 * s, x + 10 * s, y - 1 * s, x, y + 6 * s); ctx.fill();
}
function drawBomb(ctx, b) {
  const blink = b.t < .4 ? Math.floor(G.time * 20) % 2 : Math.floor(G.time * 6) % 2;
  if (b.owner === 'e') { ctx.globalAlpha = .35; ctx.strokeStyle = INK.red; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(b.tx, b.ty, 50, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  else { ctx.globalAlpha = .2; ctx.fillStyle = INK.orange; ctx.beginPath(); ctx.arc(b.x, b.y, 56, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.fillStyle = INK.pink; ctx.beginPath(); ctx.arc(b.x + 1.5, b.y + 1.5, 7, 0, TAU); ctx.fill();
  ctx.fillStyle = INK.night; ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, TAU); ctx.fill();
  ctx.fillStyle = blink ? INK.cream : INK.orange; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, TAU); ctx.fill();
}
function drawShot(ctx, s) {
  const c = s.from === 'p' ? INK.yellow : (s.c || INK.pink);
  const a = Math.atan2(s.vy, s.vx);
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
  if (s.from === 'p') { ctx.fillStyle = INK.pink; ctx.fillRect(-9, -2, 14, 5); ctx.fillStyle = c; ctx.fillRect(-10, -3, 14, 5); ctx.fillStyle = INK.cream; ctx.fillRect(-2, -2, 6, 3); }
  else { ctx.fillStyle = INK.night; ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, TAU); ctx.fill(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill(); ctx.fillStyle = INK.cream; ctx.fillRect(-1, -1, 2, 2); }
  ctx.restore();
}
function drawRing(ctx, r) {
  if (r.kind === 'pulse') { ctx.strokeStyle = INK.teal; ctx.globalAlpha = 1 - r.rad / r.max; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(r.x, r.y, r.rad, 0, TAU); ctx.stroke();
    ctx.strokeStyle = INK.cream; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(r.x, r.y, r.rad * .8, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  else { ctx.strokeStyle = INK.teal; ctx.lineWidth = 12; ctx.globalAlpha = .35 * (1 - r.rad / r.max) + .2; ctx.beginPath(); ctx.arc(r.x, r.y, r.rad, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#05060f'; ctx.lineWidth = 5; ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(r.x, r.y, r.rad, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
}
function drawFx(ctx, f) {
  const k = f.t / f.max;
  if (f.k === 'dot') { ctx.globalAlpha = Math.min(1, k * 2); ctx.fillStyle = f.c; ctx.fillRect(f.x - f.s / 2, f.y - f.s / 2, f.s, f.s); ctx.globalAlpha = 1; }
  else if (f.k === 'txt') { ctx.globalAlpha = Math.min(1, k * 2); ctx.font = '700 9px ' + FONT_B; ctx.textAlign = 'center'; ctx.fillStyle = INK.night; ctx.fillText(f.text, f.x + 1, f.y + 1); ctx.fillStyle = f.c; ctx.fillText(f.text, f.x, f.y); ctx.globalAlpha = 1; }
  else if (f.k === 'blast') { ctx.globalAlpha = k; ctx.fillStyle = INK.yellow; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.2 - k * .6), 0, TAU); ctx.fill();
    ctx.fillStyle = halftone(ctx, INK.orange, 5, 1.6); ctx.fill(); ctx.globalAlpha = 1; }
}
// ---------- HUD ----------
function drawHud(ctx, V) {
  const S = G.save, pad = 14, top = Math.max(pad, G.view.safeTop || 0);
  // hearts
  const hearts = S.maxhp / 2;
  for (let i = 0; i < hearts; i++) {
    const x = pad + 12 + i * 24, y = top + 12, v = S.hp - i * 2;
    heartShape(ctx, x + 2, y + 2, 1.15, INK.night);
    heartShape(ctx, x, y, 1.15, v > 0 ? INK.orange : '#3a3d7a');
    if (v === 1) { ctx.save(); ctx.beginPath(); ctx.rect(x, y - 12, 12, 24); ctx.clip(); heartShape(ctx, x, y, 1.15, '#3a3d7a'); ctx.restore(); }
  }
  // scrap / keys / shards
  let y2 = top + 36;
  cog(ctx, pad + 10, y2, 5, INK.yellow);
  ctx.font = '700 14px ' + FONT_B; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = INK.night; ctx.fillText(S.scrap, pad + 22, y2 + 1); ctx.fillStyle = INK.cream; ctx.fillText(S.scrap, pad + 21, y2);
  let xx = pad + 34 + ctx.measureText(String(S.scrap)).width;
  const keys = S.keys[G.L.id] || 0;
  if (keys) { ctx.fillStyle = INK.yellow; keyShape(ctx, xx + 6, y2); ctx.fillStyle = INK.cream; ctx.fillText('×' + keys, xx + 18, y2); xx += 44; }
  for (let i = 0; i < 3; i++) { const has = [S.shards.rust, S.shards.reef, S.shards.vault][i]; diamond(ctx, xx + 6 + i * 13, y2, 6, has ? INK.cream : '#3a3d7a'); }
  // item slot
  const sel = selectable(), sz = 50, ix = V.w - pad - sz, iy = top;
  G.hud.itemRect = { x:ix, y:iy, w:sz, h:sz };
  ctx.fillStyle = INK.pink; ctx.fillRect(ix + 4, iy + 4, sz, sz);
  ctx.fillStyle = INK.night; ctx.fillRect(ix, iy, sz, sz);
  ctx.strokeStyle = INK.cream; ctx.lineWidth = 2; ctx.strokeRect(ix + 1, iy + 1, sz - 2, sz - 2);
  if (sel.length) {
    const it = sel[S.sel % sel.length];
    itemIcon(ctx, it, ix + sz / 2, iy + sz / 2 - 3);
    if (G.p.itemCd > 0) { ctx.fillStyle = 'rgba(20,22,63,.7)'; ctx.fillRect(ix + 2, iy + 2, sz - 4, (sz - 4) * clamp(G.p.itemCd / 1.2, 0, 1)); }
    ctx.font = '600 9px ' + FONT_B; ctx.textAlign = 'center'; ctx.fillStyle = INK.cream; ctx.fillText(ITEM_INFO[it].name, ix + sz / 2, iy + sz - 7);
    if (sel.length > 1) { ctx.fillStyle = INK.yellow; ctx.fillText('tap to switch', ix + sz / 2, iy + sz + 10); }
  } else { ctx.font = '600 9px ' + FONT_B; ctx.textAlign = 'center'; ctx.fillStyle = '#8b8fc9'; ctx.fillText('No item', ix + sz / 2, iy + sz / 2); }
  if (S.items.includes('phase')) { ctx.font = '600 9px ' + FONT_B; ctx.textAlign = 'right'; ctx.fillStyle = INK.teal; ctx.fillText('Phase dash', ix - 8, iy + 10); }
  // boss bar
  const b = G.boss;
  if (b && b.active && !b.dead) {
    const bw = Math.min(360, V.w - 150), bx = (V.w - bw) / 2, by = top + 70;
    ctx.font = '13px ' + FONT_D; ctx.textAlign = 'center'; ctx.fillStyle = INK.pink; ctx.fillText(b.name, V.w / 2 + 1.5, by - 10 + 1.5); ctx.fillStyle = INK.cream; ctx.fillText(b.name, V.w / 2, by - 10);
    ctx.fillStyle = INK.night; ctx.fillRect(bx - 2, by - 2, bw + 4, 12);
    ctx.fillStyle = INK.pink; ctx.fillRect(bx + 2, by + 2, bw * b.hp / b.max, 8);
    ctx.fillStyle = b.shielded && b.shieldOff <= 0 ? INK.teal : INK.orange; ctx.fillRect(bx, by, bw * b.hp / b.max, 8);
  }
  // banner
  if (G.banner) {
    const bn = G.banner, a = Math.min(1, bn.t / .5, (3.2 - bn.t) / .3), sz2 = Math.min(40, V.w / 11);
    ctx.globalAlpha = clamp(a, 0, 1);
    riText(ctx, bn.title, V.w / 2, V.h * .3, sz2, INK.cream, INK.pink, 'center');
    ctx.font = 'italic 15px ' + FONT_B; ctx.fillStyle = INK.yellow; ctx.fillText(bn.sub, V.w / 2, V.h * .3 + sz2 * .9);
    ctx.globalAlpha = 1;
  }
  // toast
  if (G.msg && !G.dialog) {
    ctx.font = '600 14px ' + FONT_B; const w = Math.min(V.w - 30, ctx.measureText(G.msg.text).width + 26), my = V.h * .62;
    ctx.globalAlpha = clamp(G.msg.t / .3, 0, 1);
    ctx.fillStyle = INK.pink; ctx.fillRect(V.w / 2 - w / 2 + 3, my - 15 + 3, w, 30);
    ctx.fillStyle = INK.cream; ctx.fillRect(V.w / 2 - w / 2, my - 15, w, 30);
    ctx.fillStyle = INK.night; ctx.textAlign = 'center'; ctx.fillText(G.msg.text, V.w / 2, my, V.w - 40);
    ctx.globalAlpha = 1;
  }
  // stick
  const tc = G.touch;
  if (tc.on) {
    ctx.globalAlpha = .5; ctx.strokeStyle = INK.cream; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tc.sx, tc.sy, 46, 0, TAU); ctx.stroke();
    ctx.fillStyle = INK.orange; ctx.beginPath(); ctx.arc(tc.x, tc.y, 22, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
}
function itemIcon(ctx, it, x, y) {
  if (it === 'arc') { ctx.fillStyle = INK.pink; ctx.beginPath(); ctx.arc(x + 2, y + 2, 11, 0, TAU); ctx.fill(); ctx.fillStyle = INK.orange; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK.yellow; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, y - 6); ctx.lineTo(x + 2, y - 1); ctx.lineTo(x - 2, y + 1); ctx.lineTo(x + 4, y + 6); ctx.stroke(); }
  else if (it === 'reso') { ctx.strokeStyle = INK.teal; ctx.lineWidth = 2.5; for (let i = 1; i < 4; i++) { ctx.globalAlpha = 1 - i * .2; ctx.beginPath(); ctx.arc(x, y, i * 4.5, 0, TAU); ctx.stroke(); } ctx.globalAlpha = 1; ctx.fillStyle = INK.cream; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); }
}
function drawPortrait(ctx, spk, w, h) {
  ctx.clearRect(0, 0, w, h);
  const look = spk === 'ines' ? { body:INK.orange, head:INK.cream, visor:INK.teal, ink2:INK.pink }
    : spk === 'kessa' ? { body:INK.red, head:'#e8b48f', visor:INK.yellow, ink2:INK.orange }
    : NPC_LOOK[spk];
  ctx.fillStyle = INK.night; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = halftone(ctx, spk === 'choir' ? INK.teal : INK.blue, 6, 1.6); ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h * .56, r = w * .26;
  if (!look) {
    if (spk === 'choir') { ctx.fillStyle = '#05060f'; ctx.beginPath(); ctx.arc(cx, cy, r * 1.2, 0, TAU); ctx.fill(); ctx.fillStyle = INK.teal; ctx.fillRect(cx - 8, cy - 4, 5, 5); ctx.fillRect(cx + 3, cy - 4, 5, 5); }
    else { diamond(ctx, cx + 2, cy + 2, r, INK.pink); diamond(ctx, cx, cy, r, INK.cream); }
    return;
  }
  ctx.fillStyle = look.ink2; roundRect(ctx, cx - r * 1.3 + 3, cy + r * .6 + 3, r * 2.6, r * 1.6, 10); ctx.fill();
  ctx.fillStyle = look.body; roundRect(ctx, cx - r * 1.3, cy + r * .6, r * 2.6, r * 1.6, 10); ctx.fill();
  ctx.fillStyle = look.ink2; ctx.beginPath(); ctx.arc(cx + 3, cy - r * .2 + 3, r, 0, TAU); ctx.fill();
  ctx.fillStyle = look.head; ctx.beginPath(); ctx.arc(cx, cy - r * .2, r, 0, TAU); ctx.fill();
  ctx.fillStyle = look.visor; roundRect(ctx, cx - r * .7, cy - r * .35, r * 1.4, r * .42, 4); ctx.fill();
}
// ---------- title backdrop ----------
const STARS = Array.from({ length:90 }, () => ({ x:Math.random(), y:Math.random(), s:Math.random() * 1.6 + .4, p:Math.random() * 6 }));
function renderTitle(ctx) {
  const V = G.view, w = V.w, h = V.h, t = G.time;
  ctx.fillStyle = INK.night; ctx.fillRect(0, 0, w, h);
  for (const s of STARS) { ctx.globalAlpha = .4 + .6 * Math.abs(Math.sin(t * .8 + s.p)); ctx.fillStyle = s.p > 5 ? INK.yellow : INK.cream; ctx.fillRect(((s.x * w + t * 4 * s.s) % w), s.y * h, s.s, s.s); }
  ctx.globalAlpha = 1;
  const planet = (x, y, r, c1, c2, dots) => {
    ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(x + r * .05, y + r * .04, r, 0, TAU); ctx.fill();
    ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    ctx.fillStyle = halftone(ctx, dots, 7, 2); ctx.fillRect(x - r * .1, y - r, r * 1.2, r * 2);
    ctx.restore();
  };
  const m = Math.min(w, h);
  planet(w * .82 + Math.sin(t * .1) * 6, h * .2, m * .16, INK.orange, INK.pink, INK.plum);
  planet(w * .12, h * .8 + Math.cos(t * .12) * 6, m * .1, INK.teal, INK.pink, INK.deep);
  // the Lamp tower
  const bx = w * .5, by = h;
  ctx.fillStyle = INK.pink; ctx.fillRect(bx - m * .06 + 4, by - m * .42 + 4, m * .12, m * .42);
  ctx.fillStyle = INK.blue; ctx.fillRect(bx - m * .06, by - m * .42, m * .12, m * .42);
  ctx.fillStyle = halftone(ctx, INK.night, 6, 1.5); ctx.fillRect(bx, by - m * .42, m * .06, m * .42);
  ctx.save(); ctx.translate(bx, by - m * .46); ctx.rotate(t * .25);
  ctx.globalAlpha = .12 + .05 * Math.sin(t * 2); ctx.fillStyle = INK.yellow;
  for (let i = 0; i < 6; i++) { ctx.rotate(TAU / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-m * .04, -m); ctx.lineTo(m * .04, -m); ctx.fill(); }
  ctx.restore(); ctx.globalAlpha = 1;
  ctx.fillStyle = INK.orange; ctx.beginPath(); ctx.arc(bx + 3, by - m * .46 + 3, m * .05, 0, TAU); ctx.fill();
  ctx.fillStyle = INK.yellow; ctx.beginPath(); ctx.arc(bx, by - m * .46, m * .05, 0, TAU); ctx.fill();
  ctx.fillStyle = grain(ctx); ctx.fillRect(0, 0, w, h);
}
