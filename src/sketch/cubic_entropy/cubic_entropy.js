import paper, { Point, Path, Rectangle } from 'paper';
import math, { random, randomInt } from 'mathjs';
import { range } from 'lodash';
import please from 'pleasejs';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import { saveAsSVG, processOptions } from 'common/utils';
import * as pens from 'common/pens';

const PAPER_SIZE = A4.portrait;
const [width, height] = PAPER_SIZE;
const canvas = createCanvas(PAPER_SIZE);
paper.setup(canvas);

function rectHatch(rect, opts = {}) {
  const box = Path.Rectangle({
    rectangle: rect,
    visible: false
  });

  const {
    stepSize = 5,
    angle, 
    pen,
    debug
  } = processOptions(opts);

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
  const width = 1000;
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
    return random(-1, 1);
  }

  // const paths = [];
  for (let i = 0; i < steps; i++) {
    trace.translate(disectionVec.normalize().multiply(-stepSize));
    const intersections = box.getIntersections(trace);
    if (intersections.length === 2) {
      const from = intersections[i % 2].point.add(xrand(), yrand());
      const to = intersections[(i + 1) % 2].point.add(xrand(), yrand());
      pens.withPen(pen, ({ color, strokeWidth }) => {
        const path = new Path({
          segments: [from, to],
          strokeWidth: strokeWidth,
          strokeColor: color
        });
        return path;
      });
    }
  }
  trace.remove();
  box.remove();
}

const palette = [
  pens.STABILO_88_40, // red
  pens.STABILO_88_32, // blue
  pens.STABILO_88_36, // green
  pens.STABILO_88_44, // yellow
  pens.STABILO_88_94 // grey
];

function cube (point, size, opts={}) {
  const box = new Rectangle(point, size);
  rectHatch(
    box, 
    opts
  );
}


function run () {
  const margin = 100;
  const nBlocks = 100
  for (let i = 0; i < nBlocks; i++) {
    const blockWidth = random(20, 100);
    const blockHeight = random(20, 100);
    const x = random(margin, width - (margin + blockWidth));
    const y = random(margin, height - (margin + blockHeight));
    cube(
      [x, y],
      [blockWidth, blockHeight],
      { stepSize: 2, angle: 45, pen: palette[randomInt(5)] }
    );
  }
}

run();

window.saveAsSvg = function save(name) {
  saveAsSVG(paper.project, name);
}