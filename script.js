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
const v0 = [0, 0, 0];
const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vmul = (v, c) => [v[0] * c, v[1] * c, v[2] * c];
const vdiv = (v, c) => [v[0] / c, v[1] / c, v[2] / c];
const vabssq = v => v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
const vabs = v => Math.sqrt(vabssq(v));
const vneg = v => [-v[0], -v[1], -v[2]];
const vnorm = v => vdiv(v, vabs(v));
const vdot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const vcross = (u, v) => [
  u[1] * v[2] - u[2] * v[1],
  u[2] * v[0] - u[0] * v[2],
  u[0] * v[1] - u[1] * v[0],
];
const vrand = (min, max) => [
  rand(min, max),
  rand(min, max),
  rand(min, max),
];
const vrUnitSphere = () => {
  let p;
  for (let i = 0; i < 1000; i++) {
    p = vrand(-1, 1);
    if (vabssq(p) < 1) {
      return p;
    }
  }
  return v0;
}
const vrUnitDisk = () => {
  let a, b;
  let p = [0, 0, 0];
  for (let i = 0; i < 1000; i++) {
    a = Math.random() * 2 - 1;
    b = Math.random() * 2 - 1;
    if (a * a + b * b < 1) {
      p[0] = a;
      p[1] = b;
      return p;
    }
  }
  return v0;
}
const TAU = 2 * Math.PI;
const random = Math.random;
const sqrt = Math.sqrt;
const sin = Math.sin;
const cos = Math.cos;
const vrUnitVec = () => {
  const a = random() * TAU;
  const z = random();
  const r = sqrt(1 - z * z);
  return [
    r * cos(a),
    r * sin(a),
    z,
  ];
}
const reflect = (v, n) => vsub(v, vmul(n, 2 * vdot(v, n)));
const refract = (uv, n, eta) => {
  const cosT = vdot(vneg(uv), n);
  const rOutPerp = vmul(vadd(uv, vmul(n, cosT)), eta);
  const rOutParallel = vmul(n, -Math.sqrt(Math.abs(1 - vabssq(rOutPerp))));
  return vadd(rOutPerp, rOutParallel);
}

/* ray abstractions */
const ray = (pos, dir) => ({ pos, dir });
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
      const cosTheta = Math.min(1, vdot(vneg(unitDir), rec.normal));
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
      scattered.dir = refracted;
      return true;
    }
  }
}
const Glass = Dielectric(1.517);
const Water = Dielectric(1.333);
const Diamond = Dielectric(2.417);
const Light = luminosity => Metal([luminosity, luminosity, luminosity], 1);
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
      const discriminant = halfB * halfB - a * c;

      if (discriminant < 0) {
        return false;
      }

      const root = Math.sqrt(discriminant);

      const t2 = (-halfB - root) / a;
      if (t2 < tMax && t2 > tMin) {
        rec.t = t2;
        rec.point = rat(r, t2);
        const outwardNormal = vdiv(vsub(rec.point, pos), radius);
        rec.setFaceNormal(r, outwardNormal);
        rec.material = material;
        return true;
      }

      const t1 = (-halfB + root) / a;
      if (t1 < tMax && t1 > tMin) {
        rec.t = t1;
        rec.point = rat(r, t1);
        const outwardNormal = vdiv(vsub(rec.point, pos), radius);
        rec.setFaceNormal(r, outwardNormal);
        rec.material = material;
        return true;
      }

      return false;
    }
  }
}
const Collection = shapes => {
  const len = shapes.length;
  return {
    hit(r, tMin, tMax, rec) {
      let tmp = hit0;
      let hitAnything = false;
      let closestSoFar = tMax;

      let i = len;
      while (i-- > 0) {
        if (shapes[i].hit(r, tMin, closestSoFar, tmp)) {
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
const render = (camera, shapes, width, height, bitmap) => {
  const rec = hit0;
  const scattered = ray0;
  const color = (r, depth) => {
    if (!depth) return BLACK;

    const attenuation = [1, 1, 1];
    if (shapes.hit(r, 0.00001, 9999999, rec)) {
      if (rec.material.scatter(r, rec, attenuation, scattered)) {
        const c = color(scattered, depth - 1);
        attenuation[0] *= c[0];
        attenuation[1] *= c[1];
        attenuation[2] *= c[2];
        return attenuation;
      }
      return BLACK;
    }
    const t = 0.5 * (vnorm(r.dir)[1] + 1);
    return vadd(
      vmul([1, 1, 1], 1 - t),
      [0.5 * t, 0.7 * t, t],
    );
  }

  let i = 0;
  // ImageData / our binary buffer format scans from
  // bottom of the frame to the top.
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++ , i += 4) {
      const c = color(
        camera.getRay(
          (x + Math.random()) / (width - 1),
          (y + Math.random()) / (height - 1),
        ),
        MAX_DEPTH,
      );

      bitmap[i] += c[0];
      bitmap[i + 1] += c[1];
      bitmap[i + 2] += c[2];
    }
  }
}

const gammaCorrect = x => Math.sqrt(x) * 255;

class Render extends Component {
  init(width, height, camera, shapes) {
    this.width = width;
    this.height = height;
    this.camera = camera;
    this.shapes = shapes;
    this.node = document.createElement('canvas');
    this.ctx = this.node.getContext('2d', { alpha: false });

    // start with black initially
    this.node.width = width;
    this.node.height = height;
    this.ctx.fillStyle = '#dddddd';
    this.ctx.fillRect(0, 0, width, height);

    this.samples = 0;
    this.BITMAP_SIZE = 4 * width * height;
    this.colors = new Float32Array(this.BITMAP_SIZE);
    this.rgbs = new Uint8ClampedArray(this.BITMAP_SIZE);
  }
  render() {
    this.samples++;

    const { width, height, colors, rgbs, BITMAP_SIZE } = this;
    this.node.width = width;
    this.node.height = height;

    render(
      this.camera,
      this.shapes,
      width,
      height,
      colors,
    );

    for (let i = 0; i < BITMAP_SIZE; i++) {
      if (i % 4 === 3) {
        rgbs[i] = 255;
      } else {
        rgbs[i] = ~~gammaCorrect(colors[i] / this.samples);
      }
    }

    const idata = new ImageData(rgbs, width, height);
    this.ctx.putImageData(idata, 0, 0);
  }
}

class App extends Component {
  init() {
    this.resetScene();
  }
  resetScene() {
    const width = Math.min(720, window.innerWidth - 16);
    const height = Math.min(480, window.innerHeight - 16);
    this.r = new Render(
      width, height,
      Camera(
        [-7, 2, 2],
        [0, 0, -1.8],
        [0, 1, 0],
        15,
        width / height,
        0.16,
      ),
      Collection([
        // backdrop
        Sphere([0, -100.5, -1], 100, Metal([0.75, 0.75, 0.65], 0.2)),
        Sphere([0, 0, -101.8], 100, Mirror([0.99, 0.99, 0.99])),
        // objects
        Sphere([-1, 0, -1], 0.5, Glass),
        Sphere([-1, 0, -1], -0.36, Glass),
        Sphere([0, -.14, -1], 0.36, Lambertian([0.067, 0.714, 0.65])),
        Sphere([1, .14, -1], 0.64, Metal([0.9, 0.6, 0.5], 0.12)),
        // faux Light
        Sphere([0, 1, -1.8], 0.4, Light(8)),
      ]),
    );
  }
  compose() {
    return jdom`<div class="app">
      ${this.r.node}
      <header>
        <p>
          <a href="https://github.com/thesephist/traceur-web" target="_blank">
            <strong>traceur-web</strong>
          </a>
          is a JavaScript port of
          <a href="https://github.com/thesephist/traceur" target="_blank">traceur</a>,
          a path tracing renderer in
          <a href="https://github.com/thesephist/ink" target="_blank">Ink</a> by
          <a href="https://thesephist.com/" target="_blank">@thesephist</a>.
        </p>
      </header>
      <nav>
        <button class="movable colored paper"
          onclick=${() => {
        this.r.render();
        this.render();
      }}> Sample once more (${this.r.samples})</button >
      </nav >
    </div > `;
  }
}

const app = new App();
document.body.appendChild(app.node);