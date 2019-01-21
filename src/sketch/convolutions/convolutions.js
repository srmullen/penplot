import paper, { Point, Path, Group, Raster } from 'paper';
import { sortBy } from 'lodash';
import { Noise } from 'noisejs';
import math, { random, randomInt } from 'mathjs';
import dat from 'dat.gui';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import { saveAsSVG, intersects, radiansToDegrees, gauss } from 'common/utils';
import * as pens from 'common/pens';
import img from './cocktail.jpg';
import GPU from 'gpu.js';

const [width, height] = STRATH_SMALL.landscape;
const canvas = createCanvas(STRATH_SMALL.landscape, {hidden: true});
paper.setup(canvas);

const leftneg = [
  -1, 0, 1,
  -1, 0, 1,
  -1, 0, 1
];

const rightneg = [
  1, 0, -1,
  1, 0, -1,
  1, 0, -1
];

const identity = [
  0, 0, 0,
  0, 1, 0,
  0, 0, 0
]

const emboss = [
  -2, -1, 0,
  -1,  1, 1,
   0,  1, 2
];

const blur = [
  0.0625, 0.125, 0.0625,
   0.125,  0.25,  0.125,
  0.0625, 0.125, 0.0625
];

const custom1 = [
  0, 0, 0,
  0, 1, 0,
  0, 0, 0
];

const custom2 = [
  0, 0, 0,
  0, 1, 0,
  0, 0, 0
];

const custom3 = [
  0, 0, 0,
  0, 1, 0,
  0, 0, 0
];

const custom4 = [
  0, 0, 0,
  0, 1, 0,
  0, 0, 0
];

const outline = [
  -1, -1, -1,
  -1,  8, -1,
  -1, -1, -1
];

const kernels = {
  identity,
  leftneg,
  rightneg,
  emboss,
  blur,
  outline,
  custom1,
  custom2,
  custom3,
  custom4,
};

const kernelNames = [
  'identity', 'leftneg', 'rightneg', 'emboss', 'blur', 'outline', 'custom1', 'custom2', 'custom3', 'custom4'
];

function start () {
  const raster = new Raster(img);
  const props = {
    red: 'identity',
    green: 'identity',
    blue: 'identity',
    alpha: 'identity',
  }
  const gui = new dat.GUI();

  raster.onLoad = () => {
    const rasterWidth = width;
    const rasterHeight = height;
    raster.setSize(rasterWidth, rasterHeight);
    raster.translate(width/2, height/2);
    const imageData = raster.getImageData();

    const gpu = new GPU();
    gpu.addFunction(function getPixel(size, x, y) {
      const i = (x * 4) + ((height - y) * width * 4);
      let r = 0, g = 0, b = 0, a = 0;
      if (i >= 0 && i < size) {
        r = data[i] / 255;
        g = data[i+1] / 255;
        b = data[i+2] / 255;
        a = data[i+3] / 255;
      }
      return [r, g, b, a];
    }, {returnType: 'Array(4)'});

    const render = gpu.createKernel(function (redKernel, greenKernel, blueKernel, alphaKernel, data, width, height) {
      const nx = this.thread.x - 1;
      const px = this.thread.x + 1;
      const ny = this.thread.y - 1;
      const py = this.thread.y + 1;
      const size = width * height * 4;

      let p0 = getPixel(size, nx, ny);
      let p1 = getPixel(size, this.thread.x, ny);
      let p2 = getPixel(size, px, ny);
      let p3 = getPixel(size, nx, this.thread.y);
      let p4 = getPixel(size, this.thread.x, this.thread.y);
      let p5 = getPixel(size, px, this.thread.y);
      let p6 = getPixel(size, nx, py);
      let p7 = getPixel(size, this.thread.x, py);
      let p8 = getPixel(size, px, py);
      const red = p0[0] * redKernel[0] +
        p1[0] * redKernel[1] +
        p2[0] * redKernel[2] +
        p3[0] * redKernel[3] +
        p4[0] * redKernel[4] +
        p5[0] * redKernel[5] +
        p6[0] * redKernel[6] +
        p7[0] * redKernel[7] +
        p8[0] * redKernel[8];

      const green = p0[1] * greenKernel[0] +
        p1[1] * greenKernel[1] +
        p2[1] * greenKernel[2] +
        p3[1] * greenKernel[3] +
        p4[1] * greenKernel[4] +
        p5[1] * greenKernel[5] +
        p6[1] * greenKernel[6] +
        p7[1] * greenKernel[7] +
        p8[1] * greenKernel[8];

      const blue = p0[2] * blueKernel[0] +
        p1[2] * blueKernel[1] +
        p2[2] * blueKernel[2] +
        p3[2] * blueKernel[3] +
        p4[2] * blueKernel[4] +
        p5[2] * blueKernel[5] +
        p6[2] * blueKernel[6] +
        p7[2] * blueKernel[7] +
        p8[2] * blueKernel[8];

      const alpha = p0[3] * alphaKernel[0] +
        p1[3] * alphaKernel[1] +
        p2[3] * alphaKernel[2] +
        p3[3] * alphaKernel[3] +
        p4[3] * alphaKernel[4] +
        p5[3] * alphaKernel[5] +
        p6[3] * alphaKernel[6] +
        p7[3] * alphaKernel[7] +
        p8[3] * alphaKernel[8];

      this.color(red, green, blue, alpha);
    }).setOutput([width, height])
      .setGraphical(true);
    const glcanvas = render.getCanvas();
    document.getElementsByTagName('body')[0].appendChild(glcanvas);
    run();

    gui.add(props, 'red', kernelNames).onChange(run);
    gui.add(props, 'green', kernelNames).onChange(run);
    gui.add(props, 'blue', kernelNames).onChange(run);
    gui.add(props, 'alpha', kernelNames).onChange(run);

    function createCustomFolder (kernel, name) {
      const folder = gui.addFolder(name);
      folder.add(kernel, '0').step(0.01).onChange(run);
      folder.add(kernel, '1').step(0.01).onChange(run);
      folder.add(kernel, '2').step(0.01).onChange(run);
      folder.add(kernel, '3').step(0.01).onChange(run);
      folder.add(kernel, '4').step(0.01).onChange(run);
      folder.add(kernel, '5').step(0.01).onChange(run);
      folder.add(kernel, '6').step(0.01).onChange(run);
      folder.add(kernel, '7').step(0.01).onChange(run);
      folder.add(kernel, '8').step(0.01).onChange(run);
    }

    createCustomFolder(custom1, 'Custom 1');
    createCustomFolder(custom2, 'Custom 2');
    createCustomFolder(custom3, 'Custom 3');
    createCustomFolder(custom4, 'Custom 4');

    function run () {
      render(
        kernels[props.red], kernels[props.green], kernels[props.blue], kernels[props.alpha],
        imageData.data, imageData.width, imageData.height
      );
    }
  }
  window.raster = raster;
}

function convolve (kernel, section) {
  let sum = 0;
  for (let y = 0; y < kernel.length; y++) {
    for (let x = 0; x < kernel[0].length; x++) {
      sum += kernel[x][y] * section[x][y];
    }
  }
  return sum;
}

function getSection (r, x, y, val='gray') {
  return[
    [r.getPixel(x-1, y-1)[val], r.getPixel(x, y-1)[val], r.getPixel(x+1, y-1)[val]],
    [r.getPixel(x-1, y)[val], r.getPixel(x, y)[val], r.getPixel(x+1, y)[val]],
    [r.getPixel(x-1, y+1)[val], r.getPixel(x, y+1)[val], r.getPixel(x+1, y+1)[val]]
  ];
}

start();
