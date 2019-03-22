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

window.math = math;
window.paper = paper;
window.please = please;

const noise = new Noise();
const [width, height] = A4.portrait;
const canvas = createCanvas(A4.portrait);
paper.setup(canvas);

const seed = randomInt(2000);
// const seed = 945;
console.log(seed);
noise.seed(seed);

const DEFAULT_PROPS = {
  deform: 0,
  noiseRate: 0.001,
  nSteps: 100,
  sections: 4
};

const H_MARGIN = 50;
const V_MARGIN = 100;
const BOUNDS = {
  top: V_MARGIN,
  left: H_MARGIN,
  bottom: height - V_MARGIN,
  right: width - H_MARGIN
};

class Disc {
  constructor (props) {
    this.props = Object.assign({}, DEFAULT_PROPS, props);
  }

  contains (point) {
    const vec = point.subtract(this.props.center);
    const boundingPoint = this.getPoint(vec.normalize().multiply(this.props.radius));
    const boundingVec = boundingPoint.subtract(this.props.center);
    return vec.length <= boundingVec.length;
  }

  /**
   * Get the point on the circle at the given angle.
   * @param angle - Angle in degrees.
   */
  getPoint (vec) {
    // get the point on a regular circle.
    const cpoint = this.props.center.add(vec);
    // use noise to offset the point.
    const point = cpoint.add(
      lerp(-this.props.deform, this.props.deform, noise.simplex2(cpoint.x * this.props.noiseRate, cpoint.y * this.props.noiseRate))
    );
    return point;
  }

  getIntersections (path) {
    const [boundary] = this.outlineSection(this.props.radius, [], {clip: false});
    return boundary.getIntersections(path);
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
      // this.group.addChildren(this.outlineSection(radius, discs, {strokeColor: 'black'}));
      this.group.addChildren(this.drawHatches(radius, prevRadius, discs, bounds));
      prevRadius = radius;
    }
  }

  outlineSection (radius, discs, {strokeColor = null, clip=true}={}) {
    const {center, deform, nSteps, noiseRate} = this.props;
    const segments = [];
    let vec = new Point({
      length: radius,
      angle: 0
    });

    const rotation = 360 / nSteps;
    let section = [];
    for (let i = 0; i <= nSteps; i++) {
      const point = this.getPoint(vec);
      if (clip && (!inBounds(point) || discs.some(disc => disc.contains(point)))) {
        if (section.length) {
          segments.push(section);
          section = [];
        }
        vec = vec.rotate(rotation);
      } else {
        section.push(point);
        vec = vec.rotate(rotation);
      }
    }
    if (section.length) {
      segments.push(section);
    }

    return segments.map(seg => new Path({
      segments: seg,
      strokeColor,
      closed: false
    }));
  }

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

    return pens.withPen(choose(pens.prisma05), ({strokeWidth, color}) => {
      return hatches.map(([from, to]) => {
        const hatch = new Path.Line({
          from, to,
          strokeColor: color,
          strokeWidth
        });
      });
    });
  }
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
      const disc = new Disc({
        center,
        radius: random(50, 170),
        deform: random(8, 30),
        sections: randomInt(3, 7),
        noiseRate: 0.002
      });
      disc.draw({bounds, discs});
      discs.push(disc);
    }
  }
}
semiRandomDiscs();

// const disc1 = new Disc({
//   id: 1,
//   center: new Point(width/2, height/2),
//   radius: 200,
//   deform: 25,
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
// disc1.draw({bounds: BOUNDS});
// disc2.draw({bounds: BOUNDS, discs: [disc1]});
// disc3.draw({bounds: BOUNDS, discs: [disc1, disc2]});

window.saveAsSvg = function save (name) {
  saveAsSVG(paper.project, name);
}
