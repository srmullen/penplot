import paper, { Point, Path, Group, Raster } from 'paper';
import { sortBy, minBy } from 'lodash';
import { Noise } from 'noisejs';
import math, { random, randomInt } from 'mathjs';
import dat from 'dat.gui';
import { A4, STRATH_SMALL, createCanvas, loadImage } from 'common/setup';
import { saveAsSVG, intersects, radiansToDegrees, gauss, choose, wchoose, processOptions } from 'common/utils';
import * as colors from 'common/color';
import * as pens from 'common/pens';
import img from 'images/oliver1.jpeg';

// const [width, height] = STRATH_SMALL.portrait;
// const canvas = createCanvas(STRATH_SMALL.portrait);
// paper.setup(canvas);

const noise = new Noise();

async function oliver () {
  const [width, height] = A4.portrait;
  const canvas = createCanvas(A4.portrait);
  paper.setup(canvas);
  window.paper = paper;

  const image = await loadImage(img);

  const raster = new Raster(image);
  raster.visible = false;
  raster.onLoad = () => {
    const scale = Math.max(width, height) / Math.max(raster.width, raster.height) * 0.8;
    raster.setSize(raster.width * scale, raster.height * scale);
    raster.translate(width/2, height/2);

    // createColorBlocks(raster, 50, 60);
    createHatchings(raster, 100, 120, [0, 0], (x, y) => noise.simplex2(x * 0.02, y * 0.02) * 180);
    // createHatchings(raster, 50, 60, [0.5, 0.5], () => 135);
    raster.remove();
  }

  function createHatchings (raster, xBlocks=100, yBlocks=100, offset=[0, 0], angle = () => random(180)) {
    const xSize = raster.width / xBlocks;
    const ySize = raster.height / yBlocks;
    const xOffset = (xSize * offset[0]) + raster.bounds.left;
    const yOffset = (xSize * offset[1]) + raster.bounds.top;
    const hatchings = new Group();
    for (let y = 0; y < yBlocks; y++) {
      const fromY = (y * ySize) + yOffset;
      for (let x = 0; x < xBlocks; x++) {
        const fromX = (x * xSize) + xOffset;
        const block = new Path.Rectangle({
          from: [fromX, fromY],
          to: [fromX + xSize, fromY + ySize],
          visible: false
        });
        const color = raster.getAverageColor(block);

        if (color.brightness < 0.6) {
          const stepSize = color.brightness * 20;
          // const pen = minBy(pens.prisma05, pen => {
          //   const info = pens.info(pen);
          //   return colors.distance(
          //     [color.red, color.green, color.blue],
          //     [info.color.red, info.color.green, info.color.blue]
          //   );
          // });
          const weights = pens.prisma05.map(pen => {
            const info = pens.info(pen);
            const distance = colors.distance(
              [color.red, color.green, color.blue],
              [info.color.red, info.color.green, info.color.blue]
            );
            return Math.pow(1/distance, 1.2);
          });
          // const pen = wchoose(weights, pens.prisma05);
          // pens.withPen(pen, ({color, strokeWidth}) => {
            const h1 = rectHatch(
              [fromX, fromY],
              [fromX + xSize, fromY + ySize],
              { angle: angle(x, y), stepSize },
              // { strokeColor: color }
              { pen: () => wchoose(weights, pens.prisma05)}
            );
            // h1.strokeColor = color;
            // hatchings.addChild(h1);
          // });
        }
        block.remove();
      }
    }
    // blocks.translate(raster.bounds.topLeft);
  }

  function createColorBlocks (raster, xBlocks=100, yBlocks=100) {
    const xSize = raster.width / xBlocks;
    const ySize = raster.height / yBlocks;
    const blocks = new Group();
    for (let y = 0; y < yBlocks; y++) {
      const fromY = (y * ySize) + raster.bounds.top;
      for (let x = 0; x < xBlocks; x++) {
        const fromX = (x * xSize) + raster.bounds.left;
        const block = new Path.Rectangle({
          from: [fromX, fromY],
          to: [fromX + xSize, fromY + ySize],
          // strokeColor: 'red'
        });
        const color = raster.getAverageColor(block);
        block.fillColor = color;
        blocks.addChild(block);
      }
    }
    // blocks.translate(raster.bounds.topLeft);
  }
}

function rectHatch (from, to, {stepSize = 5, angle, debug} = {}, opts={}) {
  const box = Path.Rectangle({
    from,
    to,
    visible: false
  });

  const center = new Point(box.bounds.centerX, box.bounds.centerY);
  const disectionVec = new Point({
    length: 1,
    angle: angle + 90
  });
  const disectionFrom = center.add(disectionVec.multiply(box.bounds.width + box.bounds.height));
  const disectionTo = center.subtract(disectionVec.multiply(box.bounds.width + box.bounds.height));

  if (debug) {
    new Path.Line({
      from: disectionFrom,
      to: disectionTo,
      strokeColor: 'red'
    });
  }

  const traceVec = disectionVec.rotate(90);
  const width = 1000;
  const trace = new Path.Line({
    visible: false,
    from: disectionFrom.subtract(traceVec.multiply(width)),
    to: disectionFrom.add(traceVec.multiply(width)),
    strokeColor: 'blue'
  });

  const disectionLength = disectionFrom.getDistance(disectionTo);
  const steps = disectionLength / stepSize;

  const xrand = () => {
    return random(-1, 1);
  }

  const yrand = () => {
    return random(-1, 1);
  }

  const paths = [];
  for (let i = 0; i < steps; i++) {
    trace.translate(disectionVec.normalize().multiply(-stepSize));
    const intersections = box.getIntersections(trace);
    if (intersections.length === 2) {
      const from = intersections[0].point.add(xrand(), yrand());
      const to = intersections[1].point.add(xrand(), yrand());
      const { pen } = processOptions(opts);
      pens.withPen(pen, ({color, strokeWidth}) => {
        const path = new Path({
          segments: [from, to],
          // strokeColor: 'black',
          strokeWidth: strokeWidth,
          // ...processOptions(opts)
          strokeColor: color
        });
        return path;
        // paths.push(path);
      });
    }
  }
  trace.remove();
  box.remove();
  // return new Group(paths);
}

function curtain_in_wind () {
  const [width, height] = STRATH_SMALL.landscape;
  const canvas = createCanvas(STRATH_SMALL.landscape);
  paper.setup(canvas);

  const nPaths = 300;

  const inBounds = (x, y) => (x >= 20 && x < width - 20 && y >= 20 && y < height - 20);

  for (let i = 0; i < nPaths; i++) {
    new Path({
      strokeColor: 'black',
      strokeWidth: 0.5,
      segments: noisePath([20 + (width / nPaths * i), 20], inBounds)
    });
  }
}

function lineSpiral () {
  // const [width, height] = STRATH_SMALL.landscape;
  // const canvas = createCanvas(STRATH_SMALL.landscape);
  const [width, height] = A4.landscape;
  const canvas = createCanvas(A4.landscape);
  paper.setup(canvas);

  const props = {
    seed: 0,
    // seed: 601,
    root: [10, height/2],
    rotateMin: -1,
    rotateMax: 1,
    pointDist: 20,
    angle: 0,
    segmentLength: 5,
    nPaths: 10,
    smooth: true,
    run
  };

  const gui = new dat.GUI();
  gui.add(props, 'angle');
  gui.add(props, 'pointDist').step(0.1);
  gui.add(props, 'rotateMin');
  gui.add(props, 'rotateMax');
  gui.add(props, 'segmentLength');
  gui.add(props, 'nPaths');
  gui.add(props, 'smooth');
  gui.add(props, 'run');

  let group = new Group();

  run();

  function run () {
    group.remove();
    group = new Group();

    if (props.seed) {
      math.config({randomSeed: props.seed});
      noise.seed(props.seed);
    } else {
      const seed = math.randomInt(1000);
      console.log(seed);
      math.config({randomSeed: seed});
      noise.seed(seed);
    }

    const opts = {
      inBounds: () => true,
      angle: props.angle,
      steps: 500,
      rotateMin: props.rotateMin,
      rotateMax: props.rotateMax,
      length: props.segmentLength
    };

    const paths = [noisePath(props.root, opts)];
    // const pointDist = (i) => 2 + i * 0.01;
    const pointDist = () => props.pointDist;
    for (let i = 0; i < props.nPaths; i++) {
      paths.push(followPath(paths[i], {pointDist, angle: 45}));
    }

    const margin = 50;
    const clipped = clipBounds(p => {
      return (p.x >= margin && p.x < width - margin && p.y >= margin && p.y < height - margin);
    }, paths);

    const drawn = clipped.map(path => {
      const child = new Path({
        strokeColor: 'black',
        strokeWidth: 0.5,
        segments: path
      });
      if (props.smooth) {
        child.smooth();
      }
      return child;
    });

    group.addChildren(drawn);
  }
}

function noisePath (from, {
  length = 2,
  angle = 45,
  inBounds = () => true,
  steps = 1000,
  rotateMin = 0,
  rotateMax = 1,
  noiseRate = 0.01
} = {}) {
  let point = new Point(from);
  let step = 0;
  let vec = new Point({
    length,
    angle
  });
  const segments = [];
  while (inBounds(point.x, point.y) && step < steps) {
    vec = vec.rotate(noise.simplex2(point.x * noiseRate, point.y * noiseRate) * math.random(rotateMin, rotateMax));
    point = point.add(vec);
    segments.push(point);

    step++;
  }

  return segments;
}

function followPath (path, {pointDist = () => 2, angle = 90} = {}) {
  const segments = [];

  let vec;
  for (let i = 1; i < path.length; i++) {
    vec = path[i].subtract(path[i-1]).normalize();
    const dist = pointDist(i);
    let point = path[i-1].add(vec.rotate(angle).multiply(dist));
    segments.push(point);
  }

  // last point
  const dist = pointDist(path.length-1);
  let point = path[path.length-1].add(vec.rotate(angle).multiply(dist));
  segments.push(point);


  return segments;
}

/**
 * Remove points from paths are out of bounds. If points out of bounds are in the middle of
 * paths then break the path into seperate paths.
 * @param inBounds {Function} - Returns true if point is in bounds, fasle otherwise.
 * @param paths Point[][] - Array of point arrays.
 */
function clipBounds (inBounds, paths) {
  return paths.reduce((acc, path) => {
    const clipped = [];
    let np;
    let continuation = false;
    for (let i = 0, l = path.length; i < l; i++) {
      const p = path[i];
      if (inBounds(p)) {
        if (!continuation) {
          np = [];
          continuation = true;
        }
        np.push(p);
      } else {
        if (continuation) {
          continuation = false;
          clipped.push(np);
        }
      }
    }
    // Push np if last point in path isn't clipped.
    if (np && np.length) {
      clipped.push(np);
    }
    return acc.concat(clipped);
  }, []);
}

// curtain_in_wind();
// oliver();
lineSpiral();

window.saveAsSvg = function save (name) {
  saveAsSVG(paper.project, name);
}
