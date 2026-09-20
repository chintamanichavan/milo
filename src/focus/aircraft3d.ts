import * as THREE from 'three';

/**
 * The fleet, built from proper geometry rather than downloaded: a lathed fuselage
 * with a real nose and tail taper, swept wings with dihedral, stabilisers, a fin,
 * nacelles, a window strip and a livery line. It reads as an aircraft from any angle.
 */
export interface Plane3D {
  group: THREE.Group;
  update(time: number, phase: string, turnRate: number): void;
  dispose(): void;
}

const SKIN = (): THREE.Material =>
  new THREE.MeshStandardMaterial({ color: 0xeef1f6, metalness: 0.35, roughness: 0.42 });
/** painted per vertex: pale belly, grey crown, violet spine, dark cockpit */
const PAINTED = (): THREE.Material =>
  new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.3, roughness: 0.45 });
/** a back-face shell in near-black, so the silhouette reads over bright ground */
const INK = (): THREE.Material =>
  new THREE.MeshBasicMaterial({ color: 0x0a0e14, side: THREE.BackSide });

const BELLY = new THREE.Color(0xeef1f6);
const CROWN = new THREE.Color(0x9aa4b0);
const SPINE = new THREE.Color(0xa78bfa);
const COCKPIT = new THREE.Color(0x10151c);
const DARK = (): THREE.Material =>
  new THREE.MeshStandardMaterial({ color: 0x4d545d, metalness: 0.5, roughness: 0.5 });
const GLASS = (): THREE.Material =>
  new THREE.MeshStandardMaterial({ color: 0x1b2430, emissive: 0x9fb6ff, emissiveIntensity: 0.5, roughness: 0.2 });
const LIVERY = (): THREE.Material =>
  new THREE.MeshStandardMaterial({ color: 0xa78bfa, metalness: 0.2, roughness: 0.5 });

interface Shape {
  length: number;
  radius: number;
  span: number;
  sweep: number;
  dihedral: number;
  engines: 0 | 2 | 4;
  prop?: boolean;
  delta?: boolean;
}

const SHAPES: Record<string, Shape> = {
  prop: { length: 2.6, radius: 0.17, span: 3.2, sweep: 0.06, dihedral: 0.09, engines: 0, prop: true },
  jet: { length: 3.2, radius: 0.19, span: 3.1, sweep: 0.3, dihedral: 0.06, engines: 2 },
  airliner: { length: 4.2, radius: 0.22, span: 4.0, sweep: 0.5, dihedral: 0.08, engines: 2 },
  wide: { length: 5.2, radius: 0.3, span: 5.0, sweep: 0.62, dihedral: 0.1, engines: 4 },
  concorde: { length: 5.6, radius: 0.19, span: 2.8, sweep: 1.6, dihedral: 0.02, engines: 4, delta: true },
};

/** nose taper, constant section, tail cone — as a lathe profile */
function fuselage(shape: Shape): THREE.Mesh {
  const points: THREE.Vector2[] = [];
  const steps = 22;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const z = -shape.length / 2 + t * shape.length;
    let r: number;
    if (t < 0.18) r = shape.radius * Math.sin((t / 0.18) * (Math.PI / 2)) ** 0.7;
    else if (t > 0.72) r = shape.radius * (1 - (t - 0.72) / 0.28) ** 0.85;
    else r = shape.radius;
    points.push(new THREE.Vector2(Math.max(0.004, r), z));
  }
  const geometry = new THREE.LatheGeometry(points, 30);
  paintBody(geometry, shape);
  const mesh = new THREE.Mesh(geometry, PAINTED());
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/**
 * The livery, painted into the vertices: an airliner seen from above is a grey
 * top with a violet spine and a dark band over the flight deck, not a white
 * arrow. The lathe turns about its own Y, so local z is which way is up.
 */
function paintBody(geometry: THREE.BufferGeometry, shape: Shape): void {
  const position = geometry.getAttribute('position');
  const colours = new Float32Array(position.count * 3);
  const colour = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const station = position.getY(i);
    const z = position.getZ(i);
    const radius = Math.max(1e-5, Math.hypot(x, z));
    const up = z / radius;
    // the nose sits at the near end of the profile
    const fromNose = (station + shape.length / 2) / shape.length;
    colour.copy(BELLY).lerp(CROWN, THREE.MathUtils.smoothstep(up, -0.3, 0.3));
    if (up > 0.62) colour.lerp(SPINE, THREE.MathUtils.smoothstep(up, 0.62, 0.9) * 0.85);
    if (fromNose < 0.2 && up > 0.25)
      colour.lerp(COCKPIT, THREE.MathUtils.smoothstep(up, 0.25, 0.5) * (1 - fromNose / 0.2));
    colours[i * 3] = colour.r;
    colours[i * 3 + 1] = colour.g;
    colours[i * 3 + 2] = colour.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
}

/** a wing is grey on top and pale underneath, for the same reason */
function paintPlate(geometry: THREE.BufferGeometry, thickness: number): void {
  const position = geometry.getAttribute('position');
  const colours = new Float32Array(position.count * 3);
  const colour = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    // the plate is extruded along its local z, and rotated so that z is down
    colour.copy(CROWN).lerp(BELLY, THREE.MathUtils.smoothstep(position.getZ(i), 0, thickness));
    colours[i * 3] = colour.r;
    colours[i * 3 + 1] = colour.g;
    colours[i * 3 + 2] = colour.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
}

/** a near-black shell a shade larger than the thing itself, drawn inside out */
function hull(target: THREE.Object3D, ink: THREE.Material, grow = 1.05): void {
  const meshes: THREE.Mesh[] = [];
  target.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) meshes.push(mesh);
  });
  for (const mesh of meshes) {
    const shell = new THREE.Mesh(mesh.geometry, ink);
    shell.position.copy(mesh.position);
    shell.rotation.copy(mesh.rotation);
    shell.scale.copy(mesh.scale).multiplyScalar(grow);
    shell.renderOrder = -1;
    mesh.parent?.add(shell);
  }
}

/** a swept planform, extruded thin, then given dihedral */
function wingPair(
  chordRoot: number,
  chordTip: number,
  span: number,
  sweep: number,
  at: number,
  dihedral: number,
  thickness = 0.035,
): THREE.Group {
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    const outline = new THREE.Shape();
    outline.moveTo(0, chordRoot / 2);
    outline.lineTo(span / 2, chordTip / 2 - sweep);
    outline.lineTo(span / 2, -chordTip / 2 - sweep);
    outline.lineTo(0, -chordRoot / 2);
    outline.closePath();
    const geometry = new THREE.ExtrudeGeometry(outline, { depth: thickness, bevelEnabled: false });
    paintPlate(geometry, thickness);
    const wing = new THREE.Mesh(geometry, PAINTED());
    wing.rotation.x = Math.PI / 2;
    wing.scale.x = side;
    wing.position.set(0, -0.02, at);
    wing.rotation.z = -side * dihedral;
    group.add(wing);
  }
  return group;
}

function nacelle(x: number, z: number, radius: number): THREE.Group {
  const group = new THREE.Group();
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.86, radius * 3.1, 14, 1, true), DARK());
  pod.rotation.x = Math.PI / 2;
  const lip = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.12, 8, 16), SKIN());
  lip.position.z = radius * 1.5;
  // the strut runs up and aft from the pod to the wing above it
  const pylon = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.32, radius * 1.9, radius * 2.8), SKIN());
  pylon.position.set(0, radius * 1.05, -radius * 1.3);
  group.add(pod, lip, pylon);
  group.position.set(x, -radius * 1.1, z);
  return group;
}

export function buildAircraft(id: string): Plane3D {
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const track = <T extends THREE.Mesh | THREE.Group>(thing: T): T => {
    thing.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.geometry) disposables.push(mesh.geometry);
      if (mesh.material) disposables.push(mesh.material as THREE.Material);
    });
    return thing;
  };

  let strobe: THREE.Mesh | null = null;
  let landingLights: THREE.Mesh[] = [];
  let propeller: THREE.Mesh | null = null;

  if (id === 'paper') {
    // a folded dart: two halves creased up along the middle, a keel underneath,
    // so that from straight above it reads as folded paper and not as an arrow
    for (const side of [-1, 1]) {
      const sheet = new THREE.Shape();
      sheet.moveTo(0, 1.4);
      sheet.lineTo(side * 0.98, -1.1);
      sheet.lineTo(side * 0.46, -1.16);
      sheet.lineTo(0, -0.58);
      sheet.closePath();
      const geometry = new THREE.ExtrudeGeometry(sheet, { depth: 0.02, bevelEnabled: false });
      paintPlate(geometry, 0.02);
      const wing = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, side: THREE.DoubleSide }),
      );
      wing.rotation.x = -Math.PI / 2;
      const fold = new THREE.Group();
      // the crease lifts each half, which is what gives a dart its shading
      fold.rotation.z = -side * 0.26;
      fold.add(wing);
      group.add(track(fold));
    }
    const crease = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.2, 2.5), LIVERY());
    crease.position.set(0, 0.1, 0.06);
    group.add(track(crease));
    // the folded body hanging under the crease, in shadow from above
    const keel = new THREE.Shape();
    keel.moveTo(0.95, 0);
    keel.lineTo(-1.1, 0);
    keel.lineTo(-1.1, -0.26);
    keel.lineTo(0.55, -0.02);
    keel.closePath();
    const body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(keel, { depth: 0.02, bevelEnabled: false }),
      new THREE.MeshStandardMaterial({ color: 0x8a939f, roughness: 0.85, side: THREE.DoubleSide }),
    );
    body.rotation.y = Math.PI / 2;
    body.position.set(0.01, 0.02, 0);
    group.add(track(body));
  } else {
    const shape = SHAPES[id] ?? SHAPES.airliner;
    group.add(track(fuselage(shape)));

    // wings
    const chord = shape.delta ? shape.length * 0.62 : shape.length * 0.34;
    const wings = track(
      wingPair(
        chord,
        shape.delta ? chord * 0.25 : chord * 0.55,
        shape.span,
        shape.sweep,
        shape.delta ? -shape.length * 0.08 : -shape.length * 0.02,
        shape.dihedral,
        shape.radius * 0.34,
      ),
    );
    group.add(wings);
    // tailplane and fin
    group.add(
      track(
        wingPair(
          shape.length * 0.17,
          shape.length * 0.09,
          shape.span * 0.38,
          shape.sweep * 0.5,
          -shape.length * 0.42,
          shape.dihedral * 0.5,
          shape.radius * 0.24,
        ),
      ),
    );
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(shape.length * 0.12, 0);
    finShape.lineTo(shape.length * 0.06, shape.radius * 3.1);
    finShape.lineTo(-shape.length * 0.02, shape.radius * 3.1);
    finShape.closePath();
    const fin = new THREE.Mesh(
      new THREE.ExtrudeGeometry(finShape, { depth: 0.028, bevelEnabled: false }),
      LIVERY(),
    );
    fin.rotation.y = Math.PI / 2;
    fin.position.set(0.014, shape.radius * 0.6, -shape.length * 0.46);
    group.add(track(fin));

    // cabin windows and a livery line down the side
    const windows = new THREE.Mesh(
      new THREE.CylinderGeometry(shape.radius * 1.002, shape.radius * 1.002, shape.length * 0.55, 18, 1, true, -0.28, 0.56),
      GLASS(),
    );
    windows.rotation.x = Math.PI / 2;
    windows.position.y = shape.radius * 0.18;
    group.add(track(windows));
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(shape.radius * 1.004, shape.radius * 1.004, shape.length * 0.7, 18, 1, true, -0.1, 0.2),
      LIVERY(),
    );
    stripe.rotation.x = Math.PI / 2;
    stripe.position.y = -shape.radius * 0.35;
    group.add(track(stripe));

    if (shape.prop) {
      const spinner = new THREE.Mesh(new THREE.ConeGeometry(shape.radius * 0.45, shape.radius * 1.2, 12), DARK());
      spinner.rotation.x = -Math.PI / 2;
      spinner.position.z = shape.length * 0.5;
      group.add(track(spinner));
      propeller = new THREE.Mesh(new THREE.BoxGeometry(shape.span * 0.42, 0.05, 0.02), DARK());
      propeller.position.z = shape.length * 0.52;
      group.add(track(propeller));
    } else if (shape.engines) {
      const radius = shape.radius * 0.72;
      // a pod sits ahead of the leading edge at its station, so from above the
      // engines read as engines and not as a smooth arrow
      const nose = (fraction: number): number =>
        -shape.length * 0.02 + chord / 2 - shape.sweep * fraction - radius * 0.4;
      const spots: [number, number][] =
        shape.engines === 2
          ? [[-shape.span * 0.27, nose(0.54)], [shape.span * 0.27, nose(0.54)]]
          : [
              [-shape.span * 0.34, nose(0.68)],
              [-shape.span * 0.19, nose(0.38)],
              [shape.span * 0.19, nose(0.38)],
              [shape.span * 0.34, nose(0.68)],
            ];
      for (const [x, z] of spots) group.add(track(nacelle(x, z, radius)));
    }

    // navigation lights: red to port, green to starboard, white strobe on the fin
    const lamp = (x: number, colour: number): THREE.Mesh => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(shape.radius * 0.22, 8, 8),
        new THREE.MeshBasicMaterial({ color: colour }),
      );
      mesh.position.set(x, -0.02, -shape.sweep * 0.5);
      return track(mesh);
    };
    group.add(lamp(-shape.span / 2, 0xff4d4d), lamp(shape.span / 2, 0x4dff9b));
    strobe = track(
      new THREE.Mesh(
        new THREE.SphereGeometry(shape.radius * 0.2, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      ),
    );
    strobe.position.set(0, shape.radius * 3.1, -shape.length * 0.46);
    group.add(strobe);

    landingLights = [-1, 1].map((side) => {
      const light = track(
        new THREE.Mesh(
          new THREE.SphereGeometry(shape.radius * 0.18, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xfff6d8 }),
        ),
      );
      light.position.set(side * shape.span * 0.16, -shape.radius * 0.5, shape.length * 0.18);
      light.visible = false;
      return light;
    });
    group.add(...landingLights);
  }

  // an inside-out shell in near-black, so the shape separates from bright ground
  const ink = INK();
  disposables.push(ink);
  hull(group, ink, id === 'paper' ? 1.05 : 1.035);

  let roll = 0;
  let pitch = 0;

  return {
    group,
    update(time, phase, turnRate) {
      // double-flash strobe, about every 1.2 s
      if (strobe) {
        const beat = time % 1.2;
        strobe.visible = beat < 0.06 || (beat > 0.16 && beat < 0.22);
      }
      for (const light of landingLights)
        light.visible = phase === 'takeoff' || phase === 'landing' || phase === 'taxi';
      if (propeller) propeller.rotation.z = time * 26;

      // bank into the turn, pitch with the phase, and never sit perfectly still
      const wantRoll = THREE.MathUtils.clamp(turnRate * 38, -0.62, 0.62);
      const wantPitch =
        phase === 'takeoff' ? 0.3 : phase === 'climb' ? 0.2 : phase === 'descent' ? -0.14 : 0.03;
      roll += (wantRoll - roll) * 0.06;
      pitch += (wantPitch - pitch) * 0.05;
      group.rotation.z = roll + Math.sin(time * 1.25) * 0.005;
      group.rotation.x = pitch + Math.sin(time * 0.9) * 0.004;
    },
    dispose() {
      for (const thing of disposables) thing.dispose();
    },
  };
}

/** The same aircraft, seen from above, for strips, boards and lists. */
export function planeSilhouette(size = 28, stroke = 1.4): string {
  return `<svg class="plane-mark" viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true"
    fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linejoin="round" stroke-linecap="round">
    <path d="M24 4c1.6 0 2.6 1.6 2.8 4.2l.3 9.2 14.4 8.1c.6.3.9.9.9 1.6v2.3l-15.4-4.3.4 8.1 4.2 3.2c.4.3.6.7.6 1.2v1.8L24 37.4l-8.2 2c0-.7 0-1.3 0-1.8 0-.5.2-.9.6-1.2l4.2-3.2.4-8.1L5.6 29.4v-2.3c0-.7.3-1.3.9-1.6l14.4-8.1.3-9.2C21.4 5.6 22.4 4 24 4z"/>
  </svg>`;
}
