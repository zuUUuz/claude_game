import * as THREE from 'three';
import { MATCH, TEAM, Team, UNITS, UNIT_ORDER, UnitKind } from './config';
import { World, POINTS, BLUE_BASE, RED_BASE, heightAt, PointDef } from './world';
import { Effects } from './effects';
import { RtsCamera } from './camera';
import { Unit } from './units';

export interface CapturePoint {
  def: PointDef;
  control: number; // -100 (Südpakt) … 100 (Nordbund)
  owner: Team | null;
  contested: boolean;
  disc: THREE.Mesh;
  flag: THREE.Mesh;
  flagMat: THREE.MeshStandardMaterial;
  discMat: THREE.MeshBasicMaterial;
}

export type GameEvent = { text: string; tone: 'good' | 'bad' | 'info' };

function labelSprite(text: string): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(20,24,18,0.85)';
  g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#f2e3b3'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#f2e3b3';
  g.font = 'bold 72px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.scale.set(4.5, 4.5, 1);
  s.renderOrder = 5;
  return s;
}

export class Game {
  renderer: THREE.WebGLRenderer;
  world = new World();
  fx: Effects;
  cam: RtsCamera;
  units: Unit[] = [];
  points: CapturePoint[] = [];
  supply: Record<Team, number> = { blue: MATCH.startSupply, red: MATCH.startSupply };
  score: Record<Team, number> = { blue: 0, red: 0 };
  time = 0;
  running = false;
  over: { winner: Team | null } | null = null;
  events: GameEvent[] = [];
  stats = { deployed: 0, kills: 0, lost: 0, captures: 0 };
  onEvent: (e: GameEvent) => void = () => {};
  onOver: (winner: Team | null) => void = () => {};

  private clock = new THREE.Clock();
  private aiTimer = 1;
  private aiOrders = new Map<number, number>();
  private raycaster = new THREE.Raycaster();

  constructor(private canvasHost: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    canvasHost.appendChild(this.renderer.domElement);

    this.fx = new Effects(this.world.scene);
    this.cam = new RtsCamera(this.renderer.domElement);
    this.cam.onTap = (x, y) => this.tap(x, y);
    this.buildPoints();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private buildPoints() {
    for (const def of POINTS) {
      const y = heightAt(def.pos.x, def.pos.y);
      const discMat = new THREE.MeshBasicMaterial({ color: 0xf2e3b3, transparent: true, opacity: 0.35, depthWrite: false });
      const disc = new THREE.Mesh(new THREE.RingGeometry(MATCH.captureRadius - 1.2, MATCH.captureRadius, 48).rotateX(-Math.PI / 2), discMat);
      disc.position.set(def.pos.x, y + 0.35, def.pos.y);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 10, 6), new THREE.MeshStandardMaterial({ color: 0xdedbd0 }));
      pole.position.set(def.pos.x, y + 5, def.pos.y);
      pole.castShadow = true;
      const flagMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, flatShading: true, side: THREE.DoubleSide });
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.2, 6, 1), flagMat);
      flag.position.set(def.pos.x + 1.8, y + 8.6, def.pos.y);
      flag.castShadow = true;
      const label = labelSprite(def.id);
      label.position.set(def.pos.x, y + 15, def.pos.y);
      this.world.scene.add(disc, pole, flag, label);
      this.points.push({ def, control: 0, owner: null, contested: false, disc, flag, flagMat, discMat });
    }
  }

  resize() {
    const w = this.canvasHost.clientWidth, h = this.canvasHost.clientHeight;
    this.renderer.setSize(w, h);
    this.cam.resize(w, h);
  }

  start() {
    this.units.forEach(u => u.dispose());
    this.units = [];
    this.points.forEach(p => { p.control = 0; p.owner = null; });
    this.supply = { blue: MATCH.startSupply, red: MATCH.startSupply };
    this.score = { blue: 0, red: 0 };
    this.stats = { deployed: 0, kills: 0, lost: 0, captures: 0 };
    this.time = 0;
    this.over = null;
    this.running = true;
    this.cam.focus(BLUE_BASE.x, BLUE_BASE.y - 30);
    // Startaufstellung
    this.spawn('infantry', 'blue', true); this.spawn('recon', 'blue', true);
    this.spawn('infantry', 'red'); this.spawn('recon', 'red');
    this.emit('Gefecht beginnt. Erobere die Punkte A, B und C.', 'info');
  }

  get timeLeft() { return Math.max(0, MATCH.duration - this.time); }
  get overtime() { return this.timeLeft <= MATCH.overtimeFrom; }
  get selected() { return this.units.filter(u => u.selected && u.alive); }

  emit(text: string, tone: GameEvent['tone']) {
    const e = { text, tone };
    this.events.unshift(e);
    this.events.length = Math.min(this.events.length, 6);
    this.onEvent(e);
  }

  spawn(kind: UnitKind, team: Team, free = false): Unit | null {
    const cost = UNITS[kind].cost;
    if (!free && this.supply[team] < cost) return null;
    if (!free && this.units.filter(u => u.team === team && u.alive).length >= MATCH.unitCap) return null;
    if (!free) this.supply[team] -= cost;
    const base = team === 'blue' ? BLUE_BASE : RED_BASE;
    const dir = team === 'blue' ? -1 : 1;
    const x = base.x + (Math.random() - 0.5) * 16, z = base.y + dir * (4 + Math.random() * 4);
    const u = new Unit(kind, team, x, z, this.world.scene, this.fx);
    u.moveTo = new THREE.Vector2(x + (Math.random() - 0.5) * 6, z + dir * 14);
    this.units.push(u);
    if (team === 'blue') this.stats.deployed++;
    return u;
  }

  deploy(kind: UnitKind) {
    if (!this.running) return false;
    if (this.units.filter(u => u.team === 'blue' && u.alive).length >= MATCH.unitCap) {
      this.emit(`Maximal ${MATCH.unitCap} Einheiten im Feld`, 'info');
      return false;
    }
    const u = this.spawn(kind, 'blue');
    if (!u) return false;
    this.units.forEach(o => o.setSelected(false));
    u.setSelected(true);
    return true;
  }

  selectAll() {
    const mine = this.units.filter(u => u.team === 'blue' && u.alive);
    const all = mine.every(u => u.selected);
    mine.forEach(u => u.setSelected(!all));
  }

  // ---------- Eingabe ----------
  private screenPos(v: THREE.Vector3) {
    const p = v.clone().project(this.cam.camera);
    const r = this.renderer.domElement.getBoundingClientRect();
    return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height, front: p.z < 1 };
  }

  private tap(x: number, y: number) {
    if (!this.running) return;
    // Nächste Einheit in Fingerreichweite
    let best: Unit | null = null, bestD = 44;
    for (const u of this.units) {
      if (!u.alive || (u.team === 'red' && !u.revealed)) continue;
      const s = this.screenPos(u.pos.clone().add(new THREE.Vector3(0, 1.5, 0)));
      const d = Math.hypot(s.x - x, s.y - y);
      if (s.front && d < bestD) { bestD = d; best = u; }
    }
    const sel = this.selected;
    if (best && best.team === 'blue') {
      const only = sel.length === 1 && sel[0] === best;
      this.units.forEach(u => u.setSelected(false));
      if (!only) best.setSelected(true);
      return;
    }
    if (best && best.team === 'red' && sel.length) {
      sel.forEach(u => { u.moveTo = best!.pos2.clone(); u.target = best; });
      this.fx.marker(best.pos, 0xff6a4a);
      return;
    }
    if (!sel.length) return;
    // Bodenpunkt bestimmen
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.cam.camera);
    const hit = this.raycaster.intersectObject(this.world.ground)[0];
    if (!hit) return;
    this.order(sel, new THREE.Vector2(hit.point.x, hit.point.z));
    this.fx.marker(hit.point, 0xffffff);
  }

  private order(units: Unit[], at: THREE.Vector2) {
    // Einfache Formation: Einheiten im Kreis um den Zielpunkt verteilen
    units.forEach((u, i) => {
      if (units.length === 1) { u.moveTo = at.clone(); return; }
      const a = (i / units.length) * Math.PI * 2, r = 4 + units.length * 0.9;
      u.moveTo = new THREE.Vector2(at.x + Math.cos(a) * r, at.y + Math.sin(a) * r);
    });
  }

  // ---------- Simulation ----------
  private frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    if (this.running) this.step(dt);
    this.fx.update(dt);
    this.animateFlags();
    this.cam.update(dt, this.fx.shake);
    this.renderer.render(this.world.scene, this.cam.camera);
  }

  private step(dt: number) {
    this.time += dt;
    this.updateVisibility();
    const blue = this.units.filter(u => u.team === 'blue');
    const red = this.units.filter(u => u.team === 'red');
    // Schaden kommt auch verzögert beim Einschlag an, daher Tode hier gesammelt melden
    for (const u of this.units) if (!u.alive && !u.reported) { u.reported = true; this.onDeath(u); }
    this.units = this.units.filter(u => u.update(dt, u.team === 'blue' ? red : blue, this.world.obstacles, this.cam.camera));
    this.separate();
    this.updatePoints(dt);
    this.economy(dt);
    this.ai(dt);
    this.checkEnd();
  }

  private onDeath(u: Unit) {
    if (u.team === 'blue') { this.stats.lost++; this.emit(`${u.stats.name} verloren`, 'bad'); }
    else { this.stats.kills++; this.emit(`Feindliche ${u.stats.name} zerstört`, 'good'); }
  }

  // Nebel des Krieges: Einheiten sind nur sichtbar, wenn ein Gegner sie sieht
  private updateVisibility() {
    for (const u of this.units) {
      if (!u.alive) { u.revealed = true; continue; }
      const enemyTeam: Team = u.team === 'blue' ? 'red' : 'blue';
      const base = enemyTeam === 'blue' ? BLUE_BASE : RED_BASE;
      let seen = Math.hypot(u.pos.x - base.x, u.pos.z - base.y) < 40;
      if (!seen) {
        for (const o of this.units) {
          if (o.team !== enemyTeam || !o.alive) continue;
          if (o.pos.distanceTo(u.pos) < o.stats.vision * (u.inCover ? 0.6 : 1)) { seen = true; break; }
        }
      }
      u.revealed = seen;
      if (u.team === 'red') u.model.root.visible = seen;
    }
  }

  private separate() {
    const alive = this.units.filter(u => u.alive);
    for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i], b = alive[j];
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz), min = a.stats.radius + b.stats.radius;
      if (d < min && d > 0.001) {
        const push = (min - d) / 2;
        a.pos.x -= dx / d * push; a.pos.z -= dz / d * push;
        b.pos.x += dx / d * push; b.pos.z += dz / d * push;
      }
    }
  }

  private updatePoints(dt: number) {
    for (const p of this.points) {
      let nb = 0, nr = 0;
      for (const u of this.units) {
        if (!u.alive) continue;
        if (Math.hypot(u.pos.x - p.def.pos.x, u.pos.z - p.def.pos.y) < MATCH.captureRadius) u.team === 'blue' ? nb++ : nr++;
      }
      p.contested = nb > 0 && nr > 0;
      const before = p.owner;
      if (!p.contested && (nb || nr)) {
        const dir = nb ? 1 : -1;
        p.control = THREE.MathUtils.clamp(p.control + dir * MATCH.captureSpeed * Math.min(3, nb || nr) * dt, -100, 100);
      }
      if (p.control >= 100) p.owner = 'blue';
      else if (p.control <= -100) p.owner = 'red';
      else if ((p.owner === 'blue' && p.control < 0) || (p.owner === 'red' && p.control > 0)) p.owner = null;
      if (p.owner !== before) {
        if (p.owner === 'blue') { this.stats.captures++; this.emit(`Punkt ${p.def.id} erobert`, 'good'); }
        else if (p.owner === 'red') this.emit(`Punkt ${p.def.id} an den Südpakt verloren`, 'bad');
        else this.emit(`Punkt ${p.def.id} ist neutral`, 'info');
      }
      // Darstellung
      const c = p.owner ? TEAM[p.owner].color : 0xf2e3b3;
      p.discMat.color.setHex(p.contested ? 0xffffff : c);
      p.discMat.opacity = p.contested ? 0.45 + Math.sin(this.time * 10) * 0.3 : 0.55;
      const mix = new THREE.Color(0xeeeeee).lerp(new THREE.Color(p.control >= 0 ? TEAM.blue.color : TEAM.red.color), Math.abs(p.control) / 100);
      p.flagMat.color.copy(mix);
    }
  }

  private animateFlags() {
    const t = performance.now() / 300;
    for (const p of this.points) {
      const pos = p.flag.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) + 1.8;
        pos.setZ(i, Math.sin(t + x * 1.6) * 0.25 * (x / 3.6));
      }
      pos.needsUpdate = true;
    }
  }

  private economy(dt: number) {
    const mult = this.overtime ? 2 : 1;
    const held = { blue: this.points.filter(p => p.owner === 'blue').length, red: this.points.filter(p => p.owner === 'red').length };
    for (const team of ['blue', 'red'] as Team[]) {
      const owned = held[team];
      const behind = Math.max(0, held[team === 'blue' ? 'red' : 'blue'] - owned);
      const income = MATCH.baseIncome + owned * MATCH.pointIncome + behind * MATCH.comebackIncome;
      this.supply[team] = Math.min(400, this.supply[team] + income * dt);
      this.score[team] += owned * MATCH.pointScore * mult * dt;
    }
  }

  // ---------- KI-Gegner ----------
  private ai(dt: number) {
    this.aiTimer -= dt;
    if (this.aiTimer > 0) return;
    this.aiTimer = 2 + Math.random();
    const red = this.units.filter(u => u.team === 'red' && u.alive);
    const seenBlue = this.units.filter(u => u.team === 'blue' && u.alive && u.revealed);

    // Aufstellen: kontert, was sie von dir sehen
    const tanks = seenBlue.filter(u => u.kind === 'tank').length;
    const soft = seenBlue.filter(u => !u.stats.armored).length;
    let want: UnitKind;
    if (tanks >= 2 && Math.random() < 0.7) want = 'antitank';
    else if (soft >= 3 && Math.random() < 0.6) want = 'tank';
    else if (!red.some(u => u.kind === 'recon') && Math.random() < 0.6) want = 'recon';
    else want = UNIT_ORDER[Math.floor(Math.random() * UNIT_ORDER.length)];
    // In Wellen aufstellen: erst sparen, dann mehrere Einheiten auf einmal
    if (this.supply.red >= 110 || (this.supply.red >= UNITS[want].cost && red.length < 3)) {
      let guard = 0;
      while (this.supply.red >= UNITS[want].cost && guard++ < 5) {
        if (!this.spawn(want, 'red')) break;
        want = Math.random() < 0.5 ? want : UNIT_ORDER[Math.floor(Math.random() * UNIT_ORDER.length)];
      }
    }

    // Befehle: freie Punkte zuerst, dann umkämpfte, dann verteidigen
    for (const u of red) {
      const last = this.aiOrders.get(u.id) ?? -99;
      if (u.moveTo && this.time - last < 10) continue;
      const ranked = [...this.points].sort((a, b) => this.aiValue(b, u) - this.aiValue(a, u));
      const goal = ranked[Math.random() < 0.75 ? 0 : 1].def.pos;
      u.moveTo = new THREE.Vector2(goal.x + (Math.random() - 0.5) * 16, goal.y + (Math.random() - 0.5) * 16);
      this.aiOrders.set(u.id, this.time);
    }
  }

  private aiValue(p: CapturePoint, u: Unit) {
    let v = 0;
    if (p.owner !== 'red') v += 50;
    if (p.contested) v += 30;
    if (p.owner === 'red' && p.control < 60) v += 25;
    v -= Math.hypot(u.pos.x - p.def.pos.x, u.pos.z - p.def.pos.y) * 0.3;
    return v + Math.random() * 10;
  }

  private checkEnd() {
    let winner: Team | null | undefined;
    if (this.score.blue >= MATCH.scoreToWin || this.score.red >= MATCH.scoreToWin) winner = this.score.blue >= this.score.red ? 'blue' : 'red';
    else if (this.timeLeft <= 0) winner = this.score.blue === this.score.red ? null : this.score.blue > this.score.red ? 'blue' : 'red';
    if (winner === undefined) return;
    this.running = false;
    this.over = { winner };
    this.units.forEach(u => u.setSelected(false));
    this.onOver(winner);
  }
}
