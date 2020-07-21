const {
  Component,
} = window.Torus;

const rand = (min, max) => min + Math.random() * (max - min)

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
  for (let i = 0; i < 1000; i ++) {
    p = vrand(-1, 1)
    if (vabssq(p) < 1) {
      return p;
    }
  }
  return v0;
}
const vrUnitDisk = () => {
  let p;
  for (let i = 0; i < 1000; i ++) {
    p = [rand(-1, 1), rand(-1, 1), 0]
    if (vabssq(p) < 1) {
      return p;
    }
  }
  return v0;
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