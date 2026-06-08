// 立體四方塊 · 顏色排列研究 —— 舊版做法（忠實重寫，紀念用）
// ============================================================================
// 這支程式把 2011 年原始程式（見同目錄 original_2011.cpp）的「暴力窮舉」精神
// 整理成乾淨可讀、可編譯的現代 C++，方法完全相同——只是不再手寫 36 層巢狀 for
// 與 1200 多個 if，而是用一支遞迴 odometer 跑同一個搜尋空間，並修掉原碼的 bug
// （e_i 誤用 +=、a22==a22 筆誤、距離檢查重複貼三次）。
//
// 【原始做法的精神】
//   ‧ 前提：RRRR/YYYY/BBBB 三個單色面分屬甲乙丙三顆 → 自由三角形 8+8+8+12 = 36。
//   ‧ 直接巢狀窮舉這 36 個自由變數 → 3^36 ≈ 1.5×10^17 種組合。
//   ‧ 對每一種組合：算出 24 個面的「旋轉標準型」，檢查
//       (1) 24 面兩兩相異（= 用滿全部 24 種面）；
//       (2) 36 個自由三角形之和 == 36（顏色平衡）。
//
// 【為什麼當年沒跑完】3^36 ≈ 1.5×10^17。即使每秒十億組也要約 4.8 年。
//   精確答案請看上一層 color_study.cpp（各方塊獨立枚舉，毫秒完成，答案 792,238,080）。
//
// 本檔示範「同一套暴力窮舉」於一個跑得完的切片：先湊出一組面不重疊、且丁補得起來的
// 甲乙丙，再老老實實窮舉丁的 3^12 種塗法，數出能讓 24 面全不同 + 平衡的丁有幾種。
// ============================================================================

#include <array>
#include <cstdint>
#include <iostream>
#include <unordered_set>
#include <vector>

using std::array;
using std::vector;

// 面的旋轉標準型：4 個三角形取 4 種循環旋轉中最大的代碼。
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

// 標準型代碼 → 索引(0..23)，共 24 種面。
#include <map>
static std::map<int, int> buildCodeIndex() {
    std::map<int, int> idx; int n = 0;
    for (int w=0;w<3;w++) for (int x=0;x<3;x++) for (int y=0;y<3;y++) for (int z=0;z<3;z++) {
        int c = canon(w,x,y,z); if (!idx.count(c)) idx[c] = n++;
    }
    return idx;
}
static const std::map<int,int> CODE_INDEX = buildCodeIndex();
static const uint32_t FULL_MASK = (1u << 24) - 1;

// 甲/乙/丙：固定面色 F，自由變數 [a1,a3,a4,a5,a6,a14,a15,a18]。
static array<int, 24> buildABC(int F, const array<int, 8>& f) {
    int a1=f[0],a3=f[1],a4=f[2],a5=f[3],a6=f[4],a14=f[5],a15=f[6],a18=f[7];
    return { a1, F, a3, a4,  a5, a6, F, a1,  F, F, F, F,
             F, a14, a15, a3,  a6, a18, a14, F,  a5, a4, a15, a18 };
}
// 丁：自由變數 [d1,d2,d3,d4,d5,d6,d7,d10,d11,d14,d15,d18]。
static array<int, 24> buildD(const array<int, 12>& f) {
    int d1=f[0],d2=f[1],d3=f[2],d4=f[3],d5=f[4],d6=f[5],d7=f[6],d10=f[7],d11=f[8],d14=f[9],d15=f[10],d18=f[11];
    return { d1, d2, d3, d4,  d5, d6, d7, d1,  d7, d10, d11, d2,
             d11, d14, d15, d3,  d6, d18, d14, d10,  d5, d4, d15, d18 };
}

// 由 24 三角形算出 6 面 face-mask（6 面互異才回傳 true），並回傳自由和。
template <int N>
static bool maskOf(const array<int, 24>& t, const array<int, N>& f, uint32_t& mask, int& sum) {
    mask = 0;
    for (int i = 0; i < 6; i++) {
        int bit = CODE_INDEX.at(canon(t[i*4], t[i*4+1], t[i*4+2], t[i*4+3]));
        if (mask & (1u << bit)) return false;
        mask |= (1u << bit);
    }
    sum = 0; for (int v : f) sum += v;
    return true;
}

struct Coloring { uint32_t mask; int sum; };

static vector<Coloring> enumABC(int F) {
    vector<Coloring> out;
    array<int, 8> f{};
    while (true) {
        uint32_t m; int s;
        if (maskOf<8>(buildABC(F, f), f, m, s)) out.push_back({m, s});
        int i = 0; for (; i < 8; i++) { if (++f[i] < 3) break; f[i] = 0; }
        if (i == 8) break;
    }
    return out;
}

int main() {
    std::cout << "立體四方塊 · 顏色排列研究 —— 舊版暴力解法（紀念重寫）\n";
    std::cout << "============================================================\n";
    std::cout << "方法：窮舉自由三角形，檢查「24 面全不同 + 平衡(和==36)」。\n\n";

    auto A = enumABC(2), B = enumABC(1), C = enumABC(0);

    // 先記下「丁」能塗出哪些 face-mask（暴力窮舉 3^12），供挑一組補得起來的甲乙丙。
    std::unordered_set<uint32_t> dMasks;
    {
        array<int, 12> fd{};
        while (true) {
            uint32_t m; int s;
            if (maskOf<12>(buildD(fd), fd, m, s)) dMasks.insert(m);
            int i = 0; for (; i < 12; i++) { if (++fd[i] < 3) break; fd[i] = 0; }
            if (i == 12) break;
        }
    }

    // 暴力湊一組 (甲,乙,丙)：面兩兩不重疊，且剩下的 6 面正好是丁塗得出來的。
    Coloring ca{}, cb{}, cc{}; bool found = false;
    for (auto& a : A) { for (auto& b : B) {
        if (a.mask & b.mask) continue;
        uint32_t ab = a.mask | b.mask;
        for (auto& c : C) {
            if (ab & c.mask) continue;
            if (dMasks.count(FULL_MASK ^ (ab | c.mask))) { ca=a; cb=b; cc=c; found=true; break; }
        }
        if (found) break;
    } if (found) break; }

    std::cout << "（示範：暴力湊出一組丁補得起來的甲乙丙，再老實窮舉丁的 3^12 種塗法，\n";
    std::cout << "  數有幾種丁能讓四顆合起來 24 面全不同 + 平衡。）\n\n";

    int64_t triedD = 0, okD = 0;
    array<int, 12> fd{};
    while (true) {
        ++triedD;
        uint32_t md; int sd;
        bool sixOk = maskOf<12>(buildD(fd), fd, md, sd);
        // 原始的 if(p==36) + 24 面全不同：四 mask 兩兩不交且補滿，且自由和 = 36
        if (sixOk && !((ca.mask | cb.mask | cc.mask) & md)
            && (ca.mask | cb.mask | cc.mask | md) == FULL_MASK
            && (ca.sum + cb.sum + cc.sum + sd) == 36)
            ++okD;
        int i = 0; for (; i < 12; i++) { if (++fd[i] < 3) break; fd[i] = 0; }
        if (i == 12) break;
    }

    std::cout << "窮舉丁的塗法 : " << triedD << "（= 3^12）\n";
    std::cout << "其中合法的丁 : " << okD << " 種（讓這組甲乙丙的 24 面全不同 + 平衡）\n\n";

    std::cout << "—— 真正的題目 ——\n";
    std::cout << "四顆同時自由 → 3^36 ≈ 1.5×10^17 組，同樣方法跑不完（約 4.8 年）。\n";
    std::cout << "上一層 color_study.cpp 改成各方塊獨立枚舉 + 組合，毫秒得精確總數 792,238,080。\n";
    return 0;
}
