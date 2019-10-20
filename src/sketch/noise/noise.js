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

/**
 * Dot product of 2d vectors.
 * @param {number[]} a 
 * @param {number[]} b 
 */
function dot2([a, b], [c, d]) {
  return a * c + b * d;
}

function lerp(from, to, val) {
  return from + val * (to - from);
}

class Perlin {
  constructor () {
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
    this.gradients = [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1]
    ];
  }

  noise (x, y) {
    const xpix = Math.floor(x) % this.gridSize;
    const ypix = Math.floor(y) % this.gridSize;
    const xoff = x - xpix;
    const yoff = y - ypix;
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
    const ab = lerp(dots[0], dots[1], xoff);
    const cd = lerp(dots[3], dots[2], xoff);
    return lerp(ab, cd, yoff);
  }
}

const perlin = new Perlin();
const noiseArr = [];
for (let i = 0; i < 500; i++) {
  const col = [];
  for (let j = 0; j < 500; j++) {
    col.push(perlin.noise(i * 0.01, j * 0.01));
  }
  noiseArr.push(col);
}

console.log(noiseArr);

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
  output: [500, 500]
});

// render();
// const pixels = render.getPixels();
// console.log(pixels);

const renderNoise = gpu.createKernel(function (noise) {
  const v = (noise[this.thread.x][this.thread.y] + 1) / 2;
  this.color(v, v, v, 1);
}, {
  graphical: true,
  output: [500, 500]
});
renderNoise(noiseArr);

// TODO:
// Read about value noise and implement.
// Watch perlin noise video.