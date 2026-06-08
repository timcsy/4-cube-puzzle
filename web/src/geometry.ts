// 立體方塊的幾何模型
//
// 6 個面對應 ±X / ±Y / ±Z。對面配對依甲方塊展開圖摺疊推導：
//   面0 ↔ 面4（-X / +X）、面1 ↔ 面3（+Y / -Y）、面2 ↔ 面5（+Z / -Z）
// 每面以兩條對角線切成 4 個三角形（楔形），順序 0=上 1=右 2=下 3=左。
// 槽位(slot) = 面 f × 4 + 楔形 w，對應三角形編號 (slot+1)。

import * as THREE from 'three';

const H = 0.5;

// 面 0..5 的外法向（對面配對 0-4, 1-3, 2-5）
export const FACE_NORMAL: THREE.Vector3[] = [
  new THREE.Vector3(-1, 0, 0), // 0  -X
  new THREE.Vector3(0, 1, 0),  // 1  +Y
  new THREE.Vector3(0, 0, 1),  // 2  +Z
  new THREE.Vector3(0, -1, 0), // 3  -Y
  new THREE.Vector3(1, 0, 0),  // 4  +X
  new THREE.Vector3(0, 0, -1), // 5  -Z
];

// 每面「上」向量（決定楔形朝向；面內 right = up × normal）
const FACE_UP: THREE.Vector3[] = [
  new THREE.Vector3(0, 1, 0),  // 0 -X
  new THREE.Vector3(0, 0, -1), // 1 +Y
  new THREE.Vector3(0, 1, 0),  // 2 +Z
  new THREE.Vector3(0, 0, 1),  // 3 -Y
  new THREE.Vector3(0, 1, 0),  // 4 +X
  new THREE.Vector3(0, 1, 0),  // 5 -Z
];

function faceRight(f: number): THREE.Vector3 {
  return new THREE.Vector3().crossVectors(FACE_UP[f], FACE_NORMAL[f]).normalize();
}

/** 楔形 w 在面內的方向（單位向量）。 */
function wedgeInPlane(f: number, w: number): THREE.Vector3 {
  const u = faceRight(f), v = FACE_UP[f];
  switch (w) {
    case 0: return v.clone();
    case 1: return u.clone();
    case 2: return v.clone().multiplyScalar(-1);
    default: return u.clone().multiplyScalar(-1);
  }
}

/** 槽位 s 的代表 3D 位置（面中心 + 楔形方向偏移），用於旋轉比對。 */
export function slotDir(s: number): THREE.Vector3 {
  const f = Math.floor(s / 4), w = s % 4;
  return FACE_NORMAL[f].clone().multiplyScalar(H).add(wedgeInPlane(f, w).multiplyScalar(0.25));
}

/** 槽位 s 三角形「外緣邊」的中點（在方塊的稜邊上）。用於組裝：相符三角形共用此邊 = 表面相鄰可見。 */
export function slotEdgeMid(s: number): THREE.Vector3 {
  const f = Math.floor(s / 4), w = s % 4;
  return FACE_NORMAL[f].clone().multiplyScalar(H).add(wedgeInPlane(f, w).multiplyScalar(H));
}

// 面四個角（面座標）：TL, TR, BR, BL
function faceCorners(f: number): THREE.Vector3[] {
  const u = faceRight(f).multiplyScalar(H);
  const v = FACE_UP[f].clone().multiplyScalar(H);
  const c = FACE_NORMAL[f].clone().multiplyScalar(H);
  return [
    c.clone().sub(u).add(v),
    c.clone().add(u).add(v),
    c.clone().add(u).sub(v),
    c.clone().sub(u).sub(v),
  ];
}
const WEDGE_CORNERS: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 0]];

/**
 * 依 24 個三角形顏色建立一顆方塊的網格（軸對齊；旋轉由外部以 group.quaternion 套用）。
 */
export function buildCubeMesh(colors: number[], colorHex: Record<number, string>): THREE.Group {
  const positions: number[] = [];
  const vColors: number[] = [];
  const col = new THREE.Color();
  for (let f = 0; f < 6; f++) {
    const corners = faceCorners(f);
    const fc = FACE_NORMAL[f].clone().multiplyScalar(H);
    for (let w = 0; w < 4; w++) {
      const [i0, i1] = WEDGE_CORNERS[w];
      const p0 = corners[i0], p1 = corners[i1];
      positions.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, fc.x, fc.y, fc.z);
      col.set(colorHex[colors[f * 4 + w]] ?? '#888');
      for (let k = 0; k < 3; k++) vColors.push(col.r, col.g, col.b);
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.Float32BufferAttribute(vColors, 3));
  geom.computeVertexNormals();
  const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.45, metalness: 0.05, side: THREE.DoubleSide,
  }));
  const group = new THREE.Group();
  group.add(mesh);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2 * H, 2 * H, 2 * H)),
    new THREE.LineBasicMaterial({ color: 0x111111 }),
  );
  group.add(edges);
  const diag: number[] = [];
  for (let f = 0; f < 6; f++) {
    const cs = faceCorners(f);
    diag.push(cs[0].x, cs[0].y, cs[0].z, cs[2].x, cs[2].y, cs[2].z);
    diag.push(cs[1].x, cs[1].y, cs[1].z, cs[3].x, cs[3].y, cs[3].z);
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.Float32BufferAttribute(diag, 3));
  group.add(new THREE.LineSegments(dg, new THREE.LineBasicMaterial({ color: 0x222222 })));
  group.userData.edges = edges;
  return group;
}
