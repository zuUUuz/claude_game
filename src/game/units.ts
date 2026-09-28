import * as THREE from 'three';
import { MATCH, Team, UNITS, UnitKind, UnitStats } from './config';
import { buildModel, UnitModel } from './models';
import { heightAt, inTown, Obstacle } from './world';
import { Effects } from './effects';

let nextId = 1;
const tmpV = new THREE.Vector3();

const ringGeo = new THREE.RingGeometry(3.2, 3.8, 32).rotateX(-Math.PI / 2);

function barMaterial(color: number) {
  return new THREE.SpriteMaterial({ color, depthTest: false, depthWrite: false, transparent: true });
}

export class Unit {
  id = nextId++;
  stats: UnitStats;
  model: UnitModel;
  pos = new THREE.Vector3();
  heading = 0;
  hp: number;
  alive = true;
  moveTo: THREE.Vector2 | null = null;
  target: Unit | null = null;
  reload = Math.random();
  selected = false;
  revealed = false; // für den Gegner sichtbar
  deadFor = 0;
  lastHit = 0;
  kills = 0;
  reported = false; // Tod wurde vom Spiel schon gemeldet

  private ring: THREE.Mesh;
  private barBg: THREE.Sprite;
  private barFg: THREE.Sprite;
  private barH: number;
  private wreckTimer = 0;

  constructor(public kind: UnitKind, public team: Team, x: number, z: number, private scene: THREE.Scene, private fx: Effects) {
    this.stats = UNITS[kind];
    this.hp = this.stats.hp;
    this.model = buildModel(kind, team);
    this.pos.set(x, heightAt(x, z), z);
    this.heading = team === 'blue' ? 0 : Math.PI;
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.y = this.heading;
    scene.add(this.model.root);

    this.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
    this.ring.visible = false;
    scene.add(this.ring);

    this.barH = this.stats.armored ? 5.2 : 4.2;
    this.barBg = new THREE.Sprite(barMaterial(0x111411));
    this.barBg.scale.set(4.4, 0.55, 1);
    this.barFg = new THREE.Sprite(barMaterial(team === 'blue' ? 0x7fb6ff : 0xffa070));
    this.barFg.center.set(0, 0.5);
    this.barFg.scale.set(4.1, 0.34, 1);
    this.barBg.renderOrder = 10; this.barFg.renderOrder = 11;
    scene.add(this.barBg, this.barFg);
  }

  get pos2() { return new THREE.Vector2(this.pos.x, this.pos.z); }
  get inCover() { return !this.stats.armored && inTown(this.pos.x, this.pos.z); }

  setSelected(v: boolean) { this.selected = v; }

  damageAgainst(t: Unit) { return t.stats.armored ? this.stats.damage.armor : this.stats.damage.soft; }

  takeHit(amount: number, from: Unit | null) {
    if (!this.alive) return;
    const cover = this.inCover ? MATCH.townCover : 1;
    this.hp -= amount * cover;
    this.lastHit = 0.15;
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
      if (from) from.kills++;
    }
  }

  private die() {
    this.alive = false;
    this.target = null;
    this.moveTo = null;
    this.ring.visible = false;
    this.barBg.visible = this.barFg.visible = false;
    if (this.stats.armored) {
      this.fx.explosion(this.pos, this.kind === 'tank' ? 1.3 : 0.9);
      // Wrack: dunkel eingefärbt, Turm verdreht
      this.model.paint.forEach(m => { m.color.setHex(0x2b2825); m.emissive.setHex(0); });
      if (this.model.turret) { this.model.turret.rotation.y += 0.7; this.model.turret.rotation.z = 0.15; }
    } else {
      this.fx.explosion(this.pos, 0.35);
    }
  }

  // Liefert true, solange die Einheit in der Szene bleiben soll
  update(dt: number, enemies: Unit[], obstacles: Obstacle[], camera: THREE.Camera): boolean {
    if (!this.alive) {
      this.deadFor += dt;
      if (this.stats.armored) {
        this.wreckTimer -= dt;
        if (this.wreckTimer <= 0 && this.deadFor < 14) { this.fx.wreckSmoke(this.pos); this.wreckTimer = 0.18; }
        if (this.deadFor > 16) { this.model.root.position.y -= dt * 0.8; }
        if (this.deadFor > 19) { this.dispose(); return false; }
      } else {
        this.model.root.scale.y = Math.max(0.01, 1 - this.deadFor * 2);
        if (this.deadFor > 0.6) { this.dispose(); return false; }
      }
      return true;
    }

    // --- Ziel suchen: bevorzugt, wogegen die eigene Waffe wirkt ---
    if (this.target && (!this.target.alive || !this.target.revealed || this.target.pos.distanceTo(this.pos) > this.stats.range * 1.1)) this.target = null;
    if (!this.target) {
      let best: Unit | null = null, bestScore = -Infinity;
      for (const e of enemies) {
        if (!e.alive || !e.revealed) continue;
        const d = e.pos.distanceTo(this.pos);
        if (d > this.stats.range) continue;
        const score = this.damageAgainst(e) * 2 - d * 0.5 - e.hp / e.stats.hp * 5;
        if (score > bestScore) { bestScore = score; best = e; }
      }
      this.target = best;
    }

    // --- Bewegung ---
    let moving = false;
    if (this.moveTo) {
      const dx = this.moveTo.x - this.pos.x, dz = this.moveTo.y - this.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.2) this.moveTo = null;
      else {
        moving = true;
        const want = Math.atan2(-dx, -dz);
        let diff = want - this.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turn = (this.stats.armored ? 2.4 : 6) * dt;
        this.heading += Math.max(-turn, Math.min(turn, diff));
        // Fahrzeuge fahren erst los, wenn sie grob in die richtige Richtung zeigen
        const align = this.stats.armored ? Math.max(0, Math.cos(diff)) : 1;
        const slope = Math.max(0.55, 1 - Math.abs(heightAt(this.pos.x - Math.sin(this.heading) * 2, this.pos.z - Math.cos(this.heading) * 2) - this.pos.y) * 0.15);
        const step = Math.min(dist, this.stats.speed * dt * align * slope);
        this.pos.x -= Math.sin(this.heading) * step;
        this.pos.z -= Math.cos(this.heading) * step;
      }
    }
    // Hindernisse (Häuser, Bäume)
    for (const o of obstacles) {
      const dx = this.pos.x - o.x, dz = this.pos.z - o.z;
      const d = Math.hypot(dx, dz), min = o.r + this.stats.radius * 0.8;
      if (d < min && d > 0.001) { this.pos.x = o.x + dx / d * min; this.pos.z = o.z + dz / d * min; }
    }
    this.pos.y = heightAt(this.pos.x, this.pos.z);

    // --- Darstellung ---
    const root = this.model.root;
    root.position.copy(this.pos);
    if (this.stats.armored) {
      // an den Hang anpassen
      const f = heightAt(this.pos.x - Math.sin(this.heading) * 2.5, this.pos.z - Math.cos(this.heading) * 2.5);
      const b = heightAt(this.pos.x + Math.sin(this.heading) * 2.5, this.pos.z + Math.cos(this.heading) * 2.5);
      const pitch = Math.atan2(f - b, 5);
      root.rotation.set(pitch, this.heading, 0, 'YXZ');
      if (moving) root.position.y += Math.sin(performance.now() / 60 + this.id) * 0.04;
    } else {
      root.rotation.set(0, this.heading, 0);
      // Soldaten wippen beim Laufen
      this.model.members.forEach((m, i) => { m.position.y = moving ? Math.abs(Math.sin(performance.now() / 110 + i * 1.7)) * 0.25 : 0; });
      const alive = Math.ceil(this.hp / this.stats.hp * this.model.members.length);
      this.model.members.forEach((m, i) => { m.visible = i < alive; });
    }

    // --- Zielen und Schießen ---
    this.reload -= dt;
    if (this.target) {
      const tx = this.target.pos.x - this.pos.x, tz = this.target.pos.z - this.pos.z;
      const aim = Math.atan2(-tx, -tz);
      if (this.model.turret) {
        let rel = aim - this.heading - this.model.turret.rotation.y;
        while (rel > Math.PI) rel -= Math.PI * 2;
        while (rel < -Math.PI) rel += Math.PI * 2;
        this.model.turret.rotation.y += Math.max(-3 * dt, Math.min(3 * dt, rel));
        if (Math.abs(rel) < 0.15 && this.reload <= 0) this.fire(moving);
      } else {
        if (!moving) {
          let diff = aim - this.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          this.heading += Math.max(-5 * dt, Math.min(5 * dt, diff));
        }
        if (this.reload <= 0) this.fire(moving);
      }
    } else if (this.model.turret) {
      this.model.turret.rotation.y *= 1 - Math.min(1, dt * 1.5);
    }

    // Treffer-Aufblitzen
    if (this.lastHit > 0) {
      this.lastHit -= dt;
      this.model.paint.forEach(m => m.emissive.setHex(this.lastHit > 0 ? 0x552211 : 0));
    }

    // Auswahlring und Lebensbalken
    this.ring.visible = this.selected;
    this.ring.position.set(this.pos.x, this.pos.y + 0.3, this.pos.z);
    (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.65 + Math.sin(performance.now() / 180) * 0.25;
    const show = root.visible && (this.selected || this.hp < this.stats.hp);
    this.barBg.visible = this.barFg.visible = show;
    if (show) {
      this.barBg.position.set(this.pos.x, this.pos.y + this.barH, this.pos.z);
      tmpV.set(-2.05, 0, 0).applyQuaternion(camera.quaternion);
      this.barFg.position.copy(this.barBg.position).add(tmpV);
      this.barFg.scale.x = 4.1 * (this.hp / this.stats.hp);
    }
    return true;
  }

  private fire(moving: boolean) {
    const t = this.target!;
    this.reload = this.stats.reload * (0.85 + Math.random() * 0.3);
    const from = this.model.muzzle.getWorldPosition(new THREE.Vector3());
    const big = this.kind === 'tank' || this.kind === 'antitank';
    this.fx.muzzle(from, big);
    const accuracy = (moving ? 0.6 : 0.85) + (this.kind === 'tank' ? 0.05 : 0);
    const hit = Math.random() < accuracy;
    const aimAt = t.pos.clone().add(new THREE.Vector3(0, t.stats.armored ? 1.5 : 1.2, 0));
    if (!hit) aimAt.add(new THREE.Vector3((Math.random() - 0.5) * 6, -1, (Math.random() - 0.5) * 6));
    const color = this.team === 'blue' ? 0xbfe0ff : 0xffc27a;
    const dmg = this.damageAgainst(t);
    const shooter = this;
    this.fx.tracer(from, aimAt, big ? 0xfff0b0 : color, big ? 160 : 220, () => {
      if (hit && t.alive) {
        t.takeHit(dmg, shooter);
        if (big && t.alive) this.fx.explosion(aimAt, 0.3);
        else this.fx.impact(aimAt, !t.stats.armored);
      } else this.fx.impact(aimAt, true);
    });
  }

  dispose() {
    this.scene.remove(this.model.root, this.ring, this.barBg, this.barFg);
  }
}
