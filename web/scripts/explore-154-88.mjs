// 挖 154/88 的結構：對手性扭轉形狀 #54（及其鏡像）算每組的「解數」，
// 看 154（解得開）vs 88（解不開）跟什麼相關。從 web/ 執行。
import fs from 'fs';
const designs=JSON.parse(fs.readFileSync('../docs/data/fully-playable-242.json','utf8')).designs;
const statsTxt=fs.readFileSync('../docs/data/fully-playable-242-stats.csv','utf8').trim().split('\n').slice(1);
const statByRep=new Map();for(const ln of statsTxt){const c=ln.split(',');statByRep.set(+c[1],{total:+c[2],s5:+c[6]});}

// —— 幾何 ——
const FN=[[-1,0,0],[0,1,0],[0,0,1],[0,-1,0],[1,0,0],[0,0,-1]];
const FU=[[0,1,0],[0,0,-1],[0,1,0],[0,0,1],[0,1,0],[0,1,0]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const nrm=v=>{const m=Math.hypot(...v);return[v[0]/m,v[1]/m,v[2]/m];};
const wip=(f,w)=>{const u=nrm(cross(FU[f],FN[f])),v=FU[f];return w===0?v:w===1?u:w===2?v.map(x=>-x):u.map(x=>-x);};
const sem=s=>{const f=(s/4)|0,w=s%4;return[FN[f][0]*0.5+wip(f,w)[0]*0.5,FN[f][1]*0.5+wip(f,w)[1]*0.5,FN[f][2]*0.5+wip(f,w)[2]*0.5];};
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const fnK=v=>v.map(Math.round).join(','),fnI={};FN.forEach((n,i)=>fnI[fnK(n)]=i);
const ap=(M,v)=>[dot(M[0],v),dot(M[1],v),dot(M[2],v)];
const units=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const mats=[];for(const a of units)for(const b of units){if(dot(a,b)!==0)continue;const c=cross(a,b);const M=[[a[0],b[0],c[0]],[a[1],b[1],c[1]],[a[2],b[2],c[2]]];const det=M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1])-M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0])+M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]);if(det===1)mats.push(M);}
const slotOf=(n,d)=>{const f=fnI[fnK(n)];for(let w=0;w<4;w++){const dw=wip(f,w);if(Math.abs(dw[0]-d[0])<1e-6&&Math.abs(dw[1]-d[1])<1e-6&&Math.abs(dw[2]-d[2])<1e-6)return f*4+w;}return-1;};
const PERMS=mats.map(M=>{const p=new Array(24);for(let s=0;s<24;s++){const f=(s/4)|0,w=s%4;p[s]=slotOf(ap(M,FN[f]).map(Math.round),ap(M,wip(f,w)));}return p;});
const orient=tri=>{const a=new Array(576);for(let o=0;o<24;o++){const x=new Array(24);for(let s=0;s<24;s++)x[PERMS[o][s]]=tri[s];for(let s=0;s<24;s++)a[o*24+s]=x[s];}return a;};

// —— 88 形狀 + 找 #54 與其鏡像 ——
const ROT=[];for(const a of units)for(const b of units){if(dot(a,b)!==0)continue;const c=cross(a,b);const M=[a,b,c];const det=a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]);if(det===1)ROT.push(M);}
const apr=(M,p)=>[dot(M[0],p),dot(M[1],p),dot(M[2],p)];
const kp=p=>p.join(','),cmp=(a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2];
const canon=cells=>{let best=null;for(const M of ROT){let pts=cells.map(p=>apr(M,p));const mx=Math.min(...pts.map(p=>p[0])),my=Math.min(...pts.map(p=>p[1])),mz=Math.min(...pts.map(p=>p[2]));pts=pts.map(p=>[p[0]-mx,p[1]-my,p[2]-mz]).sort(cmp);const s=pts.map(kp).join(';');if(best===null||s<best)best=s;}return best;};
const NB=[];for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){const d=dx*dx+dy*dy+dz*dz;if(d===1||d===2)NB.push([dx,dy,dz]);}
let level=new Map([[canon([[0,0,0]]),[[0,0,0]]]]);
for(let sz=1;sz<4;sz++){const nx=new Map();for(const cells of level.values()){const occ=new Set(cells.map(kp));const cand=new Set();for(const c of cells)for(const d of NB){const n=[c[0]+d[0],c[1]+d[1],c[2]+d[2]];if(!occ.has(kp(n)))cand.add(kp(n));}for(const ck of cand){const n=ck.split(',').map(Number);const cn=canon([...cells,n]);if(!nx.has(cn))nx.set(cn,[...cells,n]);}}level=nx;}
const shapes=[...level.values()];
const canonOf=new Map();shapes.forEach((s,i)=>canonOf.set(canon(s),i));
// #54 = 手性扭轉
const TW=shapes.findIndex(s=>canon(s)===canon([[0,0,0],[-1,-1,0],[0,0,-1],[-1,-1,-1]]));
const mirror=cells=>cells.map(p=>[-p[0],p[1],p[2]]);
const TWm=canonOf.get(canon(mirror(shapes[TW])));
console.error(`手性扭轉形狀 index=${TW}，其鏡像 index=${TWm}（鏡像是不同形狀？ ${TW!==TWm}）`);

// —— 約束 + 解題器（數全解）——
const LAB=['a','b','c','d'];
function constraints(cells){const pos={};cells.forEach((c,i)=>pos[LAB[i]]=c);const occ=new Set(cells.map(p=>p.join(',')));const m=new Map();
  for(const k of LAB)for(let s=0;s<24;s++){const p=pos[k],w=[p[0]+sem(s)[0],p[1]+sem(s)[1],p[2]+sem(s)[2]].map(x=>x.toFixed(2)).join(',');const cur=m.get(w)||[];cur.push([k,s]);m.set(w,cur);}
  const ext=(k,s)=>{const n=FN[(s/4)|0];return !occ.has([pos[k][0]+n[0],pos[k][1]+n[1],pos[k][2]+n[2]].join(','));};
  const cons=[];for(const arr of m.values())for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++){const[kA,sA]=arr[i],[kB,sB]=arr[j];if(kA===kB)continue;if(ext(kA,sA)&&ext(kB,sB))cons.push([kA,sA+1,kB,sB+1]);}
  return cons;}
const POSI={a:0,b:1,c:2,d:3},P4=(()=>{const r=[],ks=['a','b','c','d'];const go=(c,rem)=>{if(!rem.length){r.push(c);return;}for(let i=0;i<rem.length;i++)go([...c,rem[i]],rem.filter((_,j)=>j!==i));};go([],ks);return r;})();
function prep(cons){const p={};for(const[p1,t1,p2,t2]of cons){let i=POSI[p1],j=POSI[p2],ti=t1,tj=t2;if(i>j){[i,j]=[j,i];[ti,tj]=[tj,ti];}(p[i+'-'+j]??=[]).push([ti,tj]);}return p;}
function nsol(pairs,cu){let tot=0;for(const pm of P4){const tri=(idx,o,t)=>cu[pm[idx]][o*24+(t-1)];const cp={};for(const key in pairs){const[i,j]=key.split('-').map(Number);const m=new Uint8Array(576);for(let oi=0;oi<24;oi++)for(let oj=0;oj<24;oj++){let ok=1;for(const[ti,tj]of pairs[key]){if(tri(i,oi,ti)!==tri(j,oj,tj)){ok=0;break;}}m[oi*24+oj]=ok;}cp[key]=m;}const ok=(i,j,oi,oj)=>{const m=cp[i+'-'+j];return m?m[oi*24+oj]:1;};
  for(let oa=0;oa<24;oa++)for(let ob=0;ob<24;ob++){if(!ok(0,1,oa,ob))continue;for(let oc=0;oc<24;oc++){if(!ok(0,2,oa,oc)||!ok(1,2,ob,oc))continue;for(let od=0;od<24;od++){if(ok(0,3,oa,od)&&ok(1,3,ob,od)&&ok(2,3,oc,od))tot++;}}}}return tot;}
const Ptw=prep(constraints(shapes[TW])),Ptwm=prep(constraints(shapes[TWm]));

const rows=[];
for(const d of designs){const cu={a:orient(d.cubes.jia),b:orient(d.cubes.yi),c:orient(d.cubes.bing),d:orient(d.cubes.ding)};
  const n=nsol(Ptw,cu),nm=nsol(Ptwm,cu),st=statByRep.get(d.repIndex)||{total:0,s5:0};
  rows.push({rep:d.repIndex,n,nm,total:st.total});}

// 1) #54 解數分佈
const dist=new Map();for(const r of rows)dist.set(r.n,(dist.get(r.n)||0)+1);
console.log('\n=== 手性扭轉 #54 的「解數」分佈（242 組）===');
[...dist.keys()].sort((a,b)=>a-b).forEach(k=>console.log(`  解數 ${k}：${dist.get(k)} 組`));

// 2) #54 vs 其鏡像 #54' 的交叉表
const cross2=new Map();for(const r of rows){const k=(r.n>0?'解#54':'卡#54')+' × '+(r.nm>0?'解#54鏡':'卡#54鏡');cross2.set(k,(cross2.get(k)||0)+1);}
console.log('\n=== #54 與其鏡像 #54’ 的可解交叉表 ===');
for(const[k,v]of cross2)console.log(`  ${k}：${v} 組`);

// 3) 154 解 vs 88 卡，跟「總解數(13圖形)」的關係
const solv=rows.filter(r=>r.n>0),fail=rows.filter(r=>r.n===0);
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[s.length>>1];};
console.log('\n=== 解 #54（154 組）vs 卡 #54（88 組），用 13 圖形總解數比較「強弱」===');
console.log(`  解#54：n=${solv.length}  total 平均 ${mean(solv.map(r=>r.total)).toFixed(0)}  中位 ${med(solv.map(r=>r.total))}  範圍 ${Math.min(...solv.map(r=>r.total))}–${Math.max(...solv.map(r=>r.total))}`);
console.log(`  卡#54：n=${fail.length}  total 平均 ${mean(fail.map(r=>r.total)).toFixed(0)}  中位 ${med(fail.map(r=>r.total))}  範圍 ${Math.min(...fail.map(r=>r.total))}–${Math.max(...fail.map(r=>r.total))}`);

// 4) 原始那組
const orig=rows.find(r=>r.rep===87970);
if(orig)console.log(`\n原始那組(rep 87970)：#54 解數=${orig.n}，#54’ 解數=${orig.nm}，total=${orig.total}`);
fs.writeFileSync('scripts/explore-154-88-out.json',JSON.stringify(rows));
