import paper, { Point, Path } from 'paper';
import math, { random, randomInt } from 'mathjs';
import { ARTIST_SKETCH, createCanvas } from 'common/setup';
import {
  saveAsSVG, choose, maprange, radiansToDegrees, clipBounds, processOptions, lerp, cerp, smoothStep
} from 'common/utils';
import * as pens from 'common/pens';
import * as palettes from 'common/palettes';
import { hatch } from 'common/hatch';
import please from 'pleasejs';
import paperSizes from 'common/paper_sizes';
import convert from 'convert-length';
import { disect } from 'common/disect';
import { fill } from 'lodash';

window.paper = paper;
window.Path = Path;

(() => {
  const DIMENSIONS = [9, 12]; // inches
  const PAPER_SIZE = DIMENSIONS.map(n => {
    return convert(n, 'in', 'px', { pixelsPerInch: 96 });
  });
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const margin = 50;

  const border = new Path.Rectangle({
    from: [margin, margin],
    to: [width - margin, height - margin],
    strokeColor: 'black'
  });

  const traceVec1 = new Point(1, 0).rotate(30);
  const from1 = new Point(0, 100);
  const trace1 = new Path.Line({
    from: from1,
    to: from1.add(traceVec1.multiply(1000)),
    strokeColor: 'red'
  });
  const directionVec = new Point(0, -5);

  const strokes = drag(trace1.clone(), (i) => directionVec.subtract(0, i), border, 120);
  // const vertical = drag()

  const traceVec2 = new Point(1, 0).rotate(90);
  const from2 = new Point(0, 100);
  const trace2 = new Path.Line({
    from: from2,
    to: from2.add(traceVec2.multiply(1200)),
    strokeColor: 'blue'
  });
  const directionVec2 = new Point(1, 0);
  for (let i = 0; i < 100; i++) {
    const intersections = trace2.getIntersections(trace1);
    if (intersections && intersections.length) {
      new Path.Circle({
        center: intersections[0].point,
        radius: 5,
        fillColor: 'blue'
      });
    }

    const borderIntersections = trace2.getIntersections(border);
    if (borderIntersections && borderIntersections.length) {
      new Path.Circle({
        center: borderIntersections[0].point,
        radius: 5,
        fillColor: 'blue'
      });
    }
    trace2.translate(directionVec2.multiply(5));
  }

  strokes.map(stroke => {
    new Path.Line({
      from: stroke[0],
      to: stroke[1],
      strokeColor: 'green'
    });
  });

  function drag(trace, step, path, maxSteps = 100) {
    const strokes = [];
    for (let i = 0; i < maxSteps; i++) {
      const intersections = trace.getIntersections(path);
      if (intersections.length === 2) {
        const points = intersections.map(intersection => {
          return intersection.point;
        });
        strokes.push(points);
        trace.translate(step(i));
      } else {
        break;
      }
    }
    trace.remove();
    return strokes;
  }
});

(() => {
  const DIMENSIONS = [5.5, 8.5]; // inches
  const PAPER_SIZE = DIMENSIONS.map(n => {
    return convert(n, 'in', 'px', { pixelsPerInch: 96 });
  });
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const margin = 50;

  const border = new Path.Rectangle({
    from: [margin, margin],
    to: [width - margin, height - margin]
  });

  const traceVec = new Point(1, 0).rotate(30);
  const from = new Point(0, 150);
  const trace = new Path.Line({
    from,
    to: from.add(traceVec.multiply(1000))
  });

  const disection = disect(border, trace);
  const bottom = new Path({
    segments: disection[0],
    closed: true
  });
  const top = new Path({
    segments: disection[1],
    closed: true
  });

  // FIXME: hatch calculates the most efficient position to start each line from, but here all
  // lines should be drawn in the same direction so the wearing down of the epn can be seen more clearly.
  // Also want the ability to space the lines differently or add in different pens.
  hatch(top, {
    pen: pens.STABILO_88_40,
    stepSize: 2,
    angle: traceVec.angle
  });

  hatch(bottom, {
    pen: pens.STABILO_88_32,
    stepSize: 2,
    angle: 90
  });

  border.remove();
  trace.remove();
});

// Many disections
(() => {
  const PAPER_SIZE = ARTIST_SKETCH.portrait;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const margin = 50;

  let paths = [];
  paths.push(new Path.Rectangle({
    from: [margin, margin],
    to: [width - margin, height - margin],
    strokeColor: 'black'
  }));

  // const trace = new Path.Line({
  //   from: [ -1000, -1000],
  //   to: [1000, 1000],
  //   strokeColor: 'red'
  // });

  const nBreaks = 10;

  for (let i = 0; i < nBreaks; i++) {
    const trace = randomBreak();
    const newPaths = [];
    for (let path of paths) {
      const disection = disect(path, trace);
      disection.forEach(segments => {
        if (segments.length > 2) {
          newPaths.push(new Path({
            segments,
            closed: true
          }));
        }
      });
    }
    trace.remove();
    paths.forEach(path => path.remove());
    paths = newPaths;
  }

  paths.forEach(path => {
    fillPath(path);
  });

  function randomBreak() {
    const center = new Point(random(margin, width - margin), random(margin, height - margin));
    const vec = new Point(1, 0).rotate(random(360)).multiply(width + height);
    return Path.Line({
      from: center.subtract(vec),
      to: center.add(vec),
      strokeColor: 'red'
    });
  }
});

function fillPath(path) {
  // const palette = palettes.palette_blues_and_greens;
  const palette = palettes.palette_hot_and_cold;
  hatch(path, {
    pen: choose(palette),
    stepSize: 2,
    angle: random(360),
    wobble: 1
  });
}

window.saveAsSvg = function save(name) {
  saveAsSVG(paper.project, name);
}