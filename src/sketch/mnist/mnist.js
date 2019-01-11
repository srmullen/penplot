import { chunk } from 'lodash';
import paper, { Point, Path, Group } from 'paper';
import brain from 'brain.js';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import { saveAsSVG, intersects, radiansToDegrees, gauss } from 'common/utils';
import math, { random, randomInt } from 'mathjs';
import dat from 'dat.gui';
import samples from './samples.json';
import model from './model.json';

// const [width, height] = STRATH_SMALL.portrait;
// const canvas = createCanvas(STRATH_SMALL.portrait);
const width = 28 * 10;
const height = 28 * 10
const canvas = createCanvas([width, height]);

paper.setup(canvas);
window.paper = paper;
window.samples = samples;

const net = new brain.NeuralNetwork();
net.fromJSON(model);

const gui = new dat.GUI();
const props = {
  prediction: '',
  strokeWidth: 15,
  makePrediction,
  clear
}

gui.add(props, 'prediction').listen();
gui.add(props, 'strokeWidth');
gui.add(props, 'clear');
gui.add(props, 'makePrediction');

function makePrediction () {
  const data = compressCanvas();
  const prediction = predict(data);
  console.log(prediction);
  props.prediction = prediction;
}

window.compressCanvas = function compressCanvas () {
  const raster = paper.project.activeLayer.rasterize();
  raster.setSize(28, 28);
  const data = [];
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      const grayScale = raster.getPixel(x, y).red;
      data.push(grayScale);
    }
  }
  raster.remove();
  return data;
}

function predict (img) {
  return maxIndex(net.run(img));
}

function predictFromSample ([label, ...img]) {
  const scaled = img.map(n => parseFloat(n)/255);
  const prediction = net.run(scaled);
  return {
    prediction: maxIndex(prediction),
    actual: parseInt(label)
  };
}

function clear () {
  paper.project.clear();
}

let path;

paper.view.onMouseDown = (event) => {
	if (path) {
		path.selected = false;
	};
	path = new Path();
  window.path = path;
	path.strokeColor = 'red';
	path.fullySelected = true;
  path.strokeWidth = props.strokeWidth;
}

paper.view.onMouseDrag = (event) => {
	path.add(event.point);
}

paper.view.onMouseUp = (event) => {
	path.selected = false;
	path.smooth();
}

function maxIndex (arr) {
  let max = -Infinity;
  let index = null;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > max) {
      max = arr[i];
      index = i;
    }
  }
  return index;
}

function drawSample ([label, ...pixels]) {
  const img = chunk(pixels, 28);
  const group = new Group();
  for (let i = 0; i < img.length; i++) {
    const row = img[i];
    for (let j = 0; j < row.length; j++) {
      group.addChild(new Path.Circle({
        radius: 1,
        fillColor: row[j] / 255,
        center: [j, i]
      }));
    }
  }
  return group;
}

// for (let i = 0; i < samples.data.length; i++) {
//   drawSample(samples.data[i]).translate(i * 28, 0);
// }
