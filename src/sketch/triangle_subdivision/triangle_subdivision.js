import paper, { Point, Path } from 'paper';
import { flatten } from 'lodash';
import math from 'mathjs';
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

class Triangle {
  constructor (p1, p2, p3) {
    this.segments = [[p1, p2], [p2, p3], [p3, p1]];
  }

  static of (p1, p2, p3) {
    return new Triangle(p1, p2, p3);
  }

  /**
   * Create a right triangle from a point and the opposite and adjacent lengths.
   */
  static right (point, adjLength=100, oppLength=100) {
    const p1 = new Point(point);
    const p2 = p1.add(0, oppLength);
    const p3 = p1.add(adjLength, 0);
    // return Triangle.of(p1, p2, p3);

    const opposite = [p1, p2];
    const hypotenuse = [p2, p3];
    const adjacent = [p3, p1];
    return [opposite, hypotenuse, adjacent];
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
    const triangle = tri.map(segment => segment.map(p => new Point(p)));
    triangle[(segment + 1) % 3][1] = newPoint;
    triangle[(segment + 2) % 3][0] = newPoint;
    return triangle;
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
    const t1 = [[cornerPoint, p], [p, segment[0]], [segment[0], cornerPoint]];
    const t2 = [[cornerPoint, p], [p, segment[1]], [segment[1], cornerPoint]];
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
    const tri1 = Triangle.right([10, 10], width-20, height-20);
    const tri2 = Triangle.mirror(tri1, 1);
    const random = () => constrain(
      gauss(props.gauss_a, props.gauss_b, props.gauss_c, math.random()),
      0.1, 0.9
    );
    const subdiv = (triangle) => {
      const {sind} = triangle.reduce((acc, segment, i) => {
        const length = segmentLength(segment);
        return length > acc.max ? {sind: i, max: length} : acc;
      }, {sind: null, max: -Infinity});
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
  tris.map(tri => tri.map(drawSegment));
}

function triangle (x, y, baseWidth=100, height=100) {
  const p1 = new Point(x, y);
  const p2 = p1.add([baseWidth, 0]);
  const p3 = p1.add(baseWidth/2, height);
  return [[p1, p2], [p2, p3], [p3, p1]];
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

// function recursiveSubdivide (subdivide, triangle, depth, stop = () => false) {
//   if (depth > 0 && !stop(depth)) {
//     const [t1, t2] = subdivide(triangle);
//     return [
//       ...recursiveSubdivide(subdivide, t1, depth-1, stop),
//       ...recursiveSubdivide(subdivide, t2, depth-1, stop)
//     ]
//   } else {
//     return [triangle];
//   }
// }

// TODO: Turn subdivided triangles to 3d and transform z with noise.
function in3d () {

}

function drawSegment ([from, to]) {
  return new Path.Line({
    from, to,
    strokeColor: 'black'
  });
}
