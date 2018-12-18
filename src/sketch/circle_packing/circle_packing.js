import paper, { Point, Path, Group } from 'paper';
import { sortBy } from 'lodash';
import please from 'pleasejs';
import dat from 'dat.gui';
import { STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, intersects, intersection, radiansToDegrees
} from 'common/utils';
import math, { random, matrix } from 'mathjs';

const [width, height] = STRATH_SMALL.landscape;
const canvas = createCanvas(STRATH_SMALL.landscape);

paper.setup(canvas);
window.paper = paper;
window.math = math;

function randomPacking () {
  function run () {
    const circles = [];
    for (let i = 0; i < 1000; i++) {
      const radius = math.random(2, 50);
      const circle = packCircle(radius, circles);
      if (circle) {
        circles.push(circle);
      }
    }
    drawCircles((circle) => {
      const angle = math.random(0, math.PI * 2);
      const color = please.make_color();
      const numStripes = math.randomInt(5, 20);
      return stripes(circle, {angle, color, numStripes});
    }, circles);
    console.log('Done!');
  }

  function packCircle (radius, circles, attempts=200) {
    const margin = 20;
    for (let i = 0; i < attempts; i++) {
      const center = [
        math.random(radius + margin, width - (radius + margin)),
        math.random(radius + margin, height - (radius + margin))
      ];
      const overlaps = circles.some((circ) => hasOverlap({center, radius}, circ));
      if (!circles.length || !overlaps) {
        return {
          radius,
          center
        };
      }
    }
  }

  run();
}

function hasOverlap (c1, c2) {
  const minDist = c1.radius + c2.radius;
  const dist = math.distance(c1.center, c2.center);
  return dist <= minDist;
}

function drawCircles (draw, circles) {
  return circles.map(draw);
}

function basic (circle) {
  return new Path.Circle({
    ...circle,
    strokeColor: please.make_color()
  });
}

function stripes ({radius, center}, {
  numStripes = 20,
  angle = math.PI/4,
  color = '#f00'
}) {
  const outline = new Path.Circle({
    radius,
    center,
    strokeColor: 'black'
  });

  const disection = new Point(math.cos(angle), math.sin(angle)).multiply(radius);
  const start = new Point(center).subtract(disection);
  const vec = disection.rotate(90).multiply(5);
  const stepSize = (radius * 2) / numStripes;
  const step = disection.normalize().multiply(stepSize);
  const trace = new Path.Line({
    from: start.add(vec),
    to: start.subtract(vec),
    strokeColor: 'red'
  });
  const group = new Group();
  trace.translate(step.divide(2));
  for (let i = 0; i < numStripes; i++) {
    const intersections = trace.getIntersections(outline);
    if (intersections.length === 2) {
      group.addChild(Path.Line({
        from: intersections[0].point,
        to: intersections[1].point,
        strokeColor: color
      }));
    }
    trace.translate(step);
  }
  trace.remove();
  outline.remove();
  return group;
}

function testStripes () {
  const circle = {
    radius: 100,
    center: [width/2, height/2]
  }
  const props = {
    numStripes: 20,
    angle: math.PI/4,
    color: '#f00'
  };
  const gui = new dat.GUI();

  let group = new Group();
  run();

  gui.add(circle, 'radius').step(1).onChange(run);
  gui.add(props, 'numStripes').onChange(run);
  gui.add(props, 'angle', 0, math.PI * 2).step(0.01).onChange(run);
  gui.addColor(props, 'color').onChange(run);

  function run () {
    group.remove();
    group = stripes(circle, props);
  }
}

// testStripes();
randomPacking();
