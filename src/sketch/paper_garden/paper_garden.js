import paper, { Point, Path, Group } from 'paper';
import math, { random, randomInt } from 'mathjs';
import { Noise } from 'noisejs';
import P5 from 'p5';
import dat from 'dat.gui';
import { sortBy, isArray } from 'lodash';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, gauss, choose, wchoose, lerp, processOptions, clipBounds
} from 'common/utils';
import * as pens from 'common/pens';
import { Disc } from 'common/Disc';

window.math = math;
window.paper = paper;

const noise = new Noise();
// const [width, height] = A4.portrait;
// const canvas = createCanvas(A4.portrait);
const [width, height] = STRATH_SMALL.portrait;
const canvas = createCanvas(STRATH_SMALL.portrait);
paper.setup(canvas);

const seed = randomInt(2000);
// const seed = 605;
// const seed = 293
console.log(seed);
noise.seed(seed);
math.config({randomSeed: seed});
let perlin = null;
new P5(p5 => {
  if (seed) {
    p5.noiseSeed(seed);
  }
  perlin = p5.noise;
});

// const palette = [
//   pens.STABILO_88_44,
//   pens.STABILO_88_33,
//   pens.STABILO_88_43,
//   pens.STABILO_88_36,
//   pens.STABILO_88_53,
//   pens.STABILO_88_63
// ];

const palette = [
  pens.STABILO_88_44,
  pens.STABILO_88_54,
  pens.STABILO_88_40,
  pens.STABILO_88_50,
  pens.STABILO_88_45,
  pens.STABILO_88_22
];

class GardenDisc extends Disc {
  draw({ discs = [], pen, inBounds } = {}) {
    const radiusStep = this.props.radius / this.props.sections;
    let radius = radiusStep;
    for (let i = 1; i <= this.props.sections; i++) {
      radius = i * radiusStep;
      const drawingImplement = isArray(pen) ? pen[i - 1] : pen;
      pens.withPen(drawingImplement, ({ color }) => {
        const opts = { 
          strokeColor: color,
          inBounds 
        };
        this.outlineSection(radius, discs, opts)
      });
    }
  }
}

/**
 * @param distance {number} - The distance at which points will begin ignoring each other.
 * @param stepDist {number} - The size of the step taken away from a point.
 */
function relaxationDisplacementStep (points, { distance = 20, stepDist = 1 } = {}) {
  const ret = [];
  let changed = false;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    let force = new Point(0, 0);
    for (let j = 0; j < points.length; j++) {
      if (i !== j) {
        const vec = points[j].subtract(point);
        if (vec.length < distance) {
          force = force.subtract(vec.normalize().multiply(stepDist));
          changed = true;
        }
      }
    }
    ret.push(point.add(force));
  }
  return [ret, changed];
}

// http://compform.net/strategy/#relaxation-displacement
function relaxationDisplacement(points, opts) {
  let changed = true;
  let displaced = points;
  while (changed) {
    [displaced, changed] = relaxationDisplacementStep(displaced, opts);
  }
  return displaced;
}

const H_MARGIN = 10;
const V_MARGIN = 10;
const BOUNDS = {
  top: V_MARGIN,
  left: H_MARGIN,
  bottom: height - V_MARGIN,
  right: width - H_MARGIN
};

function inBounds(point) {
  return point.x > BOUNDS.left && point.x < BOUNDS.right && point.y > BOUNDS.top && point.y < BOUNDS.bottom;
}

function plant (pos, discs=[]) {
  const n_points = randomInt(60, 120);
  const range = 1;
  const vinePct = 0.12;
  let points = [];
  for (let i = 0; i < n_points; i++) {
    const point = pos.add(random(-range, range), random(-range, range));
    points.push(point);
  }

  points = relaxationDisplacement(points);
  // sort points into the order they should be drawn.
  points = sortBy(points, p => p.getDistance(pos));

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (random() < vinePct) {
      const radius = random(5, 10);
      vine(point, {
        radius,
        nSteps: radius * (5/2),
        deform: () => random(1, 6),
        noiseRate: 0.007,
        sections: 1
      }, { strokeColor: 'green' }, discs);
    } else {
      const radius = random(15, 22);
      const disc = new GardenDisc({
        center: point,
        radius,
        nSteps: radius * (5/2),
        deform: random(8, 15),
        noiseRate: 0.01,
        sections: 4
      }, perlin);

      const pen = getPen(point.subtract(pos).length);
      disc.draw({ discs, pen, inBounds });

      discs.push(disc);
    }
  }

  return discs;
}

function vine (point, discOpts, drawOpts={}, discs=[]) {
  const length = choose([8, 8, 8, 9, 9, 10, 20, 30, 30]);
  const radius = discOpts.radius || 5;
  const pen = choose(palette);
  for (let i = 0; i < length; i++) {
    const disc = new GardenDisc({
      center: point,
      ...processOptions(discOpts)
    }, perlin);
    point = point.add(random(-radius, radius), random(radius, radius + radius/2));
    disc.draw({ discs, pen, inBounds });
    discs.push(disc);
  }

  return discs;
}

function getPen(dist, nPens = 4) {
  const arr = [];
  let idx = Math.floor(dist / 50);
  for (let i = 0; i < nPens; i++) {
    if (random() < dist/50) {
      idx++;
    }
    arr.push(palette[Math.min(idx, 5)]);
  }
  return arr;
}

function run () {
  const center = new paper.Point(width/2, height * (1-0.618));
  const points = [];
  const n_plants = 3;
  for (let i = 0; i < n_plants; i++) {
    points.push(center.add(random(-2, 2), random(-2, 2)));
  }
  const locations = relaxationDisplacement(points, {distance: 200});

  locations.reduce((discs, location) => {
    return plant(location, discs);
  }, []);
}

function runVines () {
  const center = new paper.Point(width/2, height/2);
  const points = [];
  const n_plants = 10;
  for (let i = 0; i < n_plants; i++) {
    points.push(center.add(random(-2, 2), random(-2, 2)));
  }
  const locations = relaxationDisplacement(points, {distance: 50});

  locations.reduce((discs, location) => {
    return vine(location, randomInt(4, 9));
  }, []);
}

run();
// runVines()

window.saveAsSvg = function save(name) {
  saveAsSVG(paper.project, name);
}