// 解法引擎 —— 忠實重現 2011 年原始 C++ 暴力窮舉演算法
//
// 原始程式：四個實體方塊 a,b,c,d 各有 24 種旋轉，四層迴圈跑遍 24⁴ 種旋轉組合，
// 每組再嘗試 24 種「方塊 ↔ 位置」排列（4! 種），對每種組合檢查該圖形的相鄰約束。
//   總嘗試數 = 24⁴ × 24 = 7,962,624（與報告數字一致）
//
// 本實作邏輯等價：列舉 4! 種「位置→實體方塊」指派，再對每顆方塊獨立列舉 24 旋轉。
// 經驗證可重現報告所有已公布的解答數（圖形1=40原始/20化簡、圖形3=134、圖形5=8、圖形6=4…）。

import type { CubeKey, Constraint, PuzzleData, Solution } from './types';

const KEYS: CubeKey[] = ['a', 'b', 'c', 'd'];

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  arr.forEach((x, i) => {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) out.push([x, ...p]);
  });
  return out;
}

const POSITION_PERMS = permutations(KEYS);

/** 取某實體方塊在某旋轉下、某槽位(1..24)的顏色。 */
function tri(cubes: Record<CubeKey, Int8Array>, cube: CubeKey, orient: number, t: number): number {
  return cubes[cube][orient * 24 + (t - 1)];
}

export interface SolveResult {
  rawCount: number;
  solutions: Solution[];
}

/**
 * 解出指定圖形的所有排列解。
 * @param maxSolutions 最多收集幾組解（避免圖形4/L型那種數萬解撐爆記憶體；計數仍為完整 rawCount）
 */
export function solveShape(
  data: PuzzleData,
  shapeId: string,
  maxSolutions = 2000,
): SolveResult {
  const shape = data.shapes[shapeId];
  const cubes: Record<CubeKey, Int8Array> = {
    a: Int8Array.from(data.cubes.a),
    b: Int8Array.from(data.cubes.b),
    c: Int8Array.from(data.cubes.c),
    d: Int8Array.from(data.cubes.d),
  };
  const constraints: Constraint[] = shape.constraints;

  let rawCount = 0;
  const solutions: Solution[] = [];

  for (const perm of POSITION_PERMS) {
    // 位置 a,b,c,d 分別指派到哪個實體方塊
    const pos: Record<CubeKey, CubeKey> = { a: perm[0], b: perm[1], c: perm[2], d: perm[3] };
    // 預解析約束 → (實體方塊1, 槽位1, 實體方塊2, 槽位2)
    const cc = constraints.map(([p1, t1, p2, t2]) => [pos[p1], t1, pos[p2], t2] as const);

    for (let oa = 0; oa < 24; oa++)
      for (let ob = 0; ob < 24; ob++)
        for (let oc = 0; oc < 24; oc++)
          for (let od = 0; od < 24; od++) {
            const orient: Record<CubeKey, number> = { a: oa, b: ob, c: oc, d: od };
            let ok = true;
            for (let m = 0; m < cc.length; m++) {
              const [c1, t1, c2, t2] = cc[m];
              if (tri(cubes, c1, orient[c1], t1) !== tri(cubes, c2, orient[c2], t2)) {
                ok = false;
                break;
              }
            }
            if (ok) {
              rawCount++;
              if (solutions.length < maxSolutions) {
                solutions.push({
                  placement: {
                    a: { cube: pos.a, orient: orient[pos.a] },
                    b: { cube: pos.b, orient: orient[pos.b] },
                    c: { cube: pos.c, orient: orient[pos.c] },
                    d: { cube: pos.d, orient: orient[pos.d] },
                  },
                });
              }
            }
          }
  }

  return { rawCount, solutions };
}
