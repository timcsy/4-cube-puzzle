// 對 242 個本質設計，逐一測它能解開 88 種形狀（4 方塊、面+邊接觸、連通、鏡像分開）中的幾種。
// 規則同 test-all-88-shapes.mjs（外部相鄰邊同色，已驗證重現 13 個官方解數）。
// 從 web/ 執行：node scripts/test-242-on-88.mjs
import fs from 'fs';
const designs=JSON.parse(fs.readFileSync('../docs/data/fully-playable-242.json','utf8')).designs;

// —— 幾何（同 geometry.ts / test-all-88）——
const FN=[[-1,0,0],[0,1,0],[0,0,1],[0,-1,0],[1,0,0],[0,0,-1]];
const FU=[[0,1,0],[0,0,-1],[0,1,0],[0,0,1],[0,1,0],[0,1,0]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const nrm=v=>{const m=Math.hypot(...v);return[v[0]/m,v[1]/m,v[2]/m];};
const wip=(f,w)=>{const u=nrm(cross(FU[f],FN[f])),v=FU[f];return w===0?v:w===1?u:w===2?v.map(x=>-x):u.map(x=>-x);};
const sem=s=>{const f=(s/4)|0,w=s%4;return[FN[f][0]*0.5+wip(f,w)[0]*0.5,FN[f][1]*0.5+wip(f,w)[1]*0.5,FN[f][2]*0.5+wip(f,w)[2]*0.5];};
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];

// —— 方塊朝向 PERMS（slot 排列）→ orient：把 24 長的基本三角陣展成 576（24 朝向）——
const fnK=v=>v.map(Math.round).join(','),fnI={};FN.forEach((n,i)=>fnI[fnK(n)]=i);
const ap=(M,v)=>[dot(M[0],v),dot(M[1],v),dot(M[2],v)];
const units=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const mats=[];for(const a of units)for(const b of units){if(dot(a,b)!==0)continue;const c=cross(a,b);const M=[[a[0],b[0],c[0]],[a[1],b[1],c[1]],[a[2],b[2],c[2]]];const det=M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1])-M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0])+M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]);if(det===1)mats.push(M);}
const slotOf=(n,d)=>{const f=fnI[fnK(n)];for(let w=0;w<4;w++){const dw=wip(f,w);if(Math.abs(dw[0]-d[0])<1e-6&&Math.abs(dw[1]-d[1])<1e-6&&Math.abs(dw[2]-d[2])<1e-6)return f*4+w;}return-1;};
const PERMS=mats.map(M=>{const p=new Array(24);for(let s=0;s<24;s++){const f=(s/4)|0,w=s%4;p[s]=slotOf(ap(M,FN[f]).map(Math.round),ap(M,wip(f,w)));}return p;});
const orient=tri=>{const a=new Array(576);for(let o=0;o<24;o++){const x=new Array(24);for(let s=0;s<24;s++)x[PERMS[o][s]]=tri[s];for(let s=0;s<24;s++)a[o*24+s]=x[s];}return a;};

// —— 列舉 88 種形狀 ——
const ROT=[];for(const a of units)for(const b of units){if(dot(a,b)!==0)continue;const c=cross(a,b);const M=[a,b,c];const det=a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]);if(det===1)ROT.push(M);}
const apr=(M,p)=>[dot(M[0],p),dot(M[1],p),dot(M[2],p)];
const kp=p=>p.join(','),cmp=(a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2];
const canon=cells=>{let best=null;for(const M of ROT){let pts=cells.map(p=>apr(M,p));const mx=Math.min(...pts.map(p=>p[0])),my=Math.min(...pts.map(p=>p[1])),mz=Math.min(...pts.map(p=>p[2]));pts=pts.map(p=>[p[0]-mx,p[1]-my,p[2]-mz]).sort(cmp);const s=pts.map(kp).join(';');if(best===null||s<best)best=s;}return best;};
const NB=[];for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){const d=dx*dx+dy*dy+dz*dz;if(d===1||d===2)NB.push([dx,dy,dz]);}
let level=new Map([[canon([[0,0,0]]),[[0,0,0]]]]);
for(let sz=1;sz<4;sz++){const nx=new Map();for(const cells of level.values()){const occ=new Set(cells.map(kp));const cand=new Set();for(const c of cells)for(const d of NB){const n=[c[0]+d[0],c[1]+d[1],c[2]+d[2]];if(!occ.has(kp(n)))cand.add(kp(n));}for(const ck of cand){const n=ck.split(',').map(Number);const cn=canon([...cells,n]);if(!nx.has(cn))nx.set(cn,[...cells,n]);}}level=nx;}
const shapes=[...level.values()];

// —— 由形狀生約束 ——
const LAB=['a','b','c','d'];
function constraints(cells){const pos={};cells.forEach((c,i)=>pos[LAB[i]]=c);const occ=new Set(cells.map(p=>p.join(',')));const m=new Map();
  for(const k of LAB)for(let s=0;s<24;s++){const p=pos[k],w=[p[0]+sem(s)[0],p[1]+sem(s)[1],p[2]+sem(s)[2]].map(x=>x.toFixed(2)).join(',');const cur=m.get(w)||[];cur.push([k,s]);m.set(w,cur);}
  const ext=(k,s)=>{const n=FN[(s/4)|0];return !occ.has([pos[k][0]+n[0],pos[k][1]+n[1],pos[k][2]+n[2]].join(','));};
  const cons=[];for(const arr of m.values())for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++){const[kA,sA]=arr[i],[kB,sB]=arr[j];if(kA===kB)continue;if(ext(kA,sA)&&ext(kB,sB))cons.push([kA,sA+1,kB,sB+1]);}
  return cons;}

// —— 解題器（參數化 cubes，只看有無解）——
const POSI={a:0,b:1,c:2,d:3},P4=(()=>{const r=[],ks=['a','b','c','d'];const go=(c,rem)=>{if(!rem.length){r.push(c);return;}for(let i=0;i<rem.length;i++)go([...c,rem[i]],rem.filter((_,j)=>j!==i));};go([],ks);return r;})();
function prep(cons){const p={};for(const[p1,t1,p2,t2]of cons){let i=POSI[p1],j=POSI[p2],ti=t1,tj=t2;if(i>j){[i,j]=[j,i];[ti,tj]=[tj,ti];}(p[i+'-'+j]??=[]).push([ti,tj]);}return p;}
function solvable(pairs,cu){for(const pm of P4){const tri=(idx,o,t)=>cu[pm[idx]][o*24+(t-1)];const cp={};for(const key in pairs){const[i,j]=key.split('-').map(Number);const m=new Uint8Array(576);for(let oi=0;oi<24;oi++)for(let oj=0;oj<24;oj++){let ok=1;for(const[ti,tj]of pairs[key]){if(tri(i,oi,ti)!==tri(j,oj,tj)){ok=0;break;}}m[oi*24+oj]=ok;}cp[key]=m;}const ok=(i,j,oi,oj)=>{const m=cp[i+'-'+j];return m?m[oi*24+oj]:1;};
  for(let oa=0;oa<24;oa++)for(let ob=0;ob<24;ob++){if(!ok(0,1,oa,ob))continue;for(let oc=0;oc<24;oc++){if(!ok(0,2,oa,oc)||!ok(1,2,ob,oc))continue;for(let od=0;od<24;od++){if(ok(0,3,oa,od)&&ok(1,3,ob,od)&&ok(2,3,oc,od))return true;}}}}return false;}

// 預先算好 88 個 pairs
const PAIRS=shapes.map(s=>prep(constraints(s)));
console.error(`88 形狀就緒、242 設計就緒，開始…`);

const results=[];
for(let di=0;di<designs.length;di++){const d=designs[di];
  const cu={a:orient(d.cubes.jia),b:orient(d.cubes.yi),c:orient(d.cubes.bing),d:orient(d.cubes.ding)};
  let solv=0;const zeroShapes=[];
  for(let si=0;si<PAIRS.length;si++){if(solvable(PAIRS[si],cu))solv++;else zeroShapes.push(si);}
  results.push({di,repIndex:d.repIndex,solv,zeroShapes});
  if((di+1)%20===0)console.error(`  ${di+1}/242`);
}

// 統計分佈
const dist=new Map();
for(const r of results){dist.set(r.solv,(dist.get(r.solv)||0)+1);}
const ks=[...dist.keys()].sort((a,b)=>a-b);
console.log(`\n=== 242 個本質設計，各自能解開 88 形狀中幾種 ===`);
console.log(`解開形狀數 : 設計數`);
for(const k of ks)console.log(`  ${String(k).padStart(2)}/88 : ${dist.get(k)} 組`);
const vals=results.map(r=>r.solv);
console.log(`\n最少 ${Math.min(...vals)}、最多 ${Math.max(...vals)}、平均 ${(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)}`);
const all88=results.filter(r=>r.solv===88).length;
console.log(`解開全部 88 種的：${all88} 組`);

// 哪些形狀「最難」（被最多設計卡住）
const hard=new Array(88).fill(0);
for(const r of results)for(const si of r.zeroShapes)hard[si]++;
const ranked=hard.map((c,si)=>({si,c})).filter(x=>x.c>0).sort((a,b)=>b.c-a.c);
console.log(`\n=== 最常無解的形狀（被幾組設計解不開）===`);
const draw=cells=>{const sp=i=>[Math.min(...cells.map(p=>p[i])),Math.max(...cells.map(p=>p[i]))];const dims=[0,1,2].map(i=>{const[s,e]=sp(i);return e-s;});const solid=dims.every(x=>x>0);return solid?`(立體 ${dims.map(x=>x+1).join('×')})`:`(平面 ${dims.map(x=>x+1).join('×')})`;};
for(const {si,c} of ranked.slice(0,15))console.log(`  形狀#${si} ${draw(shapes[si])}：${c} 組無解  ${JSON.stringify(shapes[si])}`);

// 原始套組 (#301546, repIndex 87970 在 orbit#185) 對照
const orig=results.find(r=>r.repIndex===87970);
if(orig)console.log(`\n原始 2011 那組（repIndex 87970）：解開 ${orig.solv}/88`);
fs.writeFileSync('scripts/test-242-on-88-out.json',JSON.stringify(results));
console.log(`\n（每組明細已存 scripts/test-242-on-88-out.json）`);
