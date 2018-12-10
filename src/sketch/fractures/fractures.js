import paper, { Point, Path } from 'paper';
import {
  createCanvas, saveAsSVG, intersects, intersection, radiansToDegrees
} from 'common/utils';
import math, { random } from 'mathjs';

// const seed = Math.floor(Math.random() * 1000);
const seed = 319;
// const seed = 767;
console.log(seed);
math.config({randomSeed: seed});

const width = 1052;
const height = 742;
const canvas = createCanvas(width, height);

paper.setup(canvas);
window.paper = paper;

const STEP_SIZE = 1;
const VEC_RANGE = [radiansToDegrees(-1), radiansToDegrees(1)];
const FRACTURE_CHANCE = 0.15;

function Fracture (root, vec, group, end) {
  this.root = root;
  this.end = end || root;
  this.vec = vec;
  this.group = group;
  this.done = false;
  this.gen = line(root, vec, group);
}

Fracture.prototype.next = function () {
  const next = this.gen.next();
  this.done = next.done;
  if (next.value) {
    this.end = next.value[1];
  }
  return next;
}

function branch (fracture) {
  // const vec = Vector.fromAngle(fracture.vec.heading() + p5.random(...VEC_RANGE));
  const vec = new Point({
    length: STEP_SIZE,
    angle: fracture.vec.angle + random(...VEC_RANGE)
  });
  // vec.setMag(STEP_SIZE);
  return new Fracture(
    new Point(fracture.end),
    vec,
    fracture.group
  );
}

function hasIntersections (line, lines) {
  for (let lkey of lines.keys()) {
    const coline = lines.get(lkey).value;
    if (
      intersects(
        line[0].x, line[0].y, line[1].x, line[1].y,
        coline[0].x, coline[0].y, coline[1].x, coline[1].y
      )
    ) {
      // return true;
      return intersection(
        line[0], line[1],
        coline[0], coline[1]
      );
    }
  }
  return false;
}

/**
 * Creates a line that continues until it encounters an obstacle.
 * @param {Vector} start - The point the line starts from.
 * @param {Vector} vec - Vector representing the direction of travel.
 */
function* line (start, vec, lines) {
  const MAX_STEPS = 10000;
  let end = new Point(start);
  let step = 0;

  let intersection = hasIntersections([start, end], lines);
  while (
    withinBoundary(end) &&
    !intersection &&
    step < MAX_STEPS
  ) {
    step++;
    // end = Vector.add(end, vec);
    end = end.add(vec);
    // yield [start, end.add(vec)];
    yield [start, end];
    intersection = hasIntersections([start, end], lines);
  }
  // return [start, end];
  if (intersection) {
    return [start, new Point(intersection.x, intersection.y)];
  } else {
    yield [start, end];
  }
}

function draw ([start, end]) {
  // p5.line(start.x, start.y, end.x, end.y);
  new Path.Line({
    from: start,
    to: end,
    strokeColor: 'black'
  });
}

const radius = 300;
const center = new Point(width/2, height/2);

const bounds = new Path.Circle(center, radius);
bounds.strokeColor = 'black';

const withinBoundary = (point) => {
  return center.getDistance(point) < radius;
}

function runFractures () {
  const group = new Map();

  const fractures = [];
  const centX = width / 2;
  const centY = height / 2;
  for (let i = 0; i < 50; i++) {
    const frac = new Fracture(
      new Point(random(centX - 100, centX + 100), random(centY - 100, centY + 100)),
      new Point(random(-1, 1), random(-1, 1)).normalize(STEP_SIZE),
      group
    );
    fractures.push(frac);
  }

  traceFractures(group, fractures);
  for (const line of group.values()) {
    draw(line.value);
  }
}

function traceFractures (group, fractures) {
  fractures.forEach(fracture => {
    group.set(fracture, fracture.next());
  });

  let steps = 0;
  let done = false;
  while (!done && steps < 10000) {
    const keys = group.keys();
    const newFractures = [];
    done = Array.from(keys).map(fracture => {
      if (group.get(fracture) && !group.get(fracture).done) {
        const next = fracture.next();
        if (next.value) {
          group.set(fracture, next);
        }

        // decide if fractures should continue.
        if (
          random() < FRACTURE_CHANCE &&
          next.value
        ) {
          const frac = branch(fracture);
          newFractures.push(frac);
        }

        return next.done;
      }
      // We already know fracture is complete.
      return true;
    }).every(bool => bool);

    newFractures.forEach(frac => group.set(frac, frac.next()));

    steps++;
  }
}

runFractures();

window.saveAsSVG = (name) => {
  saveAsSVG(paper.project, name);
}
