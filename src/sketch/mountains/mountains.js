import paper, { Point, Path, Group } from 'paper';
import math, { random, randomInt } from 'mathjs';
import please from 'pleasejs';
import { Noise } from 'noisejs';
import dat from 'dat.gui';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, intersects, intersection, radiansToDegrees, gauss, choose, wchoose, lerp, processOptions, clipBounds
} from 'common/utils';
import * as colors from 'common/color';
import * as pens from 'common/pens';

window.math = math;

const noise = new Noise();
const [width, height] = A4.landscape;
const canvas = createCanvas(A4.landscape);
paper.setup(canvas);

/**
 * Creates mountainous craggy points between p1 and p2.
 * @param {Point} p1 
 * @param {Point} p2 
 * @param {number} nPoints 
 */
function crags(p1, p2, nPoints) {
  const points = [];
  const dist = p1.getDistance(p2) / nPoints + 1;
  const vec = p2.subtract(p1).normalize();
  for (let i = 1; i < nPoints; i++) {
    const point = p1.add(vec.multiply(dist * i)).add([0, random(-15, 15)]);
    points.push(point);
  }
  return points;
}

function getBounds (segments) {
  let top = Infinity;
  let bottom = -Infinity;
  let left = Infinity;
  let right = -Infinity;
  for (let point of segments) {
    if (point.y < top) {
      top = point.y;
    }
    if (point.y > bottom) {
      bottom = point.y;
    }
    if (point.x < left) {
      left = point.x;
    }
    if (point.x > right) {
      right = point.x;
    }
  }
  return { top, left, bottom, right };
}

class Mountain {
  constructor (base, peak, segments) {
    this.base = base;
    this.peak = peak;
    this.segments = segments;
    this.bounds = getBounds(segments);
  }
  
  /**
   * @param {Point} base - the Mountain center.
   */
  static triangleMountain(base, opts = {}) {
    const {
      elevation = 100,
    } = processOptions(opts);
    const spanLeft = opts.spanLeft || opts.span;
    const spanRight = opts.spanRight || opts.span;

    // Create the points
    const peak = base.subtract(0, elevation);
    const left = base.subtract(spanLeft());
    const right = base.add(spanRight());
    const leftMid = left.add(peak.subtract(left).divide(2)).add([0, elevation / 4]);
    const rightMid = peak.add(right.subtract(peak).divide(2)).add([0, elevation / 4]);

    const points = [left, leftMid, peak, rightMid, right];

    const segments = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      for (let crag of crags(p1, p2, 3)) {
        segments.push(crag);
      }
      segments.push(p2);
    }

    return new Mountain(base, peak, segments);
  }

  getIntersections (s1, s2) {
    for (let i = 1; i < this.segments.length; i++) {
      const p1 = new Path.Line({
        from: this.segments[i - 1],
        to: this.segments[i],
      });
      const p2 = new Path.Line({
        from: s1,
        to: s2,
      });
      const intersections = p1.getCrossings(p2);
      if (intersections.length) {
        p1.remove();
        p2.remove();
        return intersections.map(intersect => intersect.point);
      }
    }
  }

  /**
   * true if the point is contained within the mountain.
   * @param {Point} point 
   */
  contains(point) {
    if (
      point.x > this.bounds.right || 
      point.x < this.bounds.left ||
      // point.y > this.bounds.bottom || // Ignore the bottom because everything below the mountain ill be hidden.
      point.y < this.bounds.top
    ) {
      return false;
    } else {
      for (let i = 1; i < this.segments.length; i++) {
        const p1 = this.segments[i-1];
        const p2 = this.segments[i];
        if (point.x > p1.x && point.x < p2.x) {
          const { x, y } = intersection(
            p1, 
            p2, 
            { x: point.x, y: this.bounds.top },
            { x: point.x, y: this.bounds.bottom }
          );
          return point.y >= y;
        }
      }
    }
  }

  drawBounds () {
    return new Path.Rectangle({
      strokeColor: 'red',
      from: [this.bounds.left, this.bounds.top],
      to: [this.bounds.right, this.bounds.bottom]
    });
  }
}

function mountainRange () {
  const m1 = Mountain.triangleMountain(
    new Point(width / 2, height / 2 + 100),
    {
      elevation: () => random(90, 110),
      span: () => [120, random(-10, 10)]
    }
  );
  const m2 = Mountain.triangleMountain(
    new Point(width / 2 + 100, height / 2 + 100),
    {
      elevation: () => random(90, 110),
      span: () => [random(40, 60), 0]
    }
  );
  const m3 = Mountain.triangleMountain(
    new Point(width / 2 - 100, height / 2 + 100),
    {
      elevation: () => random(90, 110),
      span: () => [70, 0]
    }
  );
  
  draw(m1, [m2, m3]);
  draw(m2);
  draw(m3);  
}

mountainRange();

function cleaveMountain(segments, m2) {
  const cleaved = [];
  const obscured = segments.map(point => m2.contains(point));
  if (!obscured[0]) {
    cleaved.push(segments[0]);
  }
  for (let i = 1; i < obscured.length; i++) {
    if (obscured[i-1] && !obscured[i]) { // first point is obscured
      const intersections = m2.getIntersections(segments[i - 1], segments[i]);
      const intersection = intersections ? intersections[0] : null;
      cleaved.push(intersection);
      cleaved.push(segments[i]);
    } else if (!obscured[i - 1] && obscured[i]) { // second point is obscured
      const intersections = m2.getIntersections(segments[i - 1], segments[i]);
      const intersection = intersections ? intersections[0] : null;
      cleaved.push(intersection);
    } else if (!obscured[i - 1] && !obscured[i]) {
      cleaved.push(segments[i]);
    } else {
      // both segments are obscured. Don't use either of them.
    }
  }
  return cleaved;
}

function draw (mountain, foreground=[]) {
  let segments = mountain.segments;
  for (let foothill of foreground) {
    segments = cleaveMountain(segments, foothill);
  }
  return new Path({
    segments, //: mountain.segments,
    strokeColor: 'black'
  });
}

function hill (base, scale) {
  const steps = 10;
  const segments = [];
  const rotation = -180 / steps;
  let vec = new Point({
    angle: 0,
    length: 1
  });
  for (let i = 0; i <= steps; i++) {
    const trail = vec.multiply(scale).add(random(-scale/10, scale/10), random(-2, 2));
    segments.push(base.add(trail));
    vec = vec.rotate(rotation);
  }
  new Path({
    segments,
    strokeColor: 'black'
  });
}

function perlinMountain (start, length = 100, height = 100) {
  const steps = 50;
  const segments = [];
  const step = math.PI / steps;
  for (let i = 0; i <= math.PI; i += step) {
    const x = start.x + (math.cos(i) * length);
    const y = (start.y - math.sin(i) * height) + noise.simplex2(x, start.y) * 10;
    const point = new Point(x, y);
    segments.push(point);
  }

  new Path.Circle({
    center: start,
    radius: 2,
    fillColor: 'red'
  });
  new Path.Line({
    from: start,
    to: start.add(length, 0),
    strokeColor: 'red'
  });

  const path = new Path({
    segments,
    strokeColor: 'black'
  });
  path.smooth();
}

// perlinMountain(new Point(width/2, height/2), 150, 200);

// hill(new Point(width/2 - 200, height/2 + 100), 50);
// hill(new Point(width/2, height/2 + 100), 100);
// hill(new Point(width/2 + 200, height/2 + 100), 120);

function perlinHoirizon (y) {
  // const steps = 100;
  // const stepSize = width / steps;
  const segments = meander(
    new Point(10, y),
    new Point(width, y),
    {noiseRate: () => 0.005, amp: () => 40}
  );

  return new Path({
    segments,
    strokeColor: 'black'
  });
}

// perlinHoirizon(height/3);
// perlinHoirizon(height/2);
// perlinHoirizon(2*height/3);

/**
 * Create a meandering line between given points.
 */
function meander (
  from,
  to,
  {
    steps=100,
    amp = () => 10,
    noiseRate = () => 0.01
  } = {}
) {
  const segments = [from];
  const vec = to.subtract(from);
  const step = vec.divide(steps);
  for (let i = 1; i < steps; i++) {
    const point = from.add(step.multiply(i));
    const rate = noiseRate({x: point.x, y: point.y, i});
    const amplitude = amp({x: point.x, y: point.y, i})
    segments.push(
      point.add(0, noise.simplex2(point.x * rate, point.y * rate) * amplitude)
    );
  }

  return segments;
}

// const m1 = meander(
//   new Point(0, height/3),
//   new Point(width, height/2),
//   {amp: ({i}) => i}
// );
// const m2 = meander(
//   new Point(0, height/2),
//   new Point(width, 2*height/3),
//   {noiseRate: ({x}) => x/width * 0.01}
// );
// new Path({
//   segments: m1,
//   strokeColor: 'black'
// });
// new Path({
//   segments: m2,
//   strokeColor: 'black'
// });

function multipleMeanders () {
  const steps = 300;
  const stepSize = height / steps;
  const paths = []
  for (let i = 0; i < steps; i++) {
    const y = i * stepSize;
    const m = meander(
      new Point(0, y),
      new Point(width, y),
      {amp: ({i}) => i}
    );
    paths.push(m);
  }

  const margin = 50;
  const inBounds = (point) => (
    point.x > margin && point.x < width - margin && point.y > margin && point.y < height - margin
  );
  const clippedPaths = clipBounds(inBounds, paths);

  clippedPaths.map(m => {
    new Path({
      segments: m,
      strokeColor: 'black'
    });
  });
}

// multipleMeanders();

function triangleOutline () {

}

triangleOutline();

window.saveAsSvg = function save (name) {
  saveAsSVG(paper.project, name);
}
