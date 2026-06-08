// 套組「可玩性」抽樣：515,780 種「24 面全不同」設計裡，有多少能拼出全部 13 個圖形？
//
// 從 web/ 執行：  node scripts/playability.mjs
//
// 作法：重用 cubeset.ts 的產生器（隨機抽設計 → 24 朝向方塊資料），再用 13 圖形解題器
// 判斷每個圖形有沒有解。解題器與報告數字交叉驗證過（見同目錄 verify-solver.mjs 的精神）。
// 詳見 docs/05-顏色排列研究.md 的「延伸發現」。

import fs from 'fs';
const data = JSON.parse(fs.readFileSync('public/data/puzzle-data.json', 'utf8'));

// ── 產生器（與 src/cubeset.ts 同模型，已驗證總數 515,780）────────────────────
const FN = [[-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, -1, 0], [1, 0, 0], [0, 0, -1]];
const FU = [[0, 1, 0], [0, 0, -1], [0, 1, 0], [0, 0, 1], [0, 1, 0], [0, 1, 0]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v) => { const m = Math.hypot(...v); return [v[0] / m, v[1] / m, v[2] / m]; };
const faceRight = (f) => norm(cross(FU[f], FN[f]));
const wedge = (f, w) => { const u = faceRight(f), v = FU[f]; return w === 0 ? v : w === 1 ? u : w === 2 ? v.map((x) => -x) : u.map((x) => -x); };
const H = 0.5;
const slotEdgeMid = (s) => { const f = (s / 4) | 0, w = s % 4, n = FN[f], d = wedge(f, w); return [n[0] * H + d[0] * H, n[1] * H + d[1] * H, n[2] * H + d[2] * H]; };
const kk = (v) => v.map((x) => x.toFixed(3)).join(',');
const mid = {}; for (let s = 0; s < 24; s++) { (mid[kk(slotEdgeMid(s))] ??= []).push(s); }
const EDGES = Object.values(mid); const edgeOfSlot = new Array(24); EDGES.forEach((p, ei) => p.forEach((s) => (edgeOfSlot[s] = ei)));
const faceEdges = (f) => [0, 1, 2, 3].map((w) => edgeOfSlot[f * 4 + w]);
const canonFace = (a, b, c, d) => Math.max(a * 1000 + b * 100 + c * 10 + d, b * 1000 + c * 100 + d * 10 + a, c * 1000 + d * 100 + a * 10 + b, d * 1000 + a * 100 + b * 10 + c);
const CODES = {}; { let n = 0; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) for (let d = 0; d < 3; d++) { const k = canonFace(a, b, c, d); if (!(k in CODES)) CODES[k] = n++; } }
const FULL = (1 << 24) - 1; const POW3 = [1]; for (let i = 1; i < 24; i++) POW3[i] = POW3[i - 1] * 3;
const units = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; const ap = (M, v) => [dot(M[0], v), dot(M[1], v), dot(M[2], v)];
const mats = []; for (const a of units) for (const b of units) { if (dot(a, b) !== 0) continue; const c = cross(a, b); const M = [[a[0], b[0], c[0]], [a[1], b[1], c[1]], [a[2], b[2], c[2]]]; const det = M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]); if (det === 1) mats.push(M); }
const fnK = (v) => v.map(Math.round).join(','), fnI = {}; FN.forEach((n, i) => (fnI[fnK(n)] = i));
const slotOf = (n, d) => { const f = fnI[fnK(n)]; for (let w = 0; w < 4; w++) { const dw = wedge(f, w); if (Math.abs(dw[0] - d[0]) < 1e-6 && Math.abs(dw[1] - d[1]) < 1e-6 && Math.abs(dw[2] - d[2]) < 1e-6) return f * 4 + w; } return -1; };
const PERMS = mats.map((M) => { const p = new Array(24); for (let s = 0; s < 24; s++) { const f = (s / 4) | 0, w = s % 4; p[s] = slotOf(ap(M, FN[f]).map(Math.round), ap(M, wedge(f, w))); } return p; });
const expand = (ec) => { const t = new Array(24); for (let s = 0; s < 24; s++) t[s] = ec[edgeOfSlot[s]]; return t; };
const maskOf = (t) => { let m = 0; for (let f = 0; f < 6; f++) { const b = CODES[canonFace(t[f * 4], t[f * 4 + 1], t[f * 4 + 2], t[f * 4 + 3])]; if (m & (1 << b)) return -1; m |= 1 << b; } return m; };
const canonKey = (t) => { let best = Infinity; for (const p of PERMS) { let v = 0; for (let s = 0; s < 24; s++) v += t[s] * POW3[p[s]]; if (v < best) best = v; } return best; };
function enumRole(mono) {
  const byMask = new Map(); const seen = new Map();
  const fixed = mono < 0 ? [] : faceEdges(2); const free = [...Array(12).keys()].filter((e) => !fixed.includes(e)); const ec = new Array(12).fill(0);
  const rec = (i) => {
    if (i === free.length) { if (mono >= 0) for (const e of fixed) ec[e] = mono; const t = expand(ec); const m = maskOf(t); if (m < 0) return; const c = canonKey(t); let s = seen.get(m); if (!s) { s = new Set(); seen.set(m, s); byMask.set(m, []); } if (!s.has(c)) { s.add(c); byMask.get(m).push(t.slice()); } return; }
    for (let v = 0; v < 3; v++) { ec[free[i]] = v; rec(i + 1); }
  };
  rec(0); return byMask;
}
process.stderr.write('building generator…\n');
const A = enumRole(2), B = enumRole(1), C = enumRole(0), D = enumRole(-1);
const parts = []; let off = 0;
for (const [mA, ra] of A) for (const [mB, rb] of B) { if (mA & mB) continue; const mAB = mA | mB; for (const [mC, rc] of C) { if (mAB & mC) continue; const need = FULL ^ (mAB | mC); const rd = D.get(need); if (!rd) continue; parts.push({ mA, mB, mC, need, a: ra.length, b: rb.length, c: rc.length, d: rd.length, off }); off += ra.length * rb.length * rc.length * rd.length; } }
const TOTAL = off;
function unrank(N) { let lo = 0, hi = parts.length - 1, pi = 0; while (lo <= hi) { const m = (lo + hi) >> 1; if (parts[m].off <= N) { pi = m; lo = m + 1; } else hi = m - 1; } const p = parts[pi]; let r = N - p.off; const ia = r % p.a; r = (r / p.a) | 0; const ib = r % p.b; r = (r / p.b) | 0; const ic = r % p.c; r = (r / p.c) | 0; const id = r; return { A: A.get(p.mA)[ia], B: B.get(p.mB)[ib], C: C.get(p.mC)[ic], D: D.get(p.need)[id] }; }
const orient = (tri) => { const a = []; for (let o = 0; o < 24; o++) { const x = new Array(24); for (let s = 0; s < 24; s++) x[PERMS[o][s]] = tri[s]; a.push(...x); } return a; };
const designToCubes = (d) => ({ a: orient(d.A), b: orient(d.B), c: orient(d.C), d: orient(d.D) });

// ── 解題器：某圖形以這組方塊有沒有解（早退）─────────────────────────────────
const POSI = { a: 0, b: 1, c: 2, d: 3 };
const PERMS4 = (() => { const r = [], ks = ['a', 'b', 'c', 'd']; const go = (cur, rem) => { if (!rem.length) { r.push(cur); return; } for (let i = 0; i < rem.length; i++) go([...cur, rem[i]], rem.filter((_, j) => j !== i)); }; go([], ks); return r; })();
function prep(shape) { const pairs = {}; for (const [p1, t1, p2, t2] of shape.constraints) { let i = POSI[p1], j = POSI[p2], ti = t1, tj = t2; if (i > j) { [i, j] = [j, i];[ti, tj] = [tj, ti]; } (pairs[i + '-' + j] ??= []).push([ti, tj]); } return pairs; }
function solvable(pairs, cubes) {
  for (const perm of PERMS4) {
    const tri = (idx, o, t) => cubes[perm[idx]][o * 24 + (t - 1)];
    const compat = {};
    for (const key in pairs) { const [i, j] = key.split('-').map(Number); const m = new Uint8Array(576); for (let oi = 0; oi < 24; oi++) for (let oj = 0; oj < 24; oj++) { let ok = 1; for (const [ti, tj] of pairs[key]) { if (tri(i, oi, ti) !== tri(j, oj, tj)) { ok = 0; break; } } m[oi * 24 + oj] = ok; } compat[key] = m; }
    const ok = (i, j, oi, oj) => { const m = compat[i + '-' + j]; return m ? m[oi * 24 + oj] : 1; };
    for (let oa = 0; oa < 24; oa++) for (let ob = 0; ob < 24; ob++) { if (!ok(0, 1, oa, ob)) continue; for (let oc = 0; oc < 24; oc++) { if (!ok(0, 2, oa, oc) || !ok(1, 2, ob, oc)) continue; for (let od = 0; od < 24; od++) { if (ok(0, 3, oa, od) && ok(1, 3, ob, od) && ok(2, 3, oc, od)) return true; } } }
  }
  return false;
}

// ── 抽樣 ────────────────────────────────────────────────────────────────────
const N = Number(process.argv[2]) || 300;
const shapeIds = data.shapeOrder;
const shapePairs = shapeIds.map((id) => ({ id, title: data.shapes[id].title, pairs: prep(data.shapes[id]) }));
process.stderr.write(`sampling ${N} sets…\n`);
const deadCount = shapeIds.map(() => 0);
const hist = new Array(14).fill(0);
let fullyPlayable = 0, anyZero = 0;
const t0 = Date.now();
for (let n = 0; n < N; n++) {
  const cubes = designToCubes(unrank(Math.floor(Math.random() * TOTAL)));
  let solved = 0;
  for (let s = 0; s < shapePairs.length; s++) { if (solvable(shapePairs[s].pairs, cubes)) solved++; else deadCount[s]++; }
  hist[solved]++; if (solved === 13) fullyPlayable++; if (solved < 13) anyZero++;
}
const secs = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`\n抽樣 ${N} 組（耗時 ${secs}s）\n`);
console.log(`至少一個圖形 0 解（不可全玩）= ${anyZero} 組（${(100 * anyZero / N).toFixed(1)}%）`);
console.log(`13 個圖形全部都有解（可全玩） = ${fullyPlayable} 組（${(100 * fullyPlayable / N).toFixed(1)}%）\n`);
console.log('每個圖形的「致死率」（多少比例的套組對它 0 解）：');
shapePairs.map((sp, i) => ({ t: sp.title, c: data.shapes[sp.id].constraints.length, d: deadCount[i] }))
  .sort((x, y) => y.d - x.d)
  .forEach((r) => console.log(`  ${r.t.padEnd(6)} 約束${String(r.c).padStart(2)}  →  ${String(r.d).padStart(4)}/${N}（${(100 * r.d / N).toFixed(0)}%）`));
console.log('\n能解開的圖形數分布：');
for (let k = 13; k >= 0; k--) if (hist[k]) console.log(`  解開 ${String(k).padStart(2)} 個：${hist[k]} 組`);
