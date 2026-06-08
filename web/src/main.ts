// UI 串接：載入資料 → 解圖形 → 視覺化 + 控制項

import './style.css';
import * as THREE from 'three';
import type { CubeKey, PuzzleData, Solution } from './types';
import { solveShape } from './solver';
import { PuzzleViz } from './viz';
import { assemble } from './assembly';
import { rotateOrient, type Axis } from './rotations';
import { renderStudy } from './study';
import { CubeSetGenerator } from './cubeset';

const KEYS: CubeKey[] = ['a', 'b', 'c', 'd'];

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

async function boot() {
  const data: PuzzleData = await fetch('./data/puzzle-data.json').then((r) => r.json());

  const host = $('#canvas-host');
  const viz = new PuzzleViz(host, data);

  let curShape = data.shapeOrder.includes('1') ? '1' : data.shapeOrder[0];
  let solutions: Solution[] = [];
  let rawCount = 0;
  let solIdx = 0;

  // 建立圖形清單
  const shapeList = $('#shape-list');
  for (const id of data.shapeOrder) {
    const s = data.shapes[id];
    const btn = document.createElement('button');
    btn.className = 'shape-btn';
    btn.dataset.id = id;
    btn.innerHTML = `<span class="st">${s.title}</span><span class="sl">${s.level}</span>`;
    btn.onclick = () => selectShape(id);
    shapeList.appendChild(btn);
  }

  const slider = $<HTMLInputElement>('#sol-slider');
  const solCount = $('#solution-count');
  const solInfo = $('#solution-info');
  const hud = $('#hud');
  const refProblem = $<HTMLImageElement>('#ref-problem');
  const setReferenceImage = (id: string) => { refProblem.src = `./shapes/prob-${id}.gif`; };

  function selectShape(id: string) {
    curShape = id;
    document.querySelectorAll('.shape-btn').forEach((b) =>
      b.classList.toggle('active', (b as HTMLElement).dataset.id === id));
    setReferenceImage(id);
    currentR = assemble(data.shapes[id]).a.quaternion.clone();

    const t0 = performance.now();
    const res = solveShape(data, id, Infinity); // 全部載入（含 >3000 解的圖形）
    const ms = Math.round(performance.now() - t0);
    solutions = res.solutions;
    rawCount = res.rawCount;
    solIdx = 0;

    const s = data.shapes[id];
    solCount.textContent = `${rawCount} 組`;
    hud.innerHTML = `<b>${s.title}</b>（${s.level}）${s.note ? '· ' + s.note : ''}<br>` +
      `排列數 <b>${rawCount.toLocaleString()}</b> · 解出耗時 ${ms} ms`;

    // 排列數 vs 組合數
    const nf = (n: number) => n.toLocaleString();
    $('#stat-total').textContent = `${nf(data.meta.totalArrangements)} 種`;
    $('#stat-raw').textContent = `${nf(rawCount)} 種`;
    const statReduced = $('#stat-reduced');
    const note = $('#stat-note');
    if (s.reducedCount != null) {
      const factor = Math.round(rawCount / s.reducedCount);
      statReduced.innerHTML = `<b class="accent">${nf(s.reducedCount)}</b> 種${factor > 1 ? `（÷${factor}）` : ''}`;
      note.textContent = factor > 1
        ? `此圖形有 ${factor} 重對稱，每個本質解被重複數 ${factor} 次，化簡後為 ${nf(s.reducedCount)} 種。`
        : `此圖形無對稱重複，排列數即為組合數。`;
    } else {
      statReduced.textContent = '原研究未化簡';
      note.textContent = '排列數＝程式枚舉的所有合法排法（含旋轉與位置順序）；組合數＝扣除圖形對稱造成的重複後、本質不同的解。此圖形原研究未公布化簡值。';
    }

    slider.max = String(Math.max(0, solutions.length - 1));
    slider.value = '0';
    renderForMode(true);
  }

  function renderForMode(refit = false) {
    if (mode === 'study') return;
    if (mode === 'play') initPlay(refit);
    else renderSolution(refit);
  }

  function renderSolution(refit = false) {
    if (!solutions.length) return;
    const sol = solutions[solIdx];
    viz.show(data.shapes[curShape], sol, refit);
    const p = sol.placement;
    const names = data.meta.cubeNames;
    solInfo.innerHTML = ['a', 'b', 'c', 'd']
      .map((k) => {
        const pl = p[k as 'a'];
        return `<div class="sol-cell"><span class="pos">${k.toUpperCase()}</span>` +
          `<span class="cube">${names[pl.cube]}</span>` +
          `<span class="rot">旋轉 ${pl.orient}</span></div>`;
      })
      .join('');
    solCount.textContent = `${solIdx + 1} / ${solutions.length}${solutions.length < rawCount ? '+' : ''}`;
  }

  slider.oninput = () => { solIdx = Number(slider.value); renderSolution(); };
  $('#prev-sol').onclick = () => { solIdx = (solIdx - 1 + solutions.length) % solutions.length; slider.value = String(solIdx); renderSolution(); };
  $('#next-sol').onclick = () => { solIdx = (solIdx + 1) % solutions.length; slider.value = String(solIdx); renderSolution(); };

  const spreadBox = $<HTMLInputElement>('#toggle-spread');
  spreadBox.onchange = () => { viz.spread = spreadBox.checked ? 1.5 : 1; renderForMode(); };
  $<HTMLInputElement>('#toggle-spin').onchange = (e) => { viz.spin = (e.target as HTMLInputElement).checked; };
  $<HTMLInputElement>('#toggle-edges').onchange = (e) => { viz.setEdges((e.target as HTMLInputElement).checked); };
  $<HTMLInputElement>('#toggle-labels').onchange = (e) => { viz.setLabels((e.target as HTMLInputElement).checked); };

  // ── 試玩模式 ────────────────────────────────────────────────────────────
  let mode: 'view' | 'play' | 'study' = 'view';
  let studyRendered = false;
  let cubeGen: CubeSetGenerator | null = null;
  const DEFAULT_CUBES: Record<CubeKey, number[]> = {
    a: data.cubes.a.slice(), b: data.cubes.b.slice(), c: data.cubes.c.slice(), d: data.cubes.d.slice(),
  };
  // 套組指示牌（自訂套組時顯示在舞台左上）
  const setBadge = document.createElement('div');
  setBadge.id = 'set-badge';
  setBadge.hidden = true;
  ($('#stage') as HTMLElement).appendChild(setBadge);

  function applyCubes(cubes: Record<CubeKey, number[]>, label: string) {
    for (const k of KEYS) data.cubes[k] = cubes[k];
    setBadge.hidden = false;
    setBadge.innerHTML = `套組：<b>${label}</b> · 解答數為此套組即時計算 <button id="set-badge-reset">還原</button>`;
    ($('#set-badge-reset') as HTMLElement).onclick = () => resetCubes();
    selectShape(curShape);
  }
  function resetCubes() {
    for (const k of KEYS) data.cubes[k] = DEFAULT_CUBES[k].slice();
    setBadge.hidden = true;
    selectShape(curShape);
  }
  const playAssign: Record<CubeKey, CubeKey> = { a: 'a', b: 'b', c: 'c', d: 'd' };
  const playOrient: Record<CubeKey, number> = { a: 0, b: 0, c: 0, d: 0 };
  let playSel: CubeKey | null = null;
  let swapMode = false;
  let swapFirst: CubeKey | null = null;
  let currentR = new THREE.Quaternion(); // 目前圖形的官方朝向旋轉（供旋轉按鈕反變換）
  const playStatus = $('#play-status');
  const playWin = $('#play-win');
  const swapBtn = $('#play-swap');
  const tri = (cube: CubeKey, o: number, t: number) => data.cubes[cube][o * 24 + (t - 1)];

  /** 評估目前試玩狀態：回傳已對好的相接處 / 總數，以及是否全解。 */
  function evalPlay() {
    const shape = data.shapes[curShape];
    const pairs = new Map<string, { ok: boolean }>();
    for (const [p1, t1, p2, t2] of shape.constraints) {
      const key = [p1, p2].sort().join('-');
      const e = pairs.get(key) ?? { ok: true };
      const match = tri(playAssign[p1], playOrient[p1], t1) === tri(playAssign[p2], playOrient[p2], t2);
      e.ok = e.ok && match;
      pairs.set(key, e);
    }
    const total = pairs.size;
    const done = [...pairs.values()].filter((p) => p.ok).length;
    return { done, total, solved: done === total };
  }

  function initPlay(refit = false) {
    if (!solutions.length) return;
    // 打亂「方塊順序（指派）」與「角度」（確保不是一開始就解開）
    do {
      const cubes: CubeKey[] = ['a', 'b', 'c', 'd'];
      for (let i = cubes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cubes[i], cubes[j]] = [cubes[j], cubes[i]];
      }
      KEYS.forEach((k, i) => { playAssign[k] = cubes[i]; playOrient[k] = Math.floor(Math.random() * 24); });
    } while (evalPlay().solved);
    playSel = null; swapMode = false; swapFirst = null;
    playWin.hidden = true;
    renderPlay(refit);
  }

  function onPickCube(pos: CubeKey) {
    if (swapMode) {
      if (swapFirst === null) { swapFirst = pos; }
      else if (swapFirst !== pos) {
        // 交換兩個位置的方塊（連同其角度一起搬）
        [playAssign[swapFirst], playAssign[pos]] = [playAssign[pos], playAssign[swapFirst]];
        [playOrient[swapFirst], playOrient[pos]] = [playOrient[pos], playOrient[swapFirst]];
        swapMode = false; swapFirst = null;
      }
    } else {
      playSel = pos;
    }
    renderPlay();
  }

  function renderPlay(refit = false) {
    const hl = swapMode ? swapFirst : playSel;
    viz.showPlay(data.shapes[curShape], playAssign, playOrient, hl, refit);
    const { done, total, solved } = evalPlay();
    playStatus.textContent = `已對好 ${done} / ${total} 處`;
    playWin.hidden = !solved;
    swapBtn.classList.toggle('active-swap', swapMode);
    let msg: string;
    if (swapMode) msg = swapFirst ? `交換模式：再點一顆與「位置${swapFirst.toUpperCase()}」交換` : '交換模式：點兩顆方塊互換位置';
    else if (playSel) msg = `已選取 位置${playSel.toUpperCase()}（${data.meta.cubeNames[playAssign[playSel]]}），用左側按鈕旋轉它`;
    else msg = '點選一個方塊開始（可旋轉，或按「交換方塊位置」調換順序）';
    hud.innerHTML = `<b>${data.shapes[curShape].title}</b> · 試玩中<br>${msg}`;
  }

  // 旋轉按鈕：讓方塊繞「世界軸」轉（與固定的世界座標軸 gizmo 一致）。
  // 因方塊以官方朝向 R 擺放，需把世界軸用 R⁻¹ 反變換成方塊本地軸再套用。
  const AXIS_VEC: Record<Axis, THREE.Vector3> = {
    x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1),
  };
  function rotateSelectedWorld(worldAxis: Axis, dir: 1 | -1) {
    if (!playSel) return;
    const local = AXIS_VEC[worldAxis].clone().applyQuaternion(currentR.clone().invert());
    const ax: Axis = Math.abs(local.x) > 0.5 ? 'x' : Math.abs(local.y) > 0.5 ? 'y' : 'z';
    const comp = ax === 'x' ? local.x : ax === 'y' ? local.y : local.z;
    const sign = comp >= 0 ? 1 : -1;
    playOrient[playSel] = rotateOrient(playOrient[playSel], ax, (dir * sign) as 1 | -1);
    renderPlay();
  }
  document.querySelectorAll<HTMLButtonElement>('.rbtn').forEach((b) => {
    b.onclick = () => rotateSelectedWorld(b.dataset.ax as Axis, Number(b.dataset.dir) as 1 | -1);
  });
  swapBtn.onclick = () => { swapMode = !swapMode; swapFirst = null; playSel = null; renderPlay(); };
  $('#play-scramble').onclick = () => initPlay();
  $('#play-reveal').onclick = () => {
    const sol = solutions[0];
    for (const k of KEYS) { playAssign[k] = sol.placement[k].cube; playOrient[k] = sol.placement[k].orient; }
    playSel = null; swapMode = false; swapFirst = null;
    renderPlay();
  };

  function setMode(m: 'view' | 'play' | 'study') {
    mode = m;
    $('#mode-view').classList.toggle('active', m === 'view');
    $('#mode-play').classList.toggle('active', m === 'play');
    $('#mode-study').classList.toggle('active', m === 'study');

    const isStudy = m === 'study';
    // 側欄：研究模式時隱藏所有解題/試玩面板
    document.querySelectorAll<HTMLElement>('#sidebar section').forEach((el) => { el.hidden = isStudy; });
    // 舞台：研究模式時改顯示文字頁，隱藏 3D 畫布
    ($('#canvas-host') as HTMLElement).style.display = isStudy ? 'none' : '';
    hud.style.display = isStudy ? 'none' : '';
    const sv = $('#study-view') as HTMLElement;
    sv.hidden = !isStudy;
    if (isStudy) {
      viz.onPick(null);
      if (!studyRendered) {
        studyRendered = true;
        sv.innerHTML = '<div class="study-loading">正在計算 515,780 種方塊套組設計…</div>';
        setTimeout(() => {
          if (!cubeGen) cubeGen = new CubeSetGenerator(data);
          renderStudy(sv, { gen: cubeGen, onApply: applyCubes, onReset: resetCubes });
        }, 30);
      }
      return;
    }

    document.querySelectorAll<HTMLElement>('.view-only').forEach((el) => { el.hidden = m === 'play'; });
    ($('#play-panel') as HTMLElement).hidden = m !== 'play';
    viz.onPick(m === 'play' ? onPickCube : null);
    // 預設：試玩有間距（方便看內部）、解答緊密組裝
    spreadBox.checked = (m === 'play');
    viz.spread = spreadBox.checked ? 1.5 : 1;
    renderForMode(true);
  }
  $('#mode-view').onclick = () => setMode('view');
  $('#mode-play').onclick = () => setMode('play');
  $('#mode-study').onclick = () => setMode('study');

  selectShape(curShape);
}

boot();
