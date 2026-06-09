// 立體四方塊資料模型
//
// 顏色編碼（沿用 2011 原始研究）：紅 R=2、黃 Y=1、藍 B=0
// 每個方塊有 6 個面，每面以兩條對角線切成 4 個三角形 → 24 個「三角形槽位」。
// 槽位編號 1..24：面 f（0..5）的 4 個三角形為 [4f+1, 4f+2, 4f+3, 4f+4]。
// 每個方塊有 24 種旋轉（orientation），故資料表為 24×24 = 576 個值。

export type CubeKey = 'a' | 'b' | 'c' | 'd';

/** 一條相鄰約束：位置 p1 的三角形 t1 必須與位置 p2 的三角形 t2 同色。 */
export type Constraint = [p1: CubeKey, t1: number, p2: CubeKey, t2: number];

/** 兩個方塊位置之間的相接面關係（由約束推導，供 3D 組裝用）。 */
export interface Adjacency {
  a: CubeKey;
  b: CubeKey;
  faceA: number; // 0..5
  faceB: number; // 0..5
}

export interface Shape {
  id: string;
  title: string;
  level: string;
  note?: string;
  constraints: Constraint[];
  adjacency?: Adjacency[];
  rawCount?: number;            // 程式窮舉的原始排列數
  reducedCount: number | null; // 報告中對稱化簡後的解法數（部分已知）
  cells?: [number, number, number][]; // 4 顆方塊的格座標（動態 88 形狀用；供組裝對齊朝向）
  official?: string | null;     // 對應的官方圖形 id（'1'..'13'）；非官方為 null
}

export interface PuzzleData {
  meta: {
    title: string;
    colors: Record<string, string>;
    colorNames: Record<string, string>;
    cubeNames: Record<CubeKey, string>;
    totalArrangements: number;
    description: string;
  };
  cubes: Record<CubeKey, number[]>; // 每個 576 個值
  shapes: Record<string, Shape>;
  shapeOrder: string[];
}

/** 一組解：每個位置 → {實體方塊, 旋轉編號} */
export interface Solution {
  // 位置 a,b,c,d 各自分配到哪個實體方塊與其旋轉
  placement: Record<CubeKey, { cube: CubeKey; orient: number }>;
}

export const COLOR_HEX: Record<number, string> = {
  2: '#e23b3b', // 紅
  1: '#f2c200', // 黃
  0: '#2f6bd8', // 藍
};
