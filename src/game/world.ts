import * as THREE from 'three';
import { MAP } from './config';

// ---------- Rauschen für das Gelände ----------
function hash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function smooth(t: number) { return t * t * (3 - 2 * t); }
function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = smooth(x - xi), yf = smooth(y - yi);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
function fbm(x: number, y: number): number {
  return valueNoise(x, y) * 0.6 + valueNoise(x * 2.1, y * 2.1) * 0.28 + valueNoise(x * 4.3, y * 4.3) * 0.12;
}

// Seeded Zufall für Deko
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export interface PointDef { id: string; pos: THREE.Vector2; town: boolean; }
export interface Obstacle { x: number; z: number; r: number; }

export const BLUE_BASE = new THREE.Vector2(0, MAP.depth / 2 - 14);
export const RED_BASE = new THREE.Vector2(0, -MAP.depth / 2 + 14);

export const POINTS: PointDef[] = [
  { id: 'A', pos: new THREE.Vector2(-52, -8), town: false },
  { id: 'B', pos: new THREE.Vector2(2, 4), town: true },
  { id: 'C', pos: new THREE.Vector2(54, -2), town: false },
];

const TOWNS = [
  { x: 2, z: 4, r: 17, houses: 12 },
  { x: -58, z: 52, r: 9, houses: 4 },
  { x: 60, z: -60, r: 9, houses: 4 },
];

// Straßen als Linienzüge
const ROADS: THREE.Vector2[][] = [
  [BLUE_BASE, new THREE.Vector2(0, 60), new THREE.Vector2(2, 4), new THREE.Vector2(0, -60), RED_BASE],
  [new THREE.Vector2(-52, -8), new THREE.Vector2(-20, 0), new THREE.Vector2(2, 4), new THREE.Vector2(26, 2), new THREE.Vector2(54, -2)],
  [new THREE.Vector2(0, 60), new THREE.Vector2(-58, 52), new THREE.Vector2(-52, -8)],
  [new THREE.Vector2(0, -60), new THREE.Vector2(60, -60), new THREE.Vector2(54, -2)],
];

function distToSegment(px: number, pz: number, a: THREE.Vector2, b: THREE.Vector2): number {
  const dx = b.x - a.x, dz = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.y) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (a.x + t * dx), pz - (a.y + t * dz));
}
function roadDist(x: number, z: number): number {
  let d = Infinity;
  for (const road of ROADS) for (let i = 0; i < road.length - 1; i++) d = Math.min(d, distToSegment(x, z, road[i], road[i + 1]));
  return d;
}

// Flache Stellen: Basen, Punkte, Städte
function flatness(x: number, z: number): number {
  let f = 0;
  const spots = [
    { x: BLUE_BASE.x, z: BLUE_BASE.y, r: 22 }, { x: RED_BASE.x, z: RED_BASE.y, r: 22 },
    ...POINTS.map(p => ({ x: p.pos.x, z: p.pos.y, r: 16 })), ...TOWNS,
  ];
  for (const s of spots) {
    const d = Math.hypot(x - s.x, z - s.z);
    f = Math.max(f, 1 - smooth(Math.min(1, Math.max(0, (d - s.r * 0.6) / (s.r * 0.9)))));
  }
  return f;
}

export function heightAt(x: number, z: number): number {
  const base = (fbm(x / 55 + 10, z / 55 + 3) - 0.45) * 16;
  const road = Math.max(0, 1 - roadDist(x, z) / 7);
  const flat = Math.max(flatness(x, z), road * 0.7);
  return base * (1 - flat) + base * 0.25 * flat;
}

export function inTown(x: number, z: number): boolean {
  return TOWNS.some(t => Math.hypot(x - t.x, z - t.z) < t.r);
}

export class World {
  scene = new THREE.Scene();
  obstacles: Obstacle[] = [];
  ground!: THREE.Mesh;
  sun!: THREE.DirectionalLight;

  constructor() {
    const sky = new THREE.Color(0xb9d2dc);
    this.scene.background = sky;
    this.scene.fog = new THREE.Fog(sky, 170, 330);
    this.buildLights();
    this.buildGround();
    this.buildTrees();
    this.buildTowns();
    this.buildBases();
  }

  private buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xdcecf5, 0x4d5a33, 1.25));
    const sun = new THREE.DirectionalLight(0xfff0d2, 2.6);
    sun.position.set(-70, 120, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const c = sun.shadow.camera;
    c.left = -150; c.right = 150; c.top = 150; c.bottom = -150; c.near = 10; c.far = 400;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.4;
    this.scene.add(sun, sun.target);
    this.sun = sun;
  }

  private buildGround() {
    const W = MAP.width + 140, D = MAP.depth + 140;
    const geo = new THREE.PlaneGeometry(W, D, 150, 190);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const grassA = new THREE.Color(0x7c9b4f), grassB = new THREE.Color(0x5f8240), grassC = new THREE.Color(0x93a85a);
    const dirt = new THREE.Color(0xa88d5f), field1 = new THREE.Color(0xc2b267), field2 = new THREE.Color(0x8a9a46);
    const base = new THREE.Color(0x8d8a70);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = heightAt(x, z);
      pos.setY(i, h);
      const n = fbm(x / 18, z / 18);
      tmp.copy(grassA).lerp(grassB, smooth(Math.min(1, Math.max(0, (n - 0.35) * 2.2))));
      if (h > 4) tmp.lerp(grassC, Math.min(1, (h - 4) / 5));
      // Felder: Streifenmuster in bestimmten Parzellen
      const cellX = Math.floor((x + 400) / 26), cellZ = Math.floor((z + 400) / 22);
      if (hash(cellX, cellZ) > 0.78 && flatness(x, z) < 0.3) {
        const stripe = Math.floor((x + 400) / 2.2) % 2 === 0;
        tmp.lerp(stripe ? field1 : field2, 0.75);
      }
      const rd = roadDist(x, z);
      if (rd < 3.4) tmp.lerp(dirt, 1 - smooth(Math.max(0, (rd - 1.8) / 1.6)));
      const bd = Math.min(Math.hypot(x - BLUE_BASE.x, z - BLUE_BASE.y), Math.hypot(x - RED_BASE.x, z - RED_BASE.y));
      if (bd < 16) tmp.lerp(base, 0.6);
      colors.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
    this.ground = new THREE.Mesh(geo, mat);
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  }

  private buildTrees() {
    const rand = rng(7);
    const spots: THREE.Vector3[] = [];
    const halfW = MAP.width / 2 + 60, halfD = MAP.depth / 2 + 60;
    for (let k = 0; k < 5000 && spots.length < 900; k++) {
      const x = (rand() * 2 - 1) * halfW, z = (rand() * 2 - 1) * halfD;
      const forest = fbm(x / 30 + 50, z / 30 + 20);
      const outside = Math.abs(x) > MAP.width / 2 || Math.abs(z) > MAP.depth / 2;
      if (forest < (outside ? 0.42 : 0.56)) continue;
      if (roadDist(x, z) < 6 || flatness(x, z) > 0.2) continue;
      spots.push(new THREE.Vector3(x, heightAt(x, z), z));
    }
    const leafGeo = new THREE.ConeGeometry(2.2, 5.5, 6);
    leafGeo.translate(0, 5.2, 0);
    const leafGeo2 = new THREE.ConeGeometry(1.6, 4, 6);
    leafGeo2.translate(0, 7.6, 0);
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.45, 2.8, 5);
    trunkGeo.translate(0, 1.4, 0);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d6b36, flatShading: true, roughness: 0.9 });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x4a7d3c, flatShading: true, roughness: 0.9 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b4331, flatShading: true });
    const meshes = [
      new THREE.InstancedMesh(leafGeo, leafMat, spots.length),
      new THREE.InstancedMesh(leafGeo2, leafMat2, spots.length),
      new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length),
    ];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    spots.forEach((p, i) => {
      const sc = 0.75 + rand() * 0.6;
      s.set(sc, sc * (0.85 + rand() * 0.4), sc);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI);
      m.compose(p, q, s);
      meshes.forEach(mesh => mesh.setMatrixAt(i, m));
      if (Math.abs(p.x) < MAP.width / 2 && Math.abs(p.z) < MAP.depth / 2) this.obstacles.push({ x: p.x, z: p.z, r: 1.4 * sc });
    });
    meshes.forEach(mesh => { mesh.castShadow = true; mesh.receiveShadow = true; this.scene.add(mesh); });
  }

  private buildTowns() {
    const rand = rng(21);
    const wallMats = [0xe4dac3, 0xd6c8a8, 0xc9c1b0, 0xe8e0d0].map(c => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85 }));
    const roofMats = [0xa4503a, 0x8e4432, 0x6f5a4a, 0xb86a44].map(c => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.8 }));
    const winMat = new THREE.MeshStandardMaterial({ color: 0x3a4550, roughness: 0.4 });
    for (const t of TOWNS) {
      const placed: { x: number; z: number; r: number }[] = [];
      for (let k = 0; k < 200 && placed.length < t.houses; k++) {
        const a = rand() * Math.PI * 2, d = 4 + rand() * t.r;
        const x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d;
        const w = 4 + rand() * 3, dd = 4 + rand() * 4, r = Math.max(w, dd) * 0.62;
        if (roadDist(x, z) < r + 2.5) continue;
        if (placed.some(p => Math.hypot(p.x - x, p.z - z) < p.r + r + 1.5)) continue;
        if (POINTS.some(p => Math.hypot(p.pos.x - x, p.pos.y - z) < 7)) continue;
        placed.push({ x, z, r });
        const h = 3.2 + rand() * 2.8;
        const house = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), wallMats[Math.floor(rand() * 4)]);
        body.position.y = h / 2;
        const roofH = 2 + rand() * 1.2;
        const roofGeo = new THREE.CylinderGeometry(0, 1, roofH, 4, 1);
        roofGeo.rotateY(Math.PI / 4);
        const roof = new THREE.Mesh(roofGeo, roofMats[Math.floor(rand() * 4)]);
        roof.scale.set(w * 0.78, 1, dd * 0.78);
        roof.position.y = h + roofH / 2;
        const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, h * 0.25, dd + 0.08), winMat);
        win.position.y = h * 0.55;
        house.add(body, roof, win);
        house.position.set(x, heightAt(x, z) - 0.2, z);
        house.rotation.y = Math.round(rand() * 4) * Math.PI / 2 + (rand() - 0.5) * 0.3;
        house.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        this.scene.add(house);
        this.obstacles.push({ x, z, r });
      }
    }
  }

  private buildBases() {
    const mat = (c: number) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.8 });
    const bases: [THREE.Vector2, number][] = [[BLUE_BASE, 0x3f7fd9], [RED_BASE, 0xd9602f]];
    for (const [p, color] of bases) {
      const g = new THREE.Group();
      // Sandsack-Wall als Halbkreis
      const bagGeo = new THREE.BoxGeometry(2.4, 1.2, 1.3);
      const bagMat = mat(0xb9a67a);
      for (let k = 0; k < 18; k++) {
        const a = Math.PI * (k / 17);
        const bag = new THREE.Mesh(bagGeo, bagMat);
        // Die offene Seite zeigt zur Front
        bag.position.set(Math.cos(a) * 15, 0.6, Math.sin(a) * 15 * (p.y > 0 ? -1 : 1));
        bag.rotation.y = -a + Math.PI / 2;
        g.add(bag);
      }
      // Zelte
      for (let k = -1; k <= 1; k++) {
        const tent = new THREE.Mesh(new THREE.CylinderGeometry(0, 3.6, 3.4, 4), mat(0x6c7446));
        tent.rotation.y = Math.PI / 4;
        tent.position.set(k * 8, 1.7, (p.y > 0 ? 6 : -6));
        g.add(tent);
      }
      // Fahnenmast
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 12, 6), mat(0xdddddd));
      pole.position.y = 6;
      const flag = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 0.1), mat(color));
      flag.position.set(2, 10.6, 0);
      g.add(pole, flag);
      g.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      g.position.set(p.x, heightAt(p.x, p.y), p.y);
      this.scene.add(g);
    }
  }
}
