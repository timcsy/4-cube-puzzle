// 顏色排列研究頁：列出面塗色的排列數 / 組合數，並即時畫出 24 個不同的面。
//
// 數字來自 color-study/ 的 C++ 程式（color_study.cpp 算排列數、combinations.cpp 算組合數），
// 此處 24 個面的列舉（Burnside = 24）則於瀏覽器即時計算並繪出。

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { COLOR_HEX } from './types';
import type { CubeKey } from './types';
import type { CubeSetGenerator, Design } from './cubeset';
import { buildCubeMesh } from './geometry';

// 結果數字（由 color-study 的 C++ 程式計算、驗證）
const N = {
  faces: 24,
  perm: 792238080,
  comb: 515780,
  partitions: 216210,
  unconstrained: 2106578152960, // 632³ × 8345：不要求 24 面全不同時的自由組合
  pruneRatio: 4084257,
  cubes: [
    { name: '甲', face: '全紅面 RRRR', edges: 8, colorings: 6561, distinct: 2528, orbits: 632 },
    { name: '乙', face: '全黃面 YYYY', edges: 8, colorings: 6561, distinct: 2528, orbits: 632 },
    { name: '丙', face: '全藍面 BBBB', edges: 8, colorings: 6561, distinct: 2528, orbits: 632 },
    { name: '丁', face: '無單色面', edges: 12, colorings: 531441, distinct: 200280, orbits: 8345 },
  ],
};

const LETTER: Record<number, string> = { 2: 'R', 1: 'Y', 0: 'B' };
const nf = (n: number) => n.toLocaleString();

/** 面標準型：4 個三角形(上右下左)取 4 種循環旋轉中最大的 4 位數碼。 */
function canonFace(t: number[]): number {
  const r = [
    t[0] * 1000 + t[1] * 100 + t[2] * 10 + t[3],
    t[1] * 1000 + t[2] * 100 + t[3] * 10 + t[0],
    t[2] * 1000 + t[3] * 100 + t[0] * 10 + t[1],
    t[3] * 1000 + t[0] * 100 + t[1] * 10 + t[2],
  ];
  return Math.max(...r);
}

/** 列舉全部 24 個「旋轉不同」的面，回傳每個面的 [上,右,下,左] 顏色。 */
function distinctFaces(): number[][] {
  const seen = new Set<number>();
  const out: number[][] = [];
  for (let a = 0; a < 3; a++)
    for (let b = 0; b < 3; b++)
      for (let c = 0; c < 3; c++)
        for (let d = 0; d < 3; d++) {
          const code = canonFace([a, b, c, d]);
          if (!seen.has(code)) {
            seen.add(code);
            out.push([Math.floor(code / 1000) % 10, Math.floor(code / 100) % 10, Math.floor(code / 10) % 10, code % 10]);
          }
        }
  // 排序：單色 → 雙色 → 三色；同類再依碼大小
  return out.sort((p, q) => {
    const cp = new Set(p).size, cq = new Set(q).size;
    if (cp !== cq) return cp - cq;
    return canonFace(q) - canonFace(p);
  });
}

/** 在 canvas 上畫一個面（正方形 + 兩條對角線切成的 4 個三角形）。 */
export function drawFace(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, face: number[]) {
  const cx = x + s / 2, cy = y + s / 2;
  const corner = [[x, y], [x + s, y], [x + s, y + s], [x, y + s]]; // 左上,右上,右下,左下
  const edges = [[corner[0], corner[1]], [corner[1], corner[2]], [corner[2], corner[3]], [corner[3], corner[0]]]; // 上右下左
  edges.forEach((e, i) => {
    ctx.beginPath();
    ctx.moveTo(e[0][0], e[0][1]);
    ctx.lineTo(e[1][0], e[1][1]);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fillStyle = COLOR_HEX[face[i]];
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  ctx.strokeStyle = '#0c1220';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, s, s);
}

function drawAllFaces(canvas: HTMLCanvasElement) {
  const faces = distinctFaces();
  const cols = 6, fs = 58, padX = 26, padY = 16, cellW = fs + padX, cellH = fs + padY + 18;
  const rows = Math.ceil(faces.length / cols);
  const W = cols * cellW, H = rows * cellH;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.textAlign = 'center';
  ctx.font = '11px ui-monospace, Menlo, monospace';

  const mono: Record<string, string> = { RRRR: '甲', YYYY: '乙', BBBB: '丙' };
  faces.forEach((face, idx) => {
    const col = idx % cols, row = Math.floor(idx / cols);
    const x = col * cellW + padX / 2, y = row * cellH + 6;
    drawFace(ctx, x, y, fs, face);
    const code = face.map((c) => LETTER[c]).join('');
    ctx.fillStyle = '#9aa3b8';
    ctx.fillText(code, x + fs / 2, y + fs + 13);
    if (mono[code]) {
      ctx.fillStyle = '#6ea8ff';
      ctx.fillText(`${mono[code]} 的單色面`, x + fs / 2, y + fs + 26);
    }
  });
}

export interface CubeSetHooks {
  gen: CubeSetGenerator;
  onApply: (cubes: Record<CubeKey, number[]>, label: string) => void;
  onReset: () => void;
}

export function renderStudy(host: HTMLElement, hooks?: CubeSetHooks) {
  const cubeRows = N.cubes
    .map(
      (c) => `<tr>
        <td class="cube">${c.name}</td><td>${c.face}</td>
        <td>${c.edges}</td><td>${nf(c.colorings)}</td>
        <td>${nf(c.distinct)}</td><td class="accent">${nf(c.orbits)}</td></tr>`,
    )
    .join('');

  host.innerHTML = `
    <div class="study-wrap">
      <h2>顏色排列研究</h2>
      <p class="study-lead">
        與「13 個立體圖形解法」各自獨立的子研究：不是算遊戲成功率，而是問
        <b>四顆方塊的面要怎麼塗 / 怎麼排</b>。正方形用兩條對角線切成 4 個三角形、塗紅(R)/黃(Y)/藍(B)，
        旋轉視為相同，則恰好有 <b>24 種不同的面</b>，正好貼滿四顆方塊的 6×4 = 24 面。
      </p>

      ${hooks ? `<section class="study-card cubeset" id="cubeset-section"></section>` : ''}

      <section class="study-card">
        <div class="study-card-h">24 個不同的面 <span class="study-sub">Burnside：(3⁴+3+9+3)/4 = 24</span></div>
        <div class="face-canvas-wrap"><canvas id="faces-canvas"></canvas></div>
        <p class="study-note">三個整面同色的面（RRRR / YYYY / BBBB）分屬甲乙丙；丁沒有單色面。</p>
      </section>

      <div class="study-stats">
        <div class="study-stat"><span class="study-stat-k">不同面種數</span><b>${N.faces}</b></div>
        <div class="study-stat"><span class="study-stat-k">排列數（每種擺向算不同）</span><b>${nf(N.perm)}</b></div>
        <div class="study-stat"><span class="study-stat-k">組合數（除去方塊旋轉）</span><b class="accent">${nf(N.comb)}</b></div>
      </div>

      <section class="study-card">
        <div class="study-card-h">每顆方塊（一顆方塊的塗色 = 它 12 條稜邊的塗色）</div>
        <table class="study-table">
          <thead><tr><th>方塊</th><th>特徵</th><th>自由邊</th><th>塗色(3ⁿ)</th><th>6面互異</th><th>本質不同(組合)</th></tr></thead>
          <tbody>${cubeRows}</tbody>
        </table>
      </section>

      <section class="study-card harsh">
        <div class="study-card-h">「24 面全不同」這條規則有多狠</div>
        <p>
          若<b>不要求</b>面全不同，四顆自由組合（632 × 632 × 632 × 8,345）＝
          <b>${nf(N.unconstrained)}</b>（約 2.1 兆）種。<br>
          加上「24 面恰好全不同」這條鐵則 → 直接砍到 <b class="accent">${nf(N.comb)}</b>，
          只留下約 <b>1 / ${nf(N.pruneRatio)}</b>。這就是「很難拼成」與「沒有第五顆方塊」的數量級來源。
        </p>
        <p class="study-note">（中間量：把 24 面分給四顆的「面分配方式」共 ${nf(N.partitions)} 種。）</p>
      </section>

      <section class="study-card">
        <div class="study-card-h">兩個值得一提的觀察</div>
        <ul class="study-list">
          <li><b>平衡是免費的</b>：加不加「顏色平衡」這條件，排列數完全一樣——只要 24 面湊到全不同，三色三角形數必然自動相等。</li>
          <li><b>24 ↔ 24 剛好卡死</b>：恰好 24 種面、恰好 24 個面位，一個不多一個不少，所以沒有第五顆方塊。</li>
        </ul>
      </section>

      <section class="study-card">
        <div class="study-card-h">延伸：真正「能全玩」13 個圖形的套組有多少？</div>
        <p>「24 面全不同」只保證方塊合法，不保證它拼得出那 13 個圖形。對全部設計枚舉、層層化簡後：</p>
        <div class="funnel">
          <div class="funnel-step" style="--w:100%"><b>515,780</b><span>「24 面全不同」的設計（排列研究的組合數）</span></div>
          <div class="funnel-arrow">↓ 要 13 個圖形全部拼得出來（瓶頸：圖形五，98% 隨機套組解不開）</div>
          <div class="funnel-step" style="--w:74%"><b>2,904</b><span>可全玩（13 圖形全解，僅 0.563%）</span></div>
          <div class="funnel-arrow">↓ 除去 R/Y/B 顏色置換（軌道全為大小 6）</div>
          <div class="funnel-step" style="--w:52%"><b>484</b><span>本質設計</span></div>
          <div class="funnel-arrow">↓ 再除去鏡射手性（軌道全為大小 12，皆手性對）</div>
          <div class="funnel-step funnel-final" style="--w:34%"><b>242</b><span>真正不同的「可全玩」拼圖</span></div>
        </div>
        <p class="study-note">原始 2011 那組（#301,546）是這 242 個之一，且為手性（鏡像 #335034）——稀有，但不孤獨。</p>
      </section>

      <p class="study-credit">
        排列數由 <code>color-study/color_study.cpp</code> 計算、組合數由 <code>color-study/combinations.cpp</code>
        以 Burnside 軌道計數得出（排列 ÷ 組合 = 恰好 24⁴ = 331,776，代表軌道全滿）。
        本頁的 24 個面為瀏覽器即時列舉繪製。
      </p>
    </div>`;

  drawAllFaces(host.querySelector<HTMLCanvasElement>('#faces-canvas')!);
  if (hooks) mountCubeSet(host.querySelector<HTMLElement>('#cubeset-section')!, hooks);
}

const CUBE_LABEL = ['甲', '乙', '丙', '丁'];
const ROLES: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

// ── 展開圖（十字網）─────────────────────────────────────────────────────────
// 與 geometry.ts 同一套面/楔形定義。每格指定 (面, 格座標, 螢幕右 sR, 螢幕上 sU 的 3D 方向)，
// 由方向反查該面的楔形顏色。已驗證：邊自洽方塊在所有折線處顏色一致。
const NFN = [[-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, -1, 0], [1, 0, 0], [0, 0, -1]];
const NFU = [[0, 1, 0], [0, 0, -1], [0, 1, 0], [0, 0, 1], [0, 1, 0], [0, 1, 0]];
type V3 = number[];
const ncross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nnorm = (v: V3): V3 => { const m = Math.hypot(v[0], v[1], v[2]); return [v[0] / m, v[1] / m, v[2] / m]; };
const nwedge = (f: number, w: number): V3 => {
  const u = nnorm(ncross(NFU[f], NFN[f])), v = NFU[f];
  return w === 0 ? v : w === 1 ? u : w === 2 ? v.map((x) => -x) : u.map((x) => -x);
};
const neq = (a: V3, b: V3) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6 && Math.abs(a[2] - b[2]) < 1e-6;
const colorInDir = (tri: number[], f: number, d: V3) => { for (let w = 0; w < 4; w++) if (neq(nwedge(f, w), d)) return tri[f * 4 + w]; return 0; };
const NEG = (v: V3): V3 => [-v[0], -v[1], -v[2]];
const NET_CELLS = [
  { f: 2, c: 1, r: 1, sR: [1, 0, 0], sU: [0, 1, 0] },   // +Z 中心
  { f: 4, c: 2, r: 1, sR: [0, 0, -1], sU: [0, 1, 0] },  // +X 右
  { f: 5, c: 3, r: 1, sR: [-1, 0, 0], sU: [0, 1, 0] },  // -Z 最右
  { f: 0, c: 0, r: 1, sR: [0, 0, 1], sU: [0, 1, 0] },   // -X 左
  { f: 1, c: 1, r: 0, sR: [1, 0, 0], sU: [0, 0, -1] },  // +Y 上
  { f: 3, c: 1, r: 2, sR: [1, 0, 0], sU: [0, 0, 1] },   // -Y 下
];

function drawNetCube(cv: HTMLCanvasElement, tri: number[], cell: number) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = 4 * cell * dpr; cv.height = 3 * cell * dpr;
  cv.style.width = 4 * cell + 'px'; cv.style.height = 3 * cell + 'px';
  const ctx = cv.getContext('2d')!;
  ctx.scale(dpr, dpr);
  for (const cl of NET_CELLS) {
    const face = [
      colorInDir(tri, cl.f, cl.sU), colorInDir(tri, cl.f, cl.sR),
      colorInDir(tri, cl.f, NEG(cl.sU)), colorInDir(tri, cl.f, NEG(cl.sR)),
    ];
    drawFace(ctx, cl.c * cell, cl.r * cell, cell, face);
  }
}

// 24 旋轉置換（作用在 24 三角形槽位），用來把指定面轉到展開圖中心。
const PERMS24: number[][] = (() => {
  const units: V3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const ap = (M: number[][], v: V3): V3 => [dot(M[0], v), dot(M[1], v), dot(M[2], v)];
  const fnKey = (v: V3) => v.map(Math.round).join(',');
  const fnIdx: Record<string, number> = {}; NFN.forEach((n, i) => (fnIdx[fnKey(n)] = i));
  const slotOf = (n: V3, d: V3) => {
    const f = fnIdx[fnKey(n)];
    for (let w = 0; w < 4; w++) {
      const dw = nwedge(f, w);
      if (Math.abs(dw[0] - d[0]) < 1e-6 && Math.abs(dw[1] - d[1]) < 1e-6 && Math.abs(dw[2] - d[2]) < 1e-6) return f * 4 + w;
    }
    return -1;
  };
  const out: number[][] = [];
  for (const a of units) for (const b of units) {
    if (dot(a, b) !== 0) continue;
    const c = ncross(a, b);
    const M = [[a[0], b[0], c[0]], [a[1], b[1], c[1]], [a[2], b[2], c[2]]];
    const det = M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
    if (det !== 1) continue;
    const p = new Array(24);
    for (let s = 0; s < 24; s++) { const f = (s / 4) | 0, w = s % 4; p[s] = slotOf(ap(M, NFN[f]).map(Math.round), ap(M, nwedge(f, w))); }
    out.push(p);
  }
  return out;
})();

/** 旋轉方塊塗色，使「旋轉標準型編號最大的面」落在展開圖中心(+Z，面索引 2)。 */
function centerMaxFace(tri: number[]): number[] {
  let best = tri, bestCode = -1;
  for (const p of PERMS24) {
    const r = new Array(24);
    for (let s = 0; s < 24; s++) r[p[s]] = tri[s];
    const code = canonFace([r[8], r[9], r[10], r[11]]); // 中心面 = 面索引 2 = slots 8..11
    if (code > bestCode) { bestCode = code; best = r; }
  }
  return best;
}

/** 以展開圖畫一個設計的 4 顆方塊（2×2 排列）。丁以「編號最大的面」置中。 */
function drawNets(host: HTMLElement, design: Design) {
  host.innerHTML = '';
  host.className = 'cs-net-grid';
  ROLES.forEach((role, ri) => {
    const cell = document.createElement('div');
    cell.className = 'cs-net-cell';
    const lbl = document.createElement('div');
    lbl.className = 'cs-cube-label';
    lbl.textContent = CUBE_LABEL[ri];
    cell.appendChild(lbl);
    const cv = document.createElement('canvas');
    const tri = ri === 3 ? centerMaxFace(design.roles[role]) : design.roles[role]; // 丁(ri=3)置中最大面
    drawNetCube(cv, tri, 30);
    cell.appendChild(cv);
    host.appendChild(cell);
  });
}

// ── 3D 預覽：4 顆方塊各自獨立、用滑鼠拖曳分別轉動（不一起轉）─────────────────────
class MiniCube {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  controls: OrbitControls;
  private group = new THREE.Group();
  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.camera.position.set(6, 5, 6);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.82));
    const key = new THREE.DirectionalLight(0xffffff, 0.95); key.position.set(4, 6, 5); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x9db4ff, 0.35); fill.position.set(-5, -2, -3); this.scene.add(fill);
    this.scene.add(this.group);
    host.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.enablePan = false;
    this.controls.enableZoom = false; // 只轉動，不縮放/平移
  }
  setCube(tri: number[]) {
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.group.add(buildCubeMesh(tri, COLOR_HEX));
    this.resize();
  }
  resize() {
    const w = Math.min(this.host.clientWidth || 230, 240), h = 150;
    this.renderer.setSize(w, h);
    const aspect = w / h, vs = 2.7;
    this.camera.left = -vs * aspect / 2; this.camera.right = vs * aspect / 2;
    this.camera.top = vs / 2; this.camera.bottom = -vs / 2;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }
  render() { this.controls.update(); this.renderer.render(this.scene, this.camera); }
}

class Preview3D {
  private minis: MiniCube[] = [];
  private raf = 0;
  constructor(private host: HTMLElement) {
    host.className = 'cs-3d-grid';
    for (let i = 0; i < 4; i++) {
      const cell = document.createElement('div');
      cell.className = 'cs-3d-cell';
      const lbl = document.createElement('div');
      lbl.className = 'cs-cube-label';
      lbl.textContent = CUBE_LABEL[i];
      cell.appendChild(lbl);
      const cdiv = document.createElement('div');
      cdiv.className = 'cs-3d-canvas-host';
      cell.appendChild(cdiv);
      host.appendChild(cell);
      this.minis.push(new MiniCube(cdiv));
    }
  }
  setDesign(design: Design) { ROLES.forEach((role, i) => this.minis[i].setCube(design.roles[role])); }
  start() {
    if (this.raf) return;
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      if (this.host.offsetParent === null) return; // 不可見時不畫
      for (const m of this.minis) m.render();
    };
    loop();
  }
  stop() { if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; } }
}

/** 套組設定 UI：用編號選 / 分步自訂，預覽，套用到觀看解答 / 試玩。 */
function mountCubeSet(card: HTMLElement, hooks: CubeSetHooks) {
  const { gen, onApply, onReset } = hooks;
  card.innerHTML = `
    <div class="study-card-h">方塊套組設定 <span class="study-sub">從 ${gen.total.toLocaleString()} 種本質不同設計選一組，可套用到觀看解答 / 試玩</span></div>
    <div class="cs-tabs">
      <button class="cs-tab active" data-tab="index">用編號選</button>
      <button class="cs-tab" data-tab="custom">分步自訂</button>
    </div>
    <div class="cs-pane" data-pane="index">
      <div class="cs-row">
        <span>設計編號</span>
        <input id="cs-index" type="number" min="1" max="${gen.total}" value="1" />
        <span class="dim">/ ${gen.total.toLocaleString()}</span>
        <button class="btn-wide cs-mini" id="cs-prev">◀</button>
        <button class="btn-wide cs-mini" id="cs-next">▶</button>
        <button class="btn-wide cs-mini" id="cs-rand">🎲 隨機</button>
        <button class="btn-wide cs-mini" id="cs-orig">↩ 原始套組</button>
      </div>
      <p class="study-note" style="margin-top:6px !important">當年 2011 那組真實拼圖就是其中一個編號（按「原始套組」跳過去對照）。</p>
    </div>
    <div class="cs-pane" data-pane="custom" hidden>
      <div class="cs-row">
        <span>面分配</span>
        <input id="cs-part" type="number" min="1" max="${gen.partitionCount}" value="1" />
        <span class="dim">/ ${gen.partitionCount.toLocaleString()}</span>
        <button class="btn-wide cs-mini" id="cs-part-prev">◀</button>
        <button class="btn-wide cs-mini" id="cs-part-next">▶</button>
        <button class="btn-wide cs-mini" id="cs-part-rand">🎲</button>
      </div>
      <div class="cs-arrange" id="cs-arrange"></div>
    </div>
    <div class="cs-preview-tabs">
      <button class="cs-ptab active" data-p="net">展開圖</button>
      <button class="cs-ptab" data-p="3d">3D</button>
    </div>
    <div class="cs-preview" id="cs-preview">
      <div id="cs-net"></div>
      <div id="cs-3d" hidden>
        <p class="study-note" style="margin:0 0 10px !important">用滑鼠拖曳各顆方塊可分別轉動。</p>
        <div id="cs-3d-host"></div>
      </div>
    </div>
    <div class="cs-actions">
      <button class="btn-wide cs-apply" id="cs-apply">套用到觀看解答 / 試玩</button>
      <button class="btn-wide" id="cs-reset">還原預設套組</button>
      <span class="cs-status dim small" id="cs-status"></span>
    </div>`;

  const q = <T extends HTMLElement>(s: string) => card.querySelector(s) as T;
  const netHost = q<HTMLElement>('#cs-net');
  const status = q<HTMLElement>('#cs-status');
  const idxInput = q<HTMLInputElement>('#cs-index');
  const partInput = q<HTMLInputElement>('#cs-part');
  const arrangeBox = q<HTMLElement>('#cs-arrange');
  let pMode: 'net' | '3d' = 'net';
  let p3d: Preview3D | null = null;
  let curIndex = 0;                  // 唯一真實狀態：全域設計編號（兩分頁皆由它推導）
  let design: Design = gen.unrank(0);
  let origIdx = -1;

  // 依目前面分配 + 擺法重建自訂分頁的 stepper（顯示對應索引）
  const renderArrange = (loc: { part: number; arrange: number[] }) => {
    const info = gen.partitionAt(loc.part);
    const counts = [info.a, info.b, info.c, info.d];
    arrangeBox.innerHTML = counts
      .map((c, i) => `<div class="cs-stepper" data-i="${i}">
        <span>${CUBE_LABEL[i]} 擺法</span>
        <button class="btn-wide cs-mini" data-d="-1">◀</button>
        <span class="cs-arr-n">${loc.arrange[i] + 1} / ${c}</span>
        <button class="btn-wide cs-mini" data-d="1">▶</button></div>`)
      .join('');
    arrangeBox.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
      b.onclick = () => {
        const i = Number((b.closest('.cs-stepper') as HTMLElement).dataset.i);
        const cur = gen.locate(curIndex);
        cur.arrange[i] += Number(b.dataset.d);
        setIndex(gen.indexOfParts(cur.part, cur.arrange));
      };
    });
  };

  // 設定全域編號 → 同步兩分頁（編號 + 面分配/擺法）+ 預覽
  function setIndex(n: number) {
    curIndex = ((n % gen.total) + gen.total) % gen.total;
    design = gen.unrank(curIndex);
    const loc = gen.locate(curIndex);
    idxInput.value = String(curIndex + 1);
    partInput.value = String(loc.part + 1);
    renderArrange(loc);
    if (pMode === '3d' && p3d) p3d.setDesign(design); else drawNets(netHost, design);
    status.textContent = '';
  }
  const setPart = (pk: number) => setIndex(gen.partOffset(pk)); // 換面分配→擺法歸零

  // 用編號選
  idxInput.onchange = () => setIndex((parseInt(idxInput.value, 10) || 1) - 1);
  q('#cs-prev').onclick = () => setIndex(curIndex - 1);
  q('#cs-next').onclick = () => setIndex(curIndex + 1);
  q('#cs-rand').onclick = () => setIndex(gen.randomIndex());
  q('#cs-orig').onclick = () => { if (origIdx < 0) origIdx = gen.originalIndex(); setIndex(origIdx); };

  // 分步自訂：面分配
  partInput.onchange = () => setPart((parseInt(partInput.value, 10) || 1) - 1);
  q('#cs-part-prev').onclick = () => setPart(gen.locate(curIndex).part - 1);
  q('#cs-part-next').onclick = () => setPart(gen.locate(curIndex).part + 1);
  q('#cs-part-rand').onclick = () => setPart(Math.floor(Math.random() * gen.partitionCount));

  // 分頁切換（兩分頁恆同步，只需切換顯示）
  card.querySelectorAll<HTMLButtonElement>('.cs-tab').forEach((t) => {
    t.onclick = () => {
      card.querySelectorAll('.cs-tab').forEach((x) => x.classList.toggle('active', x === t));
      card.querySelectorAll<HTMLElement>('.cs-pane').forEach((p) => { p.hidden = p.dataset.pane !== t.dataset.tab; });
    };
  });

  // 預覽切換：展開圖 / 3D
  card.querySelectorAll<HTMLButtonElement>('.cs-ptab').forEach((t) => {
    t.onclick = () => {
      pMode = t.dataset.p as 'net' | '3d';
      card.querySelectorAll('.cs-ptab').forEach((x) => x.classList.toggle('active', x === t));
      q<HTMLElement>('#cs-net').hidden = pMode !== 'net';
      q<HTMLElement>('#cs-3d').hidden = pMode !== '3d';
      if (pMode === '3d') {
        if (!p3d) p3d = new Preview3D(q<HTMLElement>('#cs-3d-host'));
        p3d.setDesign(design);
        p3d.start();
      } else { p3d?.stop(); drawNets(netHost, design); }
    };
  });

  // 套用 / 還原
  q('#cs-apply').onclick = () => {
    onApply(gen.designToCubes(design), `自訂套組 #${curIndex + 1}`);
    status.textContent = '已套用 ✓ 切到「觀看解答 / 試玩」看看';
  };
  q('#cs-reset').onclick = () => {
    onReset();
    if (origIdx < 0) origIdx = gen.originalIndex();
    setIndex(origIdx); // 兩分頁一起跳到原始套組（編號 + 面分配/擺法）
    status.textContent = `已還原為 2011 原始套組（編號 ${origIdx + 1}）`;
  };

  setIndex(0);
}
