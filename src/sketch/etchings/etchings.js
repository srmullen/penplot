import paper, { Point, Path, Group } from 'paper';
import { sortBy } from 'lodash';
import { Noise } from 'noisejs';
import math, { random, randomInt } from 'mathjs';
import dat from 'dat.gui';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import { saveAsSVG, intersects, radiansToDegrees, gauss } from 'common/utils';
import * as pens from 'common/pens';

const [width, height] = STRATH_SMALL.landscape;
const canvas = createCanvas(STRATH_SMALL.landscape);

const noise = new Noise();
paper.setup(canvas);
window.paper = paper;

function rectHatch (from, to, {stepSize = 5, angle, debug} = {}) {
  const box = Path.Rectangle({
    from,
    to,
    visible: false
  });

  const center = new Point(box.bounds.centerX, box.bounds.centerY);
  const disectionVec = new Point({
    length: 1,
    angle: angle + 90
  });
  const disectionFrom = center.add(disectionVec.multiply(box.bounds.width + box.bounds.height));
  const disectionTo = center.subtract(disectionVec.multiply(box.bounds.width + box.bounds.height));

  if (debug) {
    new Path.Line({
      from: disectionFrom,
      to: disectionTo,
      strokeColor: 'red'
    });
  }

  const traceVec = disectionVec.rotate(90);
  const trace = new Path.Line({
    visible: false,
    from: disectionFrom.subtract(traceVec.multiply(width)),
    to: disectionFrom.add(traceVec.multiply(width)),
    strokeColor: 'blue'
  });

  const disectionLength = disectionFrom.getDistance(disectionTo);
  const steps = disectionLength / stepSize;

  const xrand = () => {
    return random(-1, 1);
  }

  const yrand = () => {
    return random(-2, 2);
  }

  const paths = [];
  for (let i = 0; i < steps; i++) {
    trace.translate(disectionVec.normalize().multiply(-stepSize));
    const intersections = box.getIntersections(trace);
    if (intersections.length === 2) {
      const from = intersections[0].point.add(xrand(), yrand());
      const to = intersections[1].point.add(xrand(), yrand());
      const path = new Path({
        segments: [from, to],
        strokeColor: 'black',
        strokeWidth: 0.5
      });
      paths.push(path);
    }
  }
  trace.remove();
  box.remove();
  return new Group(paths);
}

rectHatch([100, 100], [200, 200], {angle: 275, stepSize: 5});
rectHatch([100, 100], [200, 200], {angle: 30, stepSize: 5});
