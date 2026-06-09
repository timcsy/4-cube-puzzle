// 四方塊「形狀」共用模組
//
// 列舉四顆方塊能拼出的全部 88 種形狀（面接觸或邊接觸都算相連、鏡像視為不同），
// 並由形狀產生「外觀外部相鄰邊同色」約束（已驗證可 100% 重現 13 個官方圖形的解答數）。
// 供「圖形拼圖」（即時求解 88 形狀）與「顏色排列」（形狀總覽）共用。

import type { Constraint } from './types';

export type Cell = [number, number, number];

// ── 幾何（與 geometry.ts 一致）──
const FN: Cell[] = [[-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, -1, 0], [1, 0, 0], [0, 0, -1]];
const FU: Cell[] = [[0, 1, 0], [0, 0, -1], [0, 1, 0], [0, 0, 1], [0, 1, 0], [0, 1, 0]];
const cross = (a: Cell, b: Cell): Cell => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (v: Cell): Cell => { const m = Math.hypot(...v); return [v[0] / m, v[1] / m, v[2] / m]; };
const wip = (f: number, w: number): Cell => { const u = nrm(cross(FU[f], FN[f])), v = FU[f]; return w === 0 ? v : w === 1 ? u : w === 2 ? (v.map((x) => -x) as Cell) : (u.map((x) => -x) as Cell); };
const sem = (s: number): Cell => { const f = (s / 4) | 0, w = s % 4; return [FN[f][0] * 0.5 + wip(f, w)[0] * 0.5, FN[f][1] * 0.5 + wip(f, w)[1] * 0.5, FN[f][2] * 0.5 + wip(f, w)[2] * 0.5]; };
const dot = (a: Cell, b: Cell) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// ── 24 個晶格旋轉，用來把形狀標準化 ──
const units: Cell[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const ROT: Cell[][] = [];
for (const a of units) for (const b of units) {
  if (dot(a, b) !== 0) continue;
  const c = cross(a, b);
  const det = a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
  if (det === 1) ROT.push([a, b, c]);
}
const ap = (M: Cell[], p: Cell): Cell => [dot(M[0], p), dot(M[1], p), dot(M[2], p)];
const kp = (p: Cell) => p.join(',');
const cmp = (a: Cell, b: Cell) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** 形狀的旋轉標準鍵（平移歸零 + 24 旋轉取最小），用來判同。 */
export function canonKey(cells: Cell[]): string {
  let best: string | null = null;
  for (const M of ROT) {
    let pts = cells.map((p) => ap(M, p));
    const mx = Math.min(...pts.map((q) => q[0])), my = Math.min(...pts.map((q) => q[1])), mz = Math.min(...pts.map((q) => q[2]));
    pts = pts.map((q): Cell => [q[0] - mx, q[1] - my, q[2] - mz]).sort(cmp);
    const s = pts.map(kp).join(';');
    if (best === null || s < best) best = s;
  }
  return best!;
}

/** 列舉全部 88 種形狀（每個回傳一組標準化的 4 個 cell 座標）。 */
export function enumerate88(): Cell[][] {
  const NB: Cell[] = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
    const d = dx * dx + dy * dy + dz * dz; if (d === 1 || d === 2) NB.push([dx, dy, dz]);
  }
  const canonPts = (cells: Cell[]): { key: string; pts: Cell[] } => {
    let key: string | null = null, pts: Cell[] = cells;
    for (const M of ROT) {
      let p = cells.map((c) => ap(M, c));
      const mx = Math.min(...p.map((q) => q[0])), my = Math.min(...p.map((q) => q[1])), mz = Math.min(...p.map((q) => q[2]));
      p = p.map((q): Cell => [q[0] - mx, q[1] - my, q[2] - mz]).sort(cmp);
      const s = p.map(kp).join(';');
      if (key === null || s < key) { key = s; pts = p; }
    }
    return { key: key!, pts };
  };
  let level = new Map<string, Cell[]>();
  const c0 = canonPts([[0, 0, 0]]); level.set(c0.key, c0.pts);
  for (let sz = 1; sz < 4; sz++) {
    const nx = new Map<string, Cell[]>();
    for (const cells of level.values()) {
      const occ = new Set(cells.map(kp)); const cand = new Set<string>();
      for (const c of cells) for (const d of NB) { const n: Cell = [c[0] + d[0], c[1] + d[1], c[2] + d[2]]; if (!occ.has(kp(n))) cand.add(kp(n)); }
      for (const ck of cand) { const n = ck.split(',').map(Number) as Cell; const cn = canonPts([...cells, n]); if (!nx.has(cn.key)) nx.set(cn.key, cn.pts); }
    }
    level = nx;
  }
  return [...level.values()];
}

/** 是否「純面相連」（只用面接觸 dist²=1 就連通）→ 8 種經典 tetracube。 */
export function isFaceConnected(cells: Cell[]): boolean {
  const d2 = (a: Cell, b: Cell) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const seen = new Set([kp(cells[0])]); const st = [cells[0]];
  while (st.length) { const p = st.pop()!; for (const c of cells) if (!seen.has(kp(c)) && d2(p, c) === 1) { seen.add(kp(c)); st.push(c); } }
  return seen.size === 4;
}

const LAB: ('a' | 'b' | 'c' | 'd')[] = ['a', 'b', 'c', 'd'];

/** 由形狀產生約束：相同外緣邊上、兩面皆為外露面的三角形必須同色。 */
export function shapeConstraints(cells: Cell[]): Constraint[] {
  const pos: Record<string, Cell> = {}; cells.forEach((c, i) => (pos[LAB[i]] = c));
  const occ = new Set(cells.map((p) => p.join(',')));
  const m = new Map<string, Array<['a' | 'b' | 'c' | 'd', number]>>();
  for (const k of LAB) for (let s = 0; s < 24; s++) {
    const p = pos[k], e = sem(s);
    const w = [p[0] + e[0], p[1] + e[1], p[2] + e[2]].map((x) => x.toFixed(2)).join(',');
    const cur = m.get(w) || []; cur.push([k, s]); m.set(w, cur);
  }
  const ext = (k: 'a' | 'b' | 'c' | 'd', s: number) => { const n = FN[(s / 4) | 0]; return !occ.has([pos[k][0] + n[0], pos[k][1] + n[1], pos[k][2] + n[2]].join(',')); };
  const cons: Constraint[] = [];
  for (const arr of m.values()) for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
    const [kA, sA] = arr[i], [kB, sB] = arr[j];
    if (kA === kB) continue;
    if (ext(kA, sA) && ext(kB, sB)) cons.push([kA, sA + 1, kB, sB + 1]);
  }
  return cons;
}

// ── 官方 13 個圖形的 cell 座標（取自 assembly 的 REF_ORIENT），用來在 88 裡標記與對應 ──
const OFFICIAL_CELLS: Record<string, Cell[]> = {
  '1': [[0, 0, 0], [1, 0, 0], [2, 0, -1], [3, 0, -1]],
  '2': [[0, 0, 0], [1, 0, 1], [2, 0, 1], [3, 0, 0]],
  '3': [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, -1]],
  '4': [[0, 0, 0], [1, 0, -1], [1, 0, 1], [2, 0, 0]],
  '5': [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]],
  '6': [[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 0, -1]],
  '7': [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 0, -1]],
  '8': [[0, 0, 0], [1, 0, 0], [1, 0, -1], [2, 0, -1]],
  '9': [[0, 0, 0], [1, 0, 0], [1, 0, -1], [1, 1, -1]],
  '10': [[0, 1, 0], [0, 0, 0], [1, 0, 0], [1, 0, -1]],
  '11': [[0, 1, 0], [0, 0, 0], [-1, 0, 0], [0, 0, -1]],
  '12': [[0, 0, 0], [1, 0, 1], [1, 0, 0], [2, 0, -1]],
  '13': [[0, 0, 0], [0, 0, 1], [1, 0, 0], [1, 0, 1]],
};
const OFFICIAL_BY_CANON: Record<string, string> = {};
for (const id of Object.keys(OFFICIAL_CELLS)) OFFICIAL_BY_CANON[canonKey(OFFICIAL_CELLS[id])] = id;
/** 若某形狀就是官方某圖形，回傳其官方 id（'1'..'13'），否則 null。 */
export function officialId(cells: Cell[]): string | null {
  return OFFICIAL_BY_CANON[canonKey(cells)] ?? null;
}

/** 對角雙柱（原始套組唯一解不開的形狀）的標準鍵。 */
export const TWIN_PILLAR_KEY = canonKey([[0, 0, 0], [0, 0, 1], [1, 1, 0], [1, 1, 1]]);

/** 等角（稍不對稱 dimetric）投影把一個 4-cell 形狀畫到 canvas。
 *  X、Z 兩軸角度略不同 → (1,1,1) 體對角不被壓扁，任何方塊都不會完全被遮住。 */
export function drawShapeIso(canvas: HTMLCanvasElement, cells: Cell[]) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = canvas.clientWidth || 104, H = canvas.clientHeight || 104;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d')!; ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);
  const proj = (x: number, y: number, z: number) => ({ ex: 1.0 * x - 0.78 * z, ey: 0.5 * x + 0.58 * z - y });
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y, z] of cells) for (const dx of [0, 1]) for (const dy of [0, 1]) for (const dz of [0, 1]) {
    const p = proj(x + dx, y + dy, z + dz); minX = Math.min(minX, p.ex); maxX = Math.max(maxX, p.ex); minY = Math.min(minY, p.ey); maxY = Math.max(maxY, p.ey);
  }
  const pad = 10, s = Math.min((W - 2 * pad) / (maxX - minX || 1), (H - 2 * pad) / (maxY - minY || 1));
  const ox = (W - (maxX - minX) * s) / 2 - minX * s, oy = (H - (maxY - minY) * s) / 2 - minY * s;
  const T = (x: number, y: number, z: number) => { const p = proj(x, y, z); return [ox + p.ex * s, oy + p.ey * s] as const; };
  ctx.lineJoin = 'round';
  const face = (pts: Array<readonly [number, number]>, fill: string) => {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = 'rgba(12,18,30,0.75)'; ctx.lineWidth = 1; ctx.stroke();
  };
  const order = cells.map((c) => c).sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
  for (const [x, y, z] of order) {
    face([T(x, y + 1, z), T(x + 1, y + 1, z), T(x + 1, y + 1, z + 1), T(x, y + 1, z + 1)], '#86a8df');
    face([T(x + 1, y, z), T(x + 1, y, z + 1), T(x + 1, y + 1, z + 1), T(x + 1, y + 1, z)], '#41608f');
    face([T(x, y, z + 1), T(x + 1, y, z + 1), T(x + 1, y + 1, z + 1), T(x, y + 1, z + 1)], '#5d7fb4');
  }
}
