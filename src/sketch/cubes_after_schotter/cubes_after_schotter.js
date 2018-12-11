import paper, { Point, Path } from 'paper';
import { sortBy } from 'lodash';
import Camera from 'common/Camera';
import { difference } from 'common/polybool';
import { A4, createCanvas } from 'common/setup';
import {
  saveAsSVG, intersects, intersection, radiansToDegrees
} from 'common/utils';
import math, { random, matrix } from 'mathjs';
import { vec3, rotationXMatrix, rotationYMatrix, rotationZMatrix } from 'common/matrix';

// const seed = Math.floor(Math.random() * 1000);
// console.log(seed);
// math.config({randomSeed: seed});

class Box {
  constructor (width, height, depth) {
    this.width = width;
    this.height = height;
    this.depth = depth;
  }

  /**
   * Calculate the 8 points of a box where the top-left-forward corner is [0, 0, 0].
   * @param {Box}
   */
  static getVertices (box) {
    const { width, height, depth } = box;
    const tlf = vec3(0, 0, 0);
    const trf = math.add(tlf, [width, 0, 0, 0]);
    const brf = math.add(trf, [0, height, 0, 0]);
    const blf = math.add(brf, [-width, 0, 0, 0]);

    const tlb = math.add(tlf, [0, 0, depth, 0]);
    const trb = math.add(tlb, [width, 0, 0, 0]);
    const brb = math.add(trb, [0, height, 0, 0]);
    const blb = math.add(brb, [-width, 0, 0, 0]);

    return [tlf, trf, brf, blf, tlb, trb, brb, blb];
  }

  /**
   * @param {Box} box
   * @param { Matrix } camera - 4x4 matrix camera-to-world matrix.
   */
  static toScreenSpace (vertices, camera) {
    const mat = camera.matrix;
    const fl = camera.focalLength;
    const points = vertices.map(vertex => {
      const v = math.multiply(vertex, mat);
      const z = v.get([2]);
      const perspective = fl / (z + fl);
      const x = v.get([0]) * perspective;
      const y = v.get([1]) * perspective;
      // z is included for potentially handling overlapping planes.
      return matrix([x, y, z]);
    });

    return points;
  }

  static getPlanes (box) {
    const [tlf, trf, brf, blf, tlb, trb, brb, blb] = this.getVertices(box);
    const top = [tlf, trf, trb, tlb];
    const bottom = [blf, brf, brb, blb];
    const left = [tlf, blf, blb, tlb];
    const right = [trf, brf, brb, trb];
    const front = [tlf, trf, brf, blf];
    const back = [tlb, trb, brb, blb];

    return { top, bottom, left, right, front, back };
  }

  static toPoints (box, point=[0, 0, 0, 0]) {
    const focalLength = point[2];
    const vertices = Box.getVertices(box);
    return vertices.map((vertex) => {
      const z = vertex.get([2]);
      const perspective = (focalLength / (focalLength + z));
      const x = (vertex.get([0]) + point[0]) * perspective;
      const y = (vertex.get([1]) + point[1]) * perspective;
      return new Point(x, y);
    });
  }

  static draw (points) {
    const group = new paper.Group({
      strokeColor: 'black'
    });

    const [tlf, trf, brf, blf, tlb, trb, brb, blb] = points.map(m => m.toArray());
    const strokeColor = 'black';
    // forward plane
    group.addChild(new Path.Line({from: tlf, to: trf, strokeColor}));
    group.addChild(new Path.Line({from: trf, to: brf, strokeColor}));
    group.addChild(new Path.Line({from: brf, to: blf, strokeColor}));
    group.addChild(new Path.Line({from: blf, to: tlf, strokeColor}));

    // back plane
    group.addChild(new Path.Line({from: tlb, to: trb, strokeColor}));
    group.addChild(new Path.Line({from: trb, to: brb, strokeColor}));
    group.addChild(new Path.Line({from: brb, to: blb, strokeColor}));
    group.addChild(new Path.Line({from: blb, to: tlb, strokeColor}));

    // front-back connections
    group.addChild(new Path.Line({from: tlf, to: tlb, strokeColor}));
    group.addChild(new Path.Line({from: trf, to: trb, strokeColor}));
    group.addChild(new Path.Line({from: brf, to: brb, strokeColor}));
    group.addChild(new Path.Line({from: blf, to: blb, strokeColor}));

    return group;
  }
}

const [width, height] = A4.portrait;
const canvas = createCanvas(A4.portrait);

paper.setup(canvas);
window.paper = paper;
window.math = math;
window.matrix = matrix;

const focalLength = 200;
const columns = 13;
const rows = 18;
const size = width / rows;
const box = new Box(size, size, size);
const marginTop = (size/2 + 100);
const marginLeft = (size/2 + 100);

const translation = matrix([
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [-size/2, -size/2, -size/2, 0]
]);

function hollowCubes () {
  for (let i = 0; i < columns; i++) {
    for (let j = 0; j < rows; j++) {
      const min = (j / rows) * -math.PI/4;
      const max = (j / rows) * math.PI/4;
      const rotationX = rotationXMatrix(random(min, max));
      const rotationY = rotationYMatrix(random(min, max));
      const rotationZ = rotationZMatrix(random(min, max));

      const camera = new Camera(focalLength);
      camera.rotate(rotationX);
      camera.rotate(rotationY);
      camera.rotate(rotationZ);

      const points = Box.toScreenSpace(
        Box.getVertices(box),
        camera
      );
      const b = Box.draw(points);

      b.translate(
        marginTop + i * size + random((j/rows) * -15, (j/rows) * 15),
        marginLeft + j * size + random((j/rows) * -20, (j/rows) * 50)
      );
    }
  }
}

function solidCubes () {
  // const camera = new Camera();
  // const group = drawSolidBox(box, camera);
  // group.translate(width/2, height/2);
  const boxes = [];
  for (let i = 0; i < columns; i++) {
    const row = [];
    for (let j = 0; j < rows; j++) {
      const min = (j / rows) * -math.PI/4;
      const max = (j / rows) * math.PI/4;
      const rotationX = rotationXMatrix(random(min, max));
      const rotationY = rotationYMatrix(random(min, max));
      const rotationZ = rotationZMatrix(random(min, max));

      const camera = new Camera(focalLength);
      camera.rotate(rotationX);
      camera.rotate(rotationY);
      camera.rotate(rotationZ);

      const translateX = marginTop + i * size + random((j/rows) * -15, (j/rows) * 15);
      const translateY = marginLeft + j * size + random((j/rows) * -20, (j/rows) * 50);

      const planes = getBoxPlanes(box, camera);
      const tplanes = planes.map(plane => plane.map(([x, y]) => {
        return [x + translateX, y + translateY];
      }));
      row.push(tplanes);
    }
    boxes.push(row);
  }

  // FIXME: I think this is not working because all points are being diffed
  // before translated.
  const drawn = [];
  for (let i = boxes.length - 1; i >= 0; i--) {
    const row = boxes[i];
    for (let j = 0; j < row.length; j++) {
      const group = new paper.Group();
      const planes = row[j];
      for (let p = 0; p < planes.length; p++) {
        const plane = planes[p];
        const diff = drawn.reduce((acc, p) => {
          const d = difference(acc, p);
          return d.regions[0] || [];
        }, plane);
        if (diff && diff.length) {
          const path = drawSolidPlane(diff);
          drawn.push(diff);
          group.addChild(path);
        }

      }
    }
  }
}

function getBoxPlanes (box, camera) {
  const planes = sortPolygons(Object.values(Box.getPlanes(box)).map(plane => {
    return Box.toScreenSpace(plane, camera);
  }));
  const diffs = [];
  // const group = new paper.Group();
  for (let i = 0; i < planes.length; i++) {
    const plane = planes[i];
    const points = plane.map(mat => {
      const ar = mat.toArray();
      return [ar[0], ar[1]];
    });
    const diff = diffs.reduce((acc, p) => {
      const d = difference(acc, p);
      return d.regions[0] || [];
    }, points);
    if (diff && diff.length) {
      diffs.push(diff);
    }
  }

  return diffs;
}

/**
 * Sort the given polygons by their front most point. i.e. the minimum z value.
 * @param {Array} - Array of polygons.
 */
function sortPolygons (polygons) {
  return sortBy(polygons, (polygon) => {
    const zs = polygon.map(mat => mat.get([2]));
    // return math.min(zs);
    return math.sum(zs) / zs.length;
  });
}

function drawSolidPlane (points) {
  const segments = [...points, points[0]];
  const planePath = new Path({
    strokeColor: 'black',
    segments
  });
  return planePath;
}

// hollowCubes();
solidCubes();

window.saveAsSVG = (name) => {
  saveAsSVG(paper.project, name);
}
