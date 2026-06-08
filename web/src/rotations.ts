// 方塊 24 種 orientation 之間的「轉 90°」轉換表。
// 由幾何（slotDir + 旋轉矩陣）反推、並驗證：皆為合法置換、轉 4 次回原、四個方塊一致。
// rotX[o] = 方塊在 orientation o 時，繞世界 X 軸轉 +90° 後變成的 orientation。

export const ROT_X: number[] = [4, 5, 6, 7, 22, 23, 20, 21, 9, 10, 11, 8, 0, 1, 2, 3, 19, 16, 17, 18, 14, 15, 12, 13];
export const ROT_Y: number[] = [16, 17, 18, 19, 5, 6, 7, 4, 0, 1, 2, 3, 15, 12, 13, 14, 20, 21, 22, 23, 8, 9, 10, 11];
export const ROT_Z: number[] = [3, 0, 1, 2, 19, 16, 17, 18, 7, 4, 5, 6, 11, 8, 9, 10, 15, 12, 13, 14, 21, 22, 23, 20];

/** 反向（-90°）：轉 3 次正向。 */
function inverse(t: number[]): number[] {
  const inv = new Array(24);
  for (let o = 0; o < 24; o++) inv[t[o]] = o;
  return inv;
}
export const ROT_X_INV = inverse(ROT_X);
export const ROT_Y_INV = inverse(ROT_Y);
export const ROT_Z_INV = inverse(ROT_Z);

export type Axis = 'x' | 'y' | 'z';
export function rotateOrient(o: number, axis: Axis, dir: 1 | -1): number {
  const t = axis === 'x' ? (dir === 1 ? ROT_X : ROT_X_INV)
    : axis === 'y' ? (dir === 1 ? ROT_Y : ROT_Y_INV)
      : (dir === 1 ? ROT_Z : ROT_Z_INV);
  return t[o];
}
