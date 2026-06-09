// 全枚舉 515,780 種設計，找「13 圖形全可解」的套組（先用圖形五篩，約 12 分鐘）。
// 從 web/ 執行：node scripts/fully-playable.mjs  → 2,904，並寫出 scripts/fully-indices.json
// 詳見 docs/05-顏色排列研究.md 的「延伸發現」。

import fs from 'fs';
const data=JSON.parse(fs.readFileSync('public/data/puzzle-data.json','utf8'));
// —— 產生器（同 cubeset.ts）——
const FN=[[-1,0,0],[0,1,0],[0,0,1],[0,-1,0],[1,0,0],[0,0,-1]],FU=[[0,1,0],[0,0,-1],[0,1,0],[0,0,1],[0,1,0],[0,1,0]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=v=>{const m=Math.hypot(...v);return[v[0]/m,v[1]/m,v[2]/m];};
const faceRight=f=>norm(cross(FU[f],FN[f])),wedge=(f,w)=>{const u=faceRight(f),v=FU[f];return w===0?v:w===1?u:w===2?v.map(x=>-x):u.map(x=>-x);};
const H=0.5,slotEdgeMid=s=>{const f=(s/4)|0,w=s%4,n=FN[f],d=wedge(f,w);return[n[0]*H+d[0]*H,n[1]*H+d[1]*H,n[2]*H+d[2]*H];},kk=v=>v.map(x=>x.toFixed(3)).join(',');
const mid={};for(let s=0;s<24;s++){(mid[kk(slotEdgeMid(s))]??=[]).push(s);}const EDGES=Object.values(mid),edgeOfSlot=new Array(24);EDGES.forEach((p,ei)=>p.forEach(s=>edgeOfSlot[s]=ei));
const faceEdges=f=>[0,1,2,3].map(w=>edgeOfSlot[f*4+w]),canonFace=(a,b,c,d)=>Math.max(a*1000+b*100+c*10+d,b*1000+c*100+d*10+a,c*1000+d*100+a*10+b,d*1000+a*100+b*10+c);
const CODES={};{let n=0;for(let a=0;a<3;a++)for(let b=0;b<3;b++)for(let c=0;c<3;c++)for(let d=0;d<3;d++){const k=canonFace(a,b,c,d);if(!(k in CODES))CODES[k]=n++;}}
const FULL=(1<<24)-1,POW3=[1];for(let i=1;i<24;i++)POW3[i]=POW3[i-1]*3;
const units=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],ap=(M,v)=>[dot(M[0],v),dot(M[1],v),dot(M[2],v)];
const mats=[];for(const a of units)for(const b of units){if(dot(a,b)!==0)continue;const c=cross(a,b),M=[[a[0],b[0],c[0]],[a[1],b[1],c[1]],[a[2],b[2],c[2]]],det=M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1])-M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0])+M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]);if(det===1)mats.push(M);}
const fnK=v=>v.map(Math.round).join(','),fnI={};FN.forEach((n,i)=>fnI[fnK(n)]=i);
const slotOf=(n,d)=>{const f=fnI[fnK(n)];for(let w=0;w<4;w++){const dw=wedge(f,w);if(Math.abs(dw[0]-d[0])<1e-6&&Math.abs(dw[1]-d[1])<1e-6&&Math.abs(dw[2]-d[2])<1e-6)return f*4+w;}return-1;};
const PERMS=mats.map(M=>{const p=new Array(24);for(let s=0;s<24;s++){const f=(s/4)|0,w=s%4;p[s]=slotOf(ap(M,FN[f]).map(Math.round),ap(M,wedge(f,w)));}return p;});
const expand=ec=>{const t=new Array(24);for(let s=0;s<24;s++)t[s]=ec[edgeOfSlot[s]];return t;},maskOf=t=>{let m=0;for(let f=0;f<6;f++){const b=CODES[canonFace(t[f*4],t[f*4+1],t[f*4+2],t[f*4+3])];if(m&(1<<b))return-1;m|=1<<b;}return m;};
const canonKey=t=>{let best=Infinity;for(const p of PERMS){let v=0;for(let s=0;s<24;s++)v+=t[s]*POW3[p[s]];if(v<best)best=v;}return best;};
function enumRole(mono){const byMask=new Map(),seen=new Map(),fixed=mono<0?[]:faceEdges(2),free=[...Array(12).keys()].filter(e=>!fixed.includes(e)),ec=new Array(12).fill(0);
  const rec=i=>{if(i===free.length){if(mono>=0)for(const e of fixed)ec[e]=mono;const t=expand(ec),m=maskOf(t);if(m<0)return;const c=canonKey(t);let s=seen.get(m);if(!s){s=new Set();seen.set(m,s);byMask.set(m,[]);}if(!s.has(c)){s.add(c);byMask.get(m).push(t.slice());}return;}for(let v=0;v<3;v++){ec[free[i]]=v;rec(i+1);}};rec(0);return byMask;}
process.stderr.write('building + pre-orienting…\n');
const A=enumRole(2),B=enumRole(1),C=enumRole(0),D=enumRole(-1);
const orient=tri=>{const a=new Array(576);for(let o=0;o<24;o++){const x=new Array(24);for(let s=0;s<24;s++)x[PERMS[o][s]]=tri[s];for(let s=0;s<24;s++)a[o*24+s]=x[s];}return a;};
const ori=bm=>{const o=new Map();for(const[m,l]of bm)o.set(m,l.map(orient));return o;};
const AO=ori(A),BO=ori(B),CO=ori(C),DO=ori(D);
const parts=[];let off=0;
for(const[mA,ra]of A)for(const[mB,rb]of B){if(mA&mB)continue;const mAB=mA|mB;for(const[mC,rc]of C){if(mAB&mC)continue;const need=FULL^(mAB|mC);const rd=D.get(need);if(!rd)continue;parts.push({mA,mB,mC,need,a:ra.length,b:rb.length,c:rc.length,d:rd.length,off});off+=ra.length*rb.length*rc.length*rd.length;}}
const TOTAL=off;
// —— 解題器 ——
const POSI={a:0,b:1,c:2,d:3},PERMS4=(()=>{const r=[],ks=['a','b','c','d'];const go=(c,rem)=>{if(!rem.length){r.push(c);return;}for(let i=0;i<rem.length;i++)go([...c,rem[i]],rem.filter((_,j)=>j!==i));};go([],ks);return r;})();
function prep(shape){const pairs={};for(const[p1,t1,p2,t2]of shape.constraints){let i=POSI[p1],j=POSI[p2],ti=t1,tj=t2;if(i>j){[i,j]=[j,i];[ti,tj]=[tj,ti];}(pairs[i+'-'+j]??=[]).push([ti,tj]);}return pairs;}
function solvable(pairs,cu){for(const pm of PERMS4){const tri=(idx,o,t)=>cu[pm[idx]][o*24+(t-1)];const cp={};for(const key in pairs){const[i,j]=key.split('-').map(Number);const m=new Uint8Array(576);for(let oi=0;oi<24;oi++)for(let oj=0;oj<24;oj++){let ok=1;for(const[ti,tj]of pairs[key]){if(tri(i,oi,ti)!==tri(j,oj,tj)){ok=0;break;}}m[oi*24+oj]=ok;}cp[key]=m;}const ok=(i,j,oi,oj)=>{const m=cp[i+'-'+j];return m?m[oi*24+oj]:1;};
  for(let oa=0;oa<24;oa++)for(let ob=0;ob<24;ob++){if(!ok(0,1,oa,ob))continue;for(let oc=0;oc<24;oc++){if(!ok(0,2,oa,oc)||!ok(1,2,ob,oc))continue;for(let od=0;od<24;od++){if(ok(0,3,oa,od)&&ok(1,3,ob,od)&&ok(2,3,oc,od))return true;}}}}return false;}
const SH={};for(const id of data.shapeOrder)SH[id]=prep(data.shapes[id]);
const order=['5','3','13','1','6','2','4','7','8','9','10','11','12']; // 先 5，再依致死率
// —— 窮舉 515,780 ——
process.stderr.write(`scanning ${TOTAL} designs…\n`);
const t0=Date.now();let surv5=0,fully=0;const fullyIdx=[];let done=0;
for(const p of parts){const aL=AO.get(p.mA),bL=BO.get(p.mB),cL=CO.get(p.mC),dL=DO.get(p.need);
  for(let ia=0;ia<aL.length;ia++)for(let ib=0;ib<bL.length;ib++)for(let ic=0;ic<cL.length;ic++)for(let id=0;id<dL.length;id++){
    const cu={a:aL[ia],b:bL[ib],c:cL[ic],d:dL[id]};done++;
    if(!solvable(SH['5'],cu))continue;surv5++;
    let okk=true;for(const sid of order){if(sid==='5')continue;if(!solvable(SH[sid],cu)){okk=false;break;}}
    if(okk){fully++;fullyIdx.push(p.off+ia+p.a*ib+p.a*p.b*ic+p.a*p.b*p.c*id);}
  }
  if(done%20000===0)process.stderr.write(`  ${(100*done/TOTAL).toFixed(0)}%  圖形五通過 ${surv5}  全可玩 ${fully}\n`);
}
const secs=((Date.now()-t0)/1000).toFixed(0);
console.log(`\n掃描 ${TOTAL} 種設計（耗時 ${secs}s）`);
console.log(`圖形五可解（survivors）= ${surv5}（${(100*surv5/TOTAL).toFixed(2)}%）`);
console.log(`全可玩（13 圖形全解）   = ${fully}（${(100*fully/TOTAL).toFixed(3)}%）`);
console.log(`原始套組(#301546, 0-based 301545) 在內？ ${fullyIdx.includes(301545)}`);
fullyIdx.sort((a,b)=>a-b);
console.log(`前 12 個全可玩編號(1-based)：${fullyIdx.slice(0,12).map(x=>x+1).join(', ')}`);
fs.writeFileSync('scripts/fully-indices.json',JSON.stringify(fullyIdx));
console.log(`（全部 ${fully} 個編號已存到 scripts/fully-indices.json）`);
