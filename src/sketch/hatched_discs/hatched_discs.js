// My atempt at imitating https://generated.space/sketch/hatched-discs/
import paper, { Point, Path, Group } from 'paper';
import math, { random, randomInt } from 'mathjs';
import please from 'pleasejs';
import { Noise } from 'noisejs';
import dat from 'dat.gui';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import { saveAsSVG, intersects, radiansToDegrees, gauss, choose, wchoose, lerp, processOptions } from 'common/utils';
import * as colors from 'common/color';
import * as pens from 'common/pens';
import { Disc } from 'common/Disc';

window.math = math;
window.paper = paper;
window.please = please;

const noise = new Noise();
const [width, height] = A4.portrait;
const canvas = createCanvas(A4.portrait);
paper.setup(canvas);

// const seed = randomInt(2000);
// const seed = 945;
const seed = 833;
console.log(seed);
noise.seed(seed);
math.config({randomSeed: seed});

const RGB_PENS = [pens.PRISMA05_RED, pens.PRISMA05_GREEN, pens.PRISMA05_BLUE];
const BROWN_PENS = [pens.PRISMA05_ORANGE, pens.PRISMA05_LBROWN, pens.PRISMA05_DBROWN];

const H_MARGIN = 50;
const V_MARGIN = 100;
const BOUNDS = {
  top: V_MARGIN,
  left: H_MARGIN,
  bottom: height - V_MARGIN,
  right: width - H_MARGIN
};

class HatchedDisc extends Disc {
  /**
   * @param section {Number} - number represention section where 1 is the innermost section.
   */
  drawHatches (radius, prevRadius, discs, bounds) {
    const {center, deform, noiseRate} = this.props;
    const hatches = [];
    // const color = please.make_color();
    // const nSteps = randomInt(50, 100);
    const nSteps = randomInt(radius / 2, radius * 2);
    const rotation = 360 / nSteps;
    let innerVec = new Point({
      length: prevRadius,
      angle: 0
    });
    let vec = new Point({
      length: radius,
      angle: 0
    });

    for (let i = 0; i < nSteps; i++) {
      let from = this.getPoint(innerVec);
      let to = this.getPoint(vec);

      if (inBounds(from) || inBounds(to)) {
        const fullPath = new Path.Line({
          from,
          to,
          strokeColor: 'black'
        });

        const fromContainingDisc = discs.find(disc => disc.contains(from));
        const toContainingDisc = discs.find(disc => disc.contains(to));
        if (fromContainingDisc && toContainingDisc) {
          fullPath.remove();
        } else {
          if (fromContainingDisc) {
            const intersections = fromContainingDisc.getIntersections(fullPath);
            if (intersections.length) {
              from = intersections[0].point;
            }
          } else if (toContainingDisc) {
            const intersections = toContainingDisc.getIntersections(fullPath);
            if (intersections.length) {
              to = intersections[0].point;
            }
          }
          if (!inBounds(to)) {
            const intersections = bounds.getIntersections(fullPath);
            if (intersections.length) {
              to = intersections[0].point;
            }
          }

          if (!inBounds(from)) {
            const intersections = bounds.getIntersections(fullPath);
            if (intersections.length) {
              from = intersections[0].point;
            }
          }
          hatches.push([from, to]);
          fullPath.remove();
        }
      }

      vec = vec.rotate(rotation);
      innerVec = innerVec.rotate(rotation);
    }

    return pens.withPen(choose(BROWN_PENS), ({strokeWidth, color}) => {
      return hatches.map((points) => {
        const segments = handdrawn(points);
        const path = new Path({
          segments,
          strokeColor: color,
          strokeWidth
        });
      });
    });
  }

  /**
   * @param disc - Array of discs lying above this one.
   */
  draw ({bounds, discs=[]} = {}) {
    this.group = new Group();
    const radiusStep = this.props.radius / this.props.sections;
    let radius = radiusStep;
    let prevRadius = radiusStep / 3;
    for (let i = 1; i <= this.props.sections; i++) {
      radius = i * radiusStep;
      // this.group.addChildren(this.outlineSection(radius, discs, {strokeColor: 'black', inBounds}));
      this.group.addChildren(this.drawHatches(radius, prevRadius, discs, bounds));
      prevRadius = radius;
    }
  }
}


function handdrawn ([from, to], opts={}) {
  const segments = [from];
  const jitter = 2;
  let vec = to.subtract(from);
  const steps = Math.floor(vec.length / 11);
  for (let i = 0; i < steps; i++) {
    const dist = vec.length;
    const step = vec.normalize().multiply(dist / (steps - i)).add(random(-jitter, jitter), random(-jitter, jitter));
    const point = segments[i].add(step);
    segments.push(point);
    vec = to.subtract(point);
  }
  return segments;
}

// Draw bounds
const bounds = new Path.Rectangle({
  from: [BOUNDS.left, BOUNDS.top],
  to: [BOUNDS.right, BOUNDS.bottom],
  strokeColor: 'black'
});
function inBounds (point) {
  return point.x > BOUNDS.left && point.x < BOUNDS.right && point.y > BOUNDS.top && point.y < BOUNDS.bottom;
}

function semiRandomDiscs () {
  const discs = [];
  const rows = 8;
  const cols = 5;
  const rowStep = height / rows;
  const colStep = width / cols;
  for (let i = 0; i <= rows; i++) {
    for (let j = 0; j <= cols; j++) {
      const y = i * rowStep;
      const x = j * colStep;
      const center = new Point(width - x, height - y).add(random(-40, 40), random(-40, 40));
      const disc = new HatchedDisc({
        center,
        radius: random(50, 170),
        deform: random(8, 30),
        sections: randomInt(3, 7),
        noiseRate: 0.001
      }, (...args) => noise.simplex2(...args));
      disc.draw({bounds, discs});
      discs.push(disc);
    }
  }
  bounds.remove();
}
semiRandomDiscs();

// const disc1 = new Disc({
//   id: 1,
//   center: new Point(width/2, height/2),
//   radius: 200,
//   deform: 25
// });
// const disc2 = new Disc({
//   id: 2,
//   center: new Point(width/2 - 100, height/2 -100),
//   radius: 220,
//   deform: 20
// });
// const disc3 = new Disc({
//   id: 3,
//   center: new Point(width/2 + 100, height/2 - 250),
//   radius: 200,
//   deform:15
// });
// disc1.draw({bounds});
// disc2.draw({bounds, discs: [disc1]});
// disc3.draw({bounds, discs: [disc1, disc2]});

window.saveAsSvg = function save (name) {
  saveAsSVG(paper.project, name);
}
