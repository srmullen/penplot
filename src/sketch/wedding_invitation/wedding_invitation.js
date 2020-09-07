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

  // const font = await loadOpentype('src/fonts/Spartan/static/Spartan-Regular.ttf');
  
  // const font = await loadOpentype('src/fonts/Handlee/Handlee-Regular.ttf');
  // const font = await loadOpentype('src/fonts/Kite_One/KiteOne-Regular.ttf');
  // const font = await loadOpentype('src/fonts/Open_Sans_condensed/OpenSansCondensed-Light.ttf');

  // const font = await loadOpentype('src/fonts/Bellota/Bellota-Light.ttf');
  const font = await loadOpentype('src/fonts/Poiret_One/PoiretOne-Regular.ttf');

  // const scriptFont = await loadOpentype('src/fonts/Satisfy/Satisfy-Regular.ttf');
  // const scriptFont = await loadOpentype('src/fonts/Cookie/Cookie-Regular.ttf');
  // const scriptFont = await loadOpentype('src/fonts/Dancing_Script/static/DancingScript-SemiBold.ttf');
  const scriptFont = await loadOpentype('src/fonts/Parisienne/Parisienne-Regular.ttf');
  // const scriptFont = await loadOpentype('src/fonts/Rochester/Rochester-Regular.ttf');

  function outerBorder() {
    const margin = 30;
    const cross = 20;

    const topBorder = handdrawnLine(
      new Point(cross, margin),
      new Point(width - cross, margin)
    );

    const bottomBorder = handdrawnLine(
      new Point([cross, height - margin]),
      new Point([width - cross, height - margin])
    );

    const leftBorder = handdrawnLine(
      new Point(margin, cross),
      new Point(margin, height - cross)
    );

    const rightBorder = handdrawnLine(
      new Point(width - margin, cross),
      new Point(width - margin, height - cross)
    );
  }

  function header() {
    const fontSize = 42;
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
      textp(scriptFont, new Point(width / 2, top + lineHeight * i), line, { fontSize, pen: pens.BLACK });
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
      'Saturday November 7',
      'Two Thousand Twenty',
      'at 4 in the afternoon',
      '',
      'Barrows House Inn',
      'Dorset, Vermont',
      // 'RSVP by phone'
    ];
    lines.forEach((line, i) => {
      textp(font, new Point(width / 2, top + lineHeight * i), line, { fontSize, pen: pens.BLACK });
    });
  }

  outerBorder();
  const vines = vineBorder();
  header();
  body();
  for (let i = 0; i < vines.length; i++) {
    fireflies(vines[i]);
  }

  function fireflies({stem, leaves}) {
    const glowbugs = [];
    const range = 20;
    const bugginess = 15;
    const maxIters = 50;
    const iter = 0;
    while (iter < maxIters && glowbugs.length < bugginess) {
      const point = stem.segments[randomInt(stem.segments.length)].point;
      const vec = new Point(0, 1).rotate(random(360)).multiply(random(range));
      const bug = new Path.Circle({
        center: point.add(vec),
        radius: random(2, 4),
        strokeColor: 'green'
      });

      const onStem = stem.getIntersections(bug).length;
      const onLeaf = leaves.some(leaf => {
        return leaf.getIntersections(bug).length;
      });
      const midairCollision = glowbugs.some(glowbug => {
        return glowbug.getIntersections(bug).length;
      });

      if (!onLeaf && !onStem && !midairCollision) {
        glowbugs.push(bug);
      } else {
        bug.remove();
      }
    }
    return glowbugs;
  }

  // const flower = babiesBreath(new Point(100, 200), new Point(0, -1), 7);

  function vine(from, to, nLeaves = 10) {
    const leaves = [];
    const stem = handdrawnLine(from, to, { pen: pens.BLUE });

    const vec = to.subtract(from).normalize();
    const step = Math.floor(stem.segments.length / nLeaves);
    const leafLength = 20;
    
    for (let i = Math.floor(step / 2), iter = 0; i < stem.segments.length; i += step, iter++) {
      const leafVecL = vec.rotate(random(40, 50)).multiply(random(leafLength-3, leafLength+3));
      const leafVecR = vec.rotate(random(-40, -50)).multiply(random(leafLength - 3, leafLength + 3));

      const segmenti = i + randomInt(-5, 5); //stem.segments[];
      if (stem.segments[segmenti]) {
        const segment = stem.segments[segmenti];
        const node = segment.point;
        leaves.push(leaf(node, leafVecL));
      }

      if (stem.segments[segmenti + 1]) {
        const segment = stem.segments[segmenti + 1];
        const node = segment.point;
        leaves.push(leaf(node, leafVecR));
      }
    }

    return {
      stem,
      leaves
    };

    function leaf(node, vec) {
      const tip = node.add(vec);

      const leafWidth = 3;
      const midPointVec = tip.subtract(node);
      const perp = midPointVec.rotate(90).normalize();
      const midPoint1 = node.add(midPointVec.divide(2).add(perp.multiply(leafWidth)));
      const midPoint2 = node.add(midPointVec.divide(2).add(perp.multiply(-leafWidth)));

      return pens.withPen(pens.BLUE, ({ color }) => {
        const path = new Path({
          segments: [node, midPoint1, tip, midPoint2],
          strokeColor: color,
          closed: true
        });
        path.smooth();
        return path;
      });
    }
  }

  function vineBorder() {
    const margin = 50;
    // Top
    const top = vine(
      new Point(margin, margin), 
      new Point(width - margin, margin)
    );

    // Right
    const right = vine(
      new Point(width - margin, margin), 
      new Point(width - margin, height - margin),
      14
    );

    // Bottom
    const bottom = vine(
      new Point(width - margin, height - margin), 
      new Point(margin, height - margin)
    );

    // Left
    const left = vine(
      new Point(margin, height - margin), 
      new Point(margin, margin),
      14
    );

    return [top, right, bottom, left];
  }
}

function babiesBreath(pos, vec, depth = 0) {
  const paths = [];

  _babiesBreath(pos, vec, depth);

  return paths;

  function _babiesBreath(pos, vec, depth = 0) {
    if (depth <= 0) {
      return;
    }
    const length = random(5, 10);
    const to = pos.add(vec.multiply(length));
    const stem = new Path.Line({
      from: pos,
      to,
      strokeColor: 'brown'
    });
    if (intersects(paths, stem)) {
      stem.remove();
      return;
    }
    paths.push(stem);

    let stemVec = vec;
    for (let i = 0; i < 2; i++) {
      // const newVec = vec.rotate(random(-45, 45));
      stemVec = stemVec.rotate(choose([random(10, 30), random(-10, -30)]))
      _babiesBreath(to, stemVec, depth - 1);
    }
  }
}

// Given a babies breath flower (aka an array of paths), check if a stem crosses any other stems.
function intersects(flower, stem) {
  for (let path of flower) {
    const intersections = stem.getCrossings(path);
    if (intersections.length) {
      return true;
    }
  }
  return false;
}

function handdrawnLine(from, to, opts = {}) {
  const {
    pen = pens.BLACK
  } = processOptions(opts);
  const segments = [from];
  const stepSize = 2;
  const rotation = 5;
  const vec = to.subtract(from).normalize();
  const dist = to.getDistance(from);
  const steps = Math.floor(dist / stepSize);
  for (let i = 0; i < steps; i++) {
    const prev = segments[segments.length - 1];
    const point = prev.add(vec.rotate(random(-rotation, rotation)).multiply(stepSize));
    segments.push(point);
  }
  return pens.withPen(pen, ({ color }) => {
    const path = new Path({
      segments,
      strokeColor: color
    });

    path.smooth();

    return path;
  });
}

inviteV1();

window.saveAsSvg = function save(name) {
  saveAsSVG(paper.project, name);
}