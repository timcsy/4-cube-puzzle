// 立體四方塊 · 顏色排列研究（現代重製版）
// ============================================================================
// 忠實重現 2011 原始程式 legacy/original_2011.cpp 的「真正意圖」，並修正其 bug、
// 用每顆方塊獨立枚舉把 3^36 的暴力縮成毫秒級。
//
// 【這個研究在問什麼】
//   正方形用兩條對角線切成 4 個三角形、塗紅(R=2)/黃(Y=1)/藍(B=0)，「旋轉視為相同」，
//   則恰好有 24 種不同的面（Burnside：(3^4+3+9+3)/4 = 24）。四顆方塊共 24 面，
//   剛好一面不多一面不少。問題是：**這 24 個不同的面要怎麼排到甲乙丙丁四顆方塊上？**
//
// 【關鍵前提（原研究的推論）】三個「整面同色」的面 RRRR、YYYY、BBBB 分屬三顆方塊：
//   甲有一面全紅、乙有一面全黃、丙有一面全藍、丁沒有單色面。
//   這個推論寫死在原程式的變數初始化裡，使自由三角形縮成 8+8+8+12 = 36 個。
//
// 【合法條件】(1) 24 個面的「旋轉標準型」兩兩不同（= 恰好用掉全部 24 種面）；
//            (2) 顏色平衡：36 個自由三角形之和 = 36。
//
// 【原始 main.cpp 的做法與 bug】用 36 層巢狀 for 直接窮舉 3^36 ≈ 1.5×10^17（跑不完），
//   且 e_i 用了 `+=`（應為 `=`）累加標準型、有 `a22==a22` 筆誤、距離檢查整段重複，
//   所以原碼其實算不出正解。本版把「面的旋轉標準型 + 24 面全不同 + 平衡」這個意圖
//   正確實作，並改成各方塊獨立枚舉（3^8×3 + 3^12 ≈ 55 萬次）後再組合，瞬間得解。
// ============================================================================

#include <array>
#include <cstdint>
#include <iostream>
#include <map>

using std::array;
using std::map;

// ── 面的「旋轉標準型」：4 個三角形取 4 種循環旋轉中最大的 4 位數代碼 ──────────────
// （與原程式 e_i 那 42 個 if-else 等價，但只要一行。）
static int canon(int w, int x, int y, int z) {
    int r0 = w * 1000 + x * 100 + y * 10 + z;
    int r1 = x * 1000 + y * 100 + z * 10 + w;
    int r2 = y * 1000 + z * 100 + w * 10 + x;
    int r3 = z * 1000 + w * 100 + x * 10 + y;
    int m = r0;
    if (r1 > m) m = r1;
    if (r2 > m) m = r2;
    if (r3 > m) m = r3;
    return m;
}

// 把 81 種面依旋轉歸類，建立 標準型代碼 → 索引(0..23) 的對照，共 24 種。
static map<int, int> buildCodeIndex() {
    map<int, int> idx;
    int next = 0;
    for (int w = 0; w < 3; w++)
        for (int x = 0; x < 3; x++)
            for (int y = 0; y < 3; y++)
                for (int z = 0; z < 3; z++) {
                    int c = canon(w, x, y, z);
                    if (idx.find(c) == idx.end()) idx[c] = next++;
                }
    return idx;
}
static const map<int, int> CODE_INDEX = buildCodeIndex();
static const uint32_t FULL_MASK = (1u << 24) - 1; // 24 種面全到齊

// 一顆方塊枚舉後的彙整：face-mask(哪 6 種面) → (此 mask 的塗色種數, 自由三角形和)。
// 註：相同 6 面 ⇒ 顏色總量相同 ⇒ 自由和相同，故 sum 由 mask 唯一決定。
struct CubeTable {
    map<uint32_t, std::pair<int64_t, int>> byMask; // mask -> (count, freeSum)
    int64_t colorings = 0;     // 總塗色數（3^free）
    int64_t sixDistinct = 0;   // 其中 6 面互異的塗色數
};

// 由「6 個面的 4 三角形」算出 mask；6 面須互異才回傳 true。
static bool faceMask(const array<int, 24>& t, uint32_t& mask) {
    mask = 0;
    for (int f = 0; f < 6; f++) {
        int c = canon(t[f * 4], t[f * 4 + 1], t[f * 4 + 2], t[f * 4 + 3]);
        int bit = CODE_INDEX.at(c);
        if (mask & (1u << bit)) return false; // 同一顆出現重複面 → 不可能達成全不同
        mask |= (1u << bit);
    }
    return true;
}

// 甲/乙/丙：固定面色 F（紅2/黃1/藍0），自由變數 [a1,a3,a4,a5,a6,a14,a15,a18]。
// 面 3 = (t9..t12) = (F,F,F,F)，即那一整面同色。
static array<int, 24> buildABC(int F, const array<int, 8>& f) {
    int a1 = f[0], a3 = f[1], a4 = f[2], a5 = f[3], a6 = f[4], a14 = f[5], a15 = f[6], a18 = f[7];
    return { a1, F, a3, a4,  a5, a6, F, a1,  F, F, F, F,
             F, a14, a15, a3,  a6, a18, a14, F,  a5, a4, a15, a18 };
}

// 丁：12 個自由變數，無固定單色面。
static array<int, 24> buildD(const array<int, 12>& f) {
    int d1 = f[0], d2 = f[1], d3 = f[2], d4 = f[3], d5 = f[4], d6 = f[5],
        d7 = f[6], d10 = f[7], d11 = f[8], d14 = f[9], d15 = f[10], d18 = f[11];
    return { d1, d2, d3, d4,  d5, d6, d7, d1,  d7, d10, d11, d2,
             d11, d14, d15, d3,  d6, d18, d14, d10,  d5, d4, d15, d18 };
}

// 以三進位 odometer 枚舉一顆方塊的所有塗色，彙整成 CubeTable。
template <int N, class Build>
static CubeTable enumerateCube(Build build) {
    CubeTable tbl;
    array<int, N> f{};
    while (true) {
        tbl.colorings++;
        auto t = build(f);
        uint32_t mask;
        if (faceMask(t, mask)) {
            int sum = 0;
            for (int v : f) sum += v;
            auto& cell = tbl.byMask[mask];
            cell.first++;
            cell.second = sum;
            tbl.sixDistinct++;
        }
        int i = 0;
        for (; i < N; i++) { if (++f[i] < 3) break; f[i] = 0; }
        if (i == N) break;
    }
    return tbl;
}

int main() {
    std::cout << "立體四方塊 · 顏色排列研究（現代重製）\n";
    std::cout << "============================================\n\n";

    std::cout << "可塗出的「不同面」種數（3 色塗對角線正方形，旋轉同視）= "
              << CODE_INDEX.size() << "（Burnside: (81+3+9+3)/4 = 24）\n";
    std::cout << "四顆方塊共 6×4 = 24 面，恰好一面不多一面不少。\n\n";

    // 各方塊獨立枚舉
    CubeTable A = enumerateCube<8>([](const array<int, 8>& f) { return buildABC(2, f); }); // 甲：紅
    CubeTable B = enumerateCube<8>([](const array<int, 8>& f) { return buildABC(1, f); }); // 乙：黃
    CubeTable C = enumerateCube<8>([](const array<int, 8>& f) { return buildABC(0, f); }); // 丙：藍
    CubeTable D = enumerateCube<12>([](const array<int, 12>& f) { return buildD(f); });    // 丁

    auto report = [](const char* name, const CubeTable& t, int freeN) {
        std::cout << "方塊 " << name << "：塗色 " << t.colorings << "（=3^" << freeN
                  << "），其中 6 面互異 " << t.sixDistinct << " 種，相異 face-mask "
                  << t.byMask.size() << " 組\n";
    };
    report("甲(紅)", A, 8);
    report("乙(黃)", B, 8);
    report("丙(藍)", C, 8);
    report("丁", D, 12);

    // 組合：四顆的 6 面要兩兩不相交、合起來剛好 24 種面，且自由和合計 = 36（平衡）。
    int64_t solBalanced = 0;   // 滿足「24 面全不同 + 平衡」的塗色組（有標號）
    int64_t solAnySum = 0;     // 只要「24 面全不同」（不強制平衡）的塗色組
    int64_t designs = 0;       // 不同的 (面分配) 設計數

    for (auto& [mA, vA] : A.byMask)
        for (auto& [mB, vB] : B.byMask) {
            if (mA & mB) continue;
            uint32_t mAB = mA | mB;
            for (auto& [mC, vC] : C.byMask) {
                if (mAB & mC) continue;
                uint32_t need = FULL_MASK ^ (mAB | mC); // 丁必須補滿剩下 6 種面
                auto it = D.byMask.find(need);
                if (it == D.byMask.end()) continue;
                auto& vD = it->second;
                int64_t ways = vA.first * vB.first * vC.first * vD.first;
                solAnySum += ways;
                designs++;
                if (vA.second + vB.second + vC.second + vD.second == 36)
                    solBalanced += ways;
            }
        }

    std::cout << "\n—— 結果 ——\n";
    std::cout << "「24 面全不同」的塗色組（有標號）       = " << solAnySum << '\n';
    std::cout << "「24 面全不同 + 顏色平衡(和=36)」的塗色組 = " << solBalanced << '\n';
    std::cout << "可達成全不同的『面分配設計』數            = " << designs << '\n';

    if (solAnySum == solBalanced)
        std::cout << "\n觀察：只要 24 面全不同，顏色就自動平衡（和必為 36）——\n"
                     "因為用滿全部 24 種面時，三色三角形數必然相等，平衡是必然結果。\n";

    std::cout << "\n—— 對照原始程式 ——\n";
    std::cout << "legacy/original_2011.cpp：36 層 for 窮舉 3^36 ≈ 1.5e17（跑不完），\n";
    std::cout << "且 e_i 用 += 累加、有 a22==a22 筆誤、距離檢查重複貼三次（算不出正解）。\n";
    std::cout << "本版正確實作其意圖，且各方塊獨立枚舉，毫秒級完成。\n";
    return 0;
}
