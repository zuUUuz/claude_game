import * as THREE from 'three';
import { TEAM, Team, UnitKind } from './config';

// Prozedurale Low-Poly-Modelle. Jedes Modell liefert:
//  root   – die ganze Einheit
//  turret – dreht sich zum Ziel (optional)
//  muzzle – Mündungspunkt für Schüsse
//  members – einzelne Soldaten, die bei Verlusten verschwinden

export interface UnitModel {
  root: THREE.Group;
  turret: THREE.Object3D | null;
  muzzle: THREE.Object3D;
  members: THREE.Object3D[];
  paint: THREE.MeshStandardMaterial[];
}

const matCache = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: number, rough = 0.75, metal = 0.05): THREE.MeshStandardMaterial {
  const key = `${color}-${rough}-${metal}`;
  let m = matCache.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: true }); matCache.set(key, m); }
  return m;
}
function box(w: number, h: number, d: number, m: THREE.Material) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); }

function paintFor(team: Team) {
  // Eigenes Material pro Einheit, damit Treffer-Blitze nur diese Einheit färben
  return new THREE.MeshStandardMaterial({ color: TEAM[team].color, roughness: 0.6, metalness: 0.15, flatShading: true });
}

function finish(root: THREE.Group) {
  root.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
}

function soldier(team: Team, weapon: 'rifle' | 'launcher', paint: THREE.MeshStandardMaterial): THREE.Group {
  const g = new THREE.Group();
  const uniform = mat(team === 'blue' ? 0x4d5b3a : 0x5f5539, 0.9);
  const legs = box(0.55, 0.8, 0.35, uniform); legs.position.y = 0.4;
  const torso = box(0.7, 0.8, 0.45, uniform); torso.position.y = 1.2;
  const vest = box(0.74, 0.5, 0.5, paint); vest.position.y = 1.25;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), mat(0xd9b48f, 0.8)); head.position.y = 1.82;
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x3d4630, 0.8)); helmet.position.y = 1.86;
  g.add(legs, torso, vest, head, helmet);
  if (weapon === 'rifle') {
    const rifle = box(0.1, 0.12, 1.0, mat(0x222222, 0.5, 0.4)); rifle.position.set(0.3, 1.25, -0.35);
    g.add(rifle);
  } else {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.5, 6), mat(0x39402c, 0.6, 0.2));
    tube.rotation.x = Math.PI / 2; tube.position.set(0.32, 1.7, -0.1);
    g.add(tube);
  }
  g.scale.setScalar(1.25);
  return g;
}

function squad(team: Team, count: number, weapon: 'rifle' | 'launcher'): UnitModel {
  const root = new THREE.Group();
  const paint = paintFor(team);
  const members: THREE.Object3D[] = [];
  const offsets = [[0, 0], [1.6, 1.1], [-1.6, 1.0], [0.2, 2.2], [1.8, -1.2], [-1.7, -1.1]];
  for (let i = 0; i < count; i++) {
    const s = soldier(team, weapon, paint);
    s.position.set(offsets[i][0], 0, offsets[i][1]);
    s.rotation.y = (Math.random() - 0.5) * 0.4;
    root.add(s);
    members.push(s);
  }
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 1.6, -1); root.add(muzzle);
  finish(root);
  return { root, turret: null, muzzle, members, paint: [paint] };
}

function tank(team: Team): UnitModel {
  const root = new THREE.Group();
  const paint = paintFor(team);
  const dark = mat(0x2a2d27, 0.9);
  const trim = mat(TEAM[team].dark, 0.7, 0.1);
  // Wanne mit abgeschrägter Front
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-3.4, 0); hullShape.lineTo(3.0, 0); hullShape.lineTo(3.6, 0.9); hullShape.lineTo(2.6, 1.5);
  hullShape.lineTo(-3.2, 1.5); hullShape.lineTo(-3.6, 0.8); hullShape.closePath();
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 3.4, bevelEnabled: false });
  hullGeo.translate(0, 0, -1.7);
  hullGeo.rotateY(Math.PI / 2);
  const hull = new THREE.Mesh(hullGeo, paint); hull.position.y = 0.7;
  root.add(hull);
  // Ketten und Laufrollen
  for (const side of [-1, 1]) {
    const track = box(1.0, 1.2, 7.2, dark); track.position.set(side * 2.05, 0.6, 0);
    root.add(track);
    for (let k = 0; k < 5; k++) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.05, 8), mat(0x3b3f36, 0.8));
      wheel.rotation.z = Math.PI / 2; wheel.position.set(side * 2.1, 0.5, -2.7 + k * 1.35);
      root.add(wheel);
    }
    const skirt = box(0.25, 0.6, 6.6, trim); skirt.position.set(side * 2.55, 1.3, 0);
    root.add(skirt);
  }
  // Turm
  const turret = new THREE.Group(); turret.position.y = 2.2;
  const tShape = new THREE.Shape();
  tShape.moveTo(-1.5, -1.9); tShape.lineTo(1.5, -1.9); tShape.lineTo(1.8, 0.2); tShape.lineTo(1.1, 1.8);
  tShape.lineTo(-1.1, 1.8); tShape.lineTo(-1.8, 0.2); tShape.closePath();
  const tGeo = new THREE.ExtrudeGeometry(tShape, { depth: 1.0, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 1 });
  tGeo.rotateX(Math.PI / 2); tGeo.translate(0, 1.0, 0.2);
  const tBody = new THREE.Mesh(tGeo, paint);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 4.6, 8), mat(0x3b3f36, 0.5, 0.3));
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.5, -3.7);
  const mantlet = box(1.0, 0.7, 0.6, trim); mantlet.position.set(0, 0.5, -1.7);
  const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.3, 8), trim); hatch.position.set(0.6, 1.1, 0.6);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 3), dark); antenna.position.set(-0.9, 2.2, 1.3);
  turret.add(tBody, barrel, mantlet, hatch, antenna);
  root.add(turret);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.5, -6.0); turret.add(muzzle);
  finish(root);
  return { root, turret, muzzle, members: [], paint: [paint] };
}

function recon(team: Team): UnitModel {
  const root = new THREE.Group();
  const paint = paintFor(team);
  const dark = mat(0x2a2d27, 0.9);
  const body = box(2.6, 1.2, 4.8, paint); body.position.y = 1.35;
  const hood = box(2.4, 0.6, 1.6, paint); hood.position.set(0, 2.1, 0.4);
  const glass = box(2.2, 0.5, 0.1, mat(0x5d7482, 0.2, 0.3)); glass.position.set(0, 2.2, -0.42);
  root.add(body, hood, glass);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.55, 10), dark);
    wheel.rotation.z = Math.PI / 2; wheel.position.set(sx * 1.35, 0.62, sz * 1.6);
    root.add(wheel);
  }
  const turret = new THREE.Group(); turret.position.set(0, 2.45, 0.5);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.35, 8), mat(TEAM[team].dark));
  const gun = box(0.12, 0.12, 1.6, mat(0x222222, 0.5, 0.4)); gun.position.set(0, 0.25, -0.8);
  turret.add(ring, gun);
  root.add(turret);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.25, -1.7); turret.add(muzzle);
  finish(root);
  return { root, turret, muzzle, members: [], paint: [paint] };
}

export function buildModel(kind: UnitKind, team: Team): UnitModel {
  switch (kind) {
    case 'tank': return tank(team);
    case 'recon': return recon(team);
    case 'antitank': return squad(team, 3, 'launcher');
    default: return squad(team, 5, 'rifle');
  }
}
