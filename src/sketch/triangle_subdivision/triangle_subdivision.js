import paper, { Point, Path } from 'paper';
import { flatten } from 'lodash';
import { map, reduce } from 'common/iterable';
import math from 'mathjs';
import uuid from 'uuid/v1';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, intersects, intersection, radiansToDegrees, gauss, constrain
} from 'common/utils';
import * as dat from 'dat.gui';

const paperSize = STRATH_SMALL.landscape;
const [width, height] = paperSize;
const canvas = createCanvas(paperSize);
paper.setup(canvas);

window.paper = paper;
window.math = math;
window.gauss = gauss;

class LineSegment {

  // static segments = {};

  constructor (p1, p2) {
    // this.id = uuid();
    this.id = LineSegment.genID(p1, p2);
    this.points = [p1, p2];
    this[0] = p1;
    this[1] = p2;
    // LineSegment.segments[this.id] = this;
  }

  static of (p1, p2) {
    return new LineSegment(p1, p2);
  }

  static genID (p1, p2) {
    return p1.x.toString() + p1.y.toString() + p2.x.toString() + p2.y.toString();
  }

  [Symbol.iterator] () {
    return this.points.values();
  }
}

class Triangle {
  constructor (p1, p2, p3) {
    this.points = [p1, p2, p3];
    this.segments = [LineSegment.of(p1, p2), LineSegment.of(p2, p3), LineSegment.of(p3, p1)];
    for (let i = 0; i < 3; i++) {
      this[i] = this.segments[i];
    }
  }

  static of (p1, p2, p3) {
    return new Triangle(p1, p2, p3);
  }

  [Symbol.iterator] () {
    return this.segments.values();
  }

  /**
   * Create a right triangle from a point and the opposite and adjacent lengths.
   */
  static right (point, adjLength=100, oppLength=100) {
    const p1 = new Point(point);
    const p2 = p1.add(0, oppLength);
    const p3 = p1.add(adjLength, 0);
    return Triangle.of(p1, p2, p3);
  }

  /**
   * Mirror a triagle along the given segment.
   * @param {Array} tri - The triangle to mirror.
   * @param {Number} segment - the index of the segment to mirror along.
   */
  static mirror (tri, segment) {
    const surface = tri[segment];
    const [, mirrorPoint] = tri[(segment + 1) % 3];
    const reflectionPoint = surface[0].add(surface[1].subtract(surface[0]).divide(2));
    const vec = reflectionPoint.subtract(mirrorPoint).multiply(2);
    const newPoint = mirrorPoint.add(vec);
    // const triangle = map(tri, segment => map(segment, p => new Point(p)));
    // triangle[(segment + 1) % 3][1] = newPoint;
    // triangle[(segment + 2) % 3][0] = newPoint;
    // return triangle;

    switch (segment) {
      case 0:
        return Triangle.of(surface[0], surface[1], newPoint);
      case 1:
        return Triangle.of(surface[1], newPoint, surface[0]);
      case 2:
        return Triangle.of(newPoint, surface[0], surface[1]);
    }
  }
}

const subdivide = {
  half (triangle, segment=2) {
    const [s1, s2, s3] = triangle;
    const [opp,] = triangle[segment];
    const p = s1[0].add(segmentVector(s1).divide(2));
    const t1 = [[opp, s1[0]], [s1[0], p], [p, opp]];
    const t2 = [[opp, s1[1]], [s1[1], p], [p, opp]];
    return [t1, t2];
  },

  random (triangle, randomFn=math.random, sind) {
    sind = sind || math.randomInt(3);
    const segment = triangle[sind];
    const cornerPoint = triangle[(sind+1) % 3][1];
    const p = segment[0].add(segmentVector(segment).multiply(randomFn()));
    const t1 = Triangle.of(cornerPoint, p, segment[0]);
    const t2 = Triangle.of(cornerPoint, p, segment[1]);
    return [t1, t2];
  }
}

function segmentVector ([p1, p2]) {
  return p2.subtract(p1);
}

function segmentLength (segment) {
  return segmentVector(segment).length;
}

// triangleRow();
randomizedSplitting();

function randomizedSplitting () {
  const props = {
    title: "triangle_subdivision",
    run,
    seed: 0,
    depth: 10,
    gauss_a: 0.5,
    gauss_b: 0.5,
    gauss_c: 0.5,
    stop_chance: 0.05,
    engage_stop: 10,
    save: (name) => {
      saveAsSVG(paper.project, props.title);
    }
  };
  const gui = new dat.GUI();
  gui.add(props, 'title');
  gui.add(props, 'seed');
  gui.add(props, 'depth', 1, 17);
  gui.add(props, 'gauss_a', 0, 2);
  gui.add(props, 'gauss_b', -1, 1);
  gui.add(props, 'gauss_c', 0.001, 3);
  gui.add(props, 'stop_chance', 0, 1);
  gui.add(props, 'engage_stop');
  gui.add(props, 'run');
  gui.add(props, 'save')

  function run () {
    paper.project.clear();
    if (props.seed) {
      math.config({randomSeed: props.seed});
    }

    const marginV = 20;
    const marginH = 20
    const tri1 = Triangle.right([marginH, marginV], width - (marginH * 2), height - (marginV * 2));
    const tri2 = Triangle.mirror(tri1, 1);
    const random = () => constrain(
      gauss(props.gauss_a, props.gauss_b, props.gauss_c, math.random()),
      0.1, 0.9
    );
    const subdiv = (triangle) => {
      const {sind} = reduce((acc, segment, i) => {
        const length = segmentLength(segment);
        return length > acc.max ? {sind: i, max: length} : acc;
      }, triangle, {sind: null, max: -Infinity});
      return subdivide.random(triangle, random, sind);
    }
    const stop = (depth) => {
      if (depth > props.depth) {
        return true;
      } else if (depth >= props.engage_stop) {
        return math.random() < props.stop_chance;
      } else {
        return false;
      }
    }
    // NOTE: Got 'Potential out of memory crash with depth of 20'
    drawTriangles(recursiveSubdivide(subdiv, tri1, stop, 0));
    drawTriangles(recursiveSubdivide(subdiv, tri2, stop, 0));
  }
}

function recursiveSubdivide (subdivide, triangle, stop = () => true, depth = 0) {
  if (!stop(depth)) {
    const [t1, t2] = subdivide(triangle);
    return [
      ...recursiveSubdivide(subdivide, t1, stop, depth+1),
      ...recursiveSubdivide(subdivide, t2, stop, depth+1)
    ]
  } else {
    return [triangle];
  }
}

function triangleRow () {
  const tris = createTriangleRow(15, [10, 10]).map(tri => recursiveSubdivide(subdivide.half, tri, math.randomInt(2, 10)));
  drawTriangles(flatten(tris));

  function createTriangleRow (count, point, hyp=100, adj=100) {
    const tris = [Triangle.right(point, hyp, adj)];
    for (let i = 0; i < count; i++) {
      tris.push(Triangle.mirror(tris[i], (i+1) % 3));
    }
    return tris;
  }
}

function drawTriangles(tris) {
  const drawn = {};
  tris.map(tri => map((segment) => {
    if (!drawn[segment.id]) {
      drawSegment(segment);
      drawn[segment.id] = true;
    }
  }, tri));
}

function triangle (x, y, baseWidth=100, height=100) {
  const p1 = new Point(x, y);
  const p2 = p1.add([baseWidth, 0]);
  const p3 = p1.add(baseWidth/2, height);
  return [[p1, p2], [p2, p3], [p3, p1]];
}

// TODO: Turn subdivided triangles to 3d and transform z with noise.
function in3d () {

}

function drawSegment ([from, to]) {
  return new Path.Line({
    from, to,
    strokeColor: 'black'
  });
}
