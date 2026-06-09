// 把「13 個官方形狀」擴到全部 88 種（4 方塊、面+邊接觸、連通、鏡像算不同），
// 用「外部相鄰三角形同色」規則（已驗證能 100% 重現 13 個官方解數）測原始方塊能解幾種。
// 從 web/ 執行：node scripts/test-all-88-shapes.mjs

import fs from 'fs';
const data=JSON.parse(fs.readFileSync('public/data/puzzle-data.json','utf8'));
// 幾何（同 geometry.ts）
const FN=[[-1,0,0],[0,1,0],[0,0,1],[0,-1,0],[1,0,0],[0,0,-1]];
const FU=[[0,1,0],[0,0,-1],[0,1,0],[0,0,1],[0,1,0],[0,1,0]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const nrm=v=>{const m=Math.hypot(...v);return[v[0]/m,v[1]/m,v[2]/m];};
const wip=(f,w)=>{const u=nrm(cross(FU[f],FN[f])),v=FU[f];return w===0?v:w===1?u:w===2?v.map(x=>-x):u.map(x=>-x);};
const sem=s=>{const f=(s/4)|0,w=s%4;return[FN[f][0]*0.5+wip(f,w)[0]*0.5,FN[f][1]*0.5+wip(f,w)[1]*0.5,FN[f][2]*0.5+wip(f,w)[2]*0.5];};
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
// 列舉 88 種（面+邊接觸、連通、鏡像算不同）
const units=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const ROT=[];for(const a of units)for(const b of units){if(dot(a,b)!==0)continue;const c=cross(a,b);const M=[a,b,c];const det=a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]);if(det===1)ROT.push(M);}
const ap=(M,p)=>[dot(M[0],p),dot(M[1],p),dot(M[2],p)];
const kp=p=>p.join(','),cmp=(a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2];
const canon=cells=>{let best=null;for(const M of ROT){let pts=cells.map(p=>ap(M,p));const mx=Math.min(...pts.map(p=>p[0])),my=Math.min(...pts.map(p=>p[1])),mz=Math.min(...pts.map(p=>p[2]));pts=pts.map(p=>[p[0]-mx,p[1]-my,p[2]-mz]).sort(cmp);const s=pts.map(kp).join(';');if(best===null||s<best)best=s;}return best;};
const NB=[];for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){const d=dx*dx+dy*dy+dz*dz;if(d===1||d===2)NB.push([dx,dy,dz]);}
let level=new Map([[canon([[0,0,0]]),[[0,0,0]]]]);
for(let sz=1;sz<4;sz++){const nx=new Map();for(const cells of level.values()){const occ=new Set(cells.map(kp));const cand=new Set();for(const c of cells)for(const d of NB){const n=[c[0]+d[0],c[1]+d[1],c[2]+d[2]];if(!occ.has(kp(n)))cand.add(kp(n));}for(const ck of cand){const n=ck.split(',').map(Number);const cn=canon([...cells,n]);if(!nx.has(cn))nx.set(cn,[...cells,n]);}}level=nx;}
const shapes=[...level.values()];
const d2=(a,b)=>{const x=a[0]-b[0],y=a[1]-b[1],z=a[2]-b[2];return x*x+y*y+z*z;};
const faceConn=cells=>{const seen=new Set([kp(cells[0])]),st=[cells[0]];while(st.length){const p=st.pop();for(const c of cells)if(!seen.has(kp(c))&&d2(p,c)===1){seen.add(kp(c));st.push(c);}}return seen.size===4;};
// 由形狀生約束（共邊 + 兩面朝向對方）
const LAB=['a','b','c','d'];
function constraints(cells){const pos={};cells.forEach((c,i)=>pos[LAB[i]]=c);const occ=new Set(cells.map(p=>p.join(',')));const m=new Map();
  for(const k of LAB)for(let s=0;s<24;s++){const p=pos[k],w=[p[0]+sem(s)[0],p[1]+sem(s)[1],p[2]+sem(s)[2]].map(x=>x.toFixed(2)).join(',');const cur=m.get(w)||[];cur.push([k,s]);m.set(w,cur);}
  const ext=(k,s)=>{const n=FN[(s/4)|0];return !occ.has([pos[k][0]+n[0],pos[k][1]+n[1],pos[k][2]+n[2]].join(','));};
  const cons=[];for(const arr of m.values())for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++){const[kA,sA]=arr[i],[kB,sB]=arr[j];if(kA===kB)continue;if(ext(kA,sA)&&ext(kB,sB))cons.push([kA,sA+1,kB,sB+1]);}
  return cons;}
// 解題器：用原始方塊，數解（早退選項）
const POSI={a:0,b:1,c:2,d:3},P4=(()=>{const r=[],ks=['a','b','c','d'];const go=(c,rem)=>{if(!rem.length){r.push(c);return;}for(let i=0;i<rem.length;i++)go([...c,rem[i]],rem.filter((_,j)=>j!==i));};go([],ks);return r;})();
function prep(cons){const p={};for(const[p1,t1,p2,t2]of cons){let i=POSI[p1],j=POSI[p2],ti=t1,tj=t2;if(i>j){[i,j]=[j,i];[ti,tj]=[tj,ti];}(p[i+'-'+j]??=[]).push([ti,tj]);}return p;}
function nsol(pairs,full=false){let tot=0;for(const pm of P4){const tri=(idx,o,t)=>data.cubes[pm[idx]][o*24+(t-1)];const cp={};for(const key in pairs){const[i,j]=key.split('-').map(Number);const m=new Uint8Array(576);for(let oi=0;oi<24;oi++)for(let oj=0;oj<24;oj++){let ok=1;for(const[ti,tj]of pairs[key]){if(tri(i,oi,ti)!==tri(j,oj,tj)){ok=0;break;}}m[oi*24+oj]=ok;}cp[key]=m;}const ok=(i,j,oi,oj)=>{const m=cp[i+'-'+j];return m?m[oi*24+oj]:1;};
  for(let oa=0;oa<24;oa++)for(let ob=0;ob<24;ob++){if(!ok(0,1,oa,ob))continue;for(let oc=0;oc<24;oc++){if(!ok(0,2,oa,oc)||!ok(1,2,ob,oc))continue;for(let od=0;od<24;od++){if(ok(0,3,oa,od)&&ok(1,3,ob,od)&&ok(2,3,oc,od)){if(!full)return 1;tot++;}}}}}return tot;}
// 跑
let solvable=0,zero=0,faceCounts=[];
const zeros=[];
for(let i=0;i<shapes.length;i++){const cons=constraints(shapes[i]);const pairs=prep(cons);const fc=faceConn(shapes[i]);
  const cnt=fc?nsol(pairs,true):nsol(pairs,false); // 面連的全數（驗證），其餘只看有無
  if(cnt>0)solvable++;else{zero++;zeros.push(i);}
  if(fc)faceCounts.push(cnt);}
console.log(`88 種中，原始方塊（在「超集」嚴格模型下）：`);
console.log(`  有解（≥1）：${solvable} 種  → 這些「真實遊戲一定也有解」`);
console.log(`  零解：${zero} 種  → 這些是「可能無解」的候選（嚴格模型下 0）`);
console.log(`\n驗證（8 個面連方塊的解數，應為 {8,4,48,44,54,36,186,8} 的排列）：`);
console.log(`  ${faceCounts.sort((a,b)=>a-b).join(', ')}`);

// === 全 13 官方驗證 + 找零解 ===
const REF={'1':[[0,0,0],[1,0,0],[2,0,-1],[3,0,-1]],'2':[[0,0,0],[1,0,1],[2,0,1],[3,0,0]],'3':[[0,0,0],[1,0,0],[2,0,0],[3,0,-1]],'4':[[0,0,0],[1,0,-1],[1,0,1],[2,0,0]],'5':[[0,0,0],[1,0,0],[2,0,0],[3,0,0]],'6':[[0,0,0],[1,0,0],[2,0,0],[2,0,-1]],'7':[[0,0,0],[1,0,0],[2,0,0],[1,0,-1]],'8':[[0,0,0],[1,0,0],[1,0,-1],[2,0,-1]],'9':[[0,0,0],[1,0,0],[1,0,-1],[1,1,-1]],'10':[[0,1,0],[0,0,0],[1,0,0],[1,0,-1]],'11':[[0,1,0],[0,0,0],[-1,0,0],[0,0,-1]],'12':[[0,0,0],[1,0,1],[1,0,0],[2,0,-1]],'13':[[0,0,0],[0,0,1],[1,0,0],[1,0,1]]};
const OFF={'1':40,'2':3400,'3':134,'4':63296,'5':8,'6':4,'7':48,'8':44,'9':54,'10':36,'11':186,'12':496,'13':8};
console.log('\n=== 全 13 官方驗證（我的模型 vs 報告）===');
let ok=0;for(const id of Object.keys(REF)){const mine=nsol(prep(constraints(REF[id])),true);const off=OFF[id];if(mine===off)ok++;console.log(`圖形${id.padStart(2)}: 我=${String(mine).padStart(6)} 官方=${String(off).padStart(6)} ${mine===off?'✓':'✗'}`);}
console.log(`吻合 ${ok}/13`);
// 找零解形狀
const draw=cells=>{const sp=i=>[Math.min(...cells.map(p=>p[i])),Math.max(...cells.map(p=>p[i]))];const[xs,xe]=sp(0),[ys,ye]=sp(1),[zs,ze]=sp(2);const dims=[xe-xs,ye-ys,ze-zs];const flat=dims.indexOf(0);if(flat<0)return '(立體，bbox '+dims.map(d=>d+1).join('×')+')';const ax=[0,1,2].filter(i=>i!==flat);const occ2=new Set(cells.map(c=>c[ax[0]]+','+c[ax[1]]));const a0=sp(ax[0]),a1=sp(ax[1]);let out='';for(let v=a1[1];v>=a1[0];v--){let row='    ';for(let u=a0[0];u<=a0[1];u++)row+=occ2.has(u+','+v)?'■':'·';out+=row+'\n';}return out;};
console.log('\n=== 那唯一 0 解的形狀 ===');
for(let i=0;i<shapes.length;i++){if(nsol(prep(constraints(shapes[i])))===0){console.log('座標:',JSON.stringify(shapes[i]),'  面連通:',faceConn(shapes[i]));console.log(draw(shapes[i]));}}
