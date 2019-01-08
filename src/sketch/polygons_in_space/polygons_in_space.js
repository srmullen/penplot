import paper, { Point, Path } from 'paper';
import dat from 'dat.gui';
import Camera from 'common/Camera';
import { STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, intersects, intersection, radiansToDegrees
} from 'common/utils';
import math, { random, matrix } from 'mathjs';
import { vec3, rotationXMatrix, rotationYMatrix, rotationZMatrix } from 'common/matrix';

const [width, height] = STRATH_SMALL.landscape;
const canvas = createCanvas(STRATH_SMALL.landscape);

paper.setup(canvas);
window.paper = paper;
window.math = math;

/*
The goal of this project is to use the pinhole camera to produce ascetically pleasing
polygons (triangles) with a sense of depth.
*/

class Polygon {
  constructor (points = [], props={}) {
    this.points = points;
    this.props = props;
  }

  normal () {
    const p0 = this.points[0];
    const p1 = this.points[1]
    return math.cross([p0[0], p0[1], p0[2]], [p1[0], p1[1], p1[2]]);
  }
}

/**
 * @param {Point} p - The point on the canvas to compute.
 * @param {Vec3} v1
 * @param {Vec3} v2
 */
// function edge (p, v1, v2) {
//   return (v2.x - p.x) * (v1.y - p.y) - (v2.y - p.y) * (v1.x - p.x);
// }

function edge (p, v1, v2) {
  return (v2[0] - p[0]) * (v1[1] - p[1]) - (v2[1] - p[1]) * (v1[0] - p[0]);
}

function depthBufferTest () {
  const gui = new dat.GUI();
  const props = {
    focalLength: 35,
    nearClippingPlane: 1
  };
  gui.add(props, 'focalLength').onChange(prop => camera.setProps({focalLength: prop}));
  gui.add(props, 'nearClippingPlane').onChange(prop => camera.setProps({nearClippingPlane: prop}));

  const camera = new Camera({imageWidth: width, imageHeight: height});
  camera.look([0, 0, -18], [0, 0, 0]);

  function run () {
    new Path.Circle({
      center: camera.computePixelCoordinates([0, 0, 0, 1])[1],
      radius: 2,
      fillColor: 'red'
    });

    const p1 = new Polygon([vec3(1, 1, 4), vec3(2, 2, 4), vec3(3, 1, 1)], {color: 'red'});
    const p2 = new Polygon([vec3(0, 1, 3), vec3(3, 2, 3), vec3(2, 0, 3)], {color: 'green'});
    const polygons = [p1, p2];
    const points1 = drawTriangle(camera, p1);
    const points2 = drawTriangle(camera, p2);
    depthBuffer(polygons);

    paper.view.onMouseDown = (event) => {
      for (let i = 0; i < polygons.length; i++) {
        const points = getRasterPoints(camera, polygons[i]);
        const area = edge(...points);
        const [p0, p1, p2] = points;
        const point = [event.point.x, event.point.y];
        // const w0 = edge(p1, p2, point);
        // const w1 = edge(p2, p0, point);
        // const w2 = edge(p0, p1, point);
        const w0 = edge(point, p1, p2);
        const w1 = edge(point, p2, p0);
        const w2 = edge(point, p0, p1);
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
          // const oneOverZ = p0[2] * (w0 / area) + p1[2] * (w1 / area) + p2[2] * (w2 / area);
          // const z = 1 / oneOverZ;
          const z = p0[2] * (w0 / area) + p1[2] * (w1 / area) + p2[2] * (w2 / area);
          console.log(`${polygons[i].props.color}: ${z}`);
        } else {
          console.log('outside');
        }
        // console.log(area, triangleArea(...points1), w0, w1, w2);
      }
    }
  }

  function depthBuffer (polygons) {
    const buffer = [];
    const size = width * height;
    for (let i = 0; i < size; i++) {
      buffer.push({z: Infinity});
    }
    // polygons.map(p => console.log(p.normal()));
    const vertices = polygons.map(polygon => {
      return getRasterPoints(camera, polygon);
    });
    vertices.forEach((points, i) => {
      const poly = polygons[i];
      const [p0, p1, p2] = points;
      const xs = [];
      const ys = [];
      points.forEach(([x, y]) => {
        xs.push(x);
        ys.push(y);
      });
      const xmin = math.min(xs);
      const ymin = math.min(ys);
      const xmax = math.max(xs);
      const ymax = math.max(ys);
      const area = edge(...points);
      for (let y = ymin; y < ymax; y++) {
        for (let x = xmin; x < xmax; x++) {
          const w0 = edge([x, y], p1, p2);
          const w1 = edge([x, y], p2, p0);
          const w2 = edge([x, y], p0, p1);
          if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
            // inside the triangle
            // const oneOverZ = p0[2] * (w0 / area) + p1[2] * (w1 / area) + p2[2] * (w2 / area);
            // const z = 1 / oneOverZ;
            const z = p0[2] * (w0 / area) + p1[2] * (w1 / area) + p2[2] * (w2 / area);

            if (z < buffer[y * width + x].z) {
              buffer[y * width + x].z = z;
              buffer[y * width + x].color = poly.props.color;
            }
          }
        }
      }
    });

    const dots = [];
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i]) {
        const x = i % width;
        const y = Math.floor(i / width);
        const dot = new Path.Circle({
          fillColor: buffer[i].color,
          radius: 1,
          center: [x, y]
        });
        dots.push(dot);
      }
    }
  }

  const navigation = new paper.Tool();
  const keys = {};
  navigation.onKeyDown = (event) => {
    keys[event.key] = true;
  }
  navigation.onKeyUp = (event) => {
    keys[event.key] = false;
  }

  // paper.view.onFrame = () => {
  //   paper.project.clear();
  //   updateCamera(camera, keys);
  //   run()
  // }

  run();
}

function getRasterPoints (camera, polygon) {
  return polygon.points.map(point => {
    const [visible, pixel] = camera.computePixelCoordinates(point.toArray());
    return pixel;
  });
}

function drawTriangle (camera, polygon) {
  const points = polygon.points.map(point => {
    const [visible, pixel] = camera.computePixelCoordinates(point.toArray());
    // console.log(visible, pixel[2]);
    // return new Point(pixel);
    return pixel;
  });

  // new Path({
  //   strokeColor: 'black',
  //   segments: points,
  //   closed: true
  // });

  const colors = ['red', 'green', 'blue'];
  const triPaths = [];
  for (let i = 0; i < 3; i++) {
    const [fromx, fromy] = points[i];
    const [tox, toy] = points[(i + 1) % 3];
    const path = new Path.Line({
      from: [fromx, fromy],
      to: [tox, toy],
      strokeColor: colors[i]
    });
    triPaths.push(path);
  }
  // return triPaths;
  return points;
}



function updateCamera (camera, keys) {
  let x = 0;
  let y = 0;
  let z = 0;
  if (keys['up']) {
    z -= 0.01;
  }
  if (keys['down']) {
    z += 0.01
  }
  if (keys['left']) {
    x -= 0.01
  }
  if (keys['right']) {
    x += 0.01
  }
  if (keys['shift']) {
    camera.rotate(x, y, z);
  } else {
    camera.translate(x, y, z);
  }
}

function triangleArea (p1, p2, p3) {
  return (p1[0] * (p2[1] - p3[1]) + p2[0] * (p3[1] - p1[1]) + p3[0] * (p1[1] - p2[1])) / 2;
}

window.triangleArea = triangleArea;

depthBufferTest();
