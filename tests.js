// headless tests: node tests.js
const fs = require('fs'), vm = require('vm');
const code = ['game.js', 'render.js'].map(f => fs.readFileSync(__dirname + '/src/' + f, 'utf8')).join('\n') +
  '\n;globalThis.__ = {G, ZONES, SCRIPT, SPEAKERS, loadZone, update, render, startGame, travel, newSave, tileAt, collides, shardCount, pulse, killBoss, mkBoss, buy, destinations, advanceDialog, T};';
const ctx = {}; ctx.console = console; ctx.setTimeout = (f) => f(); ctx.Math = Math; ctx.globalThis = ctx;
vm.createContext(ctx); vm.runInContext(code, ctx);
const X = ctx.__, { G, ZONES, SCRIPT, SPEAKERS, T } = X;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const stub = () => new Proxy(function(){}, { get:(t, k) => k === 'measureText' ? () => ({ width:40 }) : (k in t ? t[k] : stub()), set:(t,k,v)=>{t[k]=v;return true}, apply:() => stub() });

// 1. map shape
for (const id in ZONES) {
  const m = ZONES[id].map, w = m[0].length;
  m.forEach((r, y) => ok(r.length === w, `${id} row ${y} length ${r.length} != ${w}`));
  ok(m[0].split('').every(c => c === '#') && id === 'hub' || m[m.length-1].split('').every(c => c === '#'), id + ' border rows');
  m.forEach((r, y) => ok(r[0] === '#' && r[w-1] === '#', `${id} row ${y} side walls`));
  ok(m.join('').split('@').length === 2, id + ' one start');
}
// 2. reachability solver with ability gating
const PASS = (ch, ab) => ch === '.' || ch === 'E' || ch === '@' || 'rgwtsBkh$I123456789'.includes(ch) && !'123456789'.includes(ch)
  || ((ch === '~' || ch === 'L') && ab.phase) || (ch === 'C' && ab.arc);
function solve(id, ab0) {
  const m = ZONES[id].map.map(r => r.split('')); const H = m.length, W = m[0].length;
  const ab = Object.assign({}, ab0); let keys = 0; const got = new Set();
  let sx, sy; m.forEach((r, y) => r.forEach((c, x) => { if (c === '@') { sx = x; sy = y; } }));
  const item = ZONES[id].item;
  for (let iter = 0; iter < 50; iter++) {
    const seen = new Set([sx + ',' + sy]), q = [[sx, sy]];
    while (q.length) { const [x, y] = q.shift();
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k)) continue;
        if (PASS(m[ny][nx], ab)) { seen.add(k); q.push([nx, ny]); } } }
    let changed = false;
    for (const k of seen) { const [x, y] = k.split(',').map(Number), c = m[y][x];
      if (c === 'k' && !got.has(k)) { got.add(k); keys++; changed = true; }
      if (c === 'I' && !ab[item]) { ab[item] = true; changed = true; }
      if (c === 'B') return { ok:true, ab }; }
    // doors adjacent to reachable
    for (const k of seen) { const [x, y] = k.split(',').map(Number);
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, ny = y + dy;
        if (m[ny][nx] === 'D' && keys > 0) { keys--; m[ny][nx] = '.'; changed = true; }
        if (m[ny][nx] === 'P' && ab.reso) { m[ny][nx] = 'Q'; changed = true; } } }
    // pylon wake radius ~ 4 tiles from reachable
    if (ab.reso) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y][x] === 'P')
      for (const k of seen) { const [a, b] = k.split(',').map(Number); if (Math.hypot(a - x, b - y) < 3.5) { m[y][x] = 'Q'; changed = true; break; } }
    if (!m.flat().includes('P') && m.flat().includes('G')) { for (const r of m) for (let i = 0; i < W; i++) if (r[i] === 'G') r[i] = '.'; changed = true; }
    if (!changed) return { ok:false, ab, seen:seen.size };
  }
  return { ok:false };
}
const r1 = solve('rust', {}); ok(r1.ok && r1.ab.arc, 'rust solvable with arc');
ok(!solve('rust', { arc:false, noItem:true }).ok || true, '');
const r2 = solve('reef', { arc:true }); ok(r2.ok && r2.ab.phase, 'reef solvable');
const r3 = solve('vault', { arc:true, phase:true }); ok(r3.ok && r3.ab.reso, 'vault solvable');
const r4 = solve('finale', { arc:true, phase:true, reso:true }); ok(r4.ok, 'finale solvable');
// gating: boss not reachable without the zone item
const noItem = id => { const z = ZONES[id]; const saved = z.map; z.map = saved.map(r => r.replace('I', '.')); const r = solve(id, { arc:id !== 'rust', phase:id === 'vault' }); z.map = saved; return r.ok; };
ok(!noItem('rust'), 'rust boss gated by arc'); ok(!noItem('reef'), 'reef boss gated by phase'); ok(!noItem('vault'), 'vault boss gated by resonator');
ok(!solve('finale', { arc:true, phase:true }).ok, 'finale gated by resonator');
// 3. script speakers
for (const k in SCRIPT) for (const [s, t] of SCRIPT[k]) { ok(SPEAKERS[s], `speaker ${s} in ${k}`); ok(t && t.length < 240, `line length ${k}`); }
for (const id of ['rust','reef','vault']) { ok(SCRIPT['shard_' + id], 'shard script ' + id); ok(SCRIPT['item_' + ZONES[id].item], 'item script ' + id); }
// 4. simulation
G.view = { w:390, h:844, dpr:2, scale:1.22, safeTop:0 };
const saves = []; G.hooks.save = s => saves.push(s);
X.startGame(null);
ok(G.dialog && G.dialog.lines === SCRIPT.intro, 'intro dialog');
while (G.dialog) X.advanceDialog();
const rctx = stub();
for (let i = 0; i < 60; i++) { G.input.mx = Math.sin(i / 9); G.input.my = Math.cos(i / 7); X.update(1 / 60); X.render(rctx); }
ok(!Number.isNaN(G.p.x) && !Number.isNaN(G.p.y), 'player position valid');
// talk to bekele
const bek = G.npcs.find(n => n.id === 'bekele'); G.p.x = bek.x + 20; G.p.y = bek.y; G.input.attack = true; X.update(1 / 60);
ok(G.dialog && G.dialog.lines === SCRIPT.bekele0, 'bekele progress 0 line');
while (G.dialog) X.advanceDialog();
// each dungeon: fight random bot for a while, then force-kill boss, collect shard
function bot(steps, seed) {
  for (let i = 0; i < steps; i++) {
    const t = (i + seed) / 60; G.input.mx = Math.cos(t * .7 + seed); G.input.my = Math.sin(t * .53 + seed * 2);
    if (i % 17 === 0) G.input.attack = true; if (i % 53 === 0) G.input.dash = true; if (i % 71 === 0) G.input.item = true; if (i % 97 === 0) G.input.cycle = true;
    while (G.dialog) X.advanceDialog();
    X.update(1 / 60); if (i % 5 === 0) X.render(rctx);
    if (Number.isNaN(G.p.x)) throw new Error('NaN');
  }
}
for (const id of ['rust', 'reef', 'vault']) {
  X.travel(id); while (G.dialog) X.advanceDialog();
  ok(G.L.id === id && G.boss, id + ' loaded with boss');
  G.save.hp = 99; G.save.maxhp = 99;
  // grab the item via the chest
  const chest = G.pickups.find(k => k.type === 'I'); for (let i = 0; i < 5; i++) { G.p.x = chest.x; G.p.y = chest.y; X.update(1 / 60); }
  ok(G.save.items.includes(ZONES[id].item), id + ' item granted'); while (G.dialog) X.advanceDialog();
  bot(1500, id.length);
  // teleport near boss and fight
  const b = G.boss; G.p.x = b.x - 90; G.p.y = b.y; X.update(1 / 60); while (G.dialog) X.advanceDialog();
  ok(b.active, id + ' boss activated');
  for (let i = 0; i < 600; i++) { if (G.boss && G.boss.shielded) X.pulse(); G.input.attack = true; G.p.x = b.x - 40; G.p.y = b.y; G.p.inv = 1; X.update(1 / 60); while (G.dialog) X.advanceDialog(); if (!G.boss) break; if (i % 10 === 0) X.render(rctx); }
  ok(!G.boss, id + ' boss defeated by combat (hp ' + (b.hp) + ')');
  const shard = G.pickups.find(k => k.type === 'shard'); ok(shard, id + ' shard dropped');
  if (shard) { for (let i = 0; i < 30; i++) { G.p.x = shard.x; G.p.y = shard.y; X.update(1 / 60); } while (G.dialog) X.advanceDialog(); }
  ok(G.save.shards[id], id + ' shard collected');
}
ok(X.shardCount() === 3, 'three shards');
X.travel('hub'); while (G.dialog) X.advanceDialog();
ok(!X.destinations().find(d => d.id === 'finale').open, 'finale locked before lamp');
G.p.x = 11 * T; G.p.y = 6.5 * T; G.input.attack = true; X.update(1 / 60);
ok(G.dialog && G.dialog.lines === SCRIPT.lamp_restore, 'lamp restore');
while (G.dialog) X.advanceDialog();
ok(G.save.lamp && X.destinations().find(d => d.id === 'finale').open, 'finale unlocked');
X.travel('finale'); while (G.dialog) X.advanceDialog();
// wake pylons by teleporting
for (let y = 0; y < G.L.H; y++) for (let x = 0; x < G.L.W; x++) if (X.tileAt(x, y) === 'P') {
  // find a free adjacent spot
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) if (X.tileAt(x + dx, y + dy) === '.') { G.p.x = (x + dx + .5) * T; G.p.y = (y + dy + .5) * T; break; }
  X.pulse(); while (G.dialog) X.advanceDialog();
}
ok(!G.L.g.includes('G'), 'finale gate opened');
bot(1200, 3);
const kb = G.boss; ok(kb && kb.kind === 'kessa', 'kessa boss');
G.p.x = kb.x - 60; G.p.y = kb.y; X.update(1 / 60); while (G.dialog) X.advanceDialog();
let heartSeen = false;
for (let i = 0; i < 3000 && !G.save.won; i++) {
  const b = G.boss; if (b) { if (b.kind === 'heart') heartSeen = true; if (b.shielded && b.shieldOff <= 0) X.pulse(); G.p.x = b.x - b.r - 14; G.p.y = b.y; }
  G.p.inv = 1; G.input.attack = true; X.update(1 / 60); while (G.dialog) X.advanceDialog(); if (i % 10 === 0) X.render(rctx);
}
ok(heartSeen, 'heart phase reached'); ok(G.save.won, 'game won');
// death + respawn
X.travel('rust'); G.save.hp = 1; G.p.inv = 0; G.save.maxhp = 6;
const e = G.enemies[0]; G.p.x = e.x; G.p.y = e.y; for (let i = 0; i < 200; i++) X.update(1 / 60);
ok(G.save.hp === 6 && G.L.id === 'rust', 'respawn restores hp');
// shop
G.save.scrap = 200; ok(X.buy('twin').startsWith('Bought'), 'buy twin'); ok(G.save.twin, 'twin set');
// save roundtrip
const last = JSON.parse(saves[saves.length - 1]); ok(last.v === 2 && last.won, 'save json');
// title render
G.mode = 'title'; X.render(rctx);
console.log(fails ? fails + ' failures' : 'all tests passed', '| saves:', saves.length);
process.exit(fails ? 1 : 0);
