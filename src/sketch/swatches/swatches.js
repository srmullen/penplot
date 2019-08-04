import paper, { Point, Path, Rectangle } from 'paper';
import math, { random, randomInt } from 'mathjs';
import { range, partition, sortBy, isFunction, sum } from 'lodash';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, shuffle, choose, maprange, processOptions
} from 'common/utils';
import * as pens from 'common/pens';

const PAPER_SIZE = A4.landscape;
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
    wobble = 0,
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
    return random(-wobble, wobble);
  }

  const yrand = () => {
    return random(-wobble, wobble);
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

function cube(point, size, opts = {}) {
  const box = new Rectangle(point, size);
  rectHatch(
    box,
    opts
  );
}

function swatch(point, size, options = []) {
  const box = new Rectangle(point, size);
  for (let opts of options) {
    rectHatch(
      box,
      opts
    );
  }
}

function swatchGrid1() {
  const margin = 20;
  const vSteps = 20;
  const hSteps = 20;
  const start = new Point(margin, margin);
  const size = (height - 2 * margin) / vSteps;
  const vrange = [2, 20];
  const vstep = (vrange[1] - vrange[0]) / (vSteps - 1);
  const hrange = [0, 180];
  const hstep = (hrange[1] - hrange[0]) / (hSteps - 1);
  for (let i = 0; i < vSteps; i++) {
    for (let j = 0; j < hSteps; j++) {
      swatch(
        start.add(size * j, size * i),
        [size, size],
        [
          {
            pen: pens.STABILO_88_32,
            stepSize: vrange[0] + vstep * i,
            angle: hrange[0] + hstep * j
          },
          {
            pen: pens.STABILO_88_36,
            stepSize: vrange[1] - vstep * i,
            angle: hrange[1] - hstep * j
          }
        ]
      );
    }
  }
}
// swatchGrid1();

function swatchGrid2({ pos, width, height, vsteps, hsteps, vrange, hrange, swatchOpts = [] } = {}) {
  const swatchSize = [width / hsteps, height / vsteps];
  const vstep = (vrange[1] - vrange[0]) / (vsteps - 1);
  const hstep = (hrange[1] - hrange[0]) / (hsteps - 1);
  for (let i = 0; i < vsteps; i++) {
    const hval = hrange[1] - hstep * i;
    for (let j = 0; j < hsteps; j++) {
      const vval = vrange[1] - vstep * j;
      swatch(
        pos.add(swatchSize[0] * j, swatchSize[1] * i),
        swatchSize,
        swatchOpts.map((opts) => Object.assign({}, opts, opts.val(hval, vval)))
      );
    }
  }
}

function rgbSwatches() {
  const margin = 20;
  const size = (width - margin * 4) / 3;
  const y = height - (size + size/2);
  const rgbArr = [
    [pens.STABILO_88_32, pens.STABILO_88_36],
    [pens.STABILO_88_32, pens.STABILO_88_40],
    [pens.STABILO_88_36, pens.STABILO_88_40]
  ];
  const cymArr = [
    [pens.STABILO_88_56, pens.STABILO_88_44],
    [pens.STABILO_88_56, pens.STABILO_88_57],
    [pens.STABILO_88_44, pens.STABILO_88_57]
  ];

  for (let i = 0; i < 3; i++) {
    swatchGrid2({
      pos: new Point(size * i + margin + margin * i, margin),
      width: size,
      height: size,
      hsteps: 10,
      vsteps: 10,
      vrange: [2, 15],
      hrange: [2, 15],
      swatchOpts: [
        {
          pen: rgbArr[i][0],
          val: (hval, vval) => ({ stepSize: vval }),
          angle: 45
        },
        {
          pen: rgbArr[i][1],
          val: (hval, vval) => ({ stepSize: hval }),
          angle: -45
        }
      ]
    });

    swatchGrid2({
      pos: new Point(size * i + margin + margin * i, height - (size + margin)),
      width: size,
      height: size,
      hsteps: 10,
      vsteps: 10,
      vrange: [2, 15],
      hrange: [2, 15],
      swatchOpts: [
        {
          pen: cymArr[i][0],
          val: (hval, vval) => ({ stepSize: vval }),
          angle: 45
        },
        {
          pen: cymArr[i][1],
          val: (hval, vval) => ({ stepSize: hval }),
          angle: -45
        }
      ]
    });
  }
}
rgbSwatches();

window.saveAsSvg = function save(name) {
  saveAsSVG(paper.project, name);
}