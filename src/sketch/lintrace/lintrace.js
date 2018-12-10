import paper, { Point, Path } from 'paper';
import { isNumber, isArray } from 'lodash';
import {
  createCanvas, saveAsSVG, intersects, intersection, radiansToDegrees
} from 'common/utils';
import math, { random } from 'mathjs';

const seed = Math.floor(Math.random() * 1000);
// const seed = 374;
console.log(seed);
math.config({randomSeed: seed});

const width = 1052;
const height = 742;
const canvas = createCanvas(width, height);

paper.setup(canvas);
window.paper = paper;

const TWO_PI = Math.PI * 2;

/**
 * Create a circle that grows inward.
 */
function circleInward () {
  const NUM_CIRCLES = 130;
  const NUM_POINTS = 30;
  const vecfn = () => random(-1, 1);
  let trace = traceCircle(NUM_POINTS, width/2, height/2, 300, vecfn);
  drawCircle(trace);
  for (let i = 0; i < NUM_CIRCLES; i++) {
    trace = traceCircle(trace, width/2, height/2, -2, vecfn);
    drawCircle(trace);
  }
}

/**
 * Create a circle that grows outward.
 */
function circleOutward () {
  const NUM_CIRCLES = 130;
  const NUM_POINTS = 30;
  const vecfn = () => random(-1, 1);
  let trace = traceCircle(NUM_POINTS, width/2, height/2, 10, vecfn);
  drawCircle(trace);
  for (let i = 0; i < NUM_CIRCLES; i++) {
    trace = traceCircle(trace, width/2, height/2, 2, vecfn);
    drawCircle(trace);
  }
}

/**
 * @param {Number || Array} points -
 * @param {Number} x - The x coord.
 * @param {Number} y - The y coord.
 * @param {Number} rad - The cirles radius.
 * @param {Function} vecfn - Function to produce value to add to vectors magnitude.
 */
function traceCircle (points, x, y, rad, vecfn) {
  if (isNumber(points)) {
    const center = new Point(x, y);
    let vec = new Point(1, 0);
    const trace = [];
    const angle = radiansToDegrees(TWO_PI / points);
    for (let i = 0; i < points; i++) {
      const point = center.add(vec.multiply(rad + vecfn()));
      trace.push(point);
      vec = vec.rotate(angle);
    }

    return trace;
  } else if (isArray(points)) {
    let vec = new Point(1, 0);
    const angle = radiansToDegrees(TWO_PI / points.length);
    return points.map((op) => {
      const point = op.add(vec.multiply(rad + vecfn()));
      vec = vec.rotate(angle);
      return point;
    });
  }
}

function drawCircle (points) {
  const circle = new Path({
    segments: points,
    strokeColor: 'black',
    strokeWidth: 1,
    closed: true
  });
  circle.smooth();
}

// circleInward();
circleOutward();

window.saveAsSVG = (name) => {
  saveAsSVG(paper.project, name);
}
