import * as THREE from 'three';

/**
 * "Pıtır" — an original round little explorer: a soft blob with big eyes,
 * a leaf sprout and tiny feet. Pure primitives, no external art.
 */
export class Character {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private feet: THREE.Mesh[] = [];
  private eyes: THREE.Group[] = [];
  private sprout: THREE.Group;
  private time = 0;
  private walkPhase = 0;
  private walking = false;
  private squash = 0;
  private shakeT = 0;
  private jumpT = -1;
  private blinkT = 2;
  private heading = 0;
  private targetHeading = 0;

  constructor(color = '#ffb432') {
    const mat = (c: string, rough = 0.6) => new THREE.MeshStandardMaterial({ color: c, roughness: rough });
    const bodyMat = mat(color, 0.55);

    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 20), bodyMat);
    blob.scale.set(1, 0.92, 0.95);
    blob.position.y = 0.45;
    blob.castShadow = true;
    this.body.add(blob);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), mat('#fff1cf'));
    belly.scale.set(1, 0.9, 0.5);
    belly.position.set(0, 0.36, 0.25);
    this.body.add(belly);

    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mat('#ffffff', 0.2));
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 10), mat('#2a2140', 0.3));
      pupil.position.set(0, 0, 0.07);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mat('#ffffff', 0.1));
      glint.position.set(0.03, 0.03, 0.12);
      eye.add(white, pupil, glint);
      eye.position.set(side * 0.15, 0.58, 0.33);
      this.eyes.push(eye);
      this.body.add(eye);

      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), mat('#ff8a7a'));
      cheek.scale.set(1, 0.6, 0.4);
      cheek.position.set(side * 0.26, 0.45, 0.33);
      this.body.add(cheek);

      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mat('#e8862a'));
      foot.scale.set(1, 0.6, 1.3);
      foot.position.set(side * 0.17, 0.06, 0.05);
      foot.castShadow = true;
      this.feet.push(foot);
      this.root.add(foot);
    }

    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 14, Math.PI), mat('#2a2140', 0.4));
    smile.rotation.z = Math.PI;
    smile.position.set(0, 0.46, 0.39);
    this.body.add(smile);

    this.sprout = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.16, 6), mat('#3f9c43'));
    stem.position.y = 0.08;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), mat('#5cc85a'));
    leaf.scale.set(1.6, 0.35, 0.8);
    leaf.position.set(0.08, 0.17, 0);
    leaf.rotation.z = 0.4;
    this.sprout.add(stem, leaf);
    this.sprout.position.y = 0.86;
    this.body.add(this.sprout);

    this.root.add(this.body);
  }

  setWalking(v: boolean) {
    this.walking = v;
  }

  /** Face towards a world direction on the ground plane. */
  faceTowards(dx: number, dz: number) {
    if (Math.abs(dx) + Math.abs(dz) < 1e-4) return;
    this.targetHeading = Math.atan2(dx, dz);
  }

  shake() {
    this.shakeT = 0.5;
  }

  cheer() {
    this.jumpT = 0;
  }

  update(dt: number) {
    this.time += dt;
    let diff = this.targetHeading - this.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.heading += diff * Math.min(1, dt * 10);
    this.root.rotation.y = this.heading;

    let y = 0, sx = 1, sy = 1;
    if (this.walking) {
      this.walkPhase += dt * 14;
      const hop = Math.abs(Math.sin(this.walkPhase));
      y = hop * 0.12;
      sy = 1 + (hop - 0.5) * 0.08;
      this.feet[0].position.z = 0.05 + Math.sin(this.walkPhase) * 0.12;
      this.feet[1].position.z = 0.05 - Math.sin(this.walkPhase) * 0.12;
    } else {
      // idle breathing
      sy = 1 + Math.sin(this.time * 2.4) * 0.025;
      this.feet.forEach((f) => (f.position.z += (0.05 - f.position.z) * Math.min(1, dt * 10)));
    }

    if (this.jumpT >= 0) {
      this.jumpT += dt;
      const t = this.jumpT;
      const k = (t % 0.55) / 0.55;
      y += Math.sin(k * Math.PI) * 0.6;
      this.body.rotation.y = t < 1.1 ? t * Math.PI * 1.8 : 0;
      if (t > 1.65) {
        this.jumpT = -1;
        this.body.rotation.y = 0;
      }
    }

    this.squash = Math.max(0, this.squash - dt * 4);
    sx = 1 / Math.sqrt(sy);
    this.body.position.y = y;
    this.body.scale.set(sx, sy, sx);

    if (this.shakeT > 0) {
      this.shakeT -= dt;
      this.body.rotation.z = Math.sin(this.shakeT * 40) * 0.18 * (this.shakeT / 0.5);
    } else this.body.rotation.z = 0;

    this.blinkT -= dt;
    const blink = this.blinkT < 0.12 ? 0.1 : 1;
    this.eyes.forEach((e) => (e.scale.y = blink));
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 3;

    this.sprout.rotation.z = Math.sin(this.time * 3) * 0.15 + (this.walking ? Math.sin(this.walkPhase) * 0.2 : 0);
  }
}
