// 探索 242 個「可全玩」本質設計的結構：方塊重用、解數簽章、原始套組排名。
// 從 web/ 執行：node scripts/explore-242.mjs  → 另寫出 docs/data/fully-playable-242-stats.csv

import fs from 'fs';
const D=JSON.parse(fs.readFileSync('../docs/data/fully-playable-242.json','utf8'));
const data=JSON.parse(fs.readFileSync('public/data/puzzle-data.json','utf8'));
const R=D.designs;
// —— (1) 每個角色用到幾種不同方塊 ——
const setOf=k=>new Set(R.map(r=>r.cubes[k].join('')));
const sj=setOf('jia'),sy=setOf('yi'),sb=setOf('bing'),sd=setOf('ding');
console.log('== 242 個代表用到的「不同方塊」數 ==');
console.log(`甲：${sj.size}　乙：${sy.size}　丙：${sb.size}　丁：${sd.size}（每角色 632/632/632/8345 種可能）`);
// 共用結構：每顆甲被幾個設計用
const cnt=k=>{const m={};for(const r of R){const key=r.cubes[k].join('');m[key]=(m[key]||0)+1;}return Object.values(m).sort((a,b)=>b-a);}
const hj=cnt('jia');
console.log(`每顆甲被幾個設計共用（前10）：${hj.slice(0,10).join(',')}　最多 ${hj[0]} 個設計共用同一顆甲`);
console.log(`只被 1 個設計用的甲：${hj.filter(x=>x===1).length} 顆`);
// —— 幾何（建 PERMS 供上色 + 解題）——
const FN=[[-1,0,0],[0,1,0],[0,0,1],[0,-1,0],[1,0,0],[0,0,-1]],FU=[[0,1,0],[0,0,-1],[0,1,0],[0,0,1],[0,1,0],[0,1,0]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],nrm=v=>{const m=Math.hypot(...v);return[v[0]/m,v[1]/m,v[2]/m];};
const fr=f=>nrm(cross(FU[f],FN[f])),wd=(f,w)=>{const u=fr(f),v=FU[f];return w===0?v:w===1?u:w===2?v.map(x=>-x):u.map(x=>-x);};
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],ap=(M,v)=>[dot(M[0],v),dot(M[1],v),dot(M[2],v)];
const units=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const mats=[];for(const a of units)for(const b of units){if(dot(a,b)!==0)continue;const c=cross(a,b),M=[[a[0],b[0],c[0]],[a[1],b[1],c[1]],[a[2],b[2],c[2]]],det=M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1])-M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0])+M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]);if(det===1)mats.push(M);}
const fnK=v=>v.map(Math.round).join(','),fnI={};FN.forEach((n,i)=>fnI[fnK(n)]=i);
const so=(n,d)=>{const f=fnI[fnK(n)];for(let w=0;w<4;w++){const dw=wd(f,w);if(Math.abs(dw[0]-d[0])<1e-6&&Math.abs(dw[1]-d[1])<1e-6&&Math.abs(dw[2]-d[2])<1e-6)return f*4+w;}return-1;};
const PERMS=mats.map(M=>{const p=new Array(24);for(let s=0;s<24;s++){const f=(s/4)|0,w=s%4;p[s]=so(ap(M,FN[f]).map(Math.round),ap(M,wd(f,w)));}return p;});
const orient=tri=>{const a=new Array(576);for(let o=0;o<24;o++){const x=new Array(24);for(let s=0;s<24;s++)x[PERMS[o][s]]=tri[s];for(let s=0;s<24;s++)a[o*24+s]=x[s];}return a;};
const POSI={a:0,b:1,c:2,d:3},P4=(()=>{const r=[],ks=['a','b','c','d'];const go=(c,rem)=>{if(!rem.length){r.push(c);return;}for(let i=0;i<rem.length;i++)go([...c,rem[i]],rem.filter((_,j)=>j!==i));};go([],ks);return r;})();
const prep=sh=>{const p={};for(const[p1,t1,p2,t2]of sh.constraints){let i=POSI[p1],j=POSI[p2],ti=t1,tj=t2;if(i>j){[i,j]=[j,i];[ti,tj]=[tj,ti];}(p[i+'-'+j]??=[]).push([ti,tj]);}return p;};
function count(pairs,cu){let tot=0;for(const pm of P4){const tri=(idx,o,t)=>cu[pm[idx]][o*24+(t-1)];const cp={};for(const key in pairs){const[i,j]=key.split('-').map(Number);const m=new Uint8Array(576);for(let oi=0;oi<24;oi++)for(let oj=0;oj<24;oj++){let ok=1;for(const[ti,tj]of pairs[key]){if(tri(i,oi,ti)!==tri(j,oj,tj)){ok=0;break;}}m[oi*24+oj]=ok;}cp[key]=m;}const ok=(i,j,oi,oj)=>{const m=cp[i+'-'+j];return m?m[oi*24+oj]:1;};
  for(let oa=0;oa<24;oa++)for(let ob=0;ob<24;ob++){if(!ok(0,1,oa,ob))continue;for(let oc=0;oc<24;oc++){if(!ok(0,2,oa,oc)||!ok(1,2,ob,oc))continue;for(let od=0;od<24;od++){if(ok(0,3,oa,od)&&ok(1,3,ob,od)&&ok(2,3,oc,od))tot++;}}}}return tot;}
const SH=data.shapeOrder.map(id=>({id,t:data.shapes[id].title,p:prep(data.shapes[id])}));
// —— (2) 每個代表的 13 解數 + 總解數 ——
console.log('\n== 解數簽章分析（242 個代表）==');
const rows=[];
for(const r of R){const cu={a:orient(r.cubes.jia),b:orient(r.cubes.yi),c:orient(r.cubes.bing),d:orient(r.cubes.ding)};
  const counts=SH.map(s=>count(s.p,cu));rows.push({rep:r.repIndex,orbit:r.orbit,counts,total:counts.reduce((x,y)=>x+y,0),min:Math.min(...counts)});}
rows.sort((a,b)=>b.total-a.total);
const sig=r=>r.counts.join(',');
const uniqSig=new Set(rows.map(sig));
console.log(`不同的 13 解數簽章：${uniqSig.size} / 242`);
const orig=rows.find(r=>r.orbit===185);
const repSig=[40,3400,134,63296,8,4,48,44,54,36,186,496,8].slice().sort((a,b)=>a-b).join(',');
const origSigSorted=orig.counts.slice().sort((a,b)=>a-b).join(',');
console.log(`原始那組(orbit#185) 13 解數(排序)：${origSigSorted}`);
console.log(`  與報告 multiset 相符？ ${origSigSorted===repSig}`);
console.log(`  總解數 = ${orig.total}`);
console.log(`\n總解數排名：最高 ${rows[0].total}(#${rows[0].rep}) … 最低 ${rows[rows.length-1].total}(#${rows[rows.length-1].rep})`);
console.log(`原始那組總解數 ${orig.total} 排第 ${rows.findIndex(r=>r.orbit===185)+1} / 242`);
const totals=rows.map(r=>r.total);
console.log(`總解數：中位數 ${totals[Math.floor(totals.length/2)]}，平均 ${Math.round(totals.reduce((a,b)=>a+b)/totals.length)}`);
// 每個圖形跨 242 的解數範圍
console.log('\n每個圖形在 242 組中的解數範圍（min–max，原始值）：');
SH.forEach((s,i)=>{const cs=R.map((_,k)=>rows.find(r=>r)).map(()=>0);});
SH.forEach((s,i)=>{const vals=rows.map(r=>r.counts[i]);console.log(`  ${s.t.padEnd(6)} ${String(Math.min(...vals)).padStart(5)} – ${String(Math.max(...vals)).padStart(6)}（原始 ${orig.counts[i]}）`);});

// —— 輸出每個設計的解數統計 CSV ——
const byOrbit=rows.slice().sort((a,b)=>a.orbit-b.orbit);
const statCsv=['orbit,repIndex,total,'+SH.map(s=>s.t).join(','),...byOrbit.map(r=>`${r.orbit},${r.rep},${r.total},${r.counts.join(',')}`)].join('\n');
fs.writeFileSync('../docs/data/fully-playable-242-stats.csv',statCsv+'\n');
console.log('\n已輸出每設計 13 解數 → docs/data/fully-playable-242-stats.csv');
