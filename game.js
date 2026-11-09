// グラビティ・キューブ browser demo (v0.9.1): the app's first-person game in three.js.
// Same room as the app's case halls (Tools/ue/gs_stages.py build_case_stage, units = cm, UE axes X fwd / Y right / Z up),
// same 8 gravity panels, same board rules (Tools/puzzle_solver5.py), same hint guide (gold panel + "seen from you").
// Rendering maps UE (x, y, z) -> three (x/100, -y/100, z/100) so the picture is not mirrored.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.gravityshift.puzzle';
const HASHTAG = 'グラビティキューブ';
// the public page to put in X posts (set after hosting; empty = this page's own address)
const SHARE_URL = '';
const W = 7, H = 6;
const DIRS = { R: [1, 0], L: [-1, 0], U: [0, 1], D: [0, -1] };
const ARROWS = { '>': 'R', '<': 'L', '^': 'U', 'v': 'D' };
const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
// The game's own size. They differ from the window while an upright phone shows the game turned 90 degrees (see updateLayout).
let turned = false, turnAllowed = true;
const viewW = () => turned ? window.innerHeight : window.innerWidth;
const viewH = () => turned ? window.innerWidth : window.innerHeight;
const pointerPos = (e) => turned ? { x: e.clientY, y: window.innerWidth - e.clientX } : { x: e.clientX, y: e.clientY };

// ------------------------------------------------------------------ text (ja / en)
const T = {
  ja: {
    sub: '重力を切り替えて解く3Dパズル　体験版（4問）',
    how: IS_TOUCH
      ? '<b>歩く</b>：画面の左半分を指でなぞる　<b>見回す</b>：右半分をなぞる<br><b>重力を変える</b>：壁・天井・床の<b style="color:#5ff0dc">青く光るパネル</b>をタップ（または狙う）→ 右下の<b>重力ボタン</b>。そのパネルの面が「床」になり、部屋ごと回ります。<br>ガラスケースの中のキューブを<b style="color:#ffcf5a">黄色い枠</b>に止めると扉が開きます。'
      : '<b>WASD</b> で歩く・<b>マウス</b>で見回す（画面をクリックで操作開始）<br><b>重力を変える</b>：壁・天井・床の<b style="color:#5ff0dc">青く光るパネル</b>を狙って<b>クリック</b>（または R キー）。そのパネルの面が「床」になり、部屋ごと回ります。<br>ガラスケースの中のキューブを<b style="color:#ffcf5a">黄色い枠</b>に止めると扉が開きます。H：ヒント　E：装置を使う　Esc：一時停止',
    play: '全60問＋EXは Google Play で',
    note: 'この体験版は4問。易しい・ちょい難・足場、逆重力のEXステージはアプリで遊べます。',
    objH: '目的', lit: '点灯', moves: (m, p) => `手数 ${m}　（最短 ${p}）`,
    focusUse: 'このパネルの面が「床」になる', focusKey: IS_TOUCH ? '右下の重力ボタンを押す' : 'クリック または R キー',
    focusFloor: '今の床', gLabel: '重力ボタン', gLabelCan: '押すと、ここが床に',
    reset: 'キューブを戻す', resetKey: IS_TOUCH ? '' : '（E キー）', resetDone: 'キューブを最初の位置に戻した',
    start: IS_TOUCH ? '左半分で歩く・右半分で見回す。青く光るパネルをタップして、右下の重力ボタン！' : 'WASD で歩き、マウスで見回す。青く光るパネルを狙ってクリック！',
    solved: '回路がつながった！ 開いた扉の先の出口へ', solvedFloor: '回路がつながった！ 床のパネルで元の向きに戻して、扉の先の出口へ',
    hint2: (p) => `最短 ${p} 手。次に使う重力パネルを、金色に光らせて案内する（1手分）。`,
    hint3: 'ここから3手分、使うパネルを順番に金色で案内する。ヒントをもう一度押すと、続きの3手も案内する。',
    guide: (w, n) => `金色に光るパネルを使おう（今のあなたから見て「${w}」）<br>ゴールまで あと ${n} 手`,
    guideOn: IS_TOUCH ? 'その金色のパネルでOK！ 右下の重力ボタンを押そう' : 'その金色のパネルでOK！ クリック（または R キー）で重力を変えよう',
    guideOff: '光っていないパネルを使った。ここからの手順で、光るパネルを出し直す',
    guideEnd: 'ヒントの案内はここまで。続きは自分で考えてみよう',
    dead: 'この状態からは解けない。「キューブを戻す」装置で、最初の位置に戻そう',
    words: { front: '正面', back: '後ろ', right: '右', left: '左', up: '上', down: '下' },
    pause: '一時停止', resume: '再開', retry: 'ステージをやり直す', menu: 'メニューへ',
    stats: (m, p) => `${m} 手でクリア（最短 ${p} 手）`,
    star: '★ 最短手数でクリア！', starNo: (p) => `最短は ${p} 手。もっと短くできる？`,
    share: 'X でポストする', next: '次の問題へ', again: 'もう一度',
    shareText: (tier, m, best) => `【グラビティ・キューブ】${tier}を${m}手でクリア！${best ? '★最短' : ''}\n重力を切り替えて解く3Dパズル、あなたは解ける？`,
    rulesTap: IS_TOUCH ? 'タップで説明' : 'Q キーで説明',
    lang: 'EN', best: (b) => `ベスト ${b} 手`, par: (p) => `最短 ${p} 手`,
  },
  en: {
    sub: 'A 3D puzzle where you switch gravity — free demo (4 puzzles)',
    how: IS_TOUCH
      ? '<b>Walk</b>: drag on the left half. <b>Look</b>: drag on the right half.<br><b>Switch gravity</b>: tap a <b style="color:#5ff0dc">glowing blue panel</b> on a wall, the ceiling or the floor, then press the <b>gravity button</b> (bottom right). That surface becomes the floor and the room rolls.<br>Stop the cubes in the glass case on the <b style="color:#ffcf5a">yellow frames</b> to open the door.'
      : '<b>WASD</b> to walk, <b>mouse</b> to look (click the screen to start).<br><b>Switch gravity</b>: aim at a <b style="color:#5ff0dc">glowing blue panel</b> and <b>click</b> (or R). That surface becomes the floor and the room rolls.<br>Stop the cubes in the glass case on the <b style="color:#ffcf5a">yellow frames</b> to open the door. H: hint, E: use, Esc: pause',
    play: 'All 60 puzzles + EX on Google Play',
    note: 'This demo has 4 puzzles. Easy, Tricky, Footholds and the reverse-gravity EX stages are in the app.',
    objH: 'GOAL', lit: 'Lit', moves: (m, p) => `Moves ${m}  (best ${p})`,
    focusUse: 'This surface becomes the floor', focusKey: IS_TOUCH ? 'Press the gravity button' : 'Click or press R',
    focusFloor: 'Current floor', gLabel: 'Gravity', gLabelCan: 'Make this the floor',
    reset: 'Reset cubes', resetKey: IS_TOUCH ? '' : '(E)', resetDone: 'Cubes are back at the start',
    start: IS_TOUCH ? 'Left half: walk. Right half: look. Tap a glowing blue panel, then the gravity button!' : 'WASD to walk, mouse to look. Aim at a glowing blue panel and click!',
    solved: 'Circuit connected! Head through the open door to the exit', solvedFloor: 'Circuit connected! Use a floor panel to stand upright, then go through the door',
    hint2: (p) => `Shortest: ${p} moves. The next gravity panel to use now glows gold (1 move).`,
    hint3: 'For the next 3 moves, the panels to use glow gold in order. Press Hint again for the next 3.',
    guide: (w, n) => `Use the panel glowing gold (from where you are now: ${w})<br>${n} moves left to the goal`,
    guideOn: IS_TOUCH ? 'That gold panel is right! Press the gravity button' : 'That gold panel is right! Click (or R) to switch gravity',
    guideOff: "You used a panel that wasn't lit. The guide works out the steps again from here.",
    guideEnd: 'The hint guide ends here. Work out the rest yourself.',
    dead: 'This position can\'t be solved. Use the "Reset cubes" console to start over.',
    words: { front: 'straight ahead', back: 'behind', right: 'right', left: 'left', up: 'up', down: 'down' },
    pause: 'Paused', resume: 'Resume', retry: 'Restart stage', menu: 'Menu',
    stats: (m, p) => `Cleared in ${m} moves (best ${p})`,
    star: '★ Perfect — fewest moves!', starNo: (p) => `The best is ${p} moves. Can you do better?`,
    share: 'Post on X', next: 'Next puzzle', again: 'Play again',
    shareText: (tier, m, best) => `GRAVITY VAULT: cleared ${tier} in ${m} moves!${best ? ' ★ perfect' : ''}\nA 3D puzzle where you switch gravity. Can you solve it?`,
    rulesTap: IS_TOUCH ? 'Tap for rules' : 'Press Q for rules',
    lang: '日本語', best: (b) => `Best ${b}`, par: (p) => `Best ${p}`,
  },
};
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* not saved */ } } };
let lang = (store.get('gc_lang') || (navigator.language || 'ja')).startsWith('ja') ? 'ja' : 'en';
const tx = () => T[lang];
const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------------ board rules (same as puzzle_solver5)
function parse(rows) {
  const b = { walls: new Set(), gates: new Set(), targets: [], switches: new Set(), stops: new Set(), oneway: new Map(), pieces0: [] };
  rows.forEach((line, r) => {
    const k = H - 1 - r;
    [...line].forEach((ch, j) => {
      const key = j + ',' + k;
      if (ch === '#') b.walls.add(key);
      else if (ch === 'g') b.gates.add(key);
      else if (ch === 'T') b.targets.push(key);
      else if (ch === 'S') b.switches.add(key);
      else if (ch === 'o') b.stops.add(key);
      else if (ARROWS[ch]) b.oneway.set(key, ARROWS[ch]);
      else if ('CHV'.includes(ch)) b.pieces0.push({ kind: ch, j, k });
    });
  });
  return b;
}
function blocked(b, j, k, d, open) {
  const key = j + ',' + k;
  if (j < 0 || j >= W || k < 0 || k >= H || b.walls.has(key)) return true;
  if (!open && b.gates.has(key)) return true;
  const ow = b.oneway.get(key);
  return ow !== undefined && ow !== d;
}
function step(b, s, d) {
  const [dj, dk] = DIRS[d];
  const order = s.p.map((_, i) => i).sort((a, c) => -(s.p[a].j * dj + s.p[a].k * dk) + (s.p[c].j * dj + s.p[c].k * dk));
  const occ = new Set(s.p.map(p => p.j + ',' + p.k));
  const out = s.p.map(p => ({ ...p }));
  for (const i of order) {
    const p = out[i];
    let { j, k } = p;
    const movable = p.kind === 'C' || (p.kind === 'H' && dk === 0) || (p.kind === 'V' && dj === 0);
    occ.delete(j + ',' + k);
    if (movable) {
      for (;;) {
        const nj = j + dj, nk = k + dk;
        if (blocked(b, nj, nk, d, s.open) || occ.has(nj + ',' + nk)) break;
        j = nj; k = nk;
        if (b.stops.has(j + ',' + k)) break;
      }
    }
    occ.add(j + ',' + k);
    p.j = j; p.k = k;
  }
  const cubes = new Set(out.filter(p => p.kind === 'C').map(p => p.j + ',' + p.k));
  const lit = new Set(s.lit);
  b.targets.forEach((t, i) => { if (cubes.has(t)) lit.add(i); });
  let open = s.open;
  for (const sw of b.switches) if (cubes.has(sw)) open = true;
  return { p: out, lit, open, g: d };
}
const isDone = (b, s) => s.lit.size === b.targets.length;
const keyOf = (s) => s.p.map(p => p.j + ',' + p.k).join('|') + '/' + [...s.lit].sort().join(',') + '/' + (s.open ? 1 : 0) + '/' + s.g;
function solveNext(b, s0) {
  if (isDone(b, s0)) return { first: null, len: 0 };
  const seen = new Set([keyOf(s0)]);
  let q = [{ s: s0, first: null, n: 0 }];
  while (q.length) {
    const nq = [];
    for (const cur of q) {
      for (const d of 'RLUD') {
        if (d === cur.s.g) continue;
        const n = step(b, cur.s, d);
        const kk = keyOf(n);
        if (seen.has(kk)) continue;
        seen.add(kk);
        const first = cur.first || d;
        if (isDone(b, n)) return { first, len: cur.n + 1 };
        if (cur.n + 1 < 30) nq.push({ s: n, first, n: cur.n + 1 });
      }
    }
    q = nq;
    if (seen.size > 300000) break;
  }
  return null;
}
// world gravity (UE axis vector) <-> board letter: board columns run along +Y, rows along +Z
const GRAV = { R: new THREE.Vector3(0, 1, 0), L: new THREE.Vector3(0, -1, 0), U: new THREE.Vector3(0, 0, 1), D: new THREE.Vector3(0, 0, -1) };

// ------------------------------------------------------------------ renderer / scene
THREE.Object3D.DEFAULT_UP.set(0, 0, 1);
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !IS_TOUCH, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(IS_TOUCH ? 1.5 : 2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = !IS_TOUCH;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fb8c8);
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 80);
const P3 = (x, y, z) => new THREE.Vector3(x / 100, -y / 100, z / 100);   // UE cm -> three m (not mirrored)
const toT = (v) => new THREE.Vector3(v.x / 100, -v.y / 100, v.z / 100);

scene.add(new THREE.HemisphereLight(0xdfeeff, 0x3a4044, 1.1));
const sun = new THREE.DirectionalLight(0xfff2e0, 2.4);
sun.position.copy(P3(-1600, 300, 1300));
sun.target.position.copy(P3(700, 700, 0));
scene.add(sun, sun.target);
if (renderer.shadowMap.enabled) {
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const c = sun.shadow.camera; c.left = -14; c.right = 14; c.top = 14; c.bottom = -14; c.near = 1; c.far = 40;
  sun.shadow.bias = -0.0006;
}
const caseLight = new THREE.PointLight(0xe8fbff, 22, 9, 1.6);
caseLight.position.copy(P3(700, 700, 690));
scene.add(caseLight);
for (const x of [200, 1200]) {
  const l = new THREE.PointLight(0xfff4e6, 10, 10, 1.6);
  l.position.copy(P3(x, 700, 760)); scene.add(l);
}

// procedural textures (no downloads)
function noiseTex(base, var_, lines, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  const img = g.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * var_;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  if (lines) { g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; g.strokeRect(1, 1, size - 2, size - 2); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const M = {
  concrete: new THREE.MeshStandardMaterial({ map: noiseTex('#b9bcbc', 26, false), roughness: 0.92 }),
  floor: new THREE.MeshStandardMaterial({ map: noiseTex('#7c8184', 30, true), roughness: 0.85 }),
  panel: new THREE.MeshStandardMaterial({ map: noiseTex('#8e9599', 12, true), roughness: 0.6, metalness: 0.25 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x3a4146, roughness: 0.55, metalness: 0.45 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x8a949a, roughness: 0.35, metalness: 0.7 }),
  block: new THREE.MeshStandardMaterial({ color: 0x4c565c, roughness: 0.6, metalness: 0.2 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xbfefff, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.1, depthWrite: false }),
  grid: new THREE.MeshBasicMaterial({ color: 0x5ff0dc, transparent: true, opacity: 0.55 }),
  gold: new THREE.MeshBasicMaterial({ color: 0xc9a23a }),
  sky: new THREE.MeshBasicMaterial({ color: 0xe9f4ff }),
  circuitOff: new THREE.MeshBasicMaterial({ color: 0x2a3a3e }),
  circuitOn: new THREE.MeshBasicMaterial({ color: 0xffcf5a }),
  goldLight: new THREE.MeshBasicMaterial({ color: 0xffd98a }),
};

// static geometry: visual boxes + axis-aligned colliders in UE cm
const colliders = [];   // {min:[x,y,z], max:[x,y,z], tag?, mesh?, on}
function boxMesh(mn, mx, mat, opts = {}) {
  const sx = (mx[0] - mn[0]) / 100, sy = (mx[1] - mn[1]) / 100, sz = (mx[2] - mn[2]) / 100;
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  m.position.copy(P3((mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2));
  if (mat.map) {   // keep the texture at roughly 1 m per tile
    const s = Math.max(sx, sy, sz), uv = m.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * s, uv.getY(i) * s);
  }
  m.castShadow = opts.shadow !== false && renderer.shadowMap.enabled;
  m.receiveShadow = renderer.shadowMap.enabled;
  (opts.parent || scene).add(m);
  return m;
}
function solid(mn, mx, mat, opts = {}) {
  const m = mat ? boxMesh(mn, mx, mat, opts) : null;
  const c = { min: mn, max: mx, tag: opts.tag, mesh: m, on: true };
  colliders.push(c);
  return c;
}
const X1 = 1400, Y1 = 1400, Z1 = 800;
// shell
solid([0, 0, -40], [X1, Y1, 0], M.floor);
solid([0, 0, Z1], [X1, Y1, Z1 + 40], M.concrete);
solid([0, -40, 0], [X1, 0, Z1], M.concrete);
solid([0, Y1, 0], [X1, Y1 + 40, Z1], M.concrete);
// -X wall with the big window (200..1200 x 150..650)
solid([-40, 0, 0], [0, Y1, 150], M.concrete);
solid([-40, 0, 650], [0, Y1, Z1], M.concrete);
solid([-40, 0, 150], [0, 200, 650], M.concrete);
solid([-40, 1200, 150], [0, Y1, 650], M.concrete);
solid([-30, 200, 150], [-10, 1200, 650], null);   // window glass: blocks the player
boxMesh([-400, 100, 50], [-380, 1300, 750], M.sky, { shadow: false });
for (let y = 200; y <= 1200; y += 250) boxMesh([-40, y - 8, 150], [-20, y + 8, 650], M.dark);
boxMesh([-40, 200, 395], [-20, 1200, 405], M.dark);
// +X wall with the door hole (610..790 x 0..230)
solid([X1, 0, 0], [X1 + 40, 610, Z1], M.concrete);
solid([X1, 790, 0], [X1 + 40, Y1, Z1], M.concrete);
solid([X1, 610, 230], [X1 + 40, 790, Z1], M.concrete);
// structure
for (const x of [150, 1250]) {
  solid([x - 30, 0, 0], [x + 30, 40, Z1], M.dark);
  solid([x - 30, Y1 - 40, 0], [x + 30, Y1, Z1], M.dark);
  solid([x - 25, 0, 774], [x + 25, Y1, Z1], M.concrete);
}
boxMesh([0, 0, 0], [X1, 6, 260], M.panel, { shadow: false });
boxMesh([0, Y1 - 6, 0], [X1, Y1, 260], M.panel, { shadow: false });
// apparatus (glass case on a base, posts, head to the ceiling)
solid([520, 220, 0], [880, 1180, 40], M.dark);
solid([560, 260, 40], [840, 1140, 100], M.panel);
for (const [x0, y0] of [[560, 260], [800, 260], [560, 1100], [800, 1100]]) solid([x0, y0, 100], [x0 + 40, y0 + 40, Z1], M.metal);
solid([600, 300, 700], [800, 1100, 740], M.dark);
solid([580, 280, 740], [820, 1120, Z1], M.panel);
solid([600, 300, 100], [800, 350, 700], M.dark);
solid([600, 1050, 100], [800, 1100, 700], M.dark);
solid([640, 350, 100], [650, 1050, 700], M.glass, { shadow: false });
solid([750, 350, 100], [760, 1050, 700], M.glass, { shadow: false });
for (const xa of [630, 760]) { boxMesh([xa, 350, 100], [xa + 10, 1050, 112], M.metal); boxMesh([xa, 350, 688], [xa + 10, 1050, 700], M.metal); }
for (let j = 1; j < 7; j++) boxMesh([637, 350 + 100 * j - 0.6, 112], [639, 350 + 100 * j + 0.6, 688], M.grid, { shadow: false });
for (let k = 1; k < 6; k++) boxMesh([637, 350, 100 + 100 * k - 0.6], [639, 1050, 100 + 100 * k + 0.6], M.grid, { shadow: false });
// door, surround, corridor, exit light
solid([1340, 540, 0], [1400, 610, 300], M.panel);
solid([1340, 790, 0], [1400, 860, 300], M.panel);
solid([1342, 610, 230], [1400, 790, 298], M.panel);
const door = solid([1400, 610, 0], [1440, 790, 230], M.metal, { tag: 'door' });
solid([1440, 520, -40], [2240, 880, 0], M.floor);
solid([1440, 520, 300], [2240, 880, 340], M.concrete);
solid([1440, 520, 0], [2240, 560, 300], M.panel);
solid([1440, 840, 0], [2240, 880, 300], M.panel);
solid([2200, 560, 0], [2240, 840, 300], M.concrete);
boxMesh([2196, 600, 40], [2200, 800, 260], M.goldLight, { shadow: false });
const exitLight = new THREE.PointLight(0xffd9a0, 8, 8, 1.5); exitLight.position.copy(P3(2100, 700, 200)); scene.add(exitLight);
// circuit from the case to the door (lights gold when every frame is lit)
boxMesh([820, 490, 770], [1400, 510, 790], M.dark);
boxMesh([1380, 490, 240], [1400, 510, 770], M.dark);
const circuit = [[[626, 395, 702], [630, 1105, 738]], [[820, 495, 742], [824, 505, 770]], [[824, 495, 768], [1380, 505, 770]],
  [[1378, 495, 240], [1380, 505, 770]], [[1398, 505, 240], [1400, 700, 246]]].map(([a, b]) => boxMesh(a, b, M.circuitOff, { shadow: false }));
// reset console ("キューブを戻す")
solid([300, 390, 0], [360, 450, 100], M.dark, { tag: 'console' });
const consoleTop = boxMesh([304, 394, 100], [356, 446, 104], new THREE.MeshBasicMaterial({ color: 0x5ff0dc }), { shadow: false });

// gravity panels (same names and places as the app)
function glyphTex(draw) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); draw(g);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const panelTex = glyphTex((g) => {
  const grd = g.createRadialGradient(64, 64, 10, 64, 64, 80);
  grd.addColorStop(0, 'rgba(255,255,255,0.55)'); grd.addColorStop(1, 'rgba(255,255,255,0.28)');
  g.fillStyle = grd; g.fillRect(6, 6, 116, 116);
  g.strokeStyle = '#fff'; g.lineWidth = 7; g.strokeRect(10, 10, 108, 108);
  g.lineWidth = 6; g.beginPath(); g.moveTo(64, 30); g.lineTo(64, 82); g.stroke();
  g.beginPath(); g.moveTo(44, 64); g.lineTo(64, 86); g.lineTo(84, 64); g.stroke();
  g.fillStyle = '#fff'; g.fillRect(36, 94, 56, 6);
});
const PANELS = [
  ['P_Right_A', [350, Y1 - 6, 170], [0, -1, 0]], ['P_Right_B', [1050, Y1 - 6, 170], [0, -1, 0]],
  ['P_Left_A', [350, 6, 170], [0, 1, 0]], ['P_Left_B', [1050, 6, 170], [0, 1, 0]],
  ['P_Ceil_A', [350, 700, Z1], [0, 0, -1]], ['P_Ceil_B', [1050, 700, Z1], [0, 0, -1]],
  ['P_Floor_A', [300, 1050, 0], [0, 0, 1]], ['P_Floor_B', [1100, 350, 0], [0, 0, 1]],
].map(([name, loc, n]) => {
  const normal = new THREE.Vector3(...n);
  const grav = normal.clone().negate();
  const letter = Object.keys(GRAV).find(k => GRAV[k].equals(grav));
  const mat = new THREE.MeshBasicMaterial({ map: panelTex, color: 0x5ff0dc, transparent: true });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), mat);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 1.42), new THREE.MeshStandardMaterial({ color: 0x1b2427, roughness: 0.5, metalness: 0.4 }));
  const pos = new THREE.Vector3(...loc).addScaledVector(normal, 2);
  plate.position.copy(toT(pos.clone().addScaledVector(normal, 0.6)));
  back.position.copy(toT(pos));
  const nT = toT(normal).normalize();
  for (const m of [plate, back]) { m.lookAt(m.position.clone().add(nT)); scene.add(m); }
  const half = [65, 65, 65]; half[[0, 1, 2].find(i => n[i] !== 0)] = 3;
  return { name, pos, normal, grav, letter, mat, mesh: plate, min: pos.toArray().map((v, i) => v - half[i]), max: pos.toArray().map((v, i) => v + half[i]), hint: false };
});

// ------------------------------------------------------------------ case contents (built per stage)
let level = null;
const cellC = (j, k) => new THREE.Vector3(700, 400 + 100 * j, 150 + 100 * k);
function letterTex(ch, color) { return glyphTex((g) => { g.fillStyle = color; g.font = 'bold 86px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 70); }); }
const ringTex = glyphTex((g) => { g.strokeStyle = '#a04dff'; g.lineWidth = 10; g.beginPath(); g.arc(64, 64, 40, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(64, 64, 14, 0, Math.PI * 2); g.fillStyle = '#a04dff'; g.fill(); });
const chevTex = glyphTex((g) => { g.strokeStyle = '#5dff6a'; g.lineWidth = 11; g.lineCap = 'round'; g.lineJoin = 'round'; for (const y of [34, 64, 94]) { g.beginPath(); g.moveTo(34, y + 16); g.lineTo(64, y - 10); g.lineTo(94, y + 16); g.stroke(); } });
const chevDir = { U: [0, 0, 1], D: [0, 0, -1], R: [0, 1, 0], L: [0, -1, 0] };
function paneGlyph(group, j, k, tex, size, upUE) {
  // a plane on both glass panes, facing out, its texture "up" along upUE (a UE vector; +Z by default)
  const c = cellC(j, k);
  for (const [x, nx] of [[624, -1], [767, 1]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size / 100, size / 100), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.position.copy(P3(x, c.y, c.z));
    const zAxis = toT(new THREE.Vector3(nx, 0, 0)).normalize();
    const yAxis = toT(new THREE.Vector3(...(upUE || [0, 0, 1]))).normalize();
    const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));
    group.add(m);
  }
}
function buildLevel(stage) {
  if (level) scene.remove(level.group);
  const b = parse(stage.rows);
  const group = new THREE.Group();
  for (const key of b.walls) {
    const [j, k] = key.split(',').map(Number);
    boxMesh([650, 350 + 100 * j, 100 + 100 * k], [750, 450 + 100 * j, 200 + 100 * k], M.block, { parent: group });
  }
  for (const key of b.stops) { const [j, k] = key.split(',').map(Number); paneGlyph(group, j, k, ringTex, 70); }
  // gold rail lines on both panes along the row (H) or column (V) of each rail box, as in the app
  const railMat = new THREE.MeshBasicMaterial({ color: 0xd9a441 });
  for (const p of b.pieces0) {
    for (const xa of [626, 770]) {
      if (p.kind === 'H') for (const zz of [100 + 100 * p.k + 2, 200 + 100 * p.k - 6]) boxMesh([xa, 350, zz], [xa + 4, 1050, zz + 4], railMat, { parent: group, shadow: false });
      if (p.kind === 'V') for (const yy of [350 + 100 * p.j + 2, 450 + 100 * p.j - 6]) boxMesh([xa, yy, 112], [xa + 4, yy + 4, 688], railMat, { parent: group, shadow: false });
    }
  }
  for (const [key, d] of b.oneway) { const [j, k] = key.split(',').map(Number); paneGlyph(group, j, k, chevTex, 70, chevDir[d]); }
  const targetMats = [];
  b.targets.forEach((key, i) => {
    const [j, k] = key.split(',').map(Number);
    const mat = M.gold.clone(); targetMats.push(mat);
    const y0 = 350 + 100 * j, z0 = 100 + 100 * k;
    for (const xa of [627, 761]) {
      boxMesh([xa, y0, z0], [xa + 2, y0 + 100, z0 + 4], mat, { parent: group, shadow: false });
      boxMesh([xa, y0, z0 + 96], [xa + 2, y0 + 100, z0 + 100], mat, { parent: group, shadow: false });
      boxMesh([xa, y0, z0 + 4], [xa + 2, y0 + 4, z0 + 96], mat, { parent: group, shadow: false });
      boxMesh([xa, y0 + 96, z0 + 4], [xa + 2, y0 + 100, z0 + 96], mat, { parent: group, shadow: false });
    }
    paneGlyph(group, j, k, letterTex('ABCD'[i], '#ffcf5a'), 34);
  });
  for (const key of b.switches) { const [j, k] = key.split(',').map(Number); paneGlyph(group, j, k, letterTex('S', '#5ff0dc'), 50); }
  const gateMeshes = [...b.gates].map(key => {
    const [j, k] = key.split(',').map(Number);
    return boxMesh([652, 352 + 100 * j, 102 + 100 * k], [748, 448 + 100 * j, 198 + 100 * k], new THREE.MeshBasicMaterial({ color: 0x5ff0dc, transparent: true, opacity: 0.35 }), { parent: group, shadow: false });
  });
  const pieceMeshes = b.pieces0.map(p => {
    let m;
    if (p.kind === 'C') {
      m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshStandardMaterial({ color: 0x0b2a2c, emissive: 0x2fb8a8, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.6 }));
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0xd8fffa })));
    } else {
      m = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.92, 0.92), new THREE.MeshStandardMaterial({ color: 0x6b4a1a, emissive: 0xffb84d, emissiveIntensity: 0.55, roughness: 0.5 }));
      m.add(new THREE.Mesh(new THREE.BoxGeometry(0.94, p.kind === 'H' ? 0.7 : 0.12, p.kind === 'H' ? 0.12 : 0.7), new THREE.MeshBasicMaterial({ color: 0xffe0a0 })));
    }
    m.castShadow = renderer.shadowMap.enabled;
    m.position.copy(toT(cellC(p.j, p.k)));
    group.add(m);
    return m;
  });
  scene.add(group);
  level = { b, group, pieceMeshes, targetMats, gateMeshes, stage };
}

// ------------------------------------------------------------------ player (axis-aligned box, gravity along an axis)
const player = {
  pos: new THREE.Vector3(200, 700, 92), vel: 0, onGround: false,
  frame: new THREE.Quaternion(), frameFrom: new THREE.Quaternion(), frameTo: new THREE.Quaternion(), rotT: 1,
  yaw: 0, pitch: -0.08, small: false,
};
let gravity = 'D';
const upVec = () => GRAV[gravity].clone().negate();
const axisOf = (v) => (Math.abs(v.x) > 0.5 ? 0 : Math.abs(v.y) > 0.5 ? 1 : 2);
function halfExt() {
  const h = [30, 30, 30];
  if (!player.small) h[axisOf(upVec())] = 86;
  return h;
}
function overlaps(pos, h) {
  for (const c of colliders) {
    if (!c.on) continue;
    if (pos.x + h[0] > c.min[0] && pos.x - h[0] < c.max[0] && pos.y + h[1] > c.min[1] && pos.y - h[1] < c.max[1] && pos.z + h[2] > c.min[2] && pos.z - h[2] < c.max[2]) return c;
  }
  return null;
}
function moveAxis(axis, delta) {
  // sub-stepped so a fast fall never tunnels through a 40 cm wall
  const h = halfExt();
  let left = delta;
  while (Math.abs(left) > 1e-4) {
    const d = Math.sign(left) * Math.min(Math.abs(left), 12);
    left -= d;
    const p = player.pos.clone(); p.setComponent(axis, p.getComponent(axis) + d);
    const c = overlaps(p, h);
    if (c) {
      player.pos.setComponent(axis, d > 0 ? c.min[axis] - h[axis] - 0.01 : c.max[axis] + h[axis] + 0.01);
      return true;
    }
    player.pos.copy(p);
  }
  return false;
}
function frameAxes(q = player.frame) {
  return { A: new THREE.Vector3(1, 0, 0).applyQuaternion(q), B: new THREE.Vector3(0, 1, 0).applyQuaternion(q), U: new THREE.Vector3(0, 0, 1).applyQuaternion(q) };
}
function viewDir() {
  const { A, B, U } = frameAxes();
  const fwd = A.clone().multiplyScalar(Math.cos(player.yaw)).addScaledVector(B, Math.sin(player.yaw));
  return { fwd, dir: fwd.clone().multiplyScalar(Math.cos(player.pitch)).addScaledVector(U, Math.sin(player.pitch)),
           up: U.clone().multiplyScalar(Math.cos(player.pitch)).addScaledVector(fwd, -Math.sin(player.pitch)),
           right: A.clone().multiplyScalar(-Math.sin(player.yaw)).addScaledVector(B, Math.cos(player.yaw)), U };
}
function eyePos() {
  const { U } = frameAxes();
  return player.pos.clone().addScaledVector(U, player.small ? 18 : 64);
}

// ------------------------------------------------------------------ input
const input = { keys: new Set(), stick: null, stickId: null, lookId: null, lookLast: null, taps: new Map() };
const keyMove = () => {
  const k = input.keys;
  return [(k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0), (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0)];
};
let locked = false, autoAim = null;
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  input.keys.add(k);
  if (!playing()) return;
  if (k === 'r') tryGravity();
  else if (k === 'e') tryInteract();
  else if (k === 'h') requestHint();
  else if (k === 'q') showRules();
});
window.addEventListener('keyup', (e) => input.keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => input.keys.clear());
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (!locked && playing() && !IS_TOUCH && !noLock) openPause();
});
let noLock = false, mouseDown = null;
document.addEventListener('pointerlockerror', () => { noLock = true; });
function askLock() {
  if (noLock || !canvas.requestPointerLock) { noLock = true; return; }
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { noLock = true; }); } catch (e) { noLock = true; }
}
document.addEventListener('mousemove', (e) => {
  if (!playing() || IS_TOUCH) return;
  if (locked) { look(e.movementX * 0.0022, -e.movementY * 0.0022); return; }
  if (mouseDown && (e.buttons & 1)) {   // no pointer lock here: drag to look
    mouseDown.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
    look(e.movementX * 0.0045, -e.movementY * 0.0045);
  }
});
canvas.addEventListener('mousedown', (e) => {
  if (IS_TOUCH || !playing()) return;
  if (locked) { if (e.button === 0 || e.button === 2) tryGravity(); return; }
  mouseDown = { moved: 0 };
});
canvas.addEventListener('mouseup', () => {
  if (IS_TOUCH || !playing() || locked || !mouseDown) return;
  const click = mouseDown.moved < 6; mouseDown = null;
  if (!click) return;
  if (!noLock) askLock(); else tryGravity();
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
function look(dyaw, dpitch) {
  player.yaw += dyaw;
  player.pitch = THREE.MathUtils.clamp(player.pitch + dpitch, -1.5, 1.5);
  autoAim = null;
}
// touch: left 42% = floating stick, right = look; a short tap on a panel turns the view to it (like the app)
canvas.addEventListener('pointerdown', (e) => {
  if (!IS_TOUCH || !playing()) return;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  const p = pointerPos(e);
  input.taps.set(e.pointerId, { x: p.x, y: p.y, t: performance.now(), moved: 0 });
  if (p.x < viewW() * 0.42 && input.stickId === null) {
    input.stickId = e.pointerId; input.stick = { ox: p.x, oy: p.y, x: p.x, y: p.y };
    $('stick').style.display = $('knob').style.display = 'block';
    $('stick').style.left = p.x + 'px'; $('stick').style.top = p.y + 'px';
    $('knob').style.left = p.x + 'px'; $('knob').style.top = p.y + 'px';
  } else if (input.lookId === null) { input.lookId = e.pointerId; input.lookLast = { x: p.x, y: p.y }; }
});
canvas.addEventListener('pointermove', (e) => {
  if (!IS_TOUCH) return;
  const p = pointerPos(e);
  const tp = input.taps.get(e.pointerId);
  if (tp) tp.moved = Math.max(tp.moved, Math.hypot(p.x - tp.x, p.y - tp.y));
  if (e.pointerId === input.stickId) {
    const st = input.stick, dx = p.x - st.ox, dy = p.y - st.oy, len = Math.hypot(dx, dy), m = Math.min(len, 60) / (len || 1);
    st.x = st.ox + dx * m; st.y = st.oy + dy * m;
    $('knob').style.left = st.x + 'px'; $('knob').style.top = st.y + 'px';
  } else if (e.pointerId === input.lookId) {
    const dx = p.x - input.lookLast.x, dy = p.y - input.lookLast.y;
    input.lookLast = { x: p.x, y: p.y };
    look(dx * 0.0055, -dy * 0.0055);
  }
});
function endPointer(e) {
  const tp = input.taps.get(e.pointerId); input.taps.delete(e.pointerId);
  if (e.pointerId === input.stickId) { input.stickId = null; input.stick = null; $('stick').style.display = $('knob').style.display = 'none'; }
  if (e.pointerId === input.lookId) input.lookId = null;
  if (tp && tp.moved < 16 && performance.now() - tp.t < 350) { const p = pointerPos(e); bannerT = Math.min(bannerT, 0.4); tapAt(p.x, p.y); }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
const raycaster = new THREE.Raycaster();
function tapAt(x, y) {
  const ndc = new THREE.Vector2((x / viewW()) * 2 - 1, -(y / viewH()) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(PANELS.map(p => p.mesh))[0];
  if (!hit) return;
  const p = PANELS.find(pp => pp.mesh === hit.object);
  if (p) { autoAim = p; flash(tx().focusKey); }
}
$('gbtn').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); tryGravity(); });
$('ctx').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); tryInteract(); });
$('bHint').onclick = () => requestHint();
$('obj').onclick = () => showRules();
$('bPause').onclick = () => openPause();

// ------------------------------------------------------------------ focus (crosshair trace, like the app)
let focus = null;   // { kind: 'panel', panel } | { kind: 'console' }
function rayBox(o, d, mn, mx) {
  let t0 = 0, t1 = 1e9;
  for (let i = 0; i < 3; i++) {
    const oi = o.getComponent(i), di = d.getComponent(i);
    if (Math.abs(di) < 1e-9) { if (oi < mn[i] || oi > mx[i]) return null; continue; }
    let a = (mn[i] - oi) / di, b = (mx[i] - oi) / di;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b);
    if (t0 > t1) return null;
  }
  return t0;
}
function updateFocus() {
  const o = eyePos(), d = viewDir().dir;
  let best = null, bestT = 3000;
  for (const c of colliders) {
    if (!c.on) continue;
    const t = rayBox(o, d, c.min, c.max);
    if (t !== null && t < bestT) { bestT = t; best = c.tag === 'console' && t < 350 ? { kind: 'console' } : null; }
  }
  for (const p of PANELS) {
    const t = rayBox(o, d, p.min, p.max);
    if (t !== null && t <= bestT + 5) { bestT = t; best = { kind: 'panel', panel: p }; }
  }
  focus = best;
}
const canSwitch = () => !!focus && focus.kind === 'panel' && focus.panel.letter !== gravity && player.rotT >= 1 && !cubesBusy();

// ------------------------------------------------------------------ game state
let stageIdx = 0, state = null, moves = 0, solved = false, clearShown = false, anims = [], animDelay = 0, pending = null, doorOpen = 0;
let hintLevel = 0, guideLeft = 0, guideDir = null, guideRemaining = 0, guideKey = '', guideDead = false;
let bannerT = 0, msgT = 0, hintT = 0, startGuideT = 0, pulsePanel = null, pulseT = 0;
let save = {}; try { save = JSON.parse(store.get('gc_demo3d') || '{}') || {}; } catch (e) { save = {}; }
const playing = () => state !== null && $('menu').classList.contains('hide') && $('pause').classList.contains('hide') && !clearShown;
const cubesBusy = () => pending !== null;

function startStage(i) {
  stageIdx = i;
  const st = STAGES[i];
  buildLevel(st);
  gravity = 'D'; moves = 0; solved = false; clearShown = false; doorOpen = 0; door.on = true; door.mesh.position.copy(P3(1420, 700, 115));
  circuit.forEach(m => { m.material = M.circuitOff; });
  player.pos.set(200, 700, 92); player.vel = 0; player.frame.identity(); player.rotT = 1; player.yaw = 0; player.pitch = -0.08; player.small = false; autoAim = null;
  hintLevel = 0; guideLeft = 0; guideDir = null; guideDead = false; guideKey = ''; setGuidePanels(null);
  state = { p: level.b.pieces0.map(p => ({ ...p })), lit: new Set(), open: false, g: 'D' };
  startSlide('D', 0.2);
  $('game').classList.remove('hidden');
  ['menu', 'pause', 'clear'].forEach(id => $(id).classList.add('hide'));
  $('gbtn').style.display = $('glabel').style.display = IS_TOUCH ? 'block' : 'none';
  $('bnN').textContent = `${st.tier[lang]}　${i + 1} / ${STAGES.length}`;
  $('bnT').textContent = st.title[lang];
  $('bnO').textContent = st.obj[lang];
  $('bnR').textContent = st.rule[lang];
  bannerT = 15;   // the rules stay until the first gravity change, a tap or this time
  startGuideT = save.seenTutorial ? 0 : 16;
  hintT = 0; $('hint').style.opacity = 0;
  if (!IS_TOUCH && !locked) askLock();
  updateObjective();
}
function startSlide(d, delay) {
  const before = state.p.map(p => ({ ...p }));
  const next = step(level.b, state, d);
  anims = next.p.map((p, i) => {
    const dist = Math.abs(p.j - before[i].j) + Math.abs(p.k - before[i].k);
    return { i, from: cellC(before[i].j, before[i].k), to: cellC(p.j, p.k), dur: dist ? 0.15 + 0.085 * dist : 0, t: 0 };
  });
  animDelay = delay; pending = next;
}
function tryGravity() {
  if (!playing() || !canSwitch()) return;
  const p = focus.panel;
  const oldUp = upVec();
  gravity = p.letter;
  bannerT = Math.min(bannerT, 0.4);
  if (!solved) moves++;   // the move back to the floor after solving is not part of the puzzle
  save.seenTutorial = true; store.set('gc_demo3d', JSON.stringify(save));
  startGuideT = 0;
  // hint guide bookkeeping: a guided move, or a different panel (then it is solved again from there)
  if (guideLeft > 0 && guideDir) {
    if (gravity === guideDir) guideLeft--; else flash(tx().guideOff, 3.2);
    if (guideLeft <= 0) flash(tx().guideEnd, 3.2);
  }
  guideDir = null; guideKey = ''; setGuidePanels(null);
  // roll the player's frame so the new floor is down (shortest roll; a 180 flip rolls around where you look)
  const newUp = upVec();
  const q = new THREE.Quaternion();
  if (oldUp.dot(newUp) < -0.99) q.setFromAxisAngle(viewDir().fwd.normalize(), Math.PI);
  else q.setFromUnitVectors(oldUp, newUp);
  player.frameFrom.copy(player.frame);
  player.frameTo.copy(q.multiply(player.frame));
  player.rotT = 0; player.small = true; player.vel = 0; player.onGround = false;
  startSlide(gravity, 0.35);
  pulsePanel = p; pulseT = 0.5;
  updateObjective();
  vibrate(15);
}
function tryInteract() {
  if (!playing() || !focus || focus.kind !== 'console' || cubesBusy()) return;
  // "キューブを戻す": pieces back to the start, then the current gravity settles them (lit frames stay lit, like the app)
  state = { p: level.b.pieces0.map(p => ({ ...p })), lit: new Set(state.lit), open: false, g: gravity };
  level.pieceMeshes.forEach((m, i) => m.position.copy(toT(cellC(state.p[i].j, state.p[i].k))));
  startSlide(gravity, 0.25);
  guideKey = '';
  flash(tx().resetDone);
}
function finishSlide() {
  state = pending; pending = null;
  level.targetMats.forEach((m, i) => m.color.setHex(state.lit.has(i) ? 0xffd34d : 0xc9a23a));
  level.gateMeshes.forEach(m => { m.visible = !state.open; });
  updateObjective();
  if (!solved && isDone(level.b, state)) {
    solved = true;
    circuit.forEach((m, i) => setTimeout(() => { m.material = M.circuitOn; }, 250 * i));
    setTimeout(() => { doorOpen = 0.0001; door.on = false; }, 1300);
    flash(gravity === 'D' ? tx().solved : tx().solvedFloor, 5);
    guideLeft = 0; setGuidePanels(null);
    vibrate([20, 40, 20]);
  }
}
function vibrate(p) { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(p); } catch (e) { /* no vibration */ } }

// ------------------------------------------------------------------ hints (same as the app: text, then gold panels)
function requestHint() {
  if (!state || solved) return;
  const st = STAGES[stageIdx];
  hintLevel = Math.min(3, hintLevel + 1);
  $('hintH').textContent = `HINT  ${hintLevel} / 3`;
  $('hintT').textContent = hintLevel === 1 ? st.h1[lang] : hintLevel === 2 ? tx().hint2(st.par) : tx().hint3;
  $('hint').style.opacity = 1; hintT = 9;
  bannerT = Math.min(bannerT, 0.4); msgT = 0; $('msg').style.opacity = 0;   // one text at a time, as in the app
  if (hintLevel >= 2) { guideLeft = hintLevel >= 3 ? 3 : 1; guideKey = ''; guideDir = null; guideDead = false; }
}
function setGuidePanels(letter) { PANELS.forEach(p => { p.hint = !!letter && p.letter === letter; }); }
let guideText = null;
function setGuide(html, gold) {
  if (!html && startGuideT > 0) { html = tx().start; gold = false; }
  if (html === guideText) return;
  guideText = html;
  $('guide').innerHTML = html;
  $('guide').classList.toggle('gold', !!gold);
  $('guide').style.opacity = html ? 1 : 0;
}
function updateGuide() {
  if (guideLeft <= 0 || solved) { setGuide(''); return; }
  if (!cubesBusy() && player.rotT >= 1) {
    const s = { ...state, g: gravity };
    const k = keyOf(s);
    if (k !== guideKey) {
      guideKey = k;
      const r = solveNext(level.b, s);
      guideDead = !r;
      guideDir = r && r.first ? r.first : null;
      guideRemaining = r ? r.len : 0;
      setGuidePanels(guideDir);
    }
  }
  if (guideDead) { setGuide(tx().dead, true); return; }
  if (!guideDir) { setGuide(''); return; }
  if (focus && focus.kind === 'panel' && focus.panel.letter === guideDir) { setGuide(tx().guideOn, true); return; }
  const eye = eyePos();
  const cand = PANELS.filter(p => p.letter === guideDir).sort((a, b) => a.pos.distanceTo(eye) - b.pos.distanceTo(eye))[0];
  const v = cand.pos.clone().sub(eye).normalize(), vd = viewDir();
  const F = v.dot(vd.dir), R = v.dot(vd.right), U = v.dot(vd.up), w = tx().words;
  const word = F > 0.8 ? w.front : (F < -0.3 && Math.abs(R) < 0.6 && Math.abs(U) < 0.6) ? w.back : Math.abs(R) >= Math.abs(U) ? (R > 0 ? w.right : w.left) : (U > 0 ? w.up : w.down);
  setGuide(tx().guide(word, guideRemaining), true);
}

// ------------------------------------------------------------------ HUD
// The goal + rules card again (tap the goal box, or Q on a PC).
function showRules() {
  if (!playing()) return;
  bannerT = 15; msgT = 0; $('msg').style.opacity = 0; hintT = 0; $('hint').style.opacity = 0;
}
function flash(text, secs = 2.6) { bannerT = Math.min(bannerT, 0.4); $('msg').textContent = text; $('msg').style.opacity = 1; msgT = secs; }
function updateObjective() {
  if (!level) return;
  const st = STAGES[stageIdx], t = tx();
  $('objH').textContent = t.objH;
  $('objT').textContent = st.obj[lang];
  $('objTap').textContent = t.rulesTap;
  const lits = level.b.targets.map((_, i) => `${'ABCD'[i]} ${state && state.lit.has(i) ? '●' : '○'}`).join('  ');
  $('objP').innerHTML = `${t.lit}  ${lits}   ${state ? state.lit.size : 0} / ${level.b.targets.length}<br>${t.moves(moves, st.par)}`;
}
function updateHud(dt) {
  const t = tx();
  const pf = focus && focus.kind === 'panel' ? focus.panel : null;
  const can = canSwitch();
  $('ring').style.opacity = pf ? 1 : 0;
  $('ring').classList.toggle('gold', !!(pf && pf.hint));
  let f = '';
  if (pf) f = pf.letter === gravity ? `<small>${t.focusFloor}</small>` : `${t.focusUse}<small>${t.focusKey}</small>`;
  else if (focus && focus.kind === 'console') f = `${t.reset}<small>${t.resetKey}</small>`;
  if ($('focus').innerHTML !== f) $('focus').innerHTML = f;
  if (IS_TOUCH) {
    $('gbtn').classList.toggle('can', can);
    $('gbtn').classList.toggle('hintc', !!(can && pf && pf.hint));
    $('glabel').textContent = can ? t.gLabelCan : t.gLabel;
    $('ctx').style.display = focus && focus.kind === 'console' ? 'block' : 'none';
    $('guide').style.visibility = IS_TOUCH && focus && focus.kind === 'console' ? 'hidden' : '';
    $('ctx').textContent = t.reset;
  }
  if (bannerT > 0) { bannerT -= dt; $('banner').style.opacity = Math.max(0, Math.min(1, bannerT / 0.6)); }
  $('obj').style.opacity = bannerT > 0.2 ? 0 : 1;
  if (msgT > 0) { msgT -= dt; $('msg').style.opacity = Math.max(0, Math.min(1, msgT / 0.5)); }
  if (hintT > 0) {
    const msgOn = msgT > 0;   // a short message takes the hint's place for a moment
    if (!msgOn) hintT -= dt;
    $('hint').style.opacity = msgOn ? 0 : Math.max(0, Math.min(1, hintT / 0.6));
    $('hint').style.top = viewW() < 760 && viewH() > viewW() ? ($('obj').getBoundingClientRect().bottom + 8) + 'px' : '';   // narrow screens: below the goal box
  }
  if (startGuideT > 0) startGuideT -= dt;
  updateGuide();
}

// ------------------------------------------------------------------ simulation
function updatePlayer(dt) {
  if (player.rotT < 1) {
    player.rotT = Math.min(1, player.rotT + dt / 0.8);
    const e = player.rotT < 0.5 ? 2 * player.rotT ** 2 : 1 - (-2 * player.rotT + 2) ** 2 / 2;
    player.frame.slerpQuaternions(player.frameFrom, player.frameTo, e);
  }
  if (autoAim) {
    const { A, B, U } = frameAxes();
    const d = autoAim.pos.clone().sub(eyePos());
    const ty = Math.atan2(d.dot(B), d.dot(A)), tp = Math.atan2(d.dot(U), Math.hypot(d.dot(A), d.dot(B)));
    let dy = ty - player.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    const k = Math.min(1, dt * 9);
    player.yaw += dy * k; player.pitch += (tp - player.pitch) * k;
    if (Math.abs(dy) < 0.01 && Math.abs(tp - player.pitch) < 0.01) autoAim = null;
  }
  // stand up again (tall box) once the roll is over and there is room
  if (player.small && player.rotT >= 1) {
    const U = upVec(), ax = axisOf(U), s = Math.sign(U.getComponent(ax));
    const test = player.pos.clone(); test.setComponent(ax, test.getComponent(ax) + s * 56);
    const h = [30, 30, 30]; h[ax] = 86;
    if (!overlaps(test, h)) { player.pos.copy(test); player.small = false; }
  }
  let [f, r] = keyMove();
  if (input.stick) { r = (input.stick.x - input.stick.ox) / 60; f = -(input.stick.y - input.stick.oy) / 60; }
  const len = Math.hypot(f, r); if (len > 1) { f /= len; r /= len; }
  const vd = viewDir();
  const U = upVec(), ax = axisOf(U);
  const fwd = vd.fwd.clone(); fwd.setComponent(ax, 0); if (fwd.lengthSq() > 1e-6) fwd.normalize();
  const right = vd.right.clone(); right.setComponent(ax, 0); if (right.lengthSq() > 1e-6) right.normalize();
  const speed = (player.onGround ? 430 : 300) * dt;
  const mv = fwd.multiplyScalar(f * speed).addScaledVector(right, r * speed);
  for (let i = 0; i < 3; i++) {
    if (i === ax || Math.abs(mv.getComponent(i)) < 1e-6) continue;
    const before = player.pos.clone();
    if (moveAxis(i, mv.getComponent(i)) && player.onGround) {
      // step up (ceiling beams, base edges): lift, move, the fall settles it
      const lifted = before.clone(); lifted.setComponent(ax, lifted.getComponent(ax) + Math.sign(U.getComponent(ax)) * 42);
      if (!overlaps(lifted, halfExt())) {
        const keep = player.pos.clone();
        player.pos.copy(lifted);
        if (moveAxis(i, mv.getComponent(i)) && Math.abs(player.pos.getComponent(i) - before.getComponent(i)) < 1) player.pos.copy(keep);
      }
    }
  }
  player.vel = Math.min(2600, player.vel + 2200 * dt);
  const g = GRAV[gravity], gax = axisOf(g);
  const hitG = moveAxis(gax, Math.sign(g.getComponent(gax)) * player.vel * dt);
  player.onGround = hitG;
  if (hitG) player.vel = 0;
  const p = player.pos;
  if (p.x < -300 || p.x > 2400 || p.y < -300 || p.y > 1700 || p.z < -300 || p.z > 1100) { p.set(200, 700, 92); player.vel = 0; }
}
function updateCubes(dt) {
  if (!pending) return;
  if (animDelay > 0) { animDelay -= dt; return; }
  let all = true;
  for (const a of anims) {
    if (a.dur <= 0) continue;
    a.t = Math.min(a.dur, a.t + dt);
    const u = a.t / a.dur;
    level.pieceMeshes[a.i].position.copy(toT(a.from.clone().lerp(a.to, u * u)));
    if (a.t < a.dur) all = false;
  }
  if (all) finishSlide();
}
function updatePanels(t, dt) {
  for (const p of PANELS) {
    const c = p.letter === gravity ? 0x6d7f86 : p.hint ? 0xffcf5a : 0x5ff0dc;
    let k = p.letter === gravity ? 0.55 : p.hint ? 0.75 + 0.25 * Math.sin(t * 8) : 0.85 + 0.15 * Math.sin(t * 2.2);
    if (focus && focus.kind === 'panel' && focus.panel === p) k = Math.min(1.3, k + 0.35);
    if (pulsePanel === p && pulseT > 0) k += pulseT;
    p.mat.color.setHex(c).multiplyScalar(k);
  }
  if (pulseT > 0) pulseT -= dt;
  consoleTop.material.color.setHex(focus && focus.kind === 'console' ? 0xbffff6 : 0x5ff0dc);
}
function updateDoor(dt) {
  if (doorOpen > 0 && doorOpen < 1) {
    doorOpen = Math.min(1, doorOpen + dt / 1.2);
    door.mesh.position.copy(P3(1420, 700, 115 + 235 * doorOpen));
  }
  if (solved && !clearShown && player.pos.x > 1950) showClear();
}

// ------------------------------------------------------------------ overlays
// Phones: when a stage starts, ask for full screen + landscape (needs the tap itself).
// Many browsers refuse (iPhone, the browsers inside apps, some Android setups): if the page is still upright shortly after, the game is turned by CSS instead.
const isPhone = () => IS_TOUCH && Math.min(screen.width, screen.height) < 800;
function goLandscape() {
  if (!isPhone()) return;
  turnAllowed = false;
  setTimeout(() => { turnAllowed = true; updateLayout(); }, 700);
  const el = document.documentElement;
  if (!el.requestFullscreen || !screen.orientation || !screen.orientation.lock) return;
  const lock = () => screen.orientation.lock('landscape');
  try { (document.fullscreenElement ? lock() : el.requestFullscreen({ navigationUI: 'hide' }).then(lock)).catch(() => { /* turned by CSS below */ }); } catch (e) { /* same */ }
}
function updateLayout() {
  const inGame = $('menu').classList.contains('hide');
  turned = isPhone() && inGame && turnAllowed && window.innerHeight > window.innerWidth;
  const b = document.body, W = viewW(), H = viewH();
  b.classList.toggle('rot', turned);
  b.style.width = turned ? W + 'px' : '';
  b.style.height = turned ? H + 'px' : '';
  b.style.transform = turned ? `translateX(${window.innerWidth}px) rotate(90deg)` : '';
  b.style.setProperty('--vw', turned ? W / 100 + 'px' : '1vw');
  b.style.setProperty('--vh', turned ? H / 100 + 'px' : '1vh');
  b.classList.toggle('port-narrow', W < 760 && H > W);
  b.classList.toggle('land-small', H <= 520 && W >= H);
  resize();
}
new MutationObserver(updateLayout).observe($('menu'), { attributes: true, attributeFilter: ['class'] });
function applyLang() {
  const t = tx();
  document.documentElement.lang = lang;
  $('mT1').innerHTML = lang === 'ja' ? 'グラビティ<br><span>キューブ</span>' : 'GRAVITY<br><span>VAULT</span>';
  $('mSub').textContent = t.sub; $('mHow').innerHTML = t.how; $('mPlay').textContent = t.play; $('mNote').textContent = t.note; $('bLang').textContent = t.lang;
  $('pT').textContent = t.pause; $('pHow').innerHTML = t.how; $('pResume').textContent = t.resume; $('pRetry').textContent = t.retry; $('pMenu').textContent = t.menu;
  $('cShare').textContent = t.share; $('cPlay').textContent = t.play; $('cRetry').textContent = t.again;
  const box = $('mStages'); box.innerHTML = '';
  STAGES.forEach((st, i) => {
    const b = document.createElement('button');
    const rec = save[st.id];
    b.innerHTML = `${st.tier[lang]}<small>${st.title[lang]}</small>` + (rec ? `<small class="st">${rec <= st.par ? '★ ' : '✓ '}${t.best(rec)}</small>` : `<small>${t.par(st.par)}</small>`);
    b.onclick = () => { goLandscape(); startStage(i); };
    box.appendChild(b);
  });
  if (state) updateObjective();
}
function openPause() { if (!state || clearShown) return; $('pause').classList.remove('hide'); if (document.pointerLockElement) document.exitPointerLock(); }
$('pResume').onclick = () => { $('pause').classList.add('hide'); if (!IS_TOUCH) askLock(); };
$('pRetry').onclick = () => startStage(stageIdx);
$('pMenu').onclick = () => { $('pause').classList.add('hide'); applyLang(); $('menu').classList.remove('hide'); };
$('bLang').onclick = () => { lang = lang === 'ja' ? 'en' : 'ja'; store.set('gc_lang', lang); applyLang(); };
$('mPlay').href = PLAY_URL; $('cPlay').href = PLAY_URL;
$('cRetry').onclick = () => startStage(stageIdx);
function showClear() {
  clearShown = true;
  if (document.pointerLockElement) document.exitPointerLock();
  const st = STAGES[stageIdx], t = tx(), best = moves <= st.par;
  if (!save[st.id] || moves < save[st.id]) { save[st.id] = moves; store.set('gc_demo3d', JSON.stringify(save)); }
  $('cTitle').textContent = `${st.tier[lang]}　${st.title[lang]}`;
  $('cStats').textContent = t.stats(moves, st.par);
  $('cStar').textContent = best ? t.star : t.starNo(st.par);
  const last = stageIdx >= STAGES.length - 1;
  $('cNext').textContent = last ? t.menu : t.next;
  $('cNext').onclick = () => { $('clear').classList.add('hide'); if (last) { applyLang(); $('menu').classList.remove('hide'); } else startStage(stageIdx + 1); };
  const url = SHARE_URL || location.href.split('#')[0].split('?')[0];
  $('cShare').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(t.shareText(st.tier[lang], moves, best)) + '&url=' + encodeURIComponent(url) + '&hashtags=' + encodeURIComponent(HASHTAG);
  $('clear').classList.remove('hide');
}

// ------------------------------------------------------------------ loop
function resize() {
  renderer.setSize(viewW(), viewH(), false);
  camera.aspect = viewW() / viewH();
  // like the app: ~105 degrees across on landscape screens; portrait keeps a usable 60-80 degrees vertical
  const hf = THREE.MathUtils.degToRad(105);
  camera.fov = Math.max(60, Math.min(80, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hf / 2) / camera.aspect))));
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', updateLayout);
const clock = new THREE.Clock();
let menuSpin = 0;
function tick() {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  if (state && playing()) {
    updatePlayer(dt);
    updateFocus();
    updateHud(dt);
  } else if (!state) {
    menuSpin += dt * 0.12;   // slow look around behind the title menu
    player.yaw = Math.sin(menuSpin) * 0.6; player.pitch = 0.05;
  }
  updateCubes(dt);
  updateDoor(dt);
  updatePanels(t, dt);
  const vd = viewDir();
  camera.position.copy(toT(eyePos()));
  camera.up.copy(toT(vd.up));
  camera.lookAt(camera.position.clone().add(toT(vd.dir)));
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
updateLayout();
applyLang();
buildLevel(STAGES[0]);
requestAnimationFrame(tick);
// automated check hooks (Docs/WEB_DEMO_v0.9.1.md)
window.__gc = {
  startStage, requestHint, tryGravity, tryInteract, solveNext, PANELS, player,
  get state() { return state; }, get level() { return level; }, get gravity() { return gravity; }, get moves() { return moves; },
  get solved() { return solved; }, get clearShown() { return clearShown; }, get busy() { return cubesBusy() || player.rotT < 1 || !!autoAim; },
  get guideDir() { return guideDir; }, get focus() { return focus; },
  aimAt(name) { autoAim = PANELS.find(x => x.name === name); },
  faceTo(x, y, z) { const { A, B } = frameAxes(); const d = new THREE.Vector3(x, y, z).sub(eyePos()); player.yaw = Math.atan2(d.dot(B), d.dot(A)); player.pitch = 0; },
  get pos() { return player.pos.toArray(); },
  walk(f, r) { input.keys.clear(); if (f > 0) input.keys.add('w'); if (f < 0) input.keys.add('s'); if (r > 0) input.keys.add('d'); if (r < 0) input.keys.add('a'); },
};
