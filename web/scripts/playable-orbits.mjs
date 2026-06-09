// 對「可全玩」設計算 R/Y/B 顏色置換軌道（需先跑 fully-playable.mjs）。
// 從 web/ 執行：node scripts/playable-orbits.mjs  → 484 個軌道（各大小 6）

import fs from 'fs';
const data=JSON.parse(fs.readFileSync('public/data/puzzle-data.json','utf8'));
const full=JSON.parse(fs.readFileSync('scripts/fully-indices.json','utf8'));
// —— 產生器（同前）——
const FN=[[-1,0,0],[0,1,0],[0,0,1],[0,-1,0],[1,0,0],[0,0,-1]],FU=[[0,1,0],[0,0,-1],[0,1,0],[0,0,1],[0,1,0],[0,1,0]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=v=>{const m=Math.hypot(...v);return[v[0]/m,v[1]/m,v[2]/m];};
const fr=f=>norm(cross(FU[f],FN[f])),wedge=(f,w)=>{const u=fr(f),v=FU[f];return w===0?v:w===1?u:w===2?v.map(x=>-x):u.map(x=>-x);};
const H=0.5,sem=s=>{const f=(s/4)|0,w=s%4,n=FN[f],d=wedge(f,w);return[n[0]*H+d[0]*H,n[1]*H+d[1]*H,n[2]*H+d[2]*H];},kk=v=>v.map(x=>x.toFixed(3)).join(',');
const mid={};for(let s=0;s<24;s++){(mid[kk(sem(s))]??=[]).push(s);}const EDGES=Object.values(mid),eos=new Array(24);EDGES.forEach((p,ei)=>p.forEach(s=>eos[s]=ei));
const fe=f=>[0,1,2,3].map(w=>eos[f*4+w]),cf=(a,b,c,d)=>Math.max(a*1000+b*100+c*10+d,b*1000+c*100+d*10+a,c*1000+d*100+a*10+b,d*1000+a*100+b*10+c);
const CODES={};{let n=0;for(let a=0;a<3;a++)for(let b=0;b<3;b++)for(let c=0;c<3;c++)for(let d=0;d<3;d++){const k=cf(a,b,c,d);if(!(k in CODES))CODES[k]=n++;}}
const FULL=(1<<24)-1,POW3=[1];for(let i=1;i<24;i++)POW3[i]=POW3[i-1]*3;
const units=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],ap=(M,v)=>[dot(M[0],v),dot(M[1],v),dot(M[2],v)];
const mats=[];for(const a of units)for(const b of units){if(dot(a,b)!==0)continue;const c=cross(a,b),M=[[a[0],b[0],c[0]],[a[1],b[1],c[1]],[a[2],b[2],c[2]]],det=M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1])-M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0])+M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]);if(det===1)mats.push(M);}
const fnK=v=>v.map(Math.round).join(','),fnI={};FN.forEach((n,i)=>fnI[fnK(n)]=i);
const so=(n,d)=>{const f=fnI[fnK(n)];for(let w=0;w<4;w++){const dw=wedge(f,w);if(Math.abs(dw[0]-d[0])<1e-6&&Math.abs(dw[1]-d[1])<1e-6&&Math.abs(dw[2]-d[2])<1e-6)return f*4+w;}return-1;};
const PERMS=mats.map(M=>{const p=new Array(24);for(let s=0;s<24;s++){const f=(s/4)|0,w=s%4;p[s]=so(ap(M,FN[f]).map(Math.round),ap(M,wedge(f,w)));}return p;});
const expand=ec=>{const t=new Array(24);for(let s=0;s<24;s++)t[s]=ec[eos[s]];return t;},maskOf=t=>{let m=0;for(let f=0;f<6;f++){const b=CODES[cf(t[f*4],t[f*4+1],t[f*4+2],t[f*4+3])];if(m&(1<<b))return-1;m|=1<<b;}return m;};
const canonKey=t=>{let best=Infinity;for(const p of PERMS){let v=0;for(let s=0;s<24;s++)v+=t[s]*POW3[p[s]];if(v<best)best=v;}return best;};
function enumRole(mono){const bm=new Map(),seen=new Map(),fixed=mono<0?[]:fe(2),free=[...Array(12).keys()].filter(e=>!fixed.includes(e)),ec=new Array(12).fill(0);
  const rec=i=>{if(i===free.length){if(mono>=0)for(const e of fixed)ec[e]=mono;const t=expand(ec),m=maskOf(t);if(m<0)return;const c=canonKey(t);let s=seen.get(m);if(!s){s=new Set();seen.set(m,s);bm.set(m,[]);}if(!s.has(c)){s.add(c);bm.get(m).push(t.slice());}return;}for(let v=0;v<3;v++){ec[free[i]]=v;rec(i+1);}};rec(0);return bm;}
const A=enumRole(2),B=enumRole(1),C=enumRole(0),D=enumRole(-1);
const parts=[];let off=0;const partMap=new Map();
for(const[mA,ra]of A)for(const[mB,rb]of B){if(mA&mB)continue;const mAB=mA|mB;for(const[mC,rc]of C){if(mAB&mC)continue;const need=FULL^(mAB|mC);const rd=D.get(need);if(!rd)continue;const p={mA,mB,mC,need,a:ra.length,b:rb.length,c:rc.length,d:rd.length,off};parts.push(p);partMap.set(mA+','+mB+','+mC,p);off+=ra.length*rb.length*rc.length*rd.length;}}
const TOTAL=off;
function unrank(N){let lo=0,hi=parts.length-1,pi=0;while(lo<=hi){const m=(lo+hi)>>1;if(parts[m].off<=N){pi=m;lo=m+1;}else hi=m-1;}const p=parts[pi];let r=N-p.off;const ia=r%p.a;r=(r/p.a)|0;const ib=r%p.b;r=(r/p.b)|0;const ic=r%p.c;r=(r/p.c)|0;const id=r;return[A.get(p.mA)[ia],B.get(p.mB)[ib],C.get(p.mC)[ic],D.get(p.need)[id]];}
// canonKey -> {mask,idx} per role
const idxMap=bm=>{const m=new Map();for(const[mask,list]of bm)list.forEach((t,i)=>m.set(canonKey(t),{mask,idx:i}));return m;};
const IA=idxMap(A),IB=idxMap(B),IC=idxMap(C),ID=idxMap(D);
const monoOf=t=>{for(let f=0;f<6;f++){const a=t.slice(f*4,f*4+4);if(a.every(x=>x===a[0]))return a[0];}return-1;};
function indexAfter(sigma,quad){
  const rec=quad.map(t=>t.map(v=>sigma[v]));
  // 依單色色重新分配角色
  let nA,nB,nC,nD;
  for(const t of rec){const m=monoOf(t);if(m===2)nA=t;else if(m===1)nB=t;else if(m===0)nC=t;else nD=t;}
  const eA=IA.get(canonKey(nA)),eB=IB.get(canonKey(nB)),eC=IC.get(canonKey(nC)),eD=ID.get(canonKey(nD));
  const p=partMap.get(eA.mask+','+eB.mask+','+eC.mask);
  return p.off+eA.idx+p.a*eB.idx+p.a*p.b*eC.idx+p.a*p.b*p.c*eD.idx;
}
// 6 種顏色置換
const perm3=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
const fullSet=new Set(full);
const seen=new Set();let orbits=0;const sizes={};let allInSet=true;
for(const N of full){if(seen.has(N))continue;
  const orb=new Set();for(const s of perm3)orb.add(indexAfter(s,unrank(N)));
  for(const x of orb){seen.add(x);if(!fullSet.has(x))allInSet=false;}
  orbits++;sizes[orb.size]=(sizes[orb.size]||0)+1;
}
console.log(`全可玩設計：${full.length}`);
console.log(`顏色置換軌道數：${orbits}`);
console.log(`軌道大小分布：`,sizes);
console.log(`每個軌道都仍在「全可玩」集合內（色置換保持全可玩）？ ${allInSet}`);
// 原始套組的軌道
const oOrb=new Set();for(const s of perm3)oOrb.add(indexAfter(s,unrank(301545)));
console.log(`原始 #301546 的 6 個顏色變體編號(1-based)：${[...oOrb].map(x=>x+1).sort((a,b)=>a-b).join(', ')}`);

// —— 再加一層：鏡射（手性）對稱 ——
const Mmat=[[-1,0,0],[0,1,0],[0,0,1]];
const Mperm=new Array(24);for(let s=0;s<24;s++){const f=(s/4)|0,w=s%4;Mperm[s]=so(ap(Mmat,FN[f]).map(Math.round),ap(Mmat,wedge(f,w)));}
const applyM=t=>{const o=new Array(24);for(let s=0;s<24;s++)o[Mperm[s]]=t[s];return o;};
function mirrorIndex(quad){const m=quad.map(applyM);let eA,eB,eC,eD;
  for(const t of m){const mo=monoOf(t);if(mo===2)eA=IA.get(canonKey(t));else if(mo===1)eB=IB.get(canonKey(t));else if(mo===0)eC=IC.get(canonKey(t));else eD=ID.get(canonKey(t));}
  if(!eA||!eB||!eC||!eD)return -1;const p=partMap.get(eA.mask+','+eB.mask+','+eC.mask);if(!p)return -1;
  return p.off+eA.idx+p.a*eB.idx+p.a*p.b*eC.idx+p.a*p.b*p.c*eD.idx;}
let inSet=0;for(const N of full){const M=mirrorIndex(unrank(N));if(M>=0&&fullSet.has(M))inSet++;}
console.log(`\n鏡射保持全可玩（13 圖形集合鏡射封閉）？ ${inSet}/${full.length}`);
const seen2=new Set();let orb2=0;const sz2={};
for(const N of full){if(seen2.has(N))continue;const stack=[N],orb=new Set([N]);
  while(stack.length){const x=stack.pop(),q=unrank(x);for(const y of [mirrorIndex(q),...perm3.map(s=>indexAfter(s,q))])if(y>=0&&!orb.has(y)){orb.add(y);stack.push(y);}}
  for(const x of orb)seen2.add(x);orb2++;sz2[orb.size]=(sz2[orb.size]||0)+1;}
console.log(`⟨色置換, 鏡射⟩ 合併軌道數：${orb2}`);
console.log(`軌道大小分布：`,sz2,'（12=手性對，6=自身鏡射對稱）');

// —— 真實調色盤：全部 2904 組用到的不同方塊（甲乙丙對稱）——
const Sj=new Set(),Sy=new Set(),Sb=new Set(),Sd=new Set();
for(const N of full){const q=unrank(N);Sj.add(q[0].join(''));Sy.add(q[1].join(''));Sb.add(q[2].join(''));Sd.add(q[3].join(''));}
console.log(`\n調色盤（2904 組用到的不同方塊）：甲 ${Sj.size}、乙 ${Sy.size}、丙 ${Sb.size}（/632）、丁 ${Sd.size}（/8345）`);
