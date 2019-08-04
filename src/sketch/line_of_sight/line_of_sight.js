import paper, { Point, Path } from 'paper';
import math, { random, randomInt } from 'mathjs';
import { range, minBy, last } from 'lodash';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, choose, maprange, radiansToDegrees, clipBounds, insert
} from 'common/utils';
import * as pens from 'common/pens';
import * as palettes from 'common/palettes';
import { AdjustablePathTool, DrawTool } from 'common/tools';

const PAPER_SIZE = A4.landscape;
const [width, height] = PAPER_SIZE;
const canvas = createCanvas(PAPER_SIZE);
paper.setup(canvas);

function createIntermediatPaths(fromPoints, toPoints, nPaths = 2) {
  // if (fromPoints.length !== toPoints.length) throw new Error('fromPoints and toPoints must be same length');
  const vectors = [];
  for (let i = 0; i < fromPoints.length; i++) {
    vectors.push(toPoints[i].subtract(fromPoints[i]).divide(nPaths + 1));
  }

  const paths = [];
  for (let i = 0; i < nPaths; i++) {
    const path = [];
    for (let j = 0; j < vectors.length; j++) {
      const step = vectors[j];
      const from = fromPoints[j];
      path.push(from.add(step.multiply(i + 1)));
    }
    paths.push(path);
  }

  return paths;
}

/**
 * Add n points to points without changing the path the points create.
 * Place points halfway between points at average step.
 * @param {Number} n 
 * @param {Point[]} points 
 */
function addPoints(n, points) {
  let ret = points;
  const step = Math.floor(points.length / (n + 2));
  for (let i = step; i < n; i += (step + 1)) {
    const vec = points[i].subtract(points[i-1]).divide(2);
    const point = points[i-1].add(vec);
    ret = insert(ret, i, point);
  }
  return ret;
}

function jaggedPaths () {
  const s1 = [];
  const s2 = [];
  const nPoints = 50;
  const vmargin = 100;
  const hmargin = 100;
  const step = (height - 2 * vmargin) / nPoints;
  for (let i = 0; i < nPoints; i++) {
    s1.push(new Point(hmargin + random(-(50 - i), 50 - i), vmargin + step * i));
    s2.push(new Point((width - hmargin) + random(-i, i), vmargin + step * i));
  }
  const p1 = new Path({
    segments: s1,
    strokeColor: 'black'
  });
  const p2 = new Path({
    segments: s2,
    strokeColor: 'black'
  });

  const paths = createIntermediatPaths(s1, s2, 150);
  pens.withPen(pens.PRISMA05_BLACK, ({ color }) => {
    paths.map(segments => new Path({ segments, strokeColor: color }));
  });
}

function faces() {
  const tool = new paper.Tool();
  let paths = [];
  let path;
  let points;
  tool.onMouseDown = () => {
    path = new Path();
    points = [];
    path.strokeColor = 'black';
    // path.strokeWidth = 0.5;
  }

  tool.onMouseDrag = (event) => {
    path.add(event.point);
    points.push(event.point);
  }

  let pathCount = 0;
  tool.onMouseUp = (event) => {
    points.push(event.point);
    if (points.length > 2) {
      paths.push(points);
      pathCount++;
    }
    if (pathCount === 2) {
      const maxPathIdx = paths[0].length > paths[1].length ? 0 : 1;
      const maxPath = paths[maxPathIdx];
      const minPathIdx = Math.abs(maxPathIdx - 1) % 2;
      const nPoints = maxPath.length - paths[minPathIdx].length;
      const minPath = addPoints(nPoints, paths[minPathIdx]);
      const intermediates = createIntermediatPaths(minPath, maxPath, 70);
      pens.withPen(pens.PRISMA05_BLACK, ({ color }) => {
        intermediates.map(segments => {
         const stroke = new Path({ segments, strokeColor: color });
         stroke.smooth();
        });
      });

      // Reset variables to draw again.
      pathCount = 0;
      paths = [];
    }
  }
}
// faces();

function adjustableLine() {
  const nPoints = 50;
  const leftMargin = 100;
  const step = 200;

  const paths = [];

  for (let i = 0; i < 2; i++) {
    const from = new Point(leftMargin + i * step, 100);
    const to = new Point(leftMargin + i * step, height - 100);
    const vec = to.subtract(from).divide(nPoints);
    const segments = [from];
    for (let i = 1; i < nPoints; i++) {
      segments.push(segments[i - 1].add(vec));
    }
    segments.push(to);
    const path = new Path({
      segments,
      strokeColor: 'black'
    });

    paths.push(path);
  }

  window.path = paths[1];

  window.adjuster = new AdjustablePathTool(paths);
}
adjustableLine();

function manuallyAdjustPath(path) {
  path.selected = true;

  const tool = new paper.Tool();
  let closestPoint;
  let highlight;
  tool.onMouseMove = (event) => {
    // find closest segment point.
    const point = event.point;
    const closest = minBy(path.segments, segment => point.getDistance(segment.point));
    if (closest !== closestPoint) {
      closestPoint = closest;
      if (highlight) highlight.remove();
      if (point.getDistance(closestPoint.point) < 15) {
        highlight = new Path.Circle({
          radius: 10,
          center: closest.point,
          fillColor: 'red'
        });
      } else {
        closestPoint = null;
      }
    }
  }

  tool.onMouseDrag = (event) => {
    if (closestPoint) {
      closestPoint.point = event.point;
    }
  }
}

// jaggedPaths();

window.saveAsSvg = function save(name) {
  saveAsSVG(paper.project, name);
}