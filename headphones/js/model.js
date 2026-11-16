// Procedural headphones (no model files). Units: about 2.3 wide. Cup local frame: +z points away from the head.
// buildHeadphones(THREE, detail) → { group, parts: {key: Object3D anchor (right cup)}, setExplode(e), setColor(c), colorLerp(a,b,t) }
export function buildHeadphones(THREE, detail = 1) {
  const seg = Math.round(64 * detail), V = (x, y) => new THREE.Vector2(x, y);
  const C = c => new THREE.Color(c);
  const mat = {
    shell: new THREE.MeshPhysicalMaterial({ color: 0x26282e, metalness: .55, roughness: .38, clearcoat: .6, clearcoatRoughness: .3 }),
    band: new THREE.MeshPhysicalMaterial({ color: 0x2c2f36, metalness: .5, roughness: .35, clearcoat: .5 }),
    accent: new THREE.MeshStandardMaterial({ color: 0x8a8f99, metalness: 1, roughness: .22 }),
    cushion: new THREE.MeshPhysicalMaterial({ color: 0x18191d, roughness: .95, sheen: 1, sheenRoughness: .6, sheenColor: 0x555a66 }),
    fabric: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 1, side: THREE.DoubleSide }),
    steel: new THREE.MeshStandardMaterial({ color: 0xd5d8de, metalness: 1, roughness: .18 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0e0f12, metalness: .6, roughness: .5 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xc58a55, metalness: 1, roughness: .3 }),
    pcb: new THREE.MeshStandardMaterial({ color: 0x173a2c, metalness: .2, roughness: .6 }),
    cell: new THREE.MeshStandardMaterial({ color: 0x9aa6b8, metalness: .8, roughness: .35 }),
  };
  const lathe = (pts, m) => { const g = new THREE.LatheGeometry(pts, seg); g.rotateX(Math.PI / 2); return new THREE.Mesh(g, m); };
  const torus = (R, r, m, s = seg) => new THREE.Mesh(new THREE.TorusGeometry(R, r, Math.max(8, s >> 2), s), m);
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

  const group = new THREE.Group(), cups = [], explodable = [];
  // ---- one ear cup; returns group with named parts and their exploded z offsets ----
  const makeCup = side => {
    const cup = new THREE.Group(); cup.rotation.y = side * Math.PI / 2; cup.position.set(side * 1.0, -.28, 0);
    const inner = new THREE.Group(); inner.scale.y = 1.24; cup.add(inner); // oval
    const part = (key, obj, ez) => { obj.userData = { key, z0: obj.position.z, ez }; inner.add(obj); explodable.push(obj); return obj; };
    // shell: rounded can open towards the head
    const sh = [V(.0, .2), V(.33, .2), V(.43, .18), V(.49, .12), V(.51, .03), V(.51, -.1), V(.49, -.16), V(.45, -.18), V(.44, -.15), V(.47, -.1), V(.47, .08), V(.4, .15), V(.0, .16)];
    part('shell', lathe(sh, mat.shell), .3);
    // outer cap + accent ring
    const cap = new THREE.Group(); cap.position.z = .205;
    const capDisc = lathe([V(0, .012), V(.33, .01), V(.36, 0), V(.36, -.01), V(0, -.01)], mat.accent); cap.add(capDisc);
    const ring = torus(.4, .012, mat.steel); cap.add(ring);
    part('cap', cap, .56);
    // battery + board + driver + grille + cushion (inside the shell, revealed by the explode)
    const batt = box(.46, .26, .07, mat.cell); batt.position.z = .1; part('battery', batt, .2);
    const pcb = new THREE.Group(); pcb.position.z = .03;
    const board = box(.56, .36, .018, mat.pcb); pcb.add(board);
    const chip = box(.14, .14, .03, mat.dark); chip.position.set(.08, .02, .02); pcb.add(chip);
    for (let i = 0; i < 4; i++) { const c = box(.05, .03, .012, mat.copper); c.position.set(-.18 + i * .055, -.12, .015); pcb.add(c); }
    part('pcb', pcb, -.02);
    const drv = new THREE.Group(); drv.position.z = -.07;
    drv.add(lathe([V(.05, .0), V(.33, -.04), V(.36, -.045), V(.36, -.06), V(.05, -.03)], mat.dark)); // cone
    drv.add(lathe([V(0, -.035), V(.09, -.035), V(.1, -.02), V(.08, .0), V(0, .0)].reverse(), mat.steel)); // dust cap
    const mag = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .08, seg), mat.steel); mag.rotation.x = Math.PI / 2; mag.position.z = .04; drv.add(mag);
    const surround = torus(.355, .015, mat.copper); surround.position.z = -.055; drv.add(surround);
    part('driver', drv, -.28);
    const grille = new THREE.Mesh(new THREE.CircleGeometry(.43, seg), mat.fabric); grille.position.z = -.165; grille.rotation.y = Math.PI; part('grille', grille, -.42);
    const cush = new THREE.Group(); cush.position.z = -.24;
    const ct = torus(.38, .095, mat.cushion); ct.scale.z = .85; cush.add(ct);
    const face = new THREE.Mesh(new THREE.CircleGeometry(.3, seg), mat.fabric); face.position.z = .02; face.rotation.y = Math.PI; cush.add(face);
    part('cushion', cush, -.6);
    // hinge block on top of the cup (stays with the shell)
    const hinge = box(.12, .1, .1, mat.steel); hinge.position.set(0, .53, -.01); part('hinge', hinge, .3);
    cups.push(cup); group.add(cup);
    return cup;
  };
  const right = makeCup(1); makeCup(-1);

  // ---- headband: flat stainless arc + soft canopy, plus stems down to the cups ----
  class Arc extends THREE.Curve { constructor(rx, ry, y0) { super(); Object.assign(this, { rx, ry, y0 }); }
    getPoint(t, out = new THREE.Vector3()) { const a = Math.PI * t; return out.set(this.rx * Math.cos(a), this.y0 + this.ry * Math.sin(a), 0); } }
  const bandG = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.TubeGeometry(new Arc(1.04, .78, .62), seg, .045, 12), mat.band); outer.scale.z = 3.2; bandG.add(outer);
  const canopy = new THREE.Mesh(new THREE.TubeGeometry(new Arc(.9, .62, .62), seg, .035, 10), mat.cushion); canopy.scale.z = 4; bandG.add(canopy);
  for (const s of [1, -1]) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .4, 16), mat.steel); stem.position.set(s * 1.0, .45, 0); bandG.add(stem);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.07, 20, 14), mat.band); cap.scale.set(1, .7, 1.6); cap.position.set(s * 1.03, .64, 0); bandG.add(cap);
  }
  group.add(bandG);

  // Anchors for labels (right cup parts, world position read each frame)
  const parts = {};
  right.traverse(o => { if (o.userData?.key) parts[o.userData.key] = o; });

  const setExplode = e => {
    const k = e * e * (3 - 2 * e);
    explodable.forEach(o => { o.position.z = o.userData.z0 + o.userData.ez * k; });
    cups.forEach(c => { c.position.x = Math.sign(c.position.x) * (1.0 + .2 * k); });
    bandG.position.y = .42 * k;
  };
  const keys = ['shell', 'band', 'accent', 'cushion'];
  const setColor = c => { keys.forEach(k => mat[k].color.set(c[k])); mat.cushion.sheenColor.set(c.accent).multiplyScalar(.5); mat.fabric.color.set(c.cushion).multiplyScalar(.8); };
  const getColor = () => Object.fromEntries(keys.map(k => [k, '#' + mat[k].color.getHexString()]));
  const colorLerp = (from, to, t) => keys.forEach(k => mat[k].color.copy(C(from[k])).lerp(C(to[k]), t));
  return { group, parts, mat, setExplode, setColor, getColor, colorLerp };
}
