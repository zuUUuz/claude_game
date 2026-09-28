import * as THREE from 'three';
import { MAP } from './config';
import { heightAt } from './world';

// RTS-Kamera: schräg von oben, ein Finger verschiebt, zwei Finger zoomen.
// Ein kurzes Antippen ohne Bewegung wird als Tap gemeldet.
export class RtsCamera {
  camera: THREE.PerspectiveCamera;
  target = new THREE.Vector3(0, 0, 70);
  private goal = new THREE.Vector3(0, 0, 70);
  distance = 120;
  private goalDistance = 120;
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number; t: number }>();
  private pinchStart = 0;
  private pinchDist = 0;
  private moved = false;
  onTap: (x: number, y: number) => void = () => {};

  constructor(private el: HTMLElement) {
    this.camera = new THREE.PerspectiveCamera(42, 1, 1, 600);
    el.addEventListener('pointerdown', e => this.down(e));
    el.addEventListener('pointermove', e => this.move(e));
    el.addEventListener('pointerup', e => this.up(e));
    el.addEventListener('pointercancel', e => this.pointers.delete(e.pointerId));
    el.addEventListener('wheel', e => { e.preventDefault(); this.zoomBy(Math.exp(e.deltaY * 0.001)); }, { passive: false });
  }

  focus(x: number, z: number) { this.goal.set(x, 0, z); }

  private zoomBy(f: number) { this.goalDistance = THREE.MathUtils.clamp(this.goalDistance * f, 45, 170); }

  private down(e: PointerEvent) {
    this.el.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
    if (this.pointers.size === 1) this.moved = false;
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      this.pinchStart = this.goalDistance;
      this.moved = true;
    }
  }

  private move(e: PointerEvent) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (Math.hypot(p.x - p.sx, p.y - p.sy) > 10) this.moved = true;
    const worldPerPx = this.distance * 1.5 / this.el.clientHeight;
    if (this.pointers.size === 1 && this.moved) {
      this.goal.x -= dx * worldPerPx;
      this.goal.z -= dy * worldPerPx * 1.3;
    } else if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinchDist > 0) this.goalDistance = THREE.MathUtils.clamp(this.pinchStart * this.pinchDist / d, 45, 170);
      this.goal.x -= dx * worldPerPx * 0.5;
      this.goal.z -= dy * worldPerPx * 0.65;
    }
  }

  private up(e: PointerEvent) {
    const p = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (p && !this.moved && this.pointers.size === 0 && performance.now() - p.t < 500) this.onTap(e.clientX, e.clientY);
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    // Im Hochformat etwas weiter weg, damit genug vom Feld sichtbar ist
    this.camera.fov = w < h ? 50 : 40;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, shake: number) {
    this.goal.x = THREE.MathUtils.clamp(this.goal.x, -MAP.width / 2, MAP.width / 2);
    this.goal.z = THREE.MathUtils.clamp(this.goal.z, -MAP.depth / 2 + 10, MAP.depth / 2 + 10);
    const k = 1 - Math.exp(-dt * 10);
    this.target.lerp(this.goal, k);
    this.distance += (this.goalDistance - this.distance) * k;
    this.target.y = heightAt(this.target.x, this.target.z);
    const pitch = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(50, 62, (this.distance - 45) / 125));
    const cam = this.camera;
    cam.position.set(this.target.x, this.target.y + Math.sin(pitch) * this.distance, this.target.z + Math.cos(pitch) * this.distance);
    if (shake > 0) cam.position.add(new THREE.Vector3((Math.random() - 0.5) * shake * 1.6, (Math.random() - 0.5) * shake * 1.6, 0));
    cam.lookAt(this.target);
  }
}
