// Three.js 場景：把一組解組裝成正確的立體外型呈現，可旋轉縮放。

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CubeKey, PuzzleData, Shape, Solution } from './types';
import { COLOR_HEX } from './types';
import { buildCubeMesh } from './geometry';
import { assemble } from './assembly';

const KEYS: CubeKey[] = ['a', 'b', 'c', 'd'];

export class PuzzleViz {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private controls: OrbitControls;
  private root = new THREE.Group();
  private cubeGroups: Partial<Record<CubeKey, THREE.Group>> = {};
  private labels: THREE.Sprite[] = [];
  private viewSize = 8; // 正交視窗高度（世界單位），由 frameContent 設定

  spin = false;
  showEdges = true;
  showLabels = true;
  spread = 1; // 方塊間距倍率（1=緊密組裝，>1=拉開）

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private pickCb: ((pos: CubeKey) => void) | null = null;
  private axisScene = new THREE.Scene();
  private axisCamera = new THREE.OrthographicCamera(-1.8, 1.8, 1.8, -1.8, 0.1, 100);

  constructor(private host: HTMLElement, private data: PuzzleData) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1a1d27');

    // 正交相機 → 扁平等角投影（與當年 VB 生成器一致）
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    this.camera.position.set(10, 8.2, 10); // 等角方向 (1, 0.82, 1)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(4, 6, 5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x9db4ff, 0.4);
    fill.position.set(-5, -2, -3);
    this.scene.add(fill);

    const grid = new THREE.GridHelper(24, 24, 0x33405e, 0x232838);
    grid.position.y = -1.8;
    this.scene.add(grid);
    this.addAxes();

    this.scene.add(this.root);
    host.appendChild(this.renderer.domElement);

    // 點擊選取方塊（試玩用）
    this.renderer.domElement.addEventListener('click', (e) => {
      if (!this.pickCb) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.root.children, true);
      for (const h of hits) {
        let obj: THREE.Object3D | null = h.object;
        while (obj && obj.userData.pos === undefined) obj = obj.parent;
        if (obj) { this.pickCb(obj.userData.pos as CubeKey); return; }
      }
    });

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.loop();
  }

  private resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    this.renderer.setSize(w, h);
    const a = w / Math.max(1, h);
    this.camera.left = -this.viewSize * a / 2;
    this.camera.right = this.viewSize * a / 2;
    this.camera.top = this.viewSize / 2;
    this.camera.bottom = -this.viewSize / 2;
    this.camera.updateProjectionMatrix();
  }

  /** 清空舞台（無解的形狀用）。 */
  clearStage() { this.clear(); }
  private clear() {
    for (const k of KEYS) { const g = this.cubeGroups[k]; if (g) this.root.remove(g); }
    this.cubeGroups = {};
    for (const s of this.labels) this.root.remove(s);
    this.labels = [];
  }

  private makeLabel(text: string, fill = '#fff'): THREE.Sprite {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.font = 'bold 78px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 9;
    ctx.strokeText(text, 64, 70);
    ctx.fillStyle = fill;
    ctx.fillText(text, 64, 70);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
    sprite.scale.set(0.42, 0.42, 0.42);
    return sprite;
  }

  /** 建立固定在畫面角落的座標軸 gizmo（獨立場景，跟著視角轉動）。 */
  private addAxes() {
    const origin = new THREE.Vector3(0, 0, 0);
    const L = 1;
    const defs: { dir: THREE.Vector3; color: number; label: string; text: string }[] = [
      { dir: new THREE.Vector3(1, 0, 0), color: 0xff6070, label: 'X', text: '#ff8a96' },
      { dir: new THREE.Vector3(0, 1, 0), color: 0x5fd86f, label: 'Y', text: '#7de88a' },
      { dir: new THREE.Vector3(0, 0, 1), color: 0x5fa0ff, label: 'Z', text: '#86b6ff' },
    ];
    for (const d of defs) {
      this.axisScene.add(new THREE.ArrowHelper(d.dir, origin, L, d.color, 0.32, 0.2));
      const lbl = this.makeLabel(d.label, d.text);
      lbl.position.copy(d.dir).multiplyScalar(L + 0.35);
      lbl.scale.set(0.7, 0.7, 0.7);
      this.axisScene.add(lbl);
    }
  }

  private frameContent() {
    this.root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    let has = false;
    for (const k of KEYS) { const g = this.cubeGroups[k]; if (g) { box.expandByObject(g); has = true; } }
    if (!has) return;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    // 設定正交視窗大小以容納物件
    this.viewSize = Math.max(size.x, size.y, size.z) * 2.4 + 2;
    this.resize();
    // 等角投影視角（與當年 VB 生成器一致）：+X 右下、+Z 左下、+Y 向上
    const dir = new THREE.Vector3(1, 0.82, 1).normalize();
    this.controls.target.copy(center);
    this.camera.position.copy(center).add(dir.multiplyScalar(50));
    this.controls.update();
  }

  /** 顯示一組解：組裝成立體外型（identity 擺放、資料 orientation 上色）。 */
  show(shape: Shape, sol: Solution, refit = false) {
    this.clear();
    const placements = assemble(shape);
    for (const k of KEYS) {
      const p = sol.placement[k];
      const colors = this.data.cubes[p.cube].slice(p.orient * 24, p.orient * 24 + 24);
      const g = buildCubeMesh(colors, COLOR_HEX);
      (g.userData.edges as THREE.LineSegments).visible = this.showEdges;
      g.position.copy(placements[k].position).multiplyScalar(this.spread);
      g.quaternion.copy(placements[k].quaternion);
      this.root.add(g);
      this.cubeGroups[k] = g;

      const label = this.makeLabel(this.data.meta.cubeNames[p.cube]);
      label.position.copy(placements[k].position).multiplyScalar(this.spread).add(new THREE.Vector3(0, 0.9, 0));
      label.visible = this.showLabels;
      this.root.add(label);
      this.labels.push(label);
    }
    if (refit) this.frameContent();
  }

  onPick(cb: ((pos: CubeKey) => void) | null) { this.pickCb = cb; }

  /** 試玩渲染：每個位置用玩家指定的方塊與 orientation；highlight 選取的位置。 */
  showPlay(
    shape: Shape,
    assignment: Record<CubeKey, CubeKey>,
    orients: Record<CubeKey, number>,
    selected: CubeKey | null,
    refit = false,
  ) {
    this.clear();
    const placements = assemble(shape); // 官方朝向（與觀看一致）
    for (const k of KEYS) {
      const cube = assignment[k];
      const colors = this.data.cubes[cube].slice(orients[k] * 24, orients[k] * 24 + 24);
      const g = buildCubeMesh(colors, COLOR_HEX);
      (g.userData.edges as THREE.LineSegments).visible = this.showEdges;
      g.userData.pos = k;
      g.position.copy(placements[k].position).multiplyScalar(this.spread);
      g.quaternion.copy(placements[k].quaternion);

      if (selected === k) {
        const halo = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(1.18, 1.18, 1.18)),
          new THREE.LineBasicMaterial({ color: 0x6ea8ff }),
        );
        g.add(halo);
      }
      this.root.add(g);
      this.cubeGroups[k] = g;

      const label = this.makeLabel(this.data.meta.cubeNames[cube]);
      label.position.copy(placements[k].position).multiplyScalar(this.spread).add(new THREE.Vector3(0, 0.85, 0));
      label.visible = this.showLabels;
      this.root.add(label);
      this.labels.push(label);
    }
    if (refit) this.frameContent();
  }

  setEdges(v: boolean) {
    this.showEdges = v;
    for (const k of KEYS) { const g = this.cubeGroups[k]; if (g) (g.userData.edges as THREE.LineSegments).visible = v; }
  }
  setLabels(v: boolean) {
    this.showLabels = v;
    for (const s of this.labels) s.visible = v;
  }

  private loop = () => {
    requestAnimationFrame(this.loop);
    if (this.spin) this.root.rotation.y += 0.006;
    this.controls.update();

    // 主場景（全畫面）
    const w = this.host.clientWidth, h = this.host.clientHeight;
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.setScissorTest(false);
    this.renderer.autoClear = true;
    this.renderer.render(this.scene, this.camera);

    // 角落 gizmo：相機方向跟主相機一致，固定在左下角
    const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
    this.axisCamera.position.copy(dir.multiplyScalar(5));
    this.axisCamera.up.copy(this.camera.up);
    this.axisCamera.lookAt(0, 0, 0);
    const s = 120, m = 16;
    const vx = w - s - m, vy = h - s - m; // 右上角（WebGL 視窗原點在左下）
    this.renderer.setViewport(vx, vy, s, s);
    this.renderer.setScissor(vx, vy, s, s);
    this.renderer.setScissorTest(true);
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(this.axisScene, this.axisCamera);
    this.renderer.setScissorTest(false);
    this.renderer.autoClear = true;
  };
}
