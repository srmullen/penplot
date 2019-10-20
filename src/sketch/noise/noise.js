import paper, { Point, Path, Group } from 'paper';
import math, { random, randomInt } from 'mathjs';
import please from 'pleasejs';
import { range, sortBy, countBy, last, flatten, isArray } from 'lodash';
import dat from 'dat.gui';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, choose, chooseN, maprange, radiansToDegrees, clipBounds, processOptions
} from 'common/utils';
import * as pens from 'common/pens';
import * as palettes from 'common/palettes';
import { GPU } from 'gpu.js'; // This does not seem to be the local node modules

const PAPER_SIZE = STRATH_SMALL.landscape;
const [width, height] = PAPER_SIZE;
const canvas = createCanvas(PAPER_SIZE);
// paper.setup(canvas);

window.canvas = canvas;
window.GPU = GPU;

function sum(ns = []) {
  return ns.reduce((acc, n) => acc + n, 0);
}

function length(vec) {
  return Math.sqrt(sum(vec.map(n => Math.pow(n, 2))));
}

function normalize(ns) {
  const total = length(ns);
  return ns.map(n => n / total);
}

function randomNormal2d() {
  return normalize([Math.random() * 2 - 1, Math.random() * 2 - 1]);
}

function randomNormal3d() {
  return normalize([
    Math.random() * 2 - 1, 
    Math.random() * 2 - 1,
    Math.random() * 2 - 1
  ]);
}

/**
 * Dot product of 2d vectors.
 * @param {number[]} a 
 * @param {number[]} b 
 */
function dot2([a, b], [c, d]) {
  return a * c + b * d;
}

function dot3([a, b, c], [d, e, f]) {
  return a * d + b * e + c * f;
}

// Linear interpolation
function lerp(from, to, val) {
  return from + val * (to - from);
}

// Cosine interpolation
function cerp(from, to, val) {
  return lerp(from, to, -Math.cos(Math.PI * val) / 2 + 0.5);
}

// Smooth step interpolation
function smoothStep(from, to, val) {
  return lerp(from, to, val * val * (3 - 2 * val));
}

// TODO:
// Create perlin noise on GPU.
// Marching cubes on noise.
// Implement other noise types. Brownian, worley, curl perlin, curl worley.

/**
 * Essay Outline
 * -------------
 * - Implement ValueNoise2d on cpu.
 * - Implement PerlinNoise2d on cpu.
 * - Discuss interpolation.
 * - Extend perlin to 3d.
 * - Discuss performance enhancements. bitwise. flat grid.
 * - Move to GPU.
 * - Benchmarks.
 */

class ValueNoise2dGrid {
  constructor() {
    this.gridSize = 16;
    this.grid = [];
    // Create a grid of random values.
    for (let x = 0; x < this.gridSize + 1; x++) {
      const col = [];
      for (let y = 0; y < this.gridSize + 1; y++) {
        col.push(Math.random());
      }
      this.grid.push(col);
    }
  }

  noise(x, y) {
    const xpix = Math.floor(x) % this.gridSize;
    const ypix = Math.floor(y) % this.gridSize;
    const xoff = x - Math.floor(x);
    const yoff = y - Math.floor(y);
    const topLeft = this.grid[xpix][ypix];
    const topRight = this.grid[xpix + 1][ypix];
    const bottomRight = this.grid[xpix + 1][ypix + 1]
    const bottomLeft = this.grid[xpix][ypix + 1];
    const ab = lerp(topLeft, topRight, xoff);
    const cd = lerp(bottomLeft, bottomRight, xoff);
    return lerp(ab, cd, yoff);
  }
}

class ValueNoise2d {
  constructor() {
    this.gridSize = 16;
    this.grid = [];
    // Create an array of random values.
    for (let i = 0; i < Math.pow(this.gridSize, 2); i++) {
      this.grid.push(Math.random());
    }
  }

  getValue(x, y) {
    return this.grid[y * this.gridSize + x];
  }

  noise(x, y) {
    const xpix = Math.floor(x) % this.gridSize;
    const ypix = Math.floor(y) % this.gridSize;
    const xoff = x - Math.floor(x);
    const yoff = y - Math.floor(y);
    const topLeft = this.getValue(xpix, ypix);
    const topRight = this.getValue(xpix + 1, ypix);
    const bottomRight = this.getValue(xpix + 1, ypix + 1);
    const bottomLeft = this.getValue(xpix, ypix + 1);

    // const interpolate = lerp;
    // const interpolate = cerp;
    const interpolate = smoothStep;
    const ab = interpolate(topLeft, topRight, xoff);
    const cd = interpolate(bottomLeft, bottomRight, xoff);
    return interpolate(ab, cd, yoff);
  }
}

class PerlinNoise2dGrid {
  constructor() {
    // Create the grid with random gradients.
    // There are other methods for initializing gradients. Such as using predefined.
    this.gridSize = 16;
    this.grid = [];
    for (let x = 0; x < this.gridSize+1; x++) {
      const col = [];
      for (let y = 0; y < this.gridSize+1; y++) {
        col.push(randomNormal2d());
      }
      this.grid.push(col);
    }
  }

  noise (x, y) {
    const xpix = Math.floor(x) % this.gridSize;
    const ypix = Math.floor(y) % this.gridSize;
    const xoff = x - Math.floor(x);
    const yoff = y - Math.floor(y);
    const gradients = [
      this.grid[xpix][ypix], // top left
      this.grid[xpix+1][ypix], // top right
      this.grid[xpix+1][ypix+1], // bottom right
      this.grid[xpix][ypix+1] // bottom left
    ];
    // const gradients = [
    //   normalize([1, 1]),
    //   normalize([-1, 1]),
    //   normalize([-1, -1]),
    //   normalize([1, -1])
    // ];
    const vecs = [
      [xoff, yoff],
      [xoff-1, yoff],
      [xoff-1, yoff-1],
      [xoff, yoff-1]
    ];
    const dots = [];
    for (let i = 0; i < 4; i++) {
      dots.push(dot2(gradients[i], vecs[i]));
    }

    // const interpolate = lerp;
    // const interpolate = cerp;
    const interpolate = smoothStep;
    const ab = interpolate(dots[0], dots[1], xoff);
    const cd = interpolate(dots[3], dots[2], xoff);
    return interpolate(ab, cd, yoff);
  }
}

class PerlinNoise2d {
  constructor() {
    // Create the grid with random gradients.
    // There are other methods for initializing gradients. Such as using predefined.
    this.gridSize = 16;
    this.grid = [];
    for (let i = 0; i < Math.pow(this.gridSize, 2); i++) {
      this.grid.push(randomNormal2d());
    }
  }

  getGradient(x, y) {
    return this.grid[((y * this.gridSize) % this.grid.length) + (x % this.gridSize)];
  }

  noise(x, y) {
    const xpix = Math.floor(x) % this.gridSize;
    const ypix = Math.floor(y) % this.gridSize;
    const xoff = x - Math.floor(x);
    const yoff = y - Math.floor(y);
    const gradients = [
      this.getGradient(xpix, ypix), // top left
      this.getGradient(xpix + 1, ypix), // top right
      this.getGradient(xpix + 1, ypix + 1), // bottom right
      this.getGradient(xpix, ypix + 1) // bottom left
    ];
    const vecs = [
      [xoff, yoff],
      [xoff - 1, yoff],
      [xoff - 1, yoff - 1],
      [xoff, yoff - 1]
    ];
    const dots = [];
    for (let i = 0; i < 4; i++) {
      dots.push(dot2(gradients[i], vecs[i]));
    }

    // const interpolate = lerp;
    // const interpolate = cerp;
    const interpolate = smoothStep;
    const ab = interpolate(dots[0], dots[1], xoff);
    const cd = interpolate(dots[3], dots[2], xoff);
    return interpolate(ab, cd, yoff);
  }
}

class ValueNoise3d {
  constructor() {
    this.gridSize = 16;
    this.grid = [];
    // Create an array of random values. Just change the power to 3 here.
    for (let i = 0; i < Math.pow(this.gridSize, 3); i++) {
      this.grid.push(Math.random());
    }
  }

  getValue(x, y, z) {
    // We use the modulo operator to make sure the pixels wrap. Otherwise there would be visible 
    // lines as artifacts where the noise begins to repeat.
    return this.grid[
      (z * this.gridSize * this.gridSize % this.grid.length) + 
      (y * this.gridSize % Math.pow(this.gridSize, 2)) + 
      x % this.gridSize
    ];
  }

  noise(x, y, z) {
    const xpix = Math.floor(x) % this.gridSize;
    const ypix = Math.floor(y) % this.gridSize;
    const zpix = Math.floor(z) % this.gridSize;
    const xoff = x - Math.floor(x);
    const yoff = y - Math.floor(y);
    const zoff = z - Math.floor(z);

    // Front cube face.
    const fTopLeft = this.getValue(xpix, ypix, zpix);
    const fTopRight = this.getValue(xpix + 1, ypix, zpix);
    const fBottomRight = this.getValue(xpix + 1, ypix + 1, zpix);
    const fBottomLeft = this.getValue(xpix, ypix + 1, zpix);
    // Back cube face.
    const bTopLeft = this.getValue(xpix, ypix, zpix + 1);
    const bTopRight = this.getValue(xpix + 1, ypix, zpix + 1);
    const bBottomRight = this.getValue(xpix + 1, ypix + 1, zpix + 1);
    const bBottomLeft = this.getValue(xpix, ypix + 1, zpix + 1);

    // const interpolate = lerp;
    // const interpolate = cerp;
    const interpolate = smoothStep;

    const fab = interpolate(fTopLeft, fTopRight, xoff);
    const fcd = interpolate(fBottomLeft, fBottomRight, xoff);
    const frontVal = interpolate(fab, fcd, yoff);

    const bab = interpolate(bTopLeft, bTopRight, xoff);
    const bcd = interpolate(bBottomLeft, bBottomRight, xoff);
    const backVal = interpolate(bab, bcd, yoff);

    return interpolate(frontVal, backVal, zoff);
  }
}

class PerlinNoise3d {
  constructor() {
    this.gridSize = 16;
    this.grid = [];
    // Create an array of random values. Just change the power to 3 here.
    for (let i = 0; i < Math.pow(this.gridSize, 3); i++) {
      this.grid.push(randomNormal3d());
    }
  }

  getGradient(x, y, z) {
    return this.grid[
      (z * this.gridSize * this.gridSize % this.grid.length) +
      (y * this.gridSize % Math.pow(this.gridSize, 2)) +
      x % this.gridSize
    ];
  }

  noise(x, y, z) {
    const xpix = Math.floor(x) % this.gridSize;
    const ypix = Math.floor(y) % this.gridSize;
    const zpix = Math.floor(z) % this.gridSize;
    const xoff = x - Math.floor(x);
    const yoff = y - Math.floor(y);
    const zoff = z - Math.floor(z);
    const gradients = [
      this.getGradient(xpix, ypix, zpix),             // front top left
      this.getGradient(xpix + 1, ypix, zpix),         // front top right
      this.getGradient(xpix + 1, ypix + 1, zpix),     // front bottom right
      this.getGradient(xpix, ypix + 1, zpix),         // front bottom left
      this.getGradient(xpix, ypix, zpix + 1),         // back top left
      this.getGradient(xpix + 1, ypix, zpix + 1),     // back top right
      this.getGradient(xpix + 1, ypix + 1, zpix + 1), // back bottom right
      this.getGradient(xpix, ypix + 1, zpix + 1)      // back bottom left
    ];
    const vecs = [
      [xoff, yoff, zoff],
      [xoff - 1, yoff, zoff],
      [xoff - 1, yoff - 1, zoff],
      [xoff, yoff - 1, zoff],
      [xoff, yoff, zoff - 1],
      [xoff - 1, yoff, zoff - 1],
      [xoff - 1, yoff - 1, zoff - 1],
      [xoff, yoff - 1, zoff - 1]
    ];
    const dots = [];
    for (let i = 0; i < vecs.length; i++) {
      dots.push(dot3(gradients[i], vecs[i]));
    }

    // const interpolate = lerp;
    // const interpolate = cerp;
    const interpolate = smoothStep;

    const fab = interpolate(dots[0], dots[1], xoff);
    const fcd = interpolate(dots[3], dots[2], xoff);
    const frontVal = interpolate(fab, fcd, yoff);

    const bab = interpolate(dots[4], dots[5], xoff);
    const bcd = interpolate(dots[7], dots[6], xoff);
    const backVal = interpolate(bab, bcd, yoff);

    return interpolate(frontVal, backVal, zoff);
  }
}

function create2dNoise() {
  // const noise = new ValueNoise2d();
  // const noise = new PerlinNoise2dGrid();
  const noise = new PerlinNoise2d();
  const noiseArr = [];
  for (let i = 0; i < 750; i++) {
    const col = [];
    for (let j = 0; j < 750; j++) {
      col.push(noise.noise(i * 0.1, j * 0.1));
    }
    noiseArr.push(col);
  }
  return noiseArr;
}

const size3d = [750, 750, 10];
function create3dNoise() {
  // const noise = new ValueNoise3d();
  const noise = new PerlinNoise3d();
  const noiseArr = [];
  for (let i = 0; i < size3d[2]; i++) {
    const col = [];
    for (let j = 0; j < size3d[1]; j++) {
      const depth = [];
      for (let k = 0; k < size3d[0]; k++) {
        depth.push(noise.noise(i * 0.01, j * 0.01, k * 0.01));
      }
      col.push(depth);
    }
    noiseArr.push(col);
  }
  return noiseArr;
}

const gpu = new GPU({
  canvas,
  mode: 'webgl2'
});

const render = gpu.createKernel(function () {
  const x = this.thread.x;
  const y = this.thread.y;
  // const z = this.thread.z;
  const z = x * y;
  this.color(
    (Math.sin(x * (y / 2) * 3.14159 * 0.01) + 1) / 2,
    (Math.sin(y * (x / 3) * 3.14159 * 0.01) + 1) / 2,
    (Math.sin(z * 3.14159 * 0.01) + 1) / 2,
    1
  )
}, {
  graphical: true,
  output: [750, 750]
});

// render();
// const pixels = render.getPixels();
// console.log(pixels);

const renderNoise2d = gpu.createKernel(function (noise) {
  const v = (noise[this.thread.x][this.thread.y] + 1) / 2;
  this.color(v, v, v, 1);
}, {
  graphical: true,
  output: [750, 750]
});

const renderNoise3d = gpu.createKernel(function (noise, z) {
  const v = (noise[this.thread.x][this.thread.y][z] + 1) / 2;
  this.color(v, v, v, 1);
}, {
  graphical: true,
  output: [size3d[0], size3d[1]]
});

let frame = 0;
function animate() {
  renderNoise3d(noiseArr, frame % size3d[2]);
  frame++;
  requestAnimationFrame(animate);
}

// Maybe the reason animating large z depth is because it takes time to pass
// all the data onto the GPU. Try handling that on the cpu instead. Yes, that fixes the issue.
function animate2d() {
  renderNoise2d(noiseArr[frame % size3d[2]]);
  frame++;
  requestAnimationFrame(animate2d);
}

// const noiseArr = create2dNoise();
const noiseArr = create3dNoise();

// renderNoise2d(noiseArr[0]);
// renderNoise3d(noiseArr, frame);
// animate();
animate2d()