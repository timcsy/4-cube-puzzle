// 把一組解組裝成立體外型
//
// 正確模型（依報告規則）：相鄰方塊「可見接縫」上的兩個三角形要同色——也就是這兩個
// 三角形**共用方塊的一條稜邊**、在表面相鄰可見。於是組裝時用「**邊中點共位**」定位：
//   posChild = posParent + slotEdgeMid(t1) − slotEdgeMid(t2)
// 使約束指定的兩三角形外緣邊重合（表面相鄰）。經驗證：13 個圖形的所有約束都 100% 共邊，
// 且得到乾淨的整數格座標（正確的多連方塊外型）。

import * as THREE from 'three';
import type { CubeKey, Shape } from './types';
import { slotEdgeMid } from './geometry';

const KEYS: CubeKey[] = ['a', 'b', 'c', 'd'];

// 官方朝向參考（從原始 VB 生成器螢幕座標反解）。僅用來決定整個外型「轉到哪個方向」，
// 不用於相鄰定位（定位用正確的邊中點共位）。
const REF_ORIENT: Record<string, [number, number, number][]> = {
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

// 立方體 24 種旋轉矩陣（行列式 +1 的整數正交矩陣）
function rotationMatrices(): THREE.Matrix4[] {
  const unit = [-1, 0, 1].flatMap((x) => [-1, 0, 1].flatMap((y) =>
    [-1, 0, 1].map((z) => new THREE.Vector3(x, y, z)))).filter((v) => v.lengthSq() === 1);
  const mats: THREE.Matrix4[] = [];
  for (const a of unit) for (const b of unit) {
    if (Math.abs(a.dot(b)) > 1e-3) continue;
    const c = new THREE.Vector3().crossVectors(a, b);
    const m = new THREE.Matrix4().makeBasis(a, b, c);
    if (Math.abs(m.determinant() - 1) < 0.01) mats.push(m);
  }
  return mats;
}
const ROT_MATS = rotationMatrices();

export interface Placement {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

interface Edge { to: CubeKey; t1: number; t2: number; n: number }

function buildAdjacency(shape: Shape): Map<CubeKey, Edge[]> {
  // 每對位置取「約束三角形最多」的代表，定位較穩
  const pairs = new Map<string, { p1: CubeKey; p2: CubeKey; t1: number; t2: number; n: number }>();
  for (const [p1, t1, p2, t2] of shape.constraints) {
    const key = [p1, p2].sort().join('-');
    const e = pairs.get(key);
    if (e) e.n++;
    else pairs.set(key, { p1, p2, t1, t2, n: 1 });
  }
  const adj = new Map<CubeKey, Edge[]>();
  const push = (from: CubeKey, e: Edge) => { (adj.get(from) ?? adj.set(from, []).get(from)!).push(e); };
  for (const { p1, p2, t1, t2, n } of pairs.values()) {
    push(p1, { to: p2, t1, t2, n });
    push(p2, { to: p1, t1: t2, t2: t1, n });
  }
  return adj;
}

/**
 * 組裝：回傳每顆方塊的位置與旋轉（外型置中）。
 * @param aligned true=套用全域旋轉對齊官方朝向（觀看用）；false=保持世界軸對齊（試玩用，旋轉按鈕才一致）。
 */
export function assemble(shape: Shape, aligned = true): Record<CubeKey, Placement> {
  const adj = buildAdjacency(shape);
  const pos: Partial<Record<CubeKey, THREE.Vector3>> = {};
  const root = KEYS.slice().sort((x, y) => (adj.get(y)?.length ?? 0) - (adj.get(x)?.length ?? 0))[0];
  pos[root] = new THREE.Vector3(0, 0, 0);
  const queue = [root];
  while (queue.length) {
    const cur = queue.shift()!;
    const edges = (adj.get(cur) ?? []).slice().sort((a, b) => b.n - a.n);
    for (const e of edges) {
      if (pos[e.to]) continue;
      // 邊中點共位：兩三角形的外緣邊重合
      pos[e.to] = pos[cur]!.clone().add(slotEdgeMid(e.t1 - 1)).sub(slotEdgeMid(e.t2 - 1));
      queue.push(e.to);
    }
  }
  let k = 1;
  for (const key of KEYS) if (!pos[key]) pos[key] = new THREE.Vector3(2 * k++, 0, 0);

  // 對齊整數格（消除浮點誤差）並置中
  for (const key of KEYS) {
    pos[key]!.set(Math.round(pos[key]!.x), Math.round(pos[key]!.y), Math.round(pos[key]!.z));
  }
  const centroid = new THREE.Vector3();
  for (const key of KEYS) centroid.add(pos[key]!);
  centroid.multiplyScalar(1 / KEYS.length);
  const centered: Record<CubeKey, THREE.Vector3> = {} as never;
  for (const key of KEYS) centered[key] = pos[key]!.clone().sub(centroid);

  // 找全域旋轉 R，使外型朝向對齊官方參考（不破壞接縫，純剛體轉向）
  let R = new THREE.Matrix4();
  const ref = aligned ? REF_ORIENT[shape.id] : null;
  if (ref) {
    const refC = ref.map((p) => new THREE.Vector3(...p));
    const rc = new THREE.Vector3();
    for (const v of refC) rc.add(v);
    rc.multiplyScalar(1 / refC.length);
    refC.forEach((v) => v.sub(rc));
    let best = Infinity;
    for (const m of ROT_MATS) {
      let err = 0;
      KEYS.forEach((key, i) => {
        err += centered[key].clone().applyMatrix4(m).distanceToSquared(refC[i]);
      });
      if (err < best) { best = err; R = m; }
    }
  }
  const q = new THREE.Quaternion().setFromRotationMatrix(R);

  const out = {} as Record<CubeKey, Placement>;
  for (const key of KEYS) {
    out[key] = { position: centered[key].clone().applyMatrix4(R), quaternion: q.clone() };
  }
  return out;
}
