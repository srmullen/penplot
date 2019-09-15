import paper, { Point, Path, Raster, Group } from 'paper';
import math, { random, randomInt } from 'mathjs';
import please from 'pleasejs';
import { sortBy, take, range } from 'lodash';
import dat from 'dat.gui';
import GPU from 'gpu.js';
import { A4, STRATH_SMALL, ARTIST_SKETCH, createCanvas, loadImage } from 'common/setup';
import {
  saveAsSVG, choose, wchoose, maprange, clipBounds, processOptions, timer
} from 'common/utils';
import * as pens from 'common/pens';
import * as palettes from 'common/palettes';
import { clipToBorder } from 'common/border';

// import img from 'images/cocktail.jpg';
// import img from 'images/oliver.jpeg';
// import img from 'images/seville.jpg';
import img from 'images/burano.jpg';
// import img from 'images/library.jpg';

window.math = math;
window.paper = paper;

function rmse(target, data) {
  let sum = 0;
  for (let i = 0; i < target.length; i++) {
    const diff = target[i] - data[i];
    sum += diff * diff;
  }
  return math.sqrt(sum/target.length);
}

function createTri(width, height, color) {
  const point = new Point(random(width), random(height));
  return {
    segments: [
      point,
      point.add(random(-width, width), random(-height, height)),
      point.add(random(-width, width), random(-height, height))
    ],
    // color: choose(['cyan', 'yellow', 'magenta']),
    // color: [random(), random(), random()],
    color,
    opacity: 0.2
  };
}

function createAvgColorTri(width, height, raster) {
  const point = new Point(random(width), random(height));
  const segments = [
    point,
    point.add(random(-width, width), random(-height, height)),
    point.add(random(-width, width), random(-height, height))
  ];
  const shape = new Path({
    segments,
    visible:false,
    closed: true
  });
  const color = raster.getAverageColor(shape);
  shape.remove();
  return {
    segments,
    color,
    opacity: 1
  };
}

function draw(shape) {
  return new Path({
    segments: shape.segments,
    fillColor: shape.color,
    opacity: shape.opacity,
    closed: true
  });
}

const guicontrols = {
  nShapes: 20,
  nClimbs: 20,
  run: () => run()
}

const gui = new dat.GUI();
gui.add(guicontrols, 'nShapes');
gui.add(guicontrols, 'nClimbs');
gui.add(guicontrols, 'run');

async function run() {
  const image = await loadImage(img);
  const orientation = image.width > image.height ? STRATH_SMALL.landscape : STRATH_SMALL.portrait;
  const [width, height] = orientation;
  const canvas = createCanvas(orientation, { hidden: false });
  paper.setup(canvas);

  const palette = ['cyan', 'yellow', 'magenta'];

  const target = new Raster(image);
  window.target = target;
  target.visible = false;
  target.onLoad = () => {
    const rasterWidth = width;
    const rasterHeight = height;
    target.setSize(rasterWidth, rasterHeight);
    target.translate(width / 2, height / 2);
    const targetData = target.getImageData();

    const nShapes = guicontrols.nShapes;
    const nClimbs = guicontrols.nClimbs;
    const nMutations = 10;
    const shapes = [];
    let prevBest = Infinity;
    for (let i = 0; i < nShapes; i++) {
      const local = [];
      for (let j = 0; j < nClimbs; j++) {
        // for (let color of palette) {
        //   local.push(createTri(width, height, color));
        // }

        local.push(createAvgColorTri(width, height, target));
      }
      const best = local.reduce((acc, shape) => {
        const image = toImageData([...shapes, shape]);
        const score = rmse(targetData.data, image.data);
        if (score < acc.score) {
          return { score, shape };
        } else {
          return acc;
        }
      }, { score: Infinity, shape: null });
      console.log(best.score);
      if (best.score < prevBest) {
        prevBest = best.score;
        shapes.push(best.shape);
      }
    }
    console.log(shapes.length);
    render(shapes);
  }

  function render(shapes) {
    return shapes.map(draw);
  }

  function toImageData(entity, image) {
    const bounds = new Path.Rectangle({
      visible: false,
      point: [0, 0],
      width, height
    });
    const group = new Group([bounds]);
    const children = render(entity);
    group.addChildren(children);
    const raster = group.rasterize(74);
    raster.setSize(width, height);
    const imageData = raster.getImageData();
    raster.remove();
    group.remove();
    return imageData;
  }
}
// run();