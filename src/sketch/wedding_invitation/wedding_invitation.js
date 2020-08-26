import * as opentype from 'opentype.js';
import paper, { Point, Path, Curve, CompoundPath } from 'paper';
import math, { random, randomInt } from 'mathjs';
import { range, sortBy, countBy, last, flatten, isArray } from 'lodash';
import { STRATH_SMALL, WEDDING_SAVE_THE_DATE, createCanvas } from 'common/setup';
import {
  saveAsSVG, choose, maprange, radiansToDegrees, clipBounds, processOptions
} from 'common/utils';
import * as pens from 'common/pens';
import * as palettes from 'common/palettes';
import paperSizes from 'common/paper_sizes';
import convert from 'convert-length';

function loadOpentype(file) {
  return new Promise((resolve, reject) => {
    opentype.load(file, (err, font) => {
      if (err) {
        reject(err);
      } else {
        resolve(font);
      }
    });
  })
}

function text(font, point, content, { fontSize = 12, pen = pens.BLACK } = {}) {
  const pathData = font.getPath(content, point.x, point.y, fontSize).toPathData();
  return pens.withPen(pen, ({ color }) => {
    const path = new paper.CompoundPath(pathData);
    path.strokeColor = color;
    path.fillColor = color;
    // path.position = point;
    return path;
  });
}

// Places the text when creating the compondPath rather than the svg data.
function textp(font, point, content, { fontSize = 12, pen = pens.BLACK } = {}) {
  const pathData = font.getPath(content, 0, 0, fontSize).toPathData();
  return pens.withPen(pen, ({ color }) => {
    const path = new paper.CompoundPath(pathData);
    path.strokeColor = color;
    path.fillColor = color;
    path.position = point;
    return path;
  });
}

// % inches by 7 inches
const PAPER_SIZE = [5, 7].map(n => {
  return convert(n, 'in', 'px', { pixelsPerInch: 96 }); // 96 is the default based on css spec.
});

async function inviteV1() {
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const font = await loadOpentype('src/fonts/Spartan/static/Spartan-Regular.ttf');

  function outerBorder() {
    const margin = 30;
    const cross = 20;

    const topBorder = new Path.Line({
      from: [cross, margin],
      to: [width - cross, margin],
      strokeColor: 'black'
    });

    const bottomBorder = new Path.Line({
      from: [cross, height - margin],
      to: [width - cross, height - margin],
      strokeColor: 'black'
    });

    const leftBorder = new Path.Line({
      from: [margin, cross],
      to: [margin, height - cross],
      strokeColor: 'black'
    });

    const rightBorder = new Path.Line({
      from: [width - margin, cross],
      to: [width - margin, height - cross],
      strokeColor: 'black'
    });
  }

  function header() {
    const fontSize = 32;
    const top = height / 5;
    const lineHeight = 50;
    const lines = [
      'Jacqueline', 
      'Walter', 
      '&', 
      'Sean', 
      'Mullen'
    ];
    lines.forEach((line, i) => {
      textp(font, new Point(width / 2, top + lineHeight * i), line, { fontSize, pen: pens.BLACK });
    });
    // textp(font, new Point(width / 2, top), 'Jacqueline Walter', { fontSize, pen: pens.BLACK });
    // textp(font, new Point(width / 2, top + lineHeight), '&', { fontSize, pen: pens.BLACK });
    // textp(font, new Point(width / 2, top + lineHeight * 2), 'Sean Mullen', { fontSize, pen: pens.BLACK });
  }

  function body() {
    const fontSize = 16;
    const top = height * 0.618;
    const lineHeight = 25;
    const lines = [
      'saturday November 7',
      'two thousand twenty',
      'at 3:30 in the afternoon',
      'Barrows House Inn',
      'Dorset, Vermont',
      'RSVP by phone'
    ];
    lines.forEach((line, i) => {
      textp(font, new Point(width / 2, top + lineHeight * i), line, { fontSize, pen: pens.BLACK });
    });
  }

  outerBorder();
  vineBorder();
  header();
  body();

  function vine(from, to) {
    const nNodes = 20;

    const nodes = [from];
    const step = from.getDistance(to) / nNodes;
    const vec = to.subtract(from).normalize();
    for (let i = 0; i < nNodes; i++) {
      const node = nodes[nodes.length - 1].add(vec.multiply(step));
      nodes.push(node);
    }

    // Draw stem
    const stem = new Path({
      segments: nodes,
      strokeColor: 'blue'
    });

    // Add leaves to stem
    const leafLength = 20;
    const leafVecL = vec.rotate(45).multiply(leafLength);
    const leafVecR = vec.rotate(-45).multiply(leafLength);
    nodes.forEach((node, i) => {
      const leafVec = [leafVecL, leafVecR][i % 2];
      const tip = node.add(leafVec);

      const leafWidth = 3;
      const midPointVec = tip.subtract(node);
      const perp = midPointVec.rotate(90).normalize();
      const midPoint1 = node.add(midPointVec.divide(2).add(perp.multiply(leafWidth)));
      const midPoint2 = node.add(midPointVec.divide(2).add(perp.multiply(-leafWidth)));
      
      const leaf = new Path({
        segments: [node, midPoint1, tip, midPoint2],
        strokeColor: 'blue',
        fillColor: 'blue',
        closed: true
      });
      leaf.smooth();
    });
  }

  function vineBorder() {
    const margin = 50;
    // Top
    vine(
      new Point(margin, margin), 
      new Point(width - margin, margin)
    );

    // Right
    vine(
      new Point(width - margin, margin), 
      new Point(width - margin, height - margin)
    );

    // Bottom
    vine(
      new Point(width - margin, height - margin), 
      new Point(margin, height - margin)
    );

    // Left
    vine(
      new Point(margin, height - margin), 
      new Point(margin, margin)
    );
  }
}

inviteV1();