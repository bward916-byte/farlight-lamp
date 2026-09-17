'use strict';
// ================= FARLIGHT: The Lamp of Hearth — core =================
const T = 32, TAU = Math.PI * 2;
const INK = { blue:'#2E3192', orange:'#FF6C2F', pink:'#FF48B0', yellow:'#FFE800', teal:'#00A99D',
  night:'#14163F', cream:'#FFF1C9', plum:'#5A2340', violet:'#3B2C73', deep:'#0B2B3F', red:'#FF3B3B' };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = (a, b) => a + Math.random() * (b - a);
const hyp = Math.hypot;
function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function angDiff(a, b) { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return Math.abs(d); }

// ---------- zones ----------
const ZONES = {
  hub: { name:'Hearth Promenade', sub:'The last lit port', floor:INK.blue, floor2:'#282b88', wall:INK.orange, wallHi:'#FFA27A', shade:INK.pink, detail:INK.yellow, bg:INK.night,
    notes:[60,64,67,71], npcs:{1:'bekele',2:'tamsin',3:'yara'}, map:[
'##########################',
'#........................#',
'#..1......2.......3......#',
'#........................#',
'#..........OO............#',
'#..........OO............#',
'#.....@..................#',
'#........................#',
'###########EE#############']},
  rust: { name:'Rust Moon', sub:"Kessa Vorn's salvage yard", floor:INK.plum, floor2:'#4d1d37', wall:INK.orange, wallHi:'#FFA27A', shade:'#2a0f22', detail:INK.yellow, bg:'#1c0a16',
    notes:[57,60,62,64], item:'arc', boss:'maw', map:[
'########################################',
'#........#...........#.................#',
'#..@.....#...r...r...#......h..........#',
'#........D...........#...........r.....#',
'#...k....#.....$.....#.................#',
'#........#...........C.................#',
'####.#########.#######.................#',
'#........#.......r...#########.#########',
'#...r....#...........#.................#',
'#........#....g......#.................#',
'#........#...........#.................#',
'#....g...#####.#######.........B.......#',
'#........#...........#.................#',
'#........#.....I.....C.................#',
'#..E.....#.........r.#.................#',
'#........#...........#.................#',
'########################################']},
  reef: { name:'Glass Reef', sub:'Where the Veil keep their secrets', floor:INK.deep, floor2:'#0a2536', wall:INK.teal, wallHi:'#7BE6DC', shade:INK.pink, detail:INK.pink, bg:'#04121c',
    notes:[62,65,69,72], npcs:{4:'mira'}, item:'phase', boss:'warden', map:[
'########################################',
'#@.....#.............#.................#',
'#......#....w....w...#.......w.........#',
'#......D.............~~................#',
'#..k...#.............~~................#',
'#..4...#......I......~~........h.......#',
'#......#.............#.................#',
'###.#########################LL#########',
'#..........#.........#.................#',
'#...w......#.........#.................#',
'#..........~~........#.................#',
'#....$.....~~........L.........B.......#',
'#..........~~...w....L.................#',
'#..........#.........#.................#',
'#..E.......#.........#.................#',
'#..........#.........#.................#',
'#..........#.........#.................#',
'########################################']},
  vault: { name:'Counting Vaults', sub:'Thessi ledgers, Thessi terms', floor:INK.violet, floor2:'#33265f', wall:INK.yellow, wallHi:'#FFF7A8', shade:INK.orange, detail:INK.orange, bg:'#150f2b',
    notes:[55,58,62,65], npcs:{5:'clerk'}, item:'reso', boss:'auditor', map:[
'########################################',
'#@.....#.........#...........#.........#',
'#......#...t.....#.....t.....#....P....#',
'#......D.........C...........~~........#',
'#..k...#....r....#.....I.....~~........#',
'#..5...#.........#...........#.........#',
'####.###########.#...........#....h....#',
'#........#.......######.################',
'#...g....#.......#...........#.........#',
'#........#...t...#...........#.........#',
'#........G.......#.....P.....#.........#',
'#..E.....#...r...#...........G....B....#',
'#........#.......#.....s.....#.........#',
'#........#...r...#...........#.........#',
'#........#.......#.....s.....#.........#',
'########################################']},
  finale: { name:'Consumed Hearth', sub:'The first port, hollowed by the dark', floor:'#1b1e4d', floor2:'#15173f', wall:INK.pink, wallHi:'#FF9AD2', shade:INK.teal, detail:INK.teal, bg:'#07081c',
    notes:[53,56,60,63], boss:'kessa', map:[
'########################################',
'#..................#..................E#',
'#..P.....s.........#..............s....#',
'#..................~~..................#',
'#......########....~~.....########.....#',
'#......#......#....#......#......#.....#',
'#..s...C..P...#....#..@...#..P...C..g..#',
'#......#......#....#......#......#.....#',
'#......########....#......########.....#',
'#....h.............#...................#',
'##################GGGG##################',
'#......................................#',
'#......................................#',
'#......................................#',
'#......................................#',
'#..................B...................#',
'#......................................#',
'#......................................#',
'#......................................#',
'########################################']}
};
const ITEM_INFO = {
  arc:{name:'Arc charge', desc:'Breaks cracked walls'},
  phase:{name:'Phase dash', desc:'Dash through lasers and gaps'},
  reso:{name:'Resonator', desc:'Wakes pylons, reveals shades'}
};

// ---------- story ----------
const SPEAKERS = {
  n:{name:'', color:INK.cream}, ines:{name:'Ines Varga', color:INK.orange}, bekele:{name:'Dr. Bekele', color:INK.yellow},
  tamsin:{name:'Tamsin Roe', color:'#FF9A6B'}, yara:{name:'Yara Lind', color:INK.teal}, mira:{name:'Mira Qell', color:INK.pink},
  clerk:{name:'Thessi clerk', color:INK.yellow}, kessa:{name:'Kessa Vorn', color:'#FF5A36'}, choir:{name:'The choir', color:'#5FE3D4'}
};
const SCRIPT = {
  intro:[
    ['n','Hearth is the last lit port before the charts run out. For two hundred years its Lamp has sung into the dark, and ships have followed the song home.'],
    ['n','Tonight the Lamp went quiet.'],
    ['bekele','Ines, good, you came. Someone cut the tuning core out of the Lamp and broke it into three shards.'],
    ['bekele','Without the song the dark moves in. The Umbra choir is gathering at the edge of the charts, and Kessen raiders are circling.'],
    ['ines','Who took it?'],
    ['bekele',"Kessa Vorn's crew. They scattered the shards. One is on Rust Moon, inside her salvage yard."],
    ['bekele','Your ship is at the dock, south of the Lamp. Bring the shards home.']],
  bekele0:[['bekele',"Rust Moon first. Kessa's yard is walled with scrap. Look for anything that can break a cracked wall."]],
  bekele1:[['bekele','One shard. The Veil carried the second into the Glass Reef to keep it from Kessa. They will want to see what you are made of.']],
  bekele2:[['bekele','The last shard sits in the Thessi Counting Vaults. They hold it as collateral on a debt Hearth never agreed to.']],
  bekele3:[['bekele','All three. Set them into the Lamp, Ines.']],
  bekele4:[['bekele','The Lamp points to Consumed Hearth. Kessa is already on her way. Go.']],
  bekele5:[['bekele','Listen to it. I never thought I would hear the Lamp this loud.']],
  yara0:[['yara','Anything that swings at you, you can dash through. Dash first, then strike.']],
  yara1:[['yara','Reef lasers cannot stop a body that is half out of the world. You will need Veil tech for that.']],
  yara2:[['yara','In the Vaults, dead pylons hold the gates shut. They answer to sound, not force.']],
  yara3:[['yara','Consumed Hearth is where the first colonists launched from. Nobody who went there came back talking.']],
  yara5:[['yara','The Thessi are recounting their ledger. For once the numbers came out in your favor.']],
  lamp_dark:[['n','The Lamp is dark. Three empty sockets wait around its core.']],
  lamp_part:[['n','The Lamp is dark. Some of its sockets are filled, and they hum faintly.']],
  lamp_lit:[['n','The Lamp hums and points west, toward Consumed Hearth.']],
  lamp_restore:[
    ['n','You set the three shards into the core. They clash, then settle into a single note.'],
    ['bekele','It is singing, but not to us. Look at the Orrery readout. The song points west, to a place with our name on it.'],
    ['bekele','Consumed Hearth. The first port. The charts say it was lost.'],
    ['ines',"Kessa's ships are heading the same way."],
    ['bekele','Then get there first. The Umbra will be there too. Your resonator speaks their language. Use it.'],
    ['n','Consumed Hearth is now on your star map.']],
  enter_rust:[['ines','Rust Moon. Every wall in this yard used to be a ship.'],['n','Find keys to open locked doors. Strike to fight or talk, dash to dodge.']],
  item_arc:[['n','You found an arc charge. Press the item button to set one down. It breaks cracked walls, and anything standing too close.']],
  shard_rust:[
    ['kessa','Enjoy the shard, freeholder. You think Hearth is the good guy in this story?'],
    ['kessa','The Kessen flew out of Hearth too. Same hulls, same song. Then one day we could not hear it anymore, and nobody came looking.'],
    ['ines','First shard. Two to go.']],
  enter_reef:[['ines','The Glass Reef. Everything in here is watching me.']],
  mira1:[['mira','A Hearth hull. We do not see many. The shard is deep in the reef, past the lasers.'],
    ['mira','Our tech is in there too. Take it if you can reach it. You will need it.']],
  mira2:[['mira','The Umbra do not want your station. They want the sound. That is why we hid the shard from Kessa. She wants the sound gone.']],
  item_phase:[['n','Phase dash installed. Your dash now carries you through lasers and across gaps.']],
  shard_reef:[['mira','Take it. If the Lamp sings again, maybe the choir will stop pressing on our reef.'],['ines','Two shards. The last one is with the Thessi.']],
  enter_vault:[['clerk','Welcome, debtor. The shard is held against Hearth\'s account. The Auditor will discuss terms.']],
  clerk1:[['clerk','The Thessi count everything. Every colony ship that ever left Hearth is in our ledger. So are the ones that stopped answering.']],
  item_reso:[['n','You found the resonator. Switch items with the item slot, then press item to send a pulse. It wakes pylons, stuns enemies, strips shields, and pulls shades into the light.']],
  shard_vault:[
    ['clerk','The account is settled. And the ledger has a line you should read.'],
    ['n','Every ship that left Hearth carried a copy of the Lamp\'s song. The Umbra gathered those songs. Ships that lost theirs were cut adrift, and their crews became the Kessen.'],
    ['ines','So the Kessen are not just raiders. They are the ones who were never called home.'],
    ['ines','Time to take the shards back to the Lamp.']],
  enter_finale:[['n','Consumed Hearth. The first port, hollowed out by the dark. Somewhere below, the choir is singing Hearth\'s stolen notes back at you.'],
    ['ines','Three dead pylons hold the gate. Let\'s wake them.']],
  kessa_start:[['kessa','You carried the song all the way here. Good. I will silence it at the source. If the Kessen cannot hear it, no one should.']],
  kessa_down:[['kessa','...Why does it sound like that? Like it is calling.'],
    ['choir','A low tone fills the chamber. The dark itself rises from the floor.'],
    ['ines','The choir\'s heart. It has been holding every note that ever left Hearth. Shield up. The resonator should crack it.']],
  ending:[
    ['n','You strike the heart with one last pulse. Every stolen note pours out at once, two hundred years of the song answering itself.'],
    ['n','Across the charts, lost Kessen hulls light their old receivers. For the first time in generations, they hear Hearth.'],
    ['kessa','...It has been a long time since anyone called us home.'],
    ['bekele','Hearth\'s Lamp is singing again, Ines. Louder than it ever has.'],
    ['n','The end. Thank you for flying FARLIGHT.']],
  locked:[['n','Locked. There is a key somewhere in this area.']],
  gates:[['n','The last pylon wakes. Somewhere nearby, a gate grinds open.']]
};

// ---------- state ----------
const G = {
  save:null, L:null, p:null, enemies:[], shots:[], bombs:[], fx:[], pickups:[], npcs:[], rings:[], boss:null,
  cam:{x:0,y:0}, shake:0, time:0, mode:'title', banner:null, dialog:null, msg:null, dead:0, freeze:0,
  view:{w:800,h:600,dpr:1,scale:2}, input:{mx:0,my:0,attack:false,dash:false,item:false,cycle:false},
  hooks:{}, hud:{itemRect:null}, touch:{on:false,sx:0,sy:0,x:0,y:0}, nearPrompt:null, msgCd:0
};
function hook(name, ...a) { const f = G.hooks[name]; if (f) try { return f(...a); } catch (e) { console.error(e); } }
function newSave() {
  return { v:2, zone:'hub', hp:6, maxhp:6, scrap:0, keys:{}, items:[], sel:0, shards:{}, lamp:false, bossDown:{},
    mods:{}, taken:{}, flags:{}, blade:1, twin:false, pods:0, won:false, time:0 };
}
function persist() { hook('save', JSON.stringify(G.save)); }
function shardCount() { const s = G.save.shards; return (s.rust?1:0) + (s.reef?1:0) + (s.vault?1:0); }
function selectable() { return G.save.items.filter(i => i !== 'phase'); }
function toast(text, dur) { G.msg = { text, t: dur || 2.4 }; }
function banner(title, sub) { G.banner = { title, sub, t: 3.2 }; }
function clearEdges() { const I = G.input; I.attack = I.dash = I.item = I.cycle = false; }

function say(id, cb) {
  const lines = typeof id === 'string' ? SCRIPT[id] : id;
  if (!lines || !lines.length) { if (cb) cb(); return; }
  G.dialog = { lines, i:0, cb };
  hook('dialog', lines[0]); hook('sfx', 'talk');
}
function advanceDialog() {
  const d = G.dialog; if (!d) return;
  d.i++;
  if (d.i >= d.lines.length) { G.dialog = null; hook('dialog', null); if (d.cb) d.cb(); }
  else { hook('dialog', d.lines[d.i]); hook('sfx', 'talk'); }
}
function once(flag, id, cb) {
  const f = G.save.flags; if (f[flag]) { if (cb) cb(); return false; }
  f[flag] = true; say(id, cb); persist(); return true;
}

// ---------- level ----------
function loadZone(id) {
  const z = ZONES[id], S = G.save; S.zone = id;
  const rows = z.map, H = rows.length, W = Math.max(...rows.map(r => r.length));
  const L = { id, z, W, H, g:new Array(W * H) };
  G.enemies = []; G.shots = []; G.bombs = []; G.fx = []; G.pickups = []; G.npcs = []; G.rings = []; G.boss = null;
  const mods = S.mods[id] || {}, taken = new Set(S.taken[id] || []);
  let start = { x:1, y:1 }, bossAt = null;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let ch = rows[y][x] || '#'; const key = x + ',' + y;
    if (ch === '@') { start = { x, y }; ch = '.'; }
    else if ('rgwts'.includes(ch)) { G.enemies.push(mkEnemy(ch, (x + .5) * T, (y + .5) * T)); ch = '.'; }
    else if (ch === 'B') { bossAt = { x, y }; ch = '.'; }
    else if (z.npcs && z.npcs[ch]) { G.npcs.push({ id:z.npcs[ch], x:(x + .5) * T, y:(y + .5) * T, r:11, t:Math.random() * 6 }); ch = 'n'; }
    else if ('kh$I'.includes(ch)) { if (!taken.has(key)) G.pickups.push({ type:ch, x:(x + .5) * T, y:(y + .5) * T, key, t:Math.random() * 6 }); ch = '.'; }
    if (mods[key]) ch = mods[key];
    L.g[y * W + x] = ch;
  }
  L.start = start; L.bossAt = bossAt; G.L = L;
  if (bossAt) {
    const bx = (bossAt.x + .5) * T, by = (bossAt.y + .5) * T;
    if (!S.bossDown[id]) G.boss = mkBoss(id === 'finale' && S.flags.kessaDown ? 'heart' : z.boss, bx, by);
    else if (id !== 'finale' && !S.shards[id]) G.pickups.push({ type:'shard', x:bx, y:by, t:0 });
  }
  const px = (start.x + .5) * T, py = (start.y + .5) * T;
  G.p = { x:px, y:py, r:10, face:Math.PI / 2, inv:0, atkCd:0, atkT:0, atkAng:0, dash:0, dashCd:0, dvx:0, dvy:0, phase:false,
    dashExt:0, itemCd:0, walk:0, lastSafe:{ x:px, y:py }, kb:{ x:0, y:0 }, onExit:false, moving:0, shotCd:0 };
  G.cam.x = px - G.view.w / G.view.scale / 2; G.cam.y = py - G.view.h / G.view.scale / 2;
  G.dead = 0; G.shake = 0; G.freeze = 0;
  banner(z.name, z.sub);
  hook('music', id);
  persist();
}
function tileAt(tx, ty) { const L = G.L; if (tx < 0 || ty < 0 || tx >= L.W || ty >= L.H) return '#'; return L.g[ty * L.W + tx]; }
function setTile(tx, ty, ch) {
  const L = G.L; L.g[ty * L.W + tx] = ch;
  const m = G.save.mods[L.id] || (G.save.mods[L.id] = {}); m[tx + ',' + ty] = ch;
}
function blocks(ch, m) {
  if (ch === '.' || ch === 'E') return false;
  if (ch === '~' || ch === 'L') return !(m.phase || m.fly);
  return true;
}
function shotBlocks(ch) { return !(ch === '.' || ch === 'E' || ch === '~' || ch === 'L' || ch === 'n'); }
function collides(x, y, r, m) {
  const x0 = Math.floor((x - r) / T), x1 = Math.floor((x + r - .01) / T), y0 = Math.floor((y - r) / T), y1 = Math.floor((y + r - .01) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { const ch = tileAt(tx, ty); if (blocks(ch, m)) return { tx, ty, ch }; }
  return null;
}
function move(e, dx, dy, m) {
  let hit = null; const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 6));
  const sx = dx / steps, sy = dy / steps;
  for (let i = 0; i < steps; i++) {
    let c = collides(e.x + sx, e.y, e.r, m); if (c) hit = c; else e.x += sx;
    c = collides(e.x, e.y + sy, e.r, m); if (c) hit = c; else e.y += sy;
  }
  return hit;
}
function losClear(a, b) {
  const d = hyp(b.x - a.x, b.y - a.y), n = Math.ceil(d / 8);
  for (let i = 1; i < n; i++) { const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n;
    if (shotBlocks(tileAt(Math.floor(x / T), Math.floor(y / T)))) return false; }
  return true;
}
function checkGates() {
  const L = G.L; if (!L.g.includes('G') || L.g.includes('P')) return false;
  for (let i = 0; i < L.g.length; i++) if (L.g[i] === 'G') setTile(i % L.W, Math.floor(i / L.W), '.');
  G.shake = 10; hook('sfx', 'gate'); return true;
}

// ---------- entities ----------
const EN = { r:{hp:3,r:10,sp:80}, g:{hp:3,r:10,sp:62}, w:{hp:2,r:8,sp:72}, t:{hp:5,r:12,sp:0}, s:{hp:4,r:11,sp:46} };
function mkEnemy(k, x, y) {
  const b = EN[k];
  return { kind:k, x, y, hp:b.hp, max:b.hp, r:b.r, sp:b.sp, t:Math.random() * 6, cd:1 + Math.random() * 1.5, stun:0, exposed:0, flash:0, kb:{x:0,y:0}, face:0, alive:true, wob:Math.random() * 6 };
}
function spawnNear(k, x, y) {
  const fly = k === 'w' || k === 's';
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * TAU, d = 40 + Math.random() * 40, nx = x + Math.cos(a) * d, ny = y + Math.sin(a) * d;
    if (!collides(nx, ny, 11, { fly })) { const e = mkEnemy(k, nx, ny); e.stun = .5; G.enemies.push(e); puff(nx, ny, INK.pink, 10); return e; }
  }
  return null;
}
const BOSSES = {
  maw:{name:'Gantry Maw', title:'Kessen salvage crawler', hp:26, r:24},
  warden:{name:'Prism Warden', title:'Guardian of the Glass Reef', hp:30, r:20},
  auditor:{name:'The Auditor', title:'Thessi debt collector', hp:30, r:20, shielded:true},
  kessa:{name:'Kessa Vorn', title:'Reaver chief of the Kessen', hp:32, r:13},
  heart:{name:'The Choir Heart', title:'Everything the dark has kept', hp:40, r:28, shielded:true}
};
function mkBoss(kind, x, y) {
  const d = BOSSES[kind];
  return { kind, name:d.name, title:d.title, hp:d.hp, max:d.hp, r:d.r, shielded:!!d.shielded, x, y, hx:x, hy:y,
    active:false, state:'idle', t:0, st:0, cd:2, cd2:4, cd3:3, flash:0, stun:0, shieldOff:0, count:0, ang:0, fired:false, dead:false };
}
function puff(x, y, color, n, sp) {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = (sp || 90) * (.3 + Math.random());
    G.fx.push({ k:'dot', x, y, vx:Math.cos(a) * s, vy:Math.sin(a) * s, t:.35 + Math.random() * .35, max:.7, c:color, s:2 + Math.random() * 3 }); }
}
function floatText(x, y, text, c) { G.fx.push({ k:'txt', x, y, vx:0, vy:-30, t:.9, max:.9, c:c || INK.cream, text }); }

function hurtPlayer(d, sx, sy) {
  const p = G.p, S = G.save;
  if (p.inv > 0 || G.dead > 0 || G.dialog) return false;
  S.hp -= d; p.inv = 1.0; G.shake = 7; G.freeze = .05;
  const a = Math.atan2(p.y - sy, p.x - sx); p.kb.x = Math.cos(a) * 230; p.kb.y = Math.sin(a) * 230;
  puff(p.x, p.y, INK.pink, 8); hook('sfx', 'hurt');
  if (S.hp <= 0) { S.hp = 0; G.dead = 1.6; puff(p.x, p.y, INK.orange, 30, 160); hook('sfx', 'die'); }
  return true;
}
function hurtEnemy(e, dmg, a) {
  if (!e.alive) return false;
  if (e.kind === 's' && e.exposed <= 0) { floatText(e.x, e.y - 14, 'no effect', INK.teal); hook('sfx', 'clink');
    if (G.save.items.includes('reso') && G.msgCd <= 0) { toast('Shades only take damage after a resonator pulse.'); G.msgCd = 6; } return false; }
  e.hp -= dmg; e.flash = .12; e.kb.x = Math.cos(a) * 200; e.kb.y = Math.sin(a) * 200; hook('sfx', 'hit');
  if (e.hp <= 0) {
    e.alive = false; puff(e.x, e.y, INK.orange, 14, 130); puff(e.x, e.y, INK.yellow, 6);
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) dropPickup('scrap', e.x, e.y);
    if (Math.random() < .18) dropPickup('heart', e.x, e.y);
  }
  return true;
}
function dropPickup(type, x, y) {
  const a = Math.random() * TAU, s = 60 + Math.random() * 60;
  G.pickups.push({ type, x, y, vx:Math.cos(a) * s, vy:Math.sin(a) * s, t:0, life:type === 'heart' ? 9 : 14 });
}
function hurtBoss(b, dmg) {
  if (!b || !b.active || b.dead) return false;
  if (b.shielded && b.shieldOff <= 0) { floatText(b.x, b.y - b.r - 6, 'shielded', INK.teal); hook('sfx', 'clink');
    if (G.msgCd <= 0) { toast('The shield is up. Pulse the resonator nearby to drop it.'); G.msgCd = 5; } return false; }
  if (b.kind === 'maw' && b.state === 'stun') dmg *= 2;
  b.hp -= dmg; b.flash = .1; hook('sfx', 'hit'); puff(b.x, b.y, INK.yellow, 4);
  if (b.hp <= 0) killBoss(b);
  return true;
}
function killBoss(b) {
  const S = G.save, id = G.L.id;
  b.dead = true; b.hp = 0; G.shake = 16; G.freeze = .2; hook('sfx', 'bossdie');
  puff(b.x, b.y, INK.orange, 40, 220); puff(b.x, b.y, INK.pink, 30, 180); puff(b.x, b.y, INK.yellow, 20, 120);
  G.enemies.forEach(e => { if (e.alive) { e.alive = false; puff(e.x, e.y, INK.orange, 8); } });
  G.shots = G.shots.filter(s => s.from === 'p'); G.rings = [];
  if (b.kind === 'kessa') {
    S.flags.kessaDown = true; persist();
    G.boss = null;
    say('kessa_down', () => { const h = mkBoss('heart', b.hx, b.hy); h.active = true; G.boss = h; banner(h.name, h.title); hook('music', 'boss'); });
    return;
  }
  S.bossDown[id] = true;
  if (b.kind === 'heart') {
    S.won = true; persist(); G.boss = null;
    setTimeout(() => say('ending', () => hook('ending')), 900);
    hook('music', 'hub');
    return;
  }
  G.pickups.push({ type:'shard', x:b.x, y:b.y, t:0 });
  G.boss = null; hook('music', id); persist();
}

// ---------- update ----------
function update(dt) {
  G.time += dt; G.msgCd -= dt;
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  if (G.msg) { G.msg.t -= dt; if (G.msg.t <= 0) G.msg = null; }
  if (G.mode !== 'play') { clearEdges(); return; }
  G.save.time += dt;
  const I = G.input;
  if (G.dialog) { if (I.attack) advanceDialog(); clearEdges(); updateFx(dt); return; }
  if (G.dead > 0) { G.dead -= dt; updateFx(dt); if (G.dead <= 0) respawn(); clearEdges(); return; }
  if (G.freeze > 0) { G.freeze -= dt; clearEdges(); return; }
  updatePlayer(dt);
  if (G.mode === 'play' && !G.dialog) { updateEnemies(dt); updateBoss(dt); updateShots(dt); updateBombs(dt); updateRings(dt); }
  updatePickups(dt); updateFx(dt); updateCam(dt);
  clearEdges();
}
function respawn() {
  const S = G.save; S.hp = S.maxhp;
  loadZone(S.zone); toast('You wake at the landing site.');
}
function updateCam(dt) {
  const L = G.L, p = G.p, vw = G.view.w / G.view.scale, vh = G.view.h / G.view.scale;
  let tx = p.x - vw / 2, ty = p.y - vh / 2;
  const mw = L.W * T, mh = L.H * T;
  tx = mw < vw ? (mw - vw) / 2 : clamp(tx, 0, mw - vw);
  ty = mh < vh ? (mh - vh) / 2 : clamp(ty, 0, mh - vh);
  const k = 1 - Math.pow(.0005, dt);
  G.cam.x += (tx - G.cam.x) * k; G.cam.y += (ty - G.cam.y) * k;
  G.shake = Math.max(0, G.shake - dt * 30);
}
function nearestTarget(range) {
  const p = G.p; let best = null, bd = range;
  for (const e of G.enemies) { if (!e.alive) continue; const d = hyp(e.x - p.x, e.y - p.y) - e.r; if (d < bd) { bd = d; best = e; } }
  const b = G.boss; if (b && b.active && !b.dead) { const d = hyp(b.x - p.x, b.y - p.y) - b.r; if (d < bd) { bd = d; best = b; } }
  return best ? { e:best, d:bd } : null;
}
function nearNpc() { const p = G.p; return G.npcs.find(n => hyp(n.x - p.x, n.y - p.y) < p.r + n.r + 16) || null; }
function nearLamp() {
  if (G.L.id !== 'hub') return false; const p = G.p;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const tx = Math.floor(p.x / T) + dx, ty = Math.floor(p.y / T) + dy;
    if (tileAt(tx, ty) === 'O' && hyp((tx + .5) * T - p.x, (ty + .5) * T - p.y) < 40) return true;
  }
  return false;
}
function talk(n) {
  const S = G.save, k = S.won ? 5 : S.lamp ? (n.id === 'yara' ? 3 : 4) : shardCount();
  n.t = 0;
  if (n.id === 'bekele') say('bekele' + k);
  else if (n.id === 'yara') say('yara' + Math.min(k, 5 === k ? 5 : 3));
  else if (n.id === 'tamsin') hook('shop');
  else if (n.id === 'mira') { if (!S.flags.mira) { S.flags.mira = true; say('mira1'); } else say('mira2'); }
  else if (n.id === 'clerk') say('clerk1');
}
function lampInteract() {
  const S = G.save, n = shardCount();
  if (S.lamp) say('lamp_lit');
  else if (n === 3) { S.lamp = true; G.shake = 12; hook('sfx', 'shard'); puff(12 * T, 5 * T, INK.yellow, 40, 200); say('lamp_restore', persist); persist(); }
  else say(n ? 'lamp_part' : 'lamp_dark');
}
function updatePlayer(dt) {
  const p = G.p, S = G.save, I = G.input, L = G.L;
  p.inv = Math.max(0, p.inv - dt); p.atkCd -= dt; p.atkT -= dt; p.dashCd -= dt; p.itemCd -= dt;
  let mx = I.mx, my = I.my; const mag = hyp(mx, my);
  if (mag > 1) { mx /= mag; my /= mag; }
  if (mag > .2) p.face = Math.atan2(my, mx);
  p.moving = mag > .2 ? 1 : 0;
  // dash
  if (I.dash && p.dashCd <= 0 && p.dash <= 0) {
    const a = mag > .2 ? Math.atan2(my, mx) : p.face;
    p.phase = S.items.includes('phase');
    const sp = p.phase ? 440 : 400; p.dash = p.phase ? .2 : .15; p.dashExt = 0;
    p.dvx = Math.cos(a) * sp; p.dvy = Math.sin(a) * sp; p.dashCd = .45;
    p.inv = Math.max(p.inv, p.dash + .08); hook('sfx', 'dash');
  }
  if (p.dash > 0) {
    p.dash -= dt;
    move(p, p.dvx * dt, p.dvy * dt, { phase:p.phase });
    if (Math.random() < .8) G.fx.push({ k:'ghost', x:p.x, y:p.y, t:.22, max:.22, face:p.face, phase:p.phase });
    if (p.dash <= 0 && p.phase) {
      if (collides(p.x, p.y, p.r, {})) {
        p.dash = .016; p.dashExt += .016; p.inv = Math.max(p.inv, .1);
        if (p.dashExt > .6) { p.x = p.lastSafe.x; p.y = p.lastSafe.y; p.dash = 0; p.phase = false; }
      } else p.phase = false;
    }
    if (p.dash <= 0) p.phase = false;
  } else {
    const sp = 112;
    move(p, (mx * sp + p.kb.x) * dt, (my * sp + p.kb.y) * dt, {});
    const k = Math.max(0, 1 - dt * 9); p.kb.x *= k; p.kb.y *= k;
    p.walk += Math.min(1, mag) * dt * 12;
  }
  if (!p.phase && !collides(p.x, p.y, p.r, {})) p.lastSafe = { x:p.x, y:p.y };
  // doors
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const tx = Math.floor((p.x + dx * (p.r + 3)) / T), ty = Math.floor((p.y + dy * (p.r + 3)) / T);
    if (tileAt(tx, ty) === 'D') {
      const k = S.keys[L.id] || 0;
      if (k > 0) { S.keys[L.id] = k - 1; setTile(tx, ty, '.'); puff((tx + .5) * T, (ty + .5) * T, ZONES[L.id].detail, 16); hook('sfx', 'door'); toast('Door unlocked.'); persist(); }
      else if (G.msgCd <= 0) { toast('Locked. Find a key in this area.'); G.msgCd = 3; }
    }
  }
  // exit pad
  const under = tileAt(Math.floor(p.x / T), Math.floor(p.y / T));
  if (under === 'E') { if (!p.onExit) { p.onExit = true; hook('map'); } } else p.onExit = false;
  // prompt
  const npc = nearNpc(), lamp = !npc && nearLamp();
  G.nearPrompt = npc ? { x:npc.x, y:npc.y - 26, text:npc.id === 'tamsin' ? 'Shop' : 'Talk' } : lamp ? { x:12 * T, y:3.6 * T, text:'Inspect' } : null;
  // strike / talk
  if (I.attack && p.atkCd <= 0) {
    if (npc) { talk(npc); return; }
    if (lamp) { lampInteract(); return; }
    const tg = nearestTarget(280);
    if (tg && tg.d < 34) swing(Math.atan2(tg.e.y - p.y, tg.e.x - p.x));
    else if (tg && losClear(p, tg.e)) fire(Math.atan2(tg.e.y - p.y, tg.e.x - p.x));
    else if (L.id === 'hub') swing(p.face);
    else fire(p.face);
  }
  // items
  const sel = selectable();
  if (I.cycle && sel.length > 1) { S.sel = (S.sel + 1) % sel.length; hook('sfx', 'tick'); toast(ITEM_INFO[sel[S.sel]].name + ' ready', 1.2); }
  if (I.item) {
    if (!sel.length) { if (G.msgCd <= 0) { toast('No item yet.'); G.msgCd = 2; } }
    else if (p.itemCd <= 0) {
      const it = sel[S.sel % sel.length];
      if (it === 'arc') { G.bombs.push({ x:p.x + Math.cos(p.face) * 14, y:p.y + Math.sin(p.face) * 14, t:1.0, owner:'p' }); p.itemCd = 1.2; hook('sfx', 'place'); }
      else if (it === 'reso') { pulse(); p.itemCd = 1.0; }
    }
  }
}
function swing(a) {
  const p = G.p, S = G.save; p.atkCd = .3; p.atkT = .18; p.atkAng = a; p.face = a; hook('sfx', 'swing');
  const reach = 40;
  for (const e of G.enemies) if (e.alive && hyp(e.x - p.x, e.y - p.y) < reach + e.r && angDiff(Math.atan2(e.y - p.y, e.x - p.x), a) < 1.2) { if (hurtEnemy(e, S.blade, a)) G.freeze = .03; }
  const b = G.boss; if (b && b.active && !b.dead && hyp(b.x - p.x, b.y - p.y) < reach + b.r && angDiff(Math.atan2(b.y - p.y, b.x - p.x), a) < 1.3) hurtBoss(b, S.blade);
}
function fire(a) {
  const p = G.p, S = G.save; p.atkCd = .36; p.face = a; hook('sfx', 'shoot');
  const angs = S.twin ? [a - .1, a + .1] : [a];
  for (const q of angs) G.shots.push({ x:p.x + Math.cos(q) * 12, y:p.y + Math.sin(q) * 12, vx:Math.cos(q) * 330, vy:Math.sin(q) * 330, r:4, dmg:1, from:'p', life:.85 });
}
function eshot(x, y, a, sp, c) { G.shots.push({ x, y, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp, r:4, dmg:1, from:'e', life:3.2, c:c || INK.pink }); }
function radial(x, y, n, off, sp, c) { for (let i = 0; i < n; i++) eshot(x, y, off + i * TAU / n, sp, c); }
function pulse() {
  const p = G.p, L = G.L, R = 130;
  G.rings.push({ kind:'pulse', x:p.x, y:p.y, rad:8, max:R + 10, speed:460 }); hook('sfx', 'pulse');
  let woke = false;
  const tx0 = Math.floor((p.x - R) / T), tx1 = Math.floor((p.x + R) / T), ty0 = Math.floor((p.y - R) / T), ty1 = Math.floor((p.y + R) / T);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++)
    if (tileAt(tx, ty) === 'P' && hyp((tx + .5) * T - p.x, (ty + .5) * T - p.y) < R + 16) { setTile(tx, ty, 'Q'); woke = true; puff((tx + .5) * T, (ty + .5) * T, L.z.detail, 20, 140); }
  if (woke) {
    hook('sfx', 'pylon');
    const left = L.g.filter(c => c === 'P').length;
    if (checkGates()) say('gates'); else if (left) toast(left + (left === 1 ? ' pylon' : ' pylons') + ' still dark.');
    persist();
  }
  for (const e of G.enemies) if (e.alive && hyp(e.x - p.x, e.y - p.y) < R + e.r) { e.stun = 1.2; if (e.kind === 's') e.exposed = 4.5; }
  const b = G.boss;
  if (b && b.active && !b.dead && hyp(b.x - p.x, b.y - p.y) < R + b.r + 10) { if (b.shielded) { if (b.shieldOff <= 0) hook('sfx', 'shieldbreak'); b.shieldOff = 5.5; b.stun = .8; } }
}
function updateEnemies(dt) {
  const p = G.p, list = G.enemies;
  for (const e of list) {
    if (!e.alive) continue;
    e.t += dt; e.flash -= dt; e.stun -= dt; e.exposed -= dt; e.cd -= dt;
    const fly = e.kind === 'w' || e.kind === 's', m = { fly };
    const kk = Math.max(0, 1 - dt * 8);
    if (Math.abs(e.kb.x) + Math.abs(e.kb.y) > 2) { move(e, e.kb.x * dt, e.kb.y * dt, m); e.kb.x *= kk; e.kb.y *= kk; }
    const dx = p.x - e.x, dy = p.y - e.y, d = hyp(dx, dy) || 1;
    if (e.stun > 0) continue;
    const aware = d < 8.5 * T && G.dead <= 0;
    e.face = Math.atan2(dy, dx);
    if (e.kind === 'r') {
      if (aware) move(e, dx / d * e.sp * dt, dy / d * e.sp * dt, m);
      else move(e, Math.cos(e.t * .7 + e.wob) * 20 * dt, Math.sin(e.t * .9 + e.wob) * 20 * dt, m);
    } else if (e.kind === 'g') {
      if (aware) {
        const v = d < 3.2 * T ? -1 : d > 5 * T ? 1 : 0, s = Math.sin(e.t * 1.3 + e.wob) * .7;
        move(e, (dx / d * v - dy / d * s) * e.sp * dt, (dy / d * v + dx / d * s) * e.sp * dt, m);
        if (e.cd <= 0 && losClear(e, p)) { eshot(e.x, e.y, e.face, 165, INK.orange); e.cd = 1.9; hook('sfx', 'eshot'); }
      }
    } else if (e.kind === 'w') {
      if (aware) { const a = e.face + Math.sin(e.t * 3 + e.wob) * .9; move(e, Math.cos(a) * e.sp * dt, Math.sin(a) * e.sp * dt, m); }
      else move(e, Math.cos(e.t + e.wob) * 25 * dt, Math.sin(e.t * 1.3) * 25 * dt, m);
    } else if (e.kind === 't') {
      if (aware && e.cd <= 0 && losClear(e, p)) { radial(e.x, e.y, 6, e.t, 120, INK.yellow); e.cd = 2.3; hook('sfx', 'eshot'); }
    } else if (e.kind === 's') {
      if (aware) move(e, dx / d * e.sp * dt, dy / d * e.sp * dt, m);
    }
    if (e.kind !== 't' && d < e.r + p.r - 2) hurtPlayer(1, e.x, e.y);
  }
  // separation
  for (let i = 0; i < list.length; i++) { const a = list[i]; if (!a.alive || a.kind === 't') continue;
    for (let j = i + 1; j < list.length; j++) { const b = list[j]; if (!b.alive || b.kind === 't') continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = hyp(dx, dy), md = a.r + b.r;
      if (d > 0 && d < md) { const push = (md - d) / 2 / d; move(a, -dx * push, -dy * push, { fly:a.kind === 'w' || a.kind === 's' }); move(b, dx * push, dy * push, { fly:b.kind === 'w' || b.kind === 's' }); } } }
  if (list.length > 40) G.enemies = list.filter(e => e.alive);
}
function aliveCount() { return G.enemies.filter(e => e.alive).length; }
function updateBoss(dt) {
  const b = G.boss, p = G.p; if (!b || b.dead) return;
  b.flash -= dt; b.shieldOff -= dt; b.stun -= dt;
  const dx = p.x - b.x, dy = p.y - b.y, d = hyp(dx, dy) || 1, a = Math.atan2(dy, dx);
  if (!b.active) {
    if (d < 6.5 * T) { b.active = true; banner(b.name, b.title); hook('music', 'boss'); hook('sfx', 'boss'); if (b.kind === 'kessa') say('kessa_start'); }
    return;
  }
  b.t += dt; b.st += dt;
  if (b.stun > 0 && b.kind !== 'maw') { contactBoss(b, d, 1); return; }
  const half = b.hp < b.max / 2;
  if (b.kind === 'maw') {
    if (b.state === 'idle') {
      move(b, dx / d * 38 * dt, dy / d * 38 * dt, {});
      if (half && !b.fired && b.st > .6) { for (const o of [-.35, 0, .35]) eshot(b.x, b.y, a + o, 160, INK.orange); b.fired = true; hook('sfx', 'eshot'); }
      if (b.st > 1.3) { b.state = 'wind'; b.st = 0; b.ang = a; b.fired = false; }
    } else if (b.state === 'wind') {
      b.ang = a; if (b.st > .65) { b.state = 'charge'; b.st = 0; hook('sfx', 'charge'); }
    } else if (b.state === 'charge') {
      const hit = move(b, Math.cos(b.ang) * 340 * dt, Math.sin(b.ang) * 340 * dt, {});
      if (Math.random() < .5) puff(b.x - Math.cos(b.ang) * 20, b.y - Math.sin(b.ang) * 20, INK.orange, 1, 40);
      if (hit || b.st > 1.5) {
        b.state = 'stun'; b.st = 0; G.shake = 9; hook('sfx', 'boom'); b.count++;
        if (b.count % 2 === 0 && aliveCount() < 4) { spawnNear('r', b.x, b.y); spawnNear('r', b.x, b.y); }
      }
    } else if (b.state === 'stun') { if (b.st > 1.4) { b.state = 'idle'; b.st = 0; } }
    contactBoss(b, d, b.state === 'charge' ? 2 : 1);
  } else if (b.kind === 'warden') {
    b.ang += (half ? 1.25 : .85) * dt;
    b.x = b.hx + Math.cos(b.t * .5) * 48; b.y = b.hy + Math.sin(b.t * .7) * 26;
    b.cd -= dt; if (b.cd <= 0) { radial(b.x, b.y, half ? 10 : 8, b.t, 115, INK.pink); b.cd = half ? 2.1 : 2.7; hook('sfx', 'eshot'); }
    const n = half ? 3 : 2, len = 120;
    for (let i = 0; i < n; i++) {
      const ba = b.ang + i * TAU / n, x1 = b.x + Math.cos(ba) * b.r, y1 = b.y + Math.sin(ba) * b.r, x2 = b.x + Math.cos(ba) * len, y2 = b.y + Math.sin(ba) * len;
      if (segDist(p.x, p.y, x1, y1, x2, y2) < p.r + 3) hurtPlayer(1, b.x, b.y);
    }
    contactBoss(b, d, 1);
  } else if (b.kind === 'auditor') {
    move(b, dx / d * 32 * dt, dy / d * 32 * dt, {});
    b.cd -= dt; if (b.cd <= 0) { radial(b.x, b.y, 10, b.t * .7, 110, INK.yellow); b.cd = b.shieldOff > 0 ? 2.8 : 2.1; hook('sfx', 'eshot'); }
    b.cd2 -= dt; if (b.cd2 <= 0) { if (aliveCount() < 4) { spawnNear('w', b.x, b.y); spawnNear('w', b.x, b.y); } b.cd2 = 7; }
    contactBoss(b, d, 1);
  } else if (b.kind === 'kessa') {
    if (b.state === 'idle') {
      const want = d > 90 ? 1 : d < 60 ? -1 : 0;
      move(b, (dx / d * want - dy / d * .8) * 95 * dt, (dy / d * want + dx / d * .8) * 95 * dt, {});
      if (b.st > (half ? .9 : 1.3)) { b.st = 0; if (Math.random() < .62) { b.state = 'wind'; b.ang = a; } else b.state = 'throw'; }
    } else if (b.state === 'wind') { b.ang = a; if (b.st > .35) { b.state = 'lunge'; b.st = 0; hook('sfx', 'dash'); } }
    else if (b.state === 'lunge') {
      move(b, Math.cos(b.ang) * 400 * dt, Math.sin(b.ang) * 400 * dt, {});
      G.fx.push({ k:'kghost', x:b.x, y:b.y, t:.2, max:.2 });
      if (b.st > .34) { b.state = 'recover'; b.st = 0; }
    } else if (b.state === 'recover') { if (b.st > .7) { b.state = 'idle'; b.st = 0; } }
    else if (b.state === 'throw') {
      if (b.st > .3 && !b.fired) {
        b.fired = true; hook('sfx', 'place');
        const n = half ? 3 : 2;
        for (let i = 0; i < n; i++) G.bombs.push({ x:b.x, y:b.y, tx:p.x + rnd(-40, 40), ty:p.y + rnd(-40, 40), t:1.1, owner:'e', fly:true });
      }
      if (b.st > .8) { b.state = 'idle'; b.st = 0; b.fired = false; }
    }
    contactBoss(b, d, b.state === 'lunge' ? 2 : 1);
  } else if (b.kind === 'heart') {
    b.x = b.hx; b.y = b.hy + Math.sin(b.t * 1.5) * 4;
    b.cd -= dt; if (b.cd <= 0) { G.rings.push({ kind:'wave', x:b.x, y:b.y, rad:b.r, max:360, speed:105, hit:false }); b.cd = half ? 2.3 : 3.3; hook('sfx', 'wave'); }
    b.cd2 -= dt; if (b.cd2 <= 0) { if (aliveCount() < 4) { spawnNear('s', b.x, b.y); spawnNear('s', b.x, b.y); } b.cd2 = 7.5; }
    if (half) { b.cd3 -= dt; if (b.cd3 <= 0) { radial(b.x, b.y, 8, b.t, 120, INK.teal); b.cd3 = 2.6; } }
    contactBoss(b, d, 1);
  }
}
function contactBoss(b, d, dmg) { if (d < b.r + G.p.r - 3) hurtPlayer(dmg, b.x, b.y); }
function segDist(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1, vy = y2 - y1, l = vx * vx + vy * vy; let t = l ? ((px - x1) * vx + (py - y1) * vy) / l : 0; t = clamp(t, 0, 1);
  return hyp(px - (x1 + vx * t), py - (y1 + vy * t));
}
function updateShots(dt) {
  const p = G.p;
  for (const s of G.shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (shotBlocks(tileAt(Math.floor(s.x / T), Math.floor(s.y / T)))) { s.life = 0; puff(s.x, s.y, s.from === 'p' ? INK.yellow : (s.c || INK.pink), 4, 60); continue; }
    if (s.from === 'p') {
      const a = Math.atan2(s.vy, s.vx);
      for (const e of G.enemies) if (e.alive && hyp(e.x - s.x, e.y - s.y) < e.r + s.r) { hurtEnemy(e, s.dmg, a); s.life = 0; break; }
      const b = G.boss; if (s.life > 0 && b && b.active && !b.dead && hyp(b.x - s.x, b.y - s.y) < b.r + s.r) { hurtBoss(b, s.dmg); s.life = 0; }
    } else if (hyp(p.x - s.x, p.y - s.y) < p.r + s.r - 1) { if (hurtPlayer(s.dmg, s.x, s.y)) s.life = 0; }
  }
  G.shots = G.shots.filter(s => s.life > 0);
}
function updateBombs(dt) {
  const p = G.p;
  for (const b of G.bombs) {
    b.t -= dt;
    if (b.fly) { const k = Math.min(1, dt * 4); b.x += (b.tx - b.x) * k; b.y += (b.ty - b.y) * k; }
    if (b.t > 0) continue;
    G.shake = 8; hook('sfx', 'boom');
    puff(b.x, b.y, INK.orange, 26, 200); puff(b.x, b.y, INK.yellow, 14, 120);
    G.fx.push({ k:'blast', x:b.x, y:b.y, t:.3, max:.3, r:b.owner === 'p' ? 56 : 50 });
    if (b.owner === 'p') {
      const tx0 = Math.floor((b.x - 64) / T), tx1 = Math.floor((b.x + 64) / T), ty0 = Math.floor((b.y - 64) / T), ty1 = Math.floor((b.y + 64) / T);
      let broke = false;
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++)
        if (tileAt(tx, ty) === 'C' && hyp((tx + .5) * T - b.x, (ty + .5) * T - b.y) < 58) { setTile(tx, ty, '.'); broke = true; puff((tx + .5) * T, (ty + .5) * T, G.L.z.wall, 24, 170); }
      if (broke) { hook('sfx', 'crumble'); persist(); }
      for (const e of G.enemies) if (e.alive && hyp(e.x - b.x, e.y - b.y) < 56 + e.r) hurtEnemy(e, 3, Math.atan2(e.y - b.y, e.x - b.x));
      const bo = G.boss; if (bo && bo.active && !bo.dead && hyp(bo.x - b.x, bo.y - b.y) < 56 + bo.r) hurtBoss(bo, 3);
      if (hyp(p.x - b.x, p.y - b.y) < 40) hurtPlayer(1, b.x, b.y);
    } else if (hyp(p.x - b.x, p.y - b.y) < 50) hurtPlayer(2, b.x, b.y);
  }
  G.bombs = G.bombs.filter(b => b.t > 0);
}
function updateRings(dt) {
  const p = G.p;
  for (const r of G.rings) {
    r.rad += r.speed * dt;
    if (r.kind === 'wave' && !r.hit && Math.abs(hyp(p.x - r.x, p.y - r.y) - r.rad) < 9 + p.r) { if (hurtPlayer(1, r.x, r.y)) r.hit = true; }
  }
  G.rings = G.rings.filter(r => r.rad < r.max);
}
function updatePickups(dt) {
  const p = G.p, S = G.save, id = G.L.id;
  for (const k of G.pickups) {
    k.t += dt;
    if (k.vx !== undefined) {
      move(Object.assign(k, { r:4 }), k.vx * dt, k.vy * dt, {}); const f = Math.max(0, 1 - dt * 5); k.vx *= f; k.vy *= f;
      k.life -= dt; if (k.life <= 0) k.gone = true;
      const d = hyp(p.x - k.x, p.y - k.y);
      if ((k.type === 'scrap' || (k.type === 'heart' && S.hp < S.maxhp)) && d < 70 && k.t > .4) { k.x += (p.x - k.x) / d * 220 * dt; k.y += (p.y - k.y) / d * 220 * dt; }
    }
    if (k.gone || G.dead > 0 || hyp(p.x - k.x, p.y - k.y) > p.r + 10) continue;
    const take = () => { k.gone = true; if (k.key) (S.taken[id] || (S.taken[id] = [])).push(k.key); };
    if (k.type === 'k') { take(); S.keys[id] = (S.keys[id] || 0) + 1; hook('sfx', 'key'); toast('Found a key.'); persist(); }
    else if (k.type === '$') { take(); S.scrap += 12; floatText(k.x, k.y, '+12 scrap', INK.yellow); hook('sfx', 'pickup'); persist(); }
    else if (k.type === 'h') { if (S.hp < S.maxhp) { take(); S.hp = Math.min(S.maxhp, S.hp + 4); hook('sfx', 'heal'); persist(); } }
    else if (k.type === 'scrap') { if (k.t > .3) { k.gone = true; S.scrap += 1; hook('sfx', 'pickup'); } }
    else if (k.type === 'heart') { if (S.hp < S.maxhp && k.t > .3) { k.gone = true; S.hp = Math.min(S.maxhp, S.hp + 2); hook('sfx', 'heal'); } }
    else if (k.type === 'I') {
      take(); const it = G.L.z.item;
      if (!S.items.includes(it)) { S.items.push(it); if (it !== 'phase') S.sel = selectable().indexOf(it); }
      puff(k.x, k.y, INK.yellow, 30, 160); hook('sfx', 'item'); persist(); say('item_' + it);
    }
    else if (k.type === 'shard') {
      k.gone = true; S.shards[id] = true; puff(k.x, k.y, INK.cream, 40, 200); G.shake = 10; hook('sfx', 'shard'); persist(); say('shard_' + id);
    }
  }
  G.pickups = G.pickups.filter(k => !k.gone);
}
function updateFx(dt) {
  for (const f of G.fx) { f.t -= dt; if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.k === 'dot') { f.vx *= .92; f.vy *= .92; } } }
  G.fx = G.fx.filter(f => f.t > 0);
  if (G.fx.length > 500) G.fx.splice(0, G.fx.length - 500);
}

// ---------- flow ----------
function startGame(save) {
  G.save = save || newSave();
  G.mode = 'play';
  loadZone(G.save.zone || 'hub');
  if (!G.save.flags.intro) once('intro', 'intro');
}
function travel(id) {
  loadZone(id);
  if (ZONES[id] && ['rust','reef','vault','finale'].includes(id)) once('enter_' + id, 'enter_' + id);
}
function destinations() {
  const S = G.save;
  return [
    { id:'hub', name:'Hearth Promenade', desc:'Home port. Dr. Bekele, Tamsin\'s shop, and the Lamp.', open:true, done:S.lamp },
    { id:'rust', name:'Rust Moon', desc:'Kessa Vorn\'s salvage yard. Holds the first shard.', open:true, done:!!S.shards.rust },
    { id:'reef', name:'Glass Reef', desc:'Veil territory. Lasers, gaps, and the second shard.', open:!!S.shards.rust, done:!!S.shards.reef },
    { id:'vault', name:'Counting Vaults', desc:'Thessi collateral. The third shard.', open:!!S.shards.reef, done:!!S.shards.vault },
    { id:'finale', name:'Consumed Hearth', desc:'The first port. Where the song is going.', open:S.lamp, done:S.won }
  ];
}
const SHOP = [
  { id:'pod', name:'Heart pod', desc:'One more heart of maximum health.', cost:s => 30 + s.pods * 20, ok:s => s.pods < 3 },
  { id:'patch', name:'Patch kit', desc:'Restore all health.', cost:() => 8, ok:s => s.hp < s.maxhp },
  { id:'edge', name:'Honed edge', desc:'Your blade hits twice as hard.', cost:() => 45, ok:s => s.blade < 2 },
  { id:'twin', name:'Twin bolt', desc:'Your blaster fires two bolts.', cost:() => 40, ok:s => !s.twin }
];
function buy(id) {
  const S = G.save, it = SHOP.find(i => i.id === id); if (!it || !it.ok(S)) return 'Not available.';
  const c = it.cost(S); if (S.scrap < c) return 'You need ' + (c - S.scrap) + ' more scrap.';
  S.scrap -= c;
  if (id === 'pod') { S.pods++; S.maxhp += 2; S.hp += 2; }
  else if (id === 'patch') S.hp = S.maxhp;
  else if (id === 'edge') S.blade = 2;
  else if (id === 'twin') S.twin = true;
  hook('sfx', 'item'); persist();
  return 'Bought: ' + it.name + '.';
}
