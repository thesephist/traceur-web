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
      const reflected = reflect(vnorm(r.dir), rec.normal);

      scattered.pos = rec.point
      scattered.dir = fuzz === 0 ? reflected : vadd(reflected, vmul(vrUnitVec(), fuzz));

      attenuation[0] = color[0];
      attenuation[1] = color[1];
      attenuation[2] = color[2];

      return vdot(scattered.dir, rec.normal) > 0;
    }
  }
}
const Mirror = color => Metal(color, 0);
const schlick = (cosine, ri) => {
  let r0 = (1 - ri) / (1 + ri);
  r0 = r0 * r0;
  return r0 + (1 - r0) * Math.pow(1 - cosine, 5);
}
const Dielectric = ri => {
  return {
    scatter(r, rec, attenuation, scattered) {
      attenuation[0] = attenuation[1] = attenuation[2] = 1;
      const eta = rec.frontFace ? 1 / ri : ri;

      const unitDir = vnorm(r.dir);
      const cosThetaTmp = vdot(vneg(unitDir), rec.normal);
      const cosTheta = cosThetaTmp > 1 ? 1 : cosThetaTmp;
      const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);

      if (eta * sinTheta > 1) {
        const reflected = reflect(unitDir, rec.normal);
        scattered.pos = rec.point;
        scattered.dir = reflected;
        return true;
      }
      if (schlick(cosTheta, eta) > Math.random()) {
        const reflected = reflect(unitDir, rec.normal);
        scattered.pos = rec.point;
        scattered.dir = reflected;
        return true;
      }
      const refracted = refract(unitDir, rec.normal, eta);
      scattered.pos = rec.point;
      scattered.dir = refracted
      return true;
    }
  }
}
const Glass = Dielectric(1.517);
const Water = Dielectric(1.333);
const Diamond = Dielectric(2.417);
const Material0 = Lambertian([0, 0, 0], 0.5);

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
  Material0,
  0,
  false,
);
const Sphere = (pos, radius, material) => {
  const radiussq = radius * radius;
  return {
    hit(r, tMin, tMax, rec) {
      const oc = vsub(r.pos, pos);
      const a = vabssq(r.dir);
      const halfB = vdot(oc, r.dir);
      const c = vabssq(oc) - radiussq;
      const discriminant = halfB * half B - a * c;

      if (discriminant < 0) {
        return false;
      }

      const root = Math.sqrt(discriminant);
      const t1 = (-halfB + root) / a;
      const t2 = (-halfB - root) / a;

      if (t2 < tMax && t2 > tMin) {
        rec.t = t2;
        rec.point = rat(r, t2);
        const outwardNormal = vdiv(vsub(rec.point, pos), radius);
        rec.setFaceNormal(r, outwardNormal);
        rec.material = material;
        return true;
      }

      if (t1 < tMax && t1 > tMin) {
        rec.t = t1;
        rec.point = rat(r, t1);
        const outwardNormal = vdiv(vsub(rec.point, pos), radius);
        rec.setFaceNormal(r.outwardNormal);
        rec.material = material;
        return true;
      }

      return false;
    }
  }
}
const Collection = shapes => {
  return {
    hit(r, tMin, tMax, rec) {
      let tmp = hit0;
      let hitAnything = false;
      let closestSoFar = tMax;

      for (const shp of shapes) {
        if (shp.hit(r, tMin, closestSoFar, tmp)) {
          closestSoFar = tmp.t;
          hitAnything = true;
        }
      }

      rec.point = tmp.point;
      rec.normal = tmp.normal;
      rec.material = tmp.material;
      rec.t = tmp.t;
      rec.frontFace = tmp.frontFace;

      return hitAnything;
    }
  }
}

/* main render loop */
const MAX_DEPTH = 50;
const BLACK = [0, 0, 0];
const render = (shapes, width, height) = {
  const color = (r, depth) => {
    if (!depth) return BLACK;

    let rec = hit0.slice();
    let attenuation = [1, 1, 1];
    let scattered = ray0.slice();
    if (shapes.hit(r, 0.00001, 9999999, rec)) {
      if (rec.material.scatter(r, rec, attenuation, scattered)) {
        const c = color(scattered, depth - 1);
        return [
          attenuation[0] * c[0],
          attenuation[1] * c[1],
          attenuation[2] * c[2],
        ];
      }
      return BLACK;
    }
    const t = 0.5 * (vnorm(r.dir)[1] + 1);
    return vadd(
      vmul([1, 1, 1], 1 - t),
      [0.5 * t, 0.7 * t, t],
    );
  }

  for (let x = 0; x < width; x ++) {
    for (let y = 0; y < height; y ++) {
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