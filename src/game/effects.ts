import * as THREE from 'three';

type Kind = 'fire' | 'smoke' | 'debris' | 'flash' | 'tracer' | 'ring' | 'spark';

interface Particle {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial | THREE.MeshLambertMaterial;
  kind: Kind;
  life: number;
  max: number;
  vel: THREE.Vector3;
  size0: number;
  size1: number;
  alpha0: number;
  active: boolean;
  onDone?: () => void;
  from?: THREE.Vector3;
  to?: THREE.Vector3;
}

const geoSphere = new THREE.IcosahedronGeometry(1, 1);
const geoRock = new THREE.IcosahedronGeometry(1, 0);
const geoBox = new THREE.BoxGeometry(1, 1, 1);
const geoTracer = new THREE.BoxGeometry(0.18, 0.18, 1);
const geoRing = new THREE.RingGeometry(0.8, 1, 32).rotateX(-Math.PI / 2);

export class Effects {
  private pool: Particle[] = [];
  private lights: { light: THREE.PointLight; life: number; max: number; power: number }[] = [];
  shake = 0;

  constructor(private scene: THREE.Scene) {
    // Feste Anzahl Lichter, damit Three.js die Shader nicht neu bauen muss
    for (let i = 0; i < 3; i++) {
      const light = new THREE.PointLight(0xffa040, 0, 40, 1.6);
      scene.add(light);
      this.lights.push({ light, life: 0, max: 1, power: 0 });
    }
  }

  private get(kind: Kind): Particle {
    let p = this.pool.find(q => !q.active && q.kind === kind);
    if (!p) {
      let mat: Particle['mat'];
      let geo: THREE.BufferGeometry = geoSphere;
      if (kind === 'smoke') mat = new THREE.MeshLambertMaterial({ color: 0x777777, transparent: true, depthWrite: false, flatShading: true });
      else if (kind === 'debris') { mat = new THREE.MeshLambertMaterial({ color: 0x33302a, flatShading: true }); geo = geoRock; }
      else mat = new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      if (kind === 'tracer') geo = geoTracer;
      if (kind === 'ring') geo = geoRing;
      if (kind === 'spark') geo = geoBox;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      p = { mesh, mat, kind, life: 0, max: 1, vel: new THREE.Vector3(), size0: 1, size1: 1, alpha0: 1, active: false };
      this.pool.push(p);
    }
    p.active = true;
    p.mesh.visible = true;
    p.life = 0;
    p.onDone = undefined;
    p.mesh.rotation.set(0, 0, 0);
    return p;
  }

  private emit(kind: Kind, pos: THREE.Vector3, opts: { vel?: THREE.Vector3; life: number; size0: number; size1: number; color?: number; alpha?: number }) {
    const p = this.get(kind);
    p.mesh.position.copy(pos);
    p.vel.copy(opts.vel ?? new THREE.Vector3());
    p.max = opts.life;
    p.size0 = opts.size0; p.size1 = opts.size1;
    p.alpha0 = opts.alpha ?? 1;
    if (opts.color !== undefined) p.mat.color.setHex(opts.color);
    p.mat.opacity = p.alpha0;
    p.mesh.scale.setScalar(opts.size0);
    if (kind === 'debris') p.mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    return p;
  }

  private flashLight(pos: THREE.Vector3, power: number, life: number) {
    const l = this.lights.reduce((a, b) => (a.life / a.max > b.life / b.max || a.power === 0 ? a : b));
    l.light.position.copy(pos).add(new THREE.Vector3(0, 3, 0));
    l.power = power; l.life = 0; l.max = life;
  }

  muzzle(pos: THREE.Vector3, big: boolean) {
    this.emit('flash', pos, { life: big ? 0.12 : 0.06, size0: big ? 1.6 : 0.6, size1: big ? 2.4 : 0.9, color: 0xffd27a });
    if (big) {
      this.flashLight(pos, 30, 0.15);
      for (let i = 0; i < 4; i++) {
        this.emit('smoke', pos, { vel: new THREE.Vector3((Math.random() - 0.5) * 3, 1 + Math.random(), (Math.random() - 0.5) * 3), life: 1.2, size0: 0.6, size1: 2.2, color: 0x9a9a92, alpha: 0.55 });
      }
    }
  }

  tracer(from: THREE.Vector3, to: THREE.Vector3, color: number, speed: number, onHit?: () => void) {
    const p = this.get('tracer');
    p.from = from.clone(); p.to = to.clone();
    p.mat.color.setHex(color);
    p.mat.opacity = 1;
    p.max = Math.max(0.05, from.distanceTo(to) / speed);
    p.mesh.position.copy(from);
    p.mesh.lookAt(to);
    p.mesh.scale.set(1, 1, 2.8);
    p.onDone = onHit;
  }

  impact(pos: THREE.Vector3, soft: boolean) {
    for (let i = 0; i < 5; i++) {
      this.emit('spark', pos, { vel: new THREE.Vector3((Math.random() - 0.5) * 12, Math.random() * 8, (Math.random() - 0.5) * 12), life: 0.25, size0: 0.25, size1: 0.05, color: soft ? 0xffe0a0 : 0xffc060 });
    }
    this.emit('smoke', pos, { vel: new THREE.Vector3(0, 1.2, 0), life: 0.9, size0: 0.5, size1: 1.8, color: soft ? 0xa89a7a : 0x8a8a84, alpha: 0.5 });
  }

  explosion(pos: THREE.Vector3, scale = 1) {
    this.shake = Math.min(1, this.shake + 0.35 * scale);
    this.flashLight(pos, 120 * scale, 0.5);
    this.emit('flash', pos.clone().add(new THREE.Vector3(0, 1, 0)), { life: 0.18, size0: 3 * scale, size1: 6 * scale, color: 0xfff1c0 });
    for (let i = 0; i < 12; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 8, 3 + Math.random() * 7, (Math.random() - 0.5) * 8).multiplyScalar(scale);
      this.emit('fire', pos.clone().add(new THREE.Vector3(0, 1, 0)), { vel: v, life: 0.5 + Math.random() * 0.4, size0: 1.4 * scale, size1: 0.2, color: Math.random() < 0.5 ? 0xff7a1a : 0xffb030 });
    }
    for (let i = 0; i < 10; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 5, 2 + Math.random() * 3, (Math.random() - 0.5) * 5).multiplyScalar(scale);
      this.emit('smoke', pos.clone().add(new THREE.Vector3(0, 1.5, 0)), { vel: v, life: 2 + Math.random() * 1.5, size0: 1.2 * scale, size1: 4.5 * scale, color: Math.random() < 0.5 ? 0x3d3a36 : 0x5a5650, alpha: 0.8 });
    }
    for (let i = 0; i < 10; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 18, 6 + Math.random() * 10, (Math.random() - 0.5) * 18).multiplyScalar(scale);
      this.emit('debris', pos.clone().add(new THREE.Vector3(0, 1, 0)), { vel: v, life: 1.4, size0: 0.35 * scale, size1: 0.3 * scale });
    }
    this.emit('ring', pos.clone().add(new THREE.Vector3(0, 0.3, 0)), { life: 0.45, size0: 1, size1: 12 * scale, color: 0xffd9a0, alpha: 0.7 });
  }

  // Dauerhafter Rauch aus Wracks
  wreckSmoke(pos: THREE.Vector3) {
    this.emit('smoke', pos.clone().add(new THREE.Vector3((Math.random() - 0.5), 1.5, (Math.random() - 0.5))), {
      vel: new THREE.Vector3(0.6 + Math.random() * 0.4, 2.2, (Math.random() - 0.5) * 0.4), life: 3, size0: 0.8, size1: 3.2, color: 0x2e2c2a, alpha: 0.6,
    });
    if (Math.random() < 0.4) this.emit('fire', pos.clone().add(new THREE.Vector3(0, 1.2, 0)), { vel: new THREE.Vector3(0, 1.5, 0), life: 0.4, size0: 0.8, size1: 0.1, color: 0xff7a1a });
  }

  marker(pos: THREE.Vector3, color: number) {
    this.emit('ring', pos.clone().add(new THREE.Vector3(0, 0.4, 0)), { life: 0.6, size0: 4, size1: 0.8, color, alpha: 0.9 });
  }

  update(dt: number) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life += dt;
      const t = Math.min(1, p.life / p.max);
      if (p.kind === 'tracer' && p.from && p.to) {
        p.mesh.position.lerpVectors(p.from, p.to, t);
      } else {
        if (p.kind === 'debris' || p.kind === 'spark') p.vel.y -= 26 * dt;
        if (p.kind === 'fire') p.vel.multiplyScalar(1 - 3 * dt);
        if (p.kind === 'smoke') p.vel.multiplyScalar(1 - 0.8 * dt);
        p.mesh.position.addScaledVector(p.vel, dt);
        if (p.kind === 'debris') { p.mesh.rotation.x += dt * 8; p.mesh.rotation.z += dt * 6; }
        const s = p.size0 + (p.size1 - p.size0) * (p.kind === 'smoke' || p.kind === 'ring' ? 1 - (1 - t) * (1 - t) : t);
        p.mesh.scale.setScalar(s);
        if (p.kind !== 'debris') p.mat.opacity = p.alpha0 * (1 - t) * (p.kind === 'smoke' ? Math.min(1, t * 6) : 1);
      }
      if (t >= 1) {
        p.active = false; p.mesh.visible = false;
        if (p.onDone) p.onDone();
      }
    }
    for (const l of this.lights) {
      if (l.power <= 0) { l.light.intensity = 0; continue; }
      l.life += dt;
      const t = l.life / l.max;
      l.light.intensity = t >= 1 ? 0 : l.power * (1 - t) * (1 - t);
      if (t >= 1) l.power = 0;
    }
    this.shake = Math.max(0, this.shake - dt * 1.8);
  }
}
