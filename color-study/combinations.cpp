// 立體四方塊 · 顏色排列研究 —— 組合數（Burnside 軌道計數）
// ============================================================================
// color_study.cpp 算出「排列數」792,238,080（把每顆方塊的每種擺向視為不同）。
// 本檔把「同一顆方塊轉到不同方向」視為同一種，算出**組合數**（本質不同的拼圖設計）。
//
// 【關鍵模型】每顆方塊的塗色，其實就是它 **12 條稜邊**的塗色：
//   原始程式的綁定（a8=a1, a16=a3, …）+ 單色面四周固定，等價於「每條稜邊兩側同色」，
//   所以一顆方塊 = 給 12 條稜邊各塗一色。甲/乙/丙 有一面固定 → 4 邊定色、8 邊自由(3^8)；
//   丁無固定面 → 12 邊自由(3^12)。一個面的花樣 = 圍著它的 4 條稜邊（循環）的旋轉標準型。
//
// 【方法】方塊的 24 種空間旋轉作用在 12 條稜邊上。對每顆方塊枚舉合法塗色（6 面互異），
//   以「24 種旋轉後字典序最小」為軌道代表，依 face-mask 分組數出**軌道數**；再像
//   color_study 一樣組合（四 mask 兩兩不交、合滿 24 面）。順便驗證排列數 = 792,238,080。
// ============================================================================

#include <algorithm>
#include <array>
#include <cstdint>
#include <iostream>
#include <map>
#include <set>
#include <vector>

using std::array;
using std::vector;

// ── 立方體幾何：6 面法向、12 稜邊（兩兩垂直的法向對）──────────────────────────
struct V3 { int x, y, z; };
static V3 NORMALS[6] = {{1,0,0},{-1,0,0},{0,1,0},{0,-1,0},{0,0,1},{0,0,-1}};

static int normalIndex(V3 v) {
    for (int i = 0; i < 6; i++)
        if (NORMALS[i].x == v.x && NORMALS[i].y == v.y && NORMALS[i].z == v.z) return i;
    return -1;
}
static V3 cross(V3 a, V3 b) { return {a.y*b.z - a.z*b.y, a.z*b.x - a.x*b.z, a.x*b.y - a.y*b.x}; }
static int dot(V3 a, V3 b) { return a.x*b.x + a.y*b.y + a.z*b.z; }
static V3 neg(V3 a) { return {-a.x, -a.y, -a.z}; }

// 12 條稜邊 = 一對垂直法向（無序）。edgeId[a][b] 給出邊索引。
static vector<std::pair<int,int>> EDGES;
static int EDGE_ID[6][6];

static void buildEdges() {
    for (auto& r : EDGE_ID) for (int& c : r) c = -1;
    for (int i = 0; i < 6; i++)
        for (int j = i + 1; j < 6; j++)
            if (dot(NORMALS[i], NORMALS[j]) == 0) {          // 垂直才成邊
                EDGE_ID[i][j] = EDGE_ID[j][i] = (int)EDGES.size();
                EDGES.push_back({i, j});
            }
}

// 每個面（法向 n）周圍 4 條稜邊，依繞著 n 的循環順序：m, n×m, -m, -(n×m)。
static array<array<int,4>,6> FACE_EDGES;
static void buildFaces() {
    for (int f = 0; f < 6; f++) {
        V3 n = NORMALS[f];
        // 取一個與 n 垂直的法向當起點
        V3 m{};
        for (int i = 0; i < 6; i++) if (dot(NORMALS[i], n) == 0) { m = NORMALS[i]; break; }
        V3 seq[4] = { m, cross(n, m), neg(m), neg(cross(n, m)) };
        for (int k = 0; k < 4; k++)
            FACE_EDGES[f][k] = EDGE_ID[f][normalIndex(seq[k])];
    }
}

// 24 種旋轉（行列式 +1 的整數正交矩陣）作用在稜邊上的置換。
static vector<array<int,12>> EDGE_PERM;
static void buildRotations() {
    vector<V3> unit(NORMALS, NORMALS + 6);
    for (V3 a : unit) for (V3 b : unit) {
        if (dot(a, b) != 0) continue;
        V3 c = cross(a, b);
        // 矩陣列為 a,b,c；det = a·(b×c)
        // 把每個面法向經此旋轉送到何處：col 基底 (a,b,c) 表示 x→a, y→b, z→c
        auto apply = [&](V3 v) -> V3 {
            return { a.x*v.x + b.x*v.y + c.x*v.z,
                     a.y*v.x + b.y*v.y + c.y*v.z,
                     a.z*v.x + b.z*v.y + c.z*v.z };
        };
        // 行列式 +1 檢查
        V3 e1 = apply({1,0,0}), e2 = apply({0,1,0}), e3 = apply({0,0,1});
        if (dot(e1, cross(e2, e3)) != 1) continue;
        array<int,12> perm{};
        for (int e = 0; e < 12; e++) {
            auto [i, j] = EDGES[e];
            perm[e] = EDGE_ID[normalIndex(apply(NORMALS[i]))][normalIndex(apply(NORMALS[j]))];
        }
        EDGE_PERM.push_back(perm);
    }
}

// 面標準型：4 條稜邊顏色取 4 種循環旋轉中最大者。
static int canon(int w, int x, int y, int z) {
    int r[4] = { w*1000+x*100+y*10+z, x*1000+y*100+z*10+w,
                 y*1000+z*100+w*10+x, z*1000+w*100+x*10+y };
    return *std::max_element(r, r + 4);
}
static std::map<int,int> CODE_INDEX;
static void buildCodeIndex() {
    int n = 0;
    for (int w=0;w<3;w++) for (int x=0;x<3;x++) for (int y=0;y<3;y++) for (int z=0;z<3;z++) {
        int c = canon(w,x,y,z); if (!CODE_INDEX.count(c)) CODE_INDEX[c] = n++;
    }
}
static const uint32_t FULL_MASK = (1u << 24) - 1;

// 由 12 邊顏色算 6 面 face-mask（6 面互異才回傳 true）。
static bool maskOf(const array<int,12>& col, uint32_t& mask) {
    mask = 0;
    for (int f = 0; f < 6; f++) {
        auto& fe = FACE_EDGES[f];
        int bit = CODE_INDEX.at(canon(col[fe[0]], col[fe[1]], col[fe[2]], col[fe[3]]));
        if (mask & (1u << bit)) return false;
        mask |= (1u << bit);
    }
    return true;
}

// 旋轉後的塗色：rotated[ perm[e] ] = col[e]。
static array<int,12> rotate(const array<int,12>& col, const array<int,12>& perm) {
    array<int,12> out{};
    for (int e = 0; e < 12; e++) out[perm[e]] = col[e];
    return out;
}
// 軌道代表：24 種旋轉後字典序最小的 12 元組。
static array<int,12> canonical(const array<int,12>& col) {
    array<int,12> best = col;
    for (auto& p : EDGE_PERM) { auto r = rotate(col, p); if (r < best) best = r; }
    return best;
}

// 對一個「角色」枚舉全部 3^12 塗色，篩出合法者（6 面互異，且含指定單色碼 monoCode；
// monoCode<0 表示丁——不需單色面）。回傳：mask → (排列數count, 軌道數orbits)。
struct Tab { std::map<uint32_t, int64_t> count; std::map<uint32_t, int64_t> orbits; };
static Tab enumerateRole(int monoCode) {
    Tab tab;
    std::map<uint32_t, std::set<array<int,12>>> reps;
    array<int,12> col{};
    while (true) {
        uint32_t mask;
        if (maskOf(col, mask)) {
            // 甲乙丙：須含指定單色面；丁：只要 6 面互異（單色面衝突交給組合階段的 disjoint 過濾）
            bool ok = (monoCode < 0) || (mask & (1u << CODE_INDEX.at(monoCode)));
            if (ok) {
                tab.count[mask]++;
                reps[mask].insert(canonical(col));
            }
        }
        int i = 0; for (; i < 12; i++) { if (++col[i] < 3) break; col[i] = 0; }
        if (i == 12) break;
    }
    for (auto& [m, s] : reps) tab.orbits[m] = (int64_t)s.size();
    return tab;
}

int main() {
    buildEdges(); buildFaces(); buildRotations(); buildCodeIndex();
    std::cout << "幾何檢查：稜邊 " << EDGES.size() << " 條、旋轉 " << EDGE_PERM.size()
              << " 種、不同面 " << CODE_INDEX.size() << " 種\n\n";

    // mono 顏色碼：RRRR=2222, YYYY=1111, BBBB=0000
    Tab A = enumerateRole(2222); // 甲 紅
    Tab B = enumerateRole(1111); // 乙 黃
    Tab C = enumerateRole(0);    // 丙 藍 (BBBB=0000 的 canon = 0)
    Tab D = enumerateRole(-1);   // 丁

    auto sumv = [](const std::map<uint32_t,int64_t>& m){ int64_t s=0; for(auto&kv:m)s+=kv.second; return s; };
    std::cout << "（未固定朝向，全 3^12 枚舉）合法塗色數（排列）/ 軌道數（組合）：\n";
    std::cout << "  甲：" << sumv(A.count) << " / " << sumv(A.orbits) << '\n';
    std::cout << "  乙：" << sumv(B.count) << " / " << sumv(B.orbits) << '\n';
    std::cout << "  丙：" << sumv(C.count) << " / " << sumv(C.orbits) << '\n';
    std::cout << "  丁：" << sumv(D.count) << " / " << sumv(D.orbits) << '\n';

    // 組合：四 mask 兩兩不相交、合起來 = 24 種面
    int64_t perm = 0, comb = 0, partitions = 0;
    for (auto& [mA, cA] : A.count) {
        int64_t oA = A.orbits[mA];
        for (auto& [mB, cB] : B.count) {
            if (mA & mB) continue; uint32_t mAB = mA | mB; int64_t oB = B.orbits[mB];
            for (auto& [mC, cC] : C.count) {
                if (mAB & mC) continue; uint32_t mABC = mAB | mC;
                uint32_t need = FULL_MASK ^ mABC;
                auto it = D.count.find(need);
                if (it == D.count.end()) continue;
                partitions++;                      // 一組「24 面如何分給四顆」的分法
                perm += cA * cB * cC * it->second;
                comb += oA * oB * C.orbits[mC] * D.orbits[need];
            }
        }
    }
    std::cout << "\n合法的『面分配方式』數（24 面分成四組 6 面，各顆塗得出來）= " << partitions << '\n';

    std::cout << "\n—— 結果 ——\n";
    std::cout << "排列數（未固定朝向；含整顆方塊 24 朝向重複）= " << perm << '\n';
    std::cout << "組合數（除去每顆方塊的 24 種旋轉）           = " << comb << '\n';
    std::cout << "比值 排列/組合 = " << (double)perm / (double)comb << "（應為 24^4 = 331776 量級）\n";
    return 0;
}
