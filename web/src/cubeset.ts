// 方塊套組產生器：把「24 面如何排到四方塊」的 515,780 種本質不同設計做成可索引 / 隨機 / 自訂。
//
// 幾何取自 geometry.ts 同一套模型（已驗證：由 slotEdgeMid 配對的 12 條稜邊 + 24 旋轉置換，
// 能逐朝向重生現有 data.cubes，故產生的套組與解題器、試玩旋轉表完全相容）。
//
// 一顆方塊的塗色 = 它 12 條稜邊的塗色（每條邊兩側同色）。甲乙丙各有一面固定單色(8 自由邊)，
// 丁無單色面(12 自由邊)。合法設計：四顆共 24 面的旋轉標準型恰好用滿全部 24 種面。

import type { CubeKey, PuzzleData } from './types';

// ── 幾何常數（與 geometry.ts 對齊）──────────────────────────────────────────
const FN = [[-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, -1, 0], [1, 0, 0], [0, 0, -1]];
const FU = [[0, 1, 0], [0, 0, -1], [0, 1, 0], [0, 0, 1], [0, 1, 0], [0, 1, 0]];
type V = number[];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v: V): V => { const m = Math.hypot(v[0], v[1], v[2]); return [v[0] / m, v[1] / m, v[2] / m]; };
const faceRight = (f: number) => norm(cross(FU[f], FN[f]));
function wedgeInPlane(f: number, w: number): V {
  const u = faceRight(f), v = FU[f];
  return w === 0 ? v : w === 1 ? u : w === 2 ? v.map((x) => -x) : u.map((x) => -x);
}
const H = 0.5;
const slotEdgeMid = (s: number): V => {
  const f = (s / 4) | 0, w = s % 4, n = FN[f], d = wedgeInPlane(f, w);
  return [n[0] * H + d[0] * H, n[1] * H + d[1] * H, n[2] * H + d[2] * H];
};

// 面標準型 + 24 種面索引
const canonFace = (a: number, b: number, c: number, d: number) =>
  Math.max(a * 1000 + b * 100 + c * 10 + d, b * 1000 + c * 100 + d * 10 + a,
           c * 1000 + d * 100 + a * 10 + b, d * 1000 + a * 100 + b * 10 + c);
const CODE_INDEX: Record<number, number> = (() => {
  const m: Record<number, number> = {}; let n = 0;
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) for (let d = 0; d < 3; d++) {
    const k = canonFace(a, b, c, d); if (!(k in m)) m[k] = n++;
  }
  return m;
})();
const FULL = (1 << 24) - 1;
const POW3: number[] = [1]; for (let i = 1; i < 24; i++) POW3[i] = POW3[i - 1] * 3;

export interface Design { roles: Record<'A' | 'B' | 'C' | 'D', number[]>; } // 每個 24 三角形 base 塗色

export class CubeSetGenerator {
  total = 0;
  partitionCount = 0;
  private byMask: Record<'A' | 'B' | 'C' | 'D', Map<number, number[][]>>;
  private parts: { mA: number; mB: number; mC: number; need: number; a: number; b: number; c: number; d: number; cnt: number; off: number }[] = [];
  private perms: number[][];                 // 依現有資料排序的 24 旋轉（PERMS[o]=朝向o）
  private edgeOfSlot: number[];
  private roleToKey: Record<'A' | 'B' | 'C' | 'D', CubeKey>;
  private defaults: Record<CubeKey, number[]>;

  constructor(private data: PuzzleData) {
    // 12 稜邊（slotEdgeMid 相同者為同一條）
    const mid = new Map<string, number[]>();
    for (let s = 0; s < 24; s++) {
      const k = slotEdgeMid(s).map((x) => x.toFixed(3)).join(',');
      (mid.get(k) ?? mid.set(k, []).get(k)!).push(s);
    }
    const edges = [...mid.values()];
    this.edgeOfSlot = new Array(24);
    edges.forEach((pair, ei) => pair.forEach((s) => (this.edgeOfSlot[s] = ei)));

    this.perms = this.buildOrderedPerms();
    this.defaults = { a: data.cubes.a.slice(), b: data.cubes.b.slice(), c: data.cubes.c.slice(), d: data.cubes.d.slice() };
    this.roleToKey = this.detectRoleKeys();

    this.byMask = { A: this.enumRole(2), B: this.enumRole(1), C: this.enumRole(0), D: this.enumRole(-1) };
    this.buildPartitions();
  }

  // 24 旋轉置換，並依「方塊 a 的現有朝向順序」排序（使 perms[o] 對應朝向 o）
  private buildOrderedPerms(): number[][] {
    const units = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const ap = (M: number[][], v: V): V => [dot(M[0], v), dot(M[1], v), dot(M[2], v)];
    const fnKey = (v: V) => v.map(Math.round).join(',');
    const fnIdx: Record<string, number> = {}; FN.forEach((n, i) => (fnIdx[fnKey(n)] = i));
    const slotOf = (n: V, d: V) => {
      const f = fnIdx[fnKey(n)];
      for (let w = 0; w < 4; w++) {
        const dw = wedgeInPlane(f, w);
        if (Math.abs(dw[0] - d[0]) < 1e-6 && Math.abs(dw[1] - d[1]) < 1e-6 && Math.abs(dw[2] - d[2]) < 1e-6) return f * 4 + w;
      }
      return -1;
    };
    const raw: number[][] = [];
    for (const a of units) for (const b of units) {
      if (dot(a, b) !== 0) continue;
      const c = cross(a, b);
      const M = [[a[0], b[0], c[0]], [a[1], b[1], c[1]], [a[2], b[2], c[2]]];
      const det = M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
      if (det !== 1) continue;
      const p = new Array(24);
      for (let s = 0; s < 24; s++) { const f = (s / 4) | 0, w = s % 4; p[s] = slotOf(ap(M, FN[f]).map(Math.round), ap(M, wedgeInPlane(f, w))); }
      raw.push(p);
    }
    // 依方塊 a 的朝向排序
    const baseA = this.data.cubes.a.slice(0, 24);
    const applyP = (p: number[], tri: number[]) => { const o = new Array(24); for (let s = 0; s < 24; s++) o[p[s]] = tri[s]; return o.join(','); };
    const ordered: number[][] = new Array(24);
    for (let o = 0; o < 24; o++) {
      const target = this.data.cubes.a.slice(o * 24, o * 24 + 24).join(',');
      ordered[o] = raw.find((p) => applyP(p, baseA) === target)!;
    }
    return ordered;
  }

  // 偵測每個資料 key（a..d）對應哪個角色（依其單色面顏色）
  private detectRoleKeys(): Record<'A' | 'B' | 'C' | 'D', CubeKey> {
    const monoColorOf = (key: CubeKey) => {
      const o0 = this.data.cubes[key].slice(0, 24);
      for (let f = 0; f < 6; f++) { const t = o0.slice(f * 4, f * 4 + 4); if (t.every((x) => x === t[0])) return t[0]; }
      return -1;
    };
    const map: Partial<Record<'A' | 'B' | 'C' | 'D', CubeKey>> = {};
    for (const key of ['a', 'b', 'c', 'd'] as CubeKey[]) {
      const m = monoColorOf(key);
      if (m === 2) map.A = key; else if (m === 1) map.B = key; else if (m === 0) map.C = key; else map.D = key;
    }
    return map as Record<'A' | 'B' | 'C' | 'D', CubeKey>;
  }

  private faceEdges(f: number) { return [0, 1, 2, 3].map((w) => this.edgeOfSlot[f * 4 + w]); }
  private expand(ec: number[]) { const t = new Array(24); for (let s = 0; s < 24; s++) t[s] = ec[this.edgeOfSlot[s]]; return t; }
  private maskOf(tri: number[]) {
    let m = 0;
    for (let f = 0; f < 6; f++) {
      const bit = CODE_INDEX[canonFace(tri[f * 4], tri[f * 4 + 1], tri[f * 4 + 2], tri[f * 4 + 3])];
      if (m & (1 << bit)) return -1;
      m |= 1 << bit;
    }
    return m;
  }
  // 方塊軌道標準型（24 旋轉後 base-3 打包最小值），作為去重 key
  private canonKey(tri: number[]) {
    let best = Infinity;
    for (const p of this.perms) { let v = 0; for (let s = 0; s < 24; s++) v += tri[s] * POW3[p[s]]; if (v < best) best = v; }
    return best;
  }

  // 列舉一個角色（monoColor=2/1/0 釘在 face2；-1=丁全自由）→ mask -> [軌道代表 tri24]
  private enumRole(monoColor: number): Map<number, number[][]> {
    const byMask = new Map<number, number[][]>();
    const seen = new Map<number, Set<number>>();
    const fixed = monoColor < 0 ? [] : this.faceEdges(2);
    const free = [...Array(12).keys()].filter((e) => !fixed.includes(e));
    const ec = new Array(12).fill(0);
    const rec = (i: number) => {
      if (i === free.length) {
        if (monoColor >= 0) for (const e of fixed) ec[e] = monoColor;
        const tri = this.expand(ec);
        const m = this.maskOf(tri);
        if (m < 0) return;
        const ck = this.canonKey(tri);
        let s = seen.get(m);
        if (!s) { s = new Set(); seen.set(m, s); byMask.set(m, []); }
        if (!s.has(ck)) { s.add(ck); byMask.get(m)!.push(tri.slice()); }
        return;
      }
      for (let c = 0; c < 3; c++) { ec[free[i]] = c; rec(i + 1); }
    };
    rec(0);
    return byMask;
  }

  private buildPartitions() {
    const { A, B, C, D } = this.byMask;
    let off = 0;
    for (const [mA, ra] of A) for (const [mB, rb] of B) {
      if (mA & mB) continue; const mAB = mA | mB;
      for (const [mC, rc] of C) {
        if (mAB & mC) continue;
        const need = FULL ^ (mAB | mC);
        const rd = D.get(need);
        if (!rd) continue;
        const cnt = ra.length * rb.length * rc.length * rd.length;
        this.parts.push({ mA, mB, mC, need, a: ra.length, b: rb.length, c: rc.length, d: rd.length, cnt, off });
        off += cnt;
      }
    }
    this.total = off;
    this.partitionCount = this.parts.length;
  }

  // ── 公開 API ────────────────────────────────────────────────────────────
  randomIndex() { return Math.floor(Math.random() * this.total); }

  /** 原始 2011 套組在 515,780 種中的編號（0-based）。執行期反查，永遠正確。 */
  originalIndex(): number {
    const roleInfo = (role: 'A' | 'B' | 'C' | 'D') => {
      const tri = this.defaults[this.roleToKey[role]].slice(0, 24);
      return { mask: this.maskOf(tri), ck: this.canonKey(tri) };
    };
    const rA = roleInfo('A'), rB = roleInfo('B'), rC = roleInfo('C'), rD = roleInfo('D');
    const at = (role: 'A' | 'B' | 'C' | 'D', mask: number, ck: number) =>
      this.byMask[role].get(mask)!.findIndex((t) => this.canonKey(t) === ck);
    const ia = at('A', rA.mask, rA.ck), ib = at('B', rB.mask, rB.ck), ic = at('C', rC.mask, rC.ck), id = at('D', rD.mask, rD.ck);
    const pk = this.parts.findIndex((p) => p.mA === rA.mask && p.mB === rB.mask && p.mC === rC.mask && p.need === rD.mask);
    const p = this.parts[pk];
    return p.off + ia + p.a * ib + p.a * p.b * ic + p.a * p.b * p.c * id;
  }

  /** 由全域編號 N(0-based) 取設計。 */
  unrank(N: number): Design {
    N = ((N % this.total) + this.total) % this.total;
    let lo = 0, hi = this.parts.length - 1, pi = 0;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (this.parts[m].off <= N) { pi = m; lo = m + 1; } else hi = m - 1; }
    const p = this.parts[pi];
    let r = N - p.off;
    const ia = r % p.a; r = (r / p.a) | 0;
    const ib = r % p.b; r = (r / p.b) | 0;
    const ic = r % p.c; r = (r / p.c) | 0;
    const id = r;
    return this.designFromParts(pi, ia, ib, ic, id);
  }

  /** 由全域編號反查它落在哪個面分配 + 各顆擺法索引（供分步自訂同步）。 */
  locate(N: number): { part: number; arrange: [number, number, number, number] } {
    N = ((N % this.total) + this.total) % this.total;
    let lo = 0, hi = this.parts.length - 1, pi = 0;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (this.parts[m].off <= N) { pi = m; lo = m + 1; } else hi = m - 1; }
    const p = this.parts[pi];
    let r = N - p.off;
    const ia = r % p.a; r = (r / p.a) | 0;
    const ib = r % p.b; r = (r / p.b) | 0;
    const ic = r % p.c; r = (r / p.c) | 0;
    const id = r;
    return { part: pi, arrange: [ia, ib, ic, id] };
  }

  /** 面分配 pk + 擺法索引 → 全域編號。 */
  indexOfParts(pk: number, arr: number[]): number {
    pk = ((pk % this.partitionCount) + this.partitionCount) % this.partitionCount;
    const p = this.parts[pk];
    const w = (i: number, n: number) => ((i % n) + n) % n;
    const ia = w(arr[0], p.a), ib = w(arr[1], p.b), ic = w(arr[2], p.c), id = w(arr[3], p.d);
    return p.off + ia + p.a * ib + p.a * p.b * ic + p.a * p.b * p.c * id;
  }

  /** 該面分配的第一個設計（擺法全為 0）的全域編號。 */
  partOffset(pk: number): number { return this.indexOfParts(pk, [0, 0, 0, 0]); }

  /** 面分配總數（自訂用）。 */
  partitionAt(pk: number) {
    pk = ((pk % this.partitionCount) + this.partitionCount) % this.partitionCount;
    const p = this.parts[pk];
    return { a: p.a, b: p.b, c: p.c, d: p.d };
  }

  /** 指定面分配 pk + 各顆擺法索引 → 設計。 */
  designFromParts(pk: number, ia: number, ib: number, ic: number, id: number): Design {
    const p = this.parts[pk];
    const pick = (arr: number[][], i: number) => arr[((i % arr.length) + arr.length) % arr.length];
    return {
      roles: {
        A: pick(this.byMask.A.get(p.mA)!, ia),
        B: pick(this.byMask.B.get(p.mB)!, ib),
        C: pick(this.byMask.C.get(p.mC)!, ic),
        D: pick(this.byMask.D.get(p.need)!, id),
      },
    };
  }

  /** 設計 → 各實體方塊的 576 值（24 朝向 × 24 三角形），鍵為資料 key(a..d)。 */
  designToCubes(d: Design): Record<CubeKey, number[]> {
    const out = {} as Record<CubeKey, number[]>;
    (['A', 'B', 'C', 'D'] as const).forEach((role) => {
      const tri = d.roles[role];
      const arr: number[] = [];
      for (let o = 0; o < 24; o++) { const ori = new Array(24); for (let s = 0; s < 24; s++) ori[this.perms[o][s]] = tri[s]; arr.push(...ori); }
      out[this.roleToKey[role]] = arr;
    });
    return out;
  }

  defaultCubes(): Record<CubeKey, number[]> {
    return { a: this.defaults.a.slice(), b: this.defaults.b.slice(), c: this.defaults.c.slice(), d: this.defaults.d.slice() };
  }
}
