import paper, { Point, Path } from 'paper';
import math, { random, randomInt } from 'mathjs';
import { sortBy } from 'lodash';
import dat from 'dat.gui';
import { A4, STRATH_SMALL, ARTIST_SKETCH, createCanvas } from 'common/setup';
import {
  saveAsSVG, choose, maprange, radiansToDegrees, clipBounds, processOptions
} from 'common/utils';
import * as pens from 'common/pens';
import * as palettes from 'common/palettes';
import { clipToBorder } from 'common/border';

const PAPER_SIZE = ARTIST_SKETCH.portrait;
const [width, height] = PAPER_SIZE;
const canvas = createCanvas(PAPER_SIZE);
paper.setup(canvas);

window.paper = paper;

function hatch(shape, opts = {}) {
  const {
    stepSize = 5,
    wobble = 0,
    angle,
    pen,
    debug
  } = processOptions(opts);

  const center = new Point(shape.bounds.centerX, shape.bounds.centerY);
  const disectionVec = new Point({
    length: 1,
    angle: angle + 90
  });
  const disectionFrom = center.add(disectionVec.multiply(shape.bounds.width + shape.bounds.height));
  const disectionTo = center.subtract(disectionVec.multiply(shape.bounds.width + shape.bounds.height));

  if (debug) {
    new Path.Line({
      from: disectionFrom,
      to: disectionTo,
      strokeColor: 'red'
    });
  }

  const traceVec = disectionVec.rotate(90);
  const width = 10000;
  const trace = new Path.Line({
    visible: false,
    from: disectionFrom.subtract(traceVec.multiply(width)),
    to: disectionFrom.add(traceVec.multiply(width)),
    strokeColor: 'blue'
  });

  const disectionLength = disectionFrom.getDistance(disectionTo);
  const steps = disectionLength / stepSize;

  const xrand = () => {
    return random(-wobble, wobble);
  }

  const yrand = () => {
    return random(-wobble, wobble);
  }

  const paths = [];
  for (let i = 0; i < steps; i++) {
    trace.translate(disectionVec.normalize().multiply(-stepSize));
    let intersections = shape.getIntersections(trace);
    if (intersections.length === 3) {
      // Both ends of the hatching line should always begin outside the shape, so assume
      // the mid-point come from clipping a corner.
      // FIXME: Need to extend this to handle all odd-numbered intersections.
      const from = intersections[0].point.add(xrand(), yrand());
      const to = intersections[2].point.add(xrand(), yrand());
      const segments = i % 2 === 0 ? [from, to] : [to, from] // reverse the direction of each stroke for faster drawing.
      pens.withPen(pen, ({ color, strokeWidth }) => {
        const path = new Path({
          segments,
          strokeWidth: strokeWidth,
          strokeColor: color
        });
        paths.push(path);
      });
    } else if (intersections.length && intersections.length % 2 === 0) {
      intersections = sortBy(intersections, loc => loc.point.x);
      for (let j = 0; j < intersections.length; j += 2) {
        const fromIdx = j;
        const toIdx = j + 1;
        const from = intersections[fromIdx].point.add(xrand(), yrand());
        const to = intersections[toIdx].point.add(xrand(), yrand());
        const segments = i % 2 === 0 ? [from, to] : [to, from] // reverse the direction of each stroke for faster drawing.
        pens.withPen(pen, ({ color, strokeWidth }) => {
          const path = new Path({
            segments,
            strokeWidth: strokeWidth,
            strokeColor: color
          });
          paths.push(path);
        });
      }
    }
  }
  trace.remove();
  return paths;
}

function basicMoire() {
  const paths = [];
  const margin = 50;
  const nLines = 70;
  const step = (width - margin * 2) / nLines;
  pens.withPen(pens.STABILO_88_44, ({ color }) => {
    for (let i = 0; i < nLines; i++) {
      let from, to;

      if (i % 2 === 0) {
        from = new Point(margin + i * step, margin);
        to = new Point(margin + i * step, height - margin);
      } else {
        from = new Point(margin + i * step, height - margin);
        to = new Point(margin + i * step, margin);
      }

      const path = new Path.Line({
        from,
        to,
        strokeColor: 'red',
        strokeWidth: 2
      });
      paths.push(path);
    }
  });

  pens.withPen(pens.STABILO_88_13, ({ color }) => {
    const blueLines = paths.map(path => {
      new Path({
        segments: path.segments,
        strokeColor: color,
        strokeWidth: 2
      });
    });
    paper.project.activeLayer.rotate(0.3);
  });
}
// basicMoire()

function moireHatch() {
  const t1 = new Path.Rectangle({
    point: [20, 10], 
    size: [width - width * 0.33, height - 20],
  });
  const t2 = new Path.Rectangle({
    point: [width * 0.33, 10],
    size: [width - width * 0.33, height - 20],
  });

  hatch(t1, { angle: 45, stepSize: 20, pen: pens.RED });
  hatch(t2, { angle: 45, stepSize: 20, pen: pens.BLUE });
}
moireHatch();


// moire(paths, (segments, idx) => {
//   const from = segments[0].point.add(1 + idx * 0.4, 0);
//   const to = segments[segments.length - 1].point.subtract(1, 0);
//   return [from, to];
// });


// function moire(paths=[], fn=(a => a)) {
//   return paths.map((path, idx) => {
//     return pens.withPen(pens.BLUE, ({ color }) => {
//       return new Path.Line({
//         segments: fn(path.segments, idx),
//         strokeColor: color,
//         strokeWidth: 2
//       });
//     })
//   });
// }

window.saveAsSvg = function save(name) {
  saveAsSVG(paper.project, name);
}