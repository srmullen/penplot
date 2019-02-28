import paper, { Point, Path } from 'paper';
import { sortBy } from 'lodash';
import dat from 'dat.gui';
import { difference } from 'common/polybool';
import Camera from 'common/Camera';
import { A4, createCanvas } from 'common/setup';
import {
  saveAsSVG, intersects, intersection, radiansToDegrees
} from 'common/utils';
import math, { random, matrix } from 'mathjs';
import { vec3, rotationXMatrix, rotationYMatrix, rotationZMatrix } from 'common/matrix';

const [width, height] = A4.landscape;
const canvas = createCanvas(A4.landscape);

paper.setup(canvas);
window.paper = paper;
window.math = math;

class Box {
  constructor (width, height, depth, pos=[0, 0, 0]) {
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.pos = pos;
  }

  get x () {
    return this.pos[0];
  }

  set x (val) {
    this.pos[0] = val;
  }

  get y () {
    return this.pos[1];
  }

  set y (val) {
    this.pos[1] = val;
  }

  get z () {
    return this.pos[2];
  }

  set z (val) {
    this.pos[2] = val;
  }

  /**
   * Calculate the 8 points of a box where the top-left-forward corner is [0, 0, 0].
   * @param {Box}
   */
  static getVertices (box) {
    const { width, height, depth } = box;
    const tlf = vec3(...box.pos);
    const trf = math.add(tlf, [width, 0, 0, 0]);
    const brf = math.add(trf, [0, height, 0, 0]);
    const blf = math.add(brf, [-width, 0, 0, 0]);

    const tlb = math.add(tlf, [0, 0, depth, 0]);
    const trb = math.add(tlb, [width, 0, 0, 0]);
    const brb = math.add(trb, [0, height, 0, 0]);
    const blb = math.add(brb, [-width, 0, 0, 0]);
    // First letter: t = top, b = bottom
    // Second letter: l = left, r = right
    // Last letter: f = front, b = back
    return [tlf, trf, brf, blf, tlb, trb, brb, blb];
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

  static getPlanePath (plane, camera) {
    const points = this.toScreenSpace(plane, camera);
    return new Path({
      strokeColor: 'black',
      segments: points.map(matrixToPoint),
      closed: true
    });
  }

  static draw (box, camera) {
    const points = this.toScreenSpace(
      this.getVertices(box),
      camera
    );
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

// const camera = new Camera(
//   1500,
//   // math.multiply(math.add(math.identity(4), translation), rotationXMatrix(Math.PI / 5), rotationYMatrix(Math.PI / 5))
//   math.add(math.identity(4), translation)
// );

const colors = {
  top: 'red',
  bottom: 'red',
  left: 'green',
  right: 'green',
  front: 'blue',
  back: 'blue'
};

const layers = {
  red: new paper.Layer({name: 'red'}),
  green: new paper.Layer({name: 'green'}),
  blue: new paper.Layer({name: 'blue'})
};

window.layers = layers;

function matrixToPoint (mat) {
  const [x, y, z] = mat.toArray();
  return new Point(x, y);
}

function hatchedBoxExample () {
  const size = 200;
  const box = new Box(size, size, size);

  const translation = matrix([
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [-size/2, -size/2, -size/2, 0]
  ]);

  const camera = new Camera(
    700,
    math.multiply(math.add(math.identity(4), translation), rotationXMatrix(Math.PI / 5), rotationYMatrix(Math.PI / 5))
  );

  drawHatchedBox(box, camera);
}

function drawHatchedBox (box, camera) {
  const planes = Box.getPlanes(box);
  for (let name in planes) {
    const plane = planes[name];
    const color = colors[name];
    layers[color].activate();
    const group = drawPlaneHatching(plane, camera, {color});
    group.translate(width/2, height/2);
  }
}

function solidBoxExample () {
  const size = 200;
  const box = new Box(size, size, size, [200, 300, 0]);

  const translation = matrix([
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [-size/2, -size/2, -size/2, 0]
  ]);

  // const translation = matrix([
  //   [0, 0, 0, 0],
  //   [0, 0, 0, 0],
  //   [0, 0, 0, 0],
  //   [size, size/2, size/2, 0]
  // ]);

  const camera = new Camera(
    700,
    math.multiply(math.add(math.identity(4), translation), rotationXMatrix(Math.PI / 5), rotationYMatrix(Math.PI / 5))
  );

  // const camera = new Camera(
  //   1500,
  //   // math.multiply(math.add(math.identity(4), translation), rotationXMatrix(Math.PI / 5), rotationYMatrix(Math.PI / 5))
  //   math.add(math.identity(4), translation)
  // );

  drawSolidBox(box, camera);
}

function drawSolidBox (box, camera) {
  const planes = sortPolygons(Object.values(Box.getPlanes(box)).map(plane => {
    return Box.toScreenSpace(plane, camera);
  }));
  const diffs = [];
  const group = new paper.Group();
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
      const path = drawSolidPlane(diff);
      group.addChild(path);
    }
  }

  // group.translate(width/2, height/2);
  return group;
}

/**
 * Sort the given polygons by their front most point. i.e. the minimum z value.
 * @param {Array} - Array of polygons.
 */
// FIXME: Need to sort by distance from camera position, not just the z position.
// This would break if camera look from opposite direction.
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

function drawPlaneHatching (plane, camera, {color='black'}={}) {
  const group = new paper.Group();
  const points = Box.toScreenSpace(plane, camera).map(matrixToPoint);
  const planePath = Box.getPlanePath(plane, camera);
  const disection = points[2].subtract(points[0]);
  const disectionLength = disection.length;

  const nLines = 50;
  const step = disectionLength / nLines;

  // const step = 5;
  // const nLines = Math.ceil(disectionLength / step);

  const disectionVector = disection.normalize().multiply(step);
  const vec = new Point({
    length: 1,
    angle: disectionVector.getAngle() + 90
  });
  const center = points[0];
  const trace = new Path.Line({
    from: center.subtract(vec.multiply(width)),
    to: center.add(vec.multiply(width))
  });
  const paths = [];
  for (let i = 0; i < nLines; i++) {
    trace.translate(disectionVector);
    const intersections = trace.getIntersections(planePath);
    if (intersections.length === 2) {
      paths.push(new Path.Line({
        strokeColor: color,
        from: intersections[0].point,
        to: intersections[1].point
      }));
    }
  }
  trace.remove();
  planePath.remove();
  group.addChildren(paths);
  return group;
}

function animateSolidBoxExample () {
  const size = 200;
  const box = new Box(size, size, size);

  const translation = matrix([
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [-size/2, -size/2, -size/2, 0]
  ]);

  const camera = new Camera(
    700,
    math.multiply(math.add(math.identity(4), translation), rotationXMatrix(Math.PI / 5), rotationYMatrix(Math.PI / 5))
  );

  animateSolidBox(box, camera);
}

function animateSolidBox (box, camera) {
  let group = new paper.Group();
  paper.view.onFrame = () => {
    group.remove();
    camera.rotate(0.01, 0.01, 0.01);
    group = drawSolidBox(box, camera);
  }
}

function animateHatchedBoxExmaple () {
  paper.view.onMouseDown = () => {
    if (paper.view._animate) {
      paper.view.pause();
      console.log(camera);
    } else {
      paper.view.play();
    }
  }

  const size = 200;
  const box = new Box(size, size, size);

  const translation = matrix([
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [-size/2, -size/2, -size/2, 0]
  ]);

  const camera = new Camera(
    700,
    math.multiply(math.add(math.identity(4), translation), rotationXMatrix(Math.PI / 5), rotationYMatrix(Math.PI / 5))
  );

  animateHatchedBox(box, camera);
}

function animateHatchedBox (box, camera) {
  const planes = Box.getPlanes(box, camera);
  let group = new paper.Group();
  paper.view.onFrame = () => {
    group.remove();
    group = new paper.Group();
    camera.rotate(0.01, 0.01, 0.03);
    for (let name in planes) {
      const plane = planes[name];

      group.addChild(drawPlaneHatching(plane, camera, {color: colors[name]}));
    }
    group.translate(width/2, height/2);
  }
}

window.saveAsSVG = (name) => {
  saveAsSVG(paper.project, name);
}

function testCameraControl () {
  const props = {
    camRotateX: 0,
    camRotateY: 0,
    camRotateZ: 0,
    rotateCamera,
    fromX: 0,
    fromY: 0,
    fromZ: 0,
    toX: 0,
    toY: 0,
    toZ: 0,
    look,
    focalLength: 700
  };

  paper.view.translate(width/2, height/2);

  const size = 2;
  const box = new Box(size, size, size, [0, 0, 50]);

  const camera = new Camera(
    props.focalLength,
    // math.multiply(math.add(math.identity(4), translation), rotationXMatrix(Math.PI / 5), rotationYMatrix(Math.PI / 5))
    // math.add(math.identity(4), translation)
  );

  function rotateCamera () {
    camera.rotate(props.camRotateX, props.camRotateY, props.camRotateZ);
  }

  function look () {
    camera.look(
      [props.fromX, props.fromY, props.fromZ],
      [props.toX, props.toY, props.toZ]
    );
  }

  const gui = new dat.GUI();
  controlBox(gui, box);
  gui.add(props, 'camRotateX', -math.PI, math.PI).step(0.01);
  gui.add(props, 'camRotateY', -math.PI, math.PI).step(0.01);
  gui.add(props, 'camRotateZ', -math.PI, math.PI).step(0.01);
  gui.add(props, 'rotateCamera');
  const fromXController = gui.add(props, 'fromX');
  const fromYController = gui.add(props, 'fromY');
  const fromZController = gui.add(props, 'fromZ');
  fromXController.onChange(() => look());
  fromYController.onChange(() => look());
  fromZController.onChange(() => look());
  const toXController = gui.add(props, 'toX');
  const toYController = gui.add(props, 'toY');
  const toZController = gui.add(props, 'toZ');
  toXController.onChange(() => look());
  toYController.onChange(() => look());
  toZController.onChange(() => look());
  gui.add(props, 'look');


  const focalLengthController = gui.add(props, 'focalLength');
  focalLengthController.onChange(val => {
    camera.focalLength = val;
  });

  new Path.Circle({
    center: [width/2, height/2],
    radius: 10,
    fillColor: 'red'
  });

  let group = new paper.Group();
  paper.view.onFrame = () => {
    group.remove();
    group = drawSolidBox(box, camera);
  }
}

function controlBox (gui, box, name = 'Box') {
  const folder = gui.addFolder(name);
  folder.add(box, 'x');
  folder.add(box, 'y');
  folder.add(box, 'z');
  folder.open();
}

function withPinholeCamera () {
  const props = {
    focalLength: 35,
    filmApertureWidth: 0.825,
    filmApertureHeight: 0.446,
    nearClippingPlane: 1,
    farClipingPlane: 1000,
    imageWidth: width,
    imageHeight: height,
    fitFilm: ''
  };

  const camProps = {
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    translateX: 0,
    translateY: 0,
    translateZ: 0,
    fromX: 0,
    fromY: 0,
    fromZ: 100,
    toX: 0,
    toY: 0,
    toZ: 0,
    look,
    run
  };

  // const camera = new Camera(props, math.matrix([
  //   [-0.95424,  0,         0.299041,  0],
  //   [0.0861242, 0.95763,   0.274823,  0],
  //   [-0.28637,  0.288002, -0.913809,  0],
  //   [-3.734612, 7.610426, -14.152769, 1]
  // ]));

  const camera = new Camera(props);

  look();

  function look () {
    const from = [camProps.fromX, camProps.fromY, camProps.fromZ];
    const to = [camProps.toX, camProps.toY, camProps.toZ];
    camera.look(from, to);
  }

  const gui = new dat.GUI();
  gui.add(props, 'focalLength').onChange(focalLength => {
    camera.setProps({focalLength});
    run();
  });
  gui.add(props, 'filmApertureWidth').onChange(filmApertureWidth => camera.setProps({filmApertureWidth}));
  gui.add(props, 'filmApertureHeight').onChange(filmApertureHeight => camera.setProps({filmApertureHeight}));
  gui.add(props, 'imageWidth').onChange(imageWidth => camera.setProps({imageWidth}));
  gui.add(props, 'imageHeight').onChange(imageHeight => camera.setProps({imageHeight}));
  gui.add(props, 'nearClippingPlane').onChange(nearClippingPlane => camera.setProps({nearClippingPlane}));
  gui.add(props, 'fitFilm', ['', 'fill', 'overscan']).onChange(fitFilm => camera.setProps({fitFilm}));

  const cameraFolder = gui.addFolder('Camera');
  cameraFolder.add(camProps, 'rotateX', -math.PI, math.PI).step(0.01).onChange(val => {
    camera.rotate(val, 0, 0);
    run();
  });
  cameraFolder.add(camProps, 'rotateY', -math.PI, math.PI).step(0.01).onChange(val => {
    camera.rotate(0, val, 0);
    run();
  });
  cameraFolder.add(camProps, 'rotateZ', -math.PI, math.PI).step(0.01).onChange(val => {
    camera.rotate(0, 0, val);
    run()
  });
  cameraFolder.add(camProps, 'translateX', -1, 1).onChange(val => {
    camera.translate(val, 0, 0);
    run();
  });
  cameraFolder.add(camProps, 'translateY', -1, 1).onChange(val => {
    camera.translate(0, val, 0);
    run();
  });
  cameraFolder.add(camProps, 'translateZ', -1, 1).onChange(val => {
    camera.translate(0, 0, val);
    run();
  });
  cameraFolder.add(camProps, 'fromX', -200, 200).step(1).onChange(val => {
    look();
    run();
  });
  cameraFolder.add(camProps, 'fromY', -200, 200).step(1).onChange(val => {
    look();
    run();
  });
  cameraFolder.add(camProps, 'fromZ', -200, 200).step(1).onChange(val => {
    look();
    run();
  });
  cameraFolder.add(camProps, 'toX', -10, 10).onChange(val => {
    look();
    run();
  });
  cameraFolder.add(camProps, 'toY', -10, 10).onChange(val => {
    look();
    run();
  });
  cameraFolder.add(camProps, 'toZ', -10, 10).onChange(val => {
    look();
    run();
  });

  const size = 2;
  const box = new Box(size, size, size, [0, 0, 1]);

  // paper.view.onFrame = () => {
  //   // run();
  // }

  let group = new paper.Group();

  run();

  function run () {
    group.remove();
    group = outlineBox(box, camera);
  }
}

function outlineBox (box, camera) {
  const planes = Object.values(Box.getPlanes(box)).map(plane => {
    return plane.map(point => camera.computePixelCoordinates(point));
  });
  const group = new paper.Group();
  for (let i = 0; i < planes.length; i++) {
    const plane = planes[i];
    const points = plane.map(([visible, mat]) => {
      return mat;
    });
    const path = drawSolidPlane(points);
    group.addChild(path);
  }

  return group;
}

// hatchedBoxExample();
// solidBoxExample();
// animateHatchedBoxExmaple();
// animateSolidBoxExample();
// testCameraControl();
withPinholeCamera();
