import * as THREE from 'three';

/** Low-poly aircraft built from primitives — no downloads, a few hundred triangles each. */
export interface Plane3D {
  group: THREE.Group;
  /** blink the strobe, drift the contrail */
  update(time: number, phase: number): void;
  trailPoints(): THREE.Vector3[];
}

const BODY = new THREE.MeshLambertMaterial({ color: 0xe8ecf2 });
const DARK = new THREE.MeshLambertMaterial({ color: 0x5a616b });
const GLASS = new THREE.MeshBasicMaterial({ color: 0x9fb6ff });
const RED = new THREE.MeshBasicMaterial({ color: 0xff5a5a });
const GREEN = new THREE.MeshBasicMaterial({ color: 0x5affa0 });
const WHITE = new THREE.MeshBasicMaterial({ color: 0xffffff });

function wing(span: number, chord: number, thickness = 0.06): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(span, thickness, chord), BODY);
  return mesh;
}

/** each id builds a different silhouette, all facing +Z */
export function buildAircraft(id: string): Plane3D {
  const group = new THREE.Group();
  const lights: THREE.Mesh[] = [];
  let strobe: THREE.Mesh | null = null;

  const addLight = (x: number, material: THREE.Material): void => {
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), material);
    light.position.set(x, 0, -0.05);
    group.add(light);
    lights.push(light);
  };

  if (id === 'paper') {
    const shape = new THREE.Shape();
    shape.moveTo(0, 1);
    shape.lineTo(0.7, -1);
    shape.lineTo(0, -0.55);
    shape.lineTo(-0.7, -1);
    shape.closePath();
    const paper = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false }),
      new THREE.MeshLambertMaterial({ color: 0xf4f6fb, side: THREE.DoubleSide }),
    );
    paper.rotation.x = -Math.PI / 2;
    group.add(paper);
  } else {
    const long = id === 'concorde' ? 2.4 : id === 'wide' ? 2.2 : 1.8;
    const fat = id === 'wide' ? 0.22 : id === 'prop' ? 0.16 : 0.18;
    const fuselage = new THREE.Mesh(
      new THREE.CapsuleGeometry(fat, long, 4, 10),
      id === 'concorde' ? new THREE.MeshLambertMaterial({ color: 0xf6f6f2 }) : BODY,
    );
    fuselage.rotation.x = Math.PI / 2;
    group.add(fuselage);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(fat, id === 'concorde' ? 1.2 : 0.5, 10), BODY);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = long / 2 + (id === 'concorde' ? 0.55 : 0.22);
    group.add(nose);

    const span = id === 'wide' ? 2.9 : id === 'prop' ? 2.2 : 2.5;
    const main = wing(span, id === 'concorde' ? 1.4 : 0.6);
    main.position.z = id === 'concorde' ? -0.2 : -0.1;
    if (id === 'concorde') main.scale.set(1, 1, 1.1);
    group.add(main);

    const tail = wing(span * 0.4, 0.34);
    tail.position.set(0, 0.05, -long / 2 - 0.1);
    group.add(tail);

    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.42), BODY);
    fin.position.set(0, 0.3, -long / 2 - 0.05);
    group.add(fin);

    const windows = new THREE.Mesh(new THREE.BoxGeometry(fat * 1.05, 0.08, long * 0.7), GLASS);
    windows.position.y = 0.06;
    group.add(windows);

    if (id === 'prop') {
      for (const side of [-1, 1]) {
        const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.36, 8), DARK);
        engine.rotation.x = Math.PI / 2;
        engine.position.set(side * 0.7, -0.02, 0.15);
        group.add(engine);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.03), DARK);
        blade.position.set(side * 0.7, -0.02, 0.36);
        group.add(blade);
      }
    } else if (id !== 'concorde') {
      const count = id === 'wide' ? 2 : 1;
      for (let i = 0; i < count; i++)
        for (const side of [-1, 1]) {
          const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 10), DARK);
          engine.rotation.x = Math.PI / 2;
          engine.position.set(side * (0.6 + i * 0.5), -0.12, 0.05);
          group.add(engine);
        }
    }
    addLight(-span / 2, RED);
    addLight(span / 2, GREEN);
    strobe = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), WHITE);
    strobe.position.set(0, 0.5, -long / 2);
    group.add(strobe);
  }

  // the caller scales the model to keep it a constant size on screen

  return {
    group,
    update(time, phase) {
      // white strobe, twice a second-ish
      if (strobe) strobe.visible = time % 1.4 < 0.12;
      for (const light of lights) light.visible = phase > 0.02;
    },
    trailPoints() {
      return [new THREE.Vector3(0, 0, -1.1)];
    },
  };
}
