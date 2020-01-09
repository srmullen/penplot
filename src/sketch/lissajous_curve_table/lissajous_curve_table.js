import paper, { Point, Path } from 'paper';
import math, { random, randomInt } from 'mathjs';
import { range, sortBy, countBy, last, flatten, isArray } from 'lodash';
import dat from 'dat.gui';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, choose, maprange, radiansToDegrees, clipBounds, processOptions
} from 'common/utils';
import * as pens from 'common/pens';
import * as palettes from 'common/palettes';

const PAPER_SIZE = A4.landscape;
const [width, height] = PAPER_SIZE;
const canvas = createCanvas(PAPER_SIZE);
paper.setup(canvas);

function circle(center, radius = 100) {
  center = new Point(center);
  const nSteps = 100;
  const points = [];
  for (let i = 0; i < nSteps; i++) {
    const point = center.add(
      math.cos(2 * math.pi * (i / nSteps)) * radius, 
      math.sin(2 * math.pi * (i / nSteps)) * radius
    );
    points.push(point);
  }
  new Path({
    segments: points,
    strokeColor: 'black',
    closed: true
  });
}
circle([width/2, height/2]);
