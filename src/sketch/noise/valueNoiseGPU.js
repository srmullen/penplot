import { GPU } from 'gpu.js';

const gpu = new GPU({
  // canvas,
  mode: 'webgl2'
});

const gridSize = 16;
const grid = [];

for (let i = 0; i < Math.pow(gridSize, 2); i++) {
  grid.push(Math.random());
}

export function createValueNoise2dKernel(gpu) {
  gpu.addFunction(function lerp(from, to, val) {
    return from + val * (to - from);
  });

  gpu.addFunction(function interpolate(from, to, val) {
    const nval = val * val * (3 - 2 * val);
    return from + nval * (to - from);
  });

  /**
   * {a} - [Number] grid
   * {b} - Number  gridSize
   * {rate} - Number - noise rate
   */
  return gpu.createKernel(function (a, b, rate) {
    const x = rate * this.thread.x;
    const y = rate * this.thread.y;
    const xpix = Math.floor(x) % b;
    const ypix = Math.floor(y) % b;
    const xoff = x - Math.floor(x);
    const yoff = y - Math.floor(y);
    const topLeft = a[ypix * b + xpix];
    const topRight = a[ypix * b + xpix + 1];
    const bottomRight = a[(ypix + 1) * b + xpix + 1];
    const bottomLeft = a[(ypix + 1) * b + xpix];
    const ab = interpolate(topLeft, topRight, xoff);
    const cd = interpolate(bottomLeft, bottomRight, xoff);
    const val = interpolate(ab, cd, yoff);
    this.color(val, val, val, 1);
  }, {
    output: [750, 750],
    graphical: true,
    returnType: 'Float'
  });
}

