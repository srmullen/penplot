import paper, { Point, Path, Group } from 'paper';
import math, { random, randomInt } from 'mathjs';
import { sortBy } from 'lodash';
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
// const PAPER_SIZE = A4.landscape
const PAPER_SIZE = STRATH_SMALL.landscape;
const [width, height] = PAPER_SIZE;
const canvas = createCanvas(PAPER_SIZE);
paper.setup(canvas);

const seed = randomInt(2000);
// const seed = 1456;
console.log(seed);
noise.seed(seed);
math.config({ randomSeed: seed });

const H_MARGIN = 30;
const V_MARGIN = 50;
const BOUNDS = {
  top: V_MARGIN,
  left: H_MARGIN,
  bottom: height - V_MARGIN,
  right: width - H_MARGIN
};

function inBounds(point) {
  return point.x > BOUNDS.left && point.x < BOUNDS.right && point.y > BOUNDS.top && point.y < BOUNDS.bottom;
}

/**
 * Creates mountainous craggy points between p1 and p2.
 * @param {Point} p1 
 * @param {Point} p2 
 * @param {number} nPoints 
 */
function crags(p1, p2, opts={}) {
  const { 
    nPoints = 3,
    upheaval = () => [0, random(-15, 15)]
  } = opts;
  const points = [];
  const dist = p1.getDistance(p2) / nPoints + 1;
  const vec = p2.subtract(p1).normalize();
  for (let i = 1; i < nPoints; i++) {
    const point = p1.add(vec.multiply(dist * i)).add(upheaval());
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

// TODO: Add a way to stop ridge if it is outside of the mountain.
function createRidge (from, to, opts={}) {
  const ridge = [from];
  let vector = to.subtract(from);
  const {
    nSwitchbacks = 5,
    inBounds = () => true
  } = opts;
  const size = vector.length / nSwitchbacks;
  vector = vector.normalize();
  for (let i = 0; i < nSwitchbacks; i++) {
    const prev = ridge[ridge.length - 1];
    const switchback = prev.add(vector.multiply(size).rotate(opts.rotation()));
    if (!inBounds(switchback)) {
      return ridge;
    }
    ridge.push(switchback);
  }
  return ridge;
}

class Mountain {
  constructor (base, peak, segments) {
    this.base = base;
    this.peak = peak;
    this.segments = segments;
    this.ridges = [];
    this.bounds = getBounds(segments);
  }
  
  /**
   * @param {Point} base - the Mountain center.
   */
  static triangleMountain(base, opts = {}) {
    const {
      elevation = new Point(0, 100)
    } = processOptions(opts);
    const spanLeft = opts.spanLeft || opts.span;
    const spanRight = opts.spanRight || opts.span;

    // Create the points
    const peak = base.subtract(elevation);
    const left = base.subtract(spanLeft());
    const right = base.add(spanRight());
    const leftMid = left.add(peak.subtract(left).divide(2)).add([0, elevation.y / 4]);
    const rightMid = peak.add(right.subtract(peak).divide(2)).add([0, elevation.y / 4]);

    const points = [left, leftMid, peak, rightMid, right];

    // Create the outline of the mountain
    const segments = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      for (let crag of crags(p1, p2, {nPoints: 10, upheaval: () => [0, random(-5, 5)]})) {
        segments.push(crag);
      }
      segments.push(p2);
    }

    const mountain = new Mountain(base, peak, segments);

    mountain.createRidges(1);

    return mountain;
  }

  createRidges (nRidges = 1) {
    // Create a ridge on the mountain face.
    // const genFromPoint = () => new Point(
    //   random(this.bounds.left, this.bounds.right),
    //   random(this.bounds.top, this.bounds.bottom)
    // );
    const genFromPoint = () => new Point(
      random(this.peak.x - 25, this.peak. x + 25),
      random(this.peak.y, this.peak.y + 25)
    );
    const genToPoint = () => {
      return new Point(
        // random(this.segments[0].x, this.segments[this.segments.length-1].x),
        random(this.base.x - 100, this.base.x + 100),
        this.base.y
      );
    }
    const ridges = [];
    for (let i = 0; i < nRidges; i++) {
      // const from = this.peak.add(random(5, 10), random(5, 15));
      // const to = this.base;
      const from = this.getRandomMountainPoint(genFromPoint);
      const to = this.getRandomMountainPoint(genToPoint)
      const ridge = createRidge(from, to, {
        rotation: () => random(-25, 25),
        inBounds: (point) => {
          return this.contains(point);
        }
      });
      
      // TODO: clip ridges - Should abstract out common functionality with cleaveSegments.
      // const clipped = clipRidge(ridge, ridges);
      ridges.push(ridge);
    }

    this.ridges = ridges;
  }

  /**
   * Uses genPoint to create a point and doesn't return until a point is contained in the mountain.
   * @param {() => Point)} genPoint 
   */
  getRandomMountainPoint (genPoint) {
    let point = genPoint();
    let i = 0;
    while (!this.contains(point)) {
      if (i > 100) { // protect against infinate loop.
        return;
      }
      point = genPoint();
    }
    return point;
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
      const intersections = p1.getIntersections(p2);
      p1.remove();
      p2.remove();
      if (intersections.length) {
        return intersections.map(intersect => intersect.point);
      }
    }
  }

  /**
   * true if the point is contained within the mountain.
   * This assumes the point has a greater depth than the mountain.
   * @param {Point} point 
   */
  contains(point) {
    if (
      point.x > this.bounds.right || 
      point.x < this.bounds.left ||
      point.y < this.bounds.top // Ignore the bottom because everything below the mountain ill be hidden.
    ) {
      return false;
    } else if (point.y >= this.bounds.bottom) {
      return true;
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

function twoMountains () {
  const tool = new paper.Tool();

  let m1 = Mountain.triangleMountain(
    new Point(width / 2, height / 2 + 100),
    {
      elevation: new Point(0, 100),
      span: () => [120, 0]
    }
  );
  let m2 = Mountain.triangleMountain(
    // new Point(width / 2 + 100, height / 2 + 100),
    new Point(581, 416),
    {
      elevation: () => new Point(0, 100),
      span: () => [100, 0]
    }
  );
  let m1Group = draw(m1, [], { strokeColor: 'blue' });
  let m2Group = draw(m2, [m1], { strokeColor: 'red' });

  tool.onMouseDrag = (event) => {
    m1Group.remove();
    m2Group.remove();
    m2 = Mountain.triangleMountain(
      event.point,
      {
        elevation: () => new Point(0, 100),
        span: () => [100, 0]
      }
    );
    m1Group = draw(m1, [], { strokeColor: 'blue' });
    m2Group = draw(m2, [m1], { strokeColor: 'red' });
  }

  tool.onMouseUp = (event) => {
    console.log(`x: ${event.point.x}, y: ${event.point.y}`);
  }
}

function threeMountains () {
  const m1 = Mountain.triangleMountain(
    new Point(width / 2, height / 2 + 100),
    {
      elevation: () => new Point(random(-50, 50), random(90, 110)),
      span: () => [120, random(-10, 10)]
    }
  );
  const m2 = Mountain.triangleMountain(
    new Point(width / 2 + 100, height / 2 + 100),
    {
      elevation: () => new Point(random(-10, 10), random(90, 110)),
      span: () => [random(40, 60), 0]
    }
  );
  const m3 = Mountain.triangleMountain(
    new Point(width / 2 - 100, height / 2 + 100),
    {
      elevation: () => new Point(random(-10, 10), random(90, 110)),
      span: () => [150, 0]
    }
  );
  
  draw(m1, [m2, m3]);
  draw(m2, [m3]);
  draw(m3);  
}

function mountainRange (nMountains=5) {
  let mountains = [];
  for (let i = 0; i < nMountains; i++) {
    const x = 100 + random(width - 100);
    const y = random(height/3, height - height/5);
    const mountain = Mountain.triangleMountain(
      new Point(x, y),
      {
        elevation: () => new Point(random(-10, 10), random(50, 120)),
        span: () => [random(90, 130), random(-10, 10)]
      }
    );
    mountains.push(mountain);
  }

  // sort mountains from front to back.
  mountains = sortBy(mountains, mountain => -mountain.base.y)

  const colors = ['black', 'red', 'green', 'blue', 'brown'];
  mountains.reduce((foreground, mountain, i) => {
    draw(mountain, foreground, {strokeColor: 'black'});
    return foreground.concat(mountain);
  }, []);


}

// twoMountains();
// threeMountains();
mountainRange(25);

function cleaveMountain(mountainSegments, foreground=[]) {
  let segments = mountainSegments;
  let ret = [];
  for (let foothill of foreground) {
    for (let segment of segments) {
      const cleaved = cleaveSegments(segment, foothill);
      for (let cleave of cleaved) {
        ret.push(cleave);
      }
    }
    segments = ret;
    ret = [];
  }
  return segments;
}

function cleaveSegments (segments, m2) {
  const cleaved = []; // cleaved is an array of arrays of all points that need to be drawn.
  let visible = []; // visible are the points that need to be drawn.
  const obscured = segments.map(point => m2.contains(point));
  if (!obscured[0]) {
    visible.push(segments[0]);
  }
  for (let i = 1; i < obscured.length; i++) {
    if (obscured[i - 1] && !obscured[i]) { // first point is obscured
      const intersections = m2.getIntersections(segments[i - 1], segments[i]);
      const intersection = intersections ? intersections[0] : null;
      if (intersection) {
        visible.push(intersection);
      }
      visible.push(segments[i]);
    } else if (!obscured[i - 1] && obscured[i]) { // second point is obscured
      const intersections = m2.getIntersections(segments[i - 1], segments[i]);
      const intersection = intersections ? intersections[0] : null;
      if (intersection) {
        visible.push(intersection);
      }
      // start a new list of segments
      cleaved.push(visible);
      visible = [];
    } else if (!obscured[i - 1] && !obscured[i]) {
      visible.push(segments[i]);
    } else {
      // both segments are obscured. Don't use either of them.
    }
  }
  if (visible.length) {
    cleaved.push(visible);
  }
  return cleaved;
}

function drawRidge (mountain, foreground) {
  const ridges = cleaveMountain(mountain.ridges, foreground);
  const clipped = clipBounds(inBounds, ridges);
  const children = clipped.map(ridge => new Path({
    segments: ridge,
    strokeColor: 'black'
  }))
  return children;
}

function draw (mountain, foreground=[], opts={}) {
  const segments = cleaveMountain([mountain.segments], foreground);

  const children = [];
  const clipped = clipBounds(inBounds, segments);
  clipped.forEach(segment => {
    children.push(new Path({
      segments: segment,
      strokeColor: 'black',
      ...opts
    }));
  });

  const ridges = drawRidge(mountain, foreground);
  for (let ridge of ridges) {
    children.push(ridge);
  }

  // TODO
  // - shading
  // - generation and variation
  return new Group({
    children
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
