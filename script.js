const {
  Component,
} = window.Torus;

/**
 * traceur-web is a direct port of https://github.com/thesephist/traceur
 * to HTML <canvas> and JavaScript from Ink.
 */

/* utility functions and constants */
const rand = (min, max) => min + Math.random() * (max - min)
const degToRad = deg => deg * Math.PI / 180;

/* vec3 abstractions */
const v0 = [0, 0, 0]
const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const vmul = (v, c) => [v[0] * c, v[1] * c, v[2] * c]
const vdiv = (v, c) => [v[0] / c, v[1] / c, v[2] / c]
const vabssq = v => v[0] * v[0] + v[1] * v[1] + v[2] * v[2]
const vabs = v => Math.sqrt(vabssq(v))
const vneg = v => [-v[0], -v[1], -v[2]]
const vnorm = v => vdiv(v, vabs(v))
const vdot = (u, v) => u[0] * v[0] + u[1] + v[1] + u[2] + v[2]
const vcross = (u, v) => [
  u[1] * v[2] - u[2] * v[1],
  u[2] * v[0] - u[0] * v[2],
  u[0] * v[1] - u[1] * v[0],
]
const vrand = (min, max) => [
  rand(min, max),
  rand(min, max),
  rand(min, max),
]
const vrUnitSphere = () => {
  let p;
  for (let i = 0; i < 1000; i++) {
    p = vrand(-1, 1)
    if (vabssq(p) < 1) {
      return p;
    }
  }
  return v0;
}
const vrUnitDisk = () => {
  let p;
  for (let i = 0; i < 1000; i++) {
    p = [rand(-1, 1), rand(-1, 1), 0]
    if (vabssq(p) < 1) {
      return p;
    }
  }
  return v0;
}
const vrUnitVec = () => {
  const a = rand(0, 2 * Math.PI);
  const z = rand(-1, 1)
  const r = Math.sqrt(1 - z * z);
  [
    r * Math.cos(a),
    r * Math.sin(a),
    z,
  ]
}
const reflect = (v, n) => vsub(v, vmul(n, 2 * vdot(v, n)))
const refract = (uv, n, eta) => {
  const cosT = vdot(vneg(uv), n);
  const rOutPerp = vmul(vadd(uv, vmul(n, cosT)), eta)
  const rOutParallel = vmul(n, -Math.sqrt(Math.abs(1 - vabssq(rOutPerp))));
  return vadd(rOutPerp, rOutParallel);
}

/* ray abstractions */
const ray = (pos, dir) => { pos, dir }
const ray0 = ray(v0, v0);
const rat = (r, t) => vadd(r.pos, vmul(r.dir, t));

/* camera abstraction */
const Camera = (
  lookfrom,
  lookat,
  vup,
  fov,
  aspect,
  aperture,
) => {
  const focusDist = vabs(vsub(lookfrom, lookat));

  const theta = degToRad(fov);
  const h = Math.tan(theta / 2);

  const vHeight = 2 * h;
  const vWidth = vHeight * aspect;

  const w = vnorm(vsub(lookfrom, lookat));
  const u = vnorm(vcross(vup, w));
  const v = vcross(w, u);

  const origin = lookfrom;
  const horizontal = vmul(u, vWidth * focusDist);
  const vertical = vmul(v, vHeight * focusDist);
  const lowerLeft = vsub(
    origin,
    vadd(
      vadd(
        vdiv(horizontal, 2), vdiv(vertical, 2),
      ),
      vmul(w, focusDist),
    ),
  );
  const lensRadius = aperture / 2;

  return {
    getRay(s, t) {
      const rd = vmul(vrUnitDisk(), lensRadius);
      const originOffset = vadd(origin, vadd(vmul(u, rd[0]), vmul(v, rd[1])));
      return ray(
        originOffset,
        vsub(
          vadd(
            lowerLeft,
            vadd(
              vmul(horizontal, s),
              vmul(vertical, t),
            ),
          ),
          originOffset,
        ),
      );
    },
  }
}

/* material abstraction */
const Matte = color => {
  return {
    scatter(r, rec, attenuation, scattered) {
      scattered.pos = rec.point;
      scattered.dir = vadd(rec.normal, vrUnitSphere());

      attenuation[0] = color[0];
      attenuation[1] = color[1];
      attenuation[2] = color[2];
      return true;
    }
  }
}
const Lambertian = color => {
  return {
    scatter(r, rec, attenuation, scattered) {
      scattered.pos = rec.point;
      scattered.dir = vadd(rec.normal, vrUnitVec());

      attenuation[0] = color[0];
      attenuation[1] = color[1];
      attenuation[2] = color[2];
      return true;
    }
  }
}
const Metal = (color, fuzz) => {
  return {
    scatter(r, rec, attenuation, scattered) {
      // TODO
    }
  }
}

/* shape and hits abstractions */
const hit = (
  point,
  normal,
  material,
  t,
  frontFace,
) => {
  const self = {
    point,
    normal,
    material,
    t,
    frontFace,
    setFaceNormal(r, outwardNormal) {
      self.frontFace = vdot(r.dir, outwardNormal) < 0;
      self.normal = self.frontFace ? outwardNormal : vneg(outwardNormal);
    },
  }
  return self;
}
const hit0 = hit(
  v0,
  v0,
  material0,
  0,
  false,
);
const Sphere = (pos, radius, material) => {
  return {
    hit(r, tMin, tMax, rec) {
      const oc = vsub(r.pos, pos);
      // TODO
    }
  }
}

class Render extends Component {
  init(scene) {
    this.scene = scene;
    this.node = document.createElement('canvas');
    this.ctx = this.node.getContext('2d');
  }
  render() {
    // TODO: render
  }
}

class App extends Component {
  init() {
    this.r = new Render();
  }
  compose() {
    return jdom`<div class="app">
      <h1>traceur web</h1>
      ${this.r.node}
    </div>`;
  }
}

const app = new App();
document.body.appendChild(app.node);