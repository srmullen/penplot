import WebFont from 'webfontloader';
import * as opentype from 'opentype.js';
import paper, { Point, Path, CompoundPath, PointText } from 'paper';
import math, { random, randomInt } from 'mathjs';
import { range, sortBy, countBy, last, flatten, isArray } from 'lodash';
import dat from 'dat.gui';
import { A4, STRATH_SMALL, WEDDING_SAVE_THE_DATE, createCanvas } from 'common/setup';
import {
  saveAsSVG, choose, maprange, radiansToDegrees, clipBounds, processOptions
} from 'common/utils';
import * as pens from 'common/pens';
import * as palettes from 'common/palettes';
import { clipToBorder } from 'common/border';

const seed = randomInt(2000);
// const seed = 473;
console.log(seed);
math.config({ randomSeed: seed });

window.paper = paper;

function circle(center, radius = 100) {
  center = new Point(center);
  const nSteps = 100;
  const points = [];
  for (let i = 0; i < nSteps; i++) {
    const point = center.add(
      math.cos(2 * math.pi * (i / nSteps)) * radius,
      math.sin(2 * math.pi * (i / nSteps)) * radius
    );
    points.push(point);
  }
  new Path({
    segments: points,
    strokeColor: 'black',
    closed: true
  });
}
// circle([width / 2, height / 2]);

function loadFonts() {
  return new Promise((resolve, reject) => {
    WebFont.load({
      // custom: {
      //   families: ['Pacifico']
      // },
      google: {
        families: ['Pacifico']
      },
      active: resolve,
      inactive: reject
    })
  });
}

function loadOpentype(file) {
  return new Promise((resolve, reject) => {
    opentype.load(file, (err, font) => {
      if (err) {
        reject(err);
      } else {
        resolve(font);
      }
    });
  })
}

const fontTest = async () => {
  try {
    await loadFonts();
  } catch(err) {
    console.error(err);
  }

  const font = await loadOpentype('src/fonts/Pacifico/Pacifico-Regular.ttf');
  console.log(font);
  window.font = font;

  function text(point, content) {
    const pathData = font.getPath(content, point.x, point.y, 34).toSVG();
    const path = new paper.CompoundPath(pathData);
    path.strokeColor = 'black';
    path.fillColor = 'black';
    // path.position = point;
    return path;
  }

  const t1 = text(new Point(100, 100), 'hello we\'re getting married');
  const t2 = text(new Point(100, 200), 'it is in Vermont');
}
// fontTest();

/**
 * @param distance {number} - The distance at which points will begin ignoring each other.
 * @param stepDist {number} - The size of the step taken away from a point.
 */
function relaxationDisplacementStep(points, { distance = 20, stepDist = 1 } = {}) {
  const ret = [];
  let changed = false;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    let force = new Point(0, 0);
    for (let j = 0; j < points.length; j++) {
      if (i !== j) {
        const vec = points[j].subtract(point);
        if (vec.length < distance) {
          force = force.subtract(vec.normalize().multiply(stepDist));
          changed = true;
        }
      }
    }
    ret.push(point.add(force));
  }
  return [ret, changed];
}

// http://compform.net/strategy/#relaxation-displacement
function relaxationDisplacement(points, opts) {
  let changed = true;
  let displaced = points;
  while (changed) {
    [displaced, changed] = relaxationDisplacementStep(displaced, opts);
  }
  return displaced;
}

class Star {
  constructor(pos, opts={}) {
    this.pos = pos;
    this.rays = [];
    this.opts = opts;
    const nRays = 8;
    // const rotation = random(-180, 180);
    const rotation = 0;
    for (let i = 0; i < nRays; i++) {
      const vec = new Point(
        math.cos(2 * math.pi * (i / nRays)),
        math.sin(2 * math.pi * (i / nRays))
      ).rotate(rotation);
      const ray = {
        vec,
        from: this.pos.add(vec.multiply(opts.innerRadius)),
        to: this.pos.add(vec.multiply(opts.outerRadius))
      };
      this.rays.push(ray);
    }
  }

  grow(stars = []) {
    for (let i = 0; i < this.rays.length; i++) {
      const ray = this.rays[i];
      if (!ray.dead) {
        const to = ray.to.add(ray.vec.multiply(this.opts.rate));
        const dead = stars.some(star => {
          if (star !== this) {
            return star.contains(to);
          }
        });
        if (dead) {
          ray.dead = true;
        } else {
          ray.to = to;
        }
      }
    }
  }

  contains(point) {
    const segments = this.rays.map(ray => ray.to);
    const path = new Path({
      segments,
      closed: true
    });
    const ret = path.contains(point);
    path.remove();
    return ret;
  }

  draw(bounds) {
    this.rays.map(ray => {      
      const fromContained = bounds.contains(ray.from);
      const toContained = bounds.contains(ray.to);
      if (fromContained && toContained) {
        return new Path.Line({
          from: ray.from,
          to: ray.to,
          strokeColor: 'gold'
        });
      } else if (fromContained && !toContained) {
        const path = new Path.Line({
          from: ray.from,
          to: ray.to,
          strokeColor: 'gold'
        });
        const intersections = bounds.getIntersections(path);
        path.remove();
        return new Path.Line({
          from: ray.from,
          to: intersections[0].point,
          strokeColor: 'gold'
        });
      } else if (!fromContained && toContained) {
        const path = new Path.Line({
          from: ray.from,
          to: ray.to,
          strokeColor: 'gold'
        });
        const intersections = bounds.getIntersections(path);
        path.remove();
        path.from = intersections[0].point;
        return new Path.Line({
          from: intersections[0].point,
          to: ray.to,
          strokeColor: 'gold'
        });
      }
    });
  }
}

function stars() {
  canvas.style = 'background-color: #090D3D;'
  const nStars = 100;
  const center = new Point(width/2, height/2);

  let points = [];
  for (let i = 0; i < nStars; i++) {
    points.push(new Point(center.add(random(60), random(20))));
  }
  points = relaxationDisplacement(points, { distance: 50, stepDist: 3 });

  const stars = [];
  for (let i = 0; i < nStars; i++) {
    const star = new Star(points[i], {
      innerRadius: 5,
      outerRadius: 10,
      rate: random(5, 15)
    });
    stars.push(star);
  }

  for (let i = 0; i < 10; i++) {
    stars.forEach(star => star.grow(stars));
  }

  const bounds = new Path.Rectangle({
    from: [50, 50],
    to: [width - 50, height - 50]
  });
  stars.map(star => star.draw(bounds));
  bounds.remove();
}
// stars();

async function stringLights_v1() {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  canvas.style = `${canvas.style}; background-color: #090D3D;`;
  const pacifico = await loadOpentype('src/fonts/Pacifico/Pacifico-Regular.ttf');
  const amanticsc = await loadOpentype('src/fonts/Amatic_SC/AmaticSC-Bold.ttf');
  const dawningOfANewDay = await loadOpentype('src/fonts/Dawning_of_a_New_Day/DawningofaNewDay-Regular.ttf');

  stringLight(8, width, height);
  stringLight(11, width, height);
  stringLight(15, width, height);
  // text(pacifico, new Point(width/2, height/2), 54, 'Save the Date');
  const silver = pens.UNIBALL_SILVER;
  const gold = pens.GELLY_ROLL_METALLIC_GOLD;
  text(amanticsc, new Point(width / 6, height / 2), 'Jacqueline', { fontSize: 64, pen: silver });
  text(amanticsc, new Point(width / 6, height / 2 + 50), '+', { fontSize: 64, pen: gold });
  text(amanticsc, new Point(width / 6, height / 2 + 100), 'Sean', { fontSize: 64, pen: silver });
  text(dawningOfANewDay, new Point(width / 2, height / 2), 'Save the Date', { fontSize: 54, pen: silver });
  text(dawningOfANewDay, new Point(width / 2, height / 2 + 50), 'November 7, 2020', { fontSize: 34, pen: silver });
  text(dawningOfANewDay, new Point(width / 2, height / 2 + 100), 'Rupert, Vermont', { fontSize: 34, pen: silver });

}
// stringLights_v1();

async function fontsDemo() {
  const PAPER_SIZE = STRATH_SMALL.portrait;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  canvas.style = `${canvas.style}; background-color: #090D3D;`;
  const pacifico = await loadOpentype('src/fonts/Pacifico/Pacifico-Regular.ttf');
  const amanticsc = await loadOpentype('src/fonts/Amatic_SC/AmaticSC-Bold.ttf');
  const dawningOfANewDay = await loadOpentype('src/fonts/Dawning_of_a_New_Day/DawningofaNewDay-Regular.ttf');
  const bershireSwash = await loadOpentype('src/fonts/Berkshire_Swash/BerkshireSwash-Regular.ttf');
  const delius = await loadOpentype('src/fonts/Delius/Delius-Regular.ttf');
  const lobster = await loadOpentype('src/fonts/Lobster/Lobster-Regular.ttf');
  const meriendaOne = await loadOpentype('src/fonts/Merienda_One/MeriendaOne-Regular.ttf');
  const openSansCondensedLight = await loadOpentype('src/fonts/Open_Sans_Condensed/OpenSansCondensed-Light.ttf');
  const openSansCondensedBold = await loadOpentype('src/fonts/Open_Sans_Condensed/OpenSansCondensed-Bold.ttf');
  const ribeye = await loadOpentype('src/fonts/Ribeye/Ribeye-Regular.ttf');
  const ribeyeMarrow = await loadOpentype('src/fonts/Ribeye_Marrow/RibeyeMarrow-Regular.ttf');
  const sacramento = await loadOpentype('src/fonts/Sacramento/Sacramento-Regular.ttf');
  const satisfy = await loadOpentype('src/fonts/Satisfy/Satisfy-Regular.ttf');

  const silver = pens.UNIBALL_SILVER;
  const gold = pens.GELLY_ROLL_METALLIC_GOLD;
  const fonts = [
    pacifico, amanticsc, dawningOfANewDay, bershireSwash, delius, lobster, meriendaOne, openSansCondensedLight, openSansCondensedBold,
    ribeye, ribeyeMarrow, sacramento, satisfy
  ];

  const base = 50;
  for (let i = 0; i < fonts.length; i++) {
    text(fonts[i], new Point(width / 6, base + 50 * i ), 'Save the Date', { fontSize: 44, pen: gold });
  }
}
// fontsDemo();

async function stringLights_v2() {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  canvas.style = `${canvas.style}; background-color: #090D3D;`;
  const pacifico = await loadOpentype('src/fonts/Pacifico/Pacifico-Regular.ttf');
  const amanticsc = await loadOpentype('src/fonts/Amatic_SC/AmaticSC-Bold.ttf');
  const dawningOfANewDay = await loadOpentype('src/fonts/Dawning_of_a_New_Day/DawningofaNewDay-Regular.ttf');
  const sacramento = await loadOpentype('src/fonts/Sacramento/Sacramento-Regular.ttf');

  stringLight(20, width, height);
  stringLight(11, width, height);
  stringLight(15, width, height);
  const silverOutline = pens.UNIBALL_SILVER;
  const silverFilled = pens.UNIBALL_SILVER_FILLED;
  const gold = pens.GELLY_ROLL_METALLIC_GOLD;
  text(pacifico, new Point(width / 4, height / 2 + 10), 'Save the Date', { fontSize: 64, pen: silverFilled });

  text(amanticsc, new Point(width / 6, height / 2 + 80), 'Jacqueline', { fontSize: 42, pen: silverOutline });
  text(amanticsc, new Point(width / 6, height / 2 + 130), '+ Sean', { fontSize: 42, pen: silverOutline });

  text(amanticsc, new Point(width * 7/12, height / 2 + 80), 'November 7, 2020', { fontSize: 42, pen: silverOutline });
  text(amanticsc, new Point(width * 7/12 , height / 2 + 130), 'Rupert, Vermont', { fontSize: 42, pen: silverOutline });

  text(amanticsc, new Point(width / 5, height * 3/4 + 80), 'www.theknot/us/jacqui-walter-and-sean-mullen', { fontSize: 30, pen: gold });

  // text(amanticsc, new Point(width / 6, height / 2), 'Jacqueline', { fontSize: 64, pen: silver });
  // text(amanticsc, new Point(width / 6, height / 2 + 50), '+', { fontSize: 64, pen: gold });
  // text(amanticsc, new Point(width / 6, height / 2 + 100), 'Sean', { fontSize: 64, pen: silver });
  // text(dawningOfANewDay, new Point(width / 2, height / 2), 'Save the Date', { fontSize: 54, pen: silver });
  // text(dawningOfANewDay, new Point(width / 2, height / 2 + 50), 'November 7, 2020', { fontSize: 34, pen: silver });
  // text(dawningOfANewDay, new Point(width / 2, height / 2 + 100), 'Rupert, Vermont', { fontSize: 34, pen: silver });
}
// stringLights_v2();

async function stringLights_v3() {
  const PAPER_SIZE = WEDDING_SAVE_THE_DATE.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  // canvas.style = `${canvas.style}; background-color: #090D3D;`;
  const pacifico = await loadOpentype('src/fonts/Pacifico/Pacifico-Regular.ttf');
  const amanticsc = await loadOpentype('src/fonts/Amatic_SC/AmaticSC-Bold.ttf');
  const dawningOfANewDay = await loadOpentype('src/fonts/Dawning_of_a_New_Day/DawningofaNewDay-Regular.ttf');
  const sacramento = await loadOpentype('src/fonts/Sacramento/Sacramento-Regular.ttf');

  const marginX = 0;
  const l1start = new Point(marginX, height / 6 - 50);
  const l1end = new Point(width - marginX, height / 6 - 40);
  const l1droop = l1start.add(l1end.subtract(l1start).divide(2)).add(0, 20);
  stringLight(
    10, 
    [
      l1start, 
      l1droop.subtract(80, 0),
      l1droop.add(80, 0),
      l1end
    ]
  );

  const l2start = new Point(marginX, height / 6 - 40);
  const l2end = new Point(width - marginX, height / 6 + 30);
  const l2droop = l2start.add(l2end.subtract(l2start).divide(2)).add(20, 40);
  stringLight(11, 
    [
      l2start,
      l2droop.subtract(90, 15),
      l2droop.add(100, 0),
      l2end
    ]
  );
  
  const l3start = new Point(marginX, height / 6 + 30);
  const l3end = new Point(width - marginX, height / 6 - 40);
  const l3droop = l3start.add(l3end.subtract(l3start).divide(2)).add(20, 40);
  stringLight(11,
    [
      l3start,
      l3droop.add(-90, 15),
      l3droop.add(100, 0),
      l3end
    ]
  );

  const silverOutline = pens.UNIBALL_SILVER;
  const silverFilled = pens.UNIBALL_SILVER_FILLED;
  const gold = pens.GELLY_ROLL_METALLIC_GOLD;

  // text(pacifico, new Point(width / 4, height / 2 + 10), 'Save the Date', { fontSize: 54, pen: silverFilled });
  // text(amanticsc, new Point(width / 6, height / 2 + 60), 'Jacqueline', { fontSize: 36, pen: silverOutline });
  // text(amanticsc, new Point(width / 6, height / 2 + 105), '+ Sean', { fontSize: 36, pen: silverOutline });
  // text(amanticsc, new Point(width * 7 / 12, height / 2 + 60), 'November 7, 2020', { fontSize: 36, pen: silverOutline });
  // text(amanticsc, new Point(width * 7 / 12, height / 2 + 105), 'Rupert, Vermont', { fontSize: 36, pen: silverOutline });
  // text(amanticsc, new Point(width / 5, height * 3 / 4 + 60), 'theknot.com/us/jacqui-walter-and-sean-mullen', { fontSize: 24, pen: gold });

  textp(pacifico, new Point(width / 2, height / 2 - 20), 'Save the Date', { fontSize: 54, pen: silverFilled });
  textp(amanticsc, new Point(width / 4, height / 2 + 50), 'Jacqueline', { fontSize: 36, pen: silverOutline });
  textp(amanticsc, new Point(width / 4, height / 2 + 95), '+ Sean', { fontSize: 36, pen: silverOutline });
  textp(amanticsc, new Point(width * 3 / 4 - 15, height / 2 + 50), 'November 7, 2020', { fontSize: 36, pen: silverOutline });
  textp(amanticsc, new Point(width * 3 / 4 - 15, height / 2 + 95), 'Rupert, Vermont', { fontSize: 36, pen: silverOutline });
  textp(amanticsc, new Point(width / 2, height * 3 / 4 + 60), 'theknot.com/us/jacqueline-sean', { fontSize: 24, pen: gold });

  function stringLight(nLights = 10, segments) {
    const droopY = random(15, 25);
    const droopX = random(-50, 50);
    // segments.forEach(point => new Path.Circle({
    //   fillColor: 'red',
    //   radius: 4,
    //   center: point
    // }));
    const string = pens.withPen(pens.UNIBALL_SILVER, ({ color }) => {
      const string = new Path({
        segments,
        strokeWidth: 2,
        strokeColor: color
      });
      string.smooth();
      return string;
    })

    const spacing = string.length / (nLights + 1);
    const iLine = new Path.Line({
      from: [marginX, 0],
      to: [marginX, height]
    });
    const lights = [];
    for (let i = 0; i < nLights; i++) {
      const step = iLine.translate(spacing, 0);
      const intersections = string.getIntersections(step);
      if (intersections.length) {
        const intersection = intersections[0].point.add(random(-5, 5), random(-5, 5));
        const light = makeLight(intersection);
        lights.push(light);
      }
    }
    iLine.remove();
  }
}
stringLights_v3();

function stringLight(nLights = 10, width, height) {
  const marginX = 10;
  const droopY = random(50, 90);
  const droopX = random(-150, 150);
  const anchorDiff = 50;
  const droopPoint = new Point(width / 2 + droopX, (height / 6) + droopY);
  const string = pens.withPen(pens.UNIBALL_SILVER, ({ color }) => {
    const string = new Path({
      segments: [
        new Point(marginX, height / 6 + random(-anchorDiff, anchorDiff)),
        droopPoint.subtract(130, 0),
        droopPoint.add(120, 0),
        new Point(width - marginX, height / 6 + random(-anchorDiff, anchorDiff))
      ],
      strokeWidth: 2,
      strokeColor: color
    });
    string.smooth();
    return string;
  })

  const spacing = string.length / (nLights + 1);
  const iLine = new Path.Line({
    from: [marginX, 0],
    to: [marginX, height]
  });
  const lights = [];
  for (let i = 0; i < nLights; i++) {
    const step = iLine.translate(spacing, 0);
    const intersections = string.getIntersections(step);
    if (intersections.length) {
      const intersection = intersections[0].point.add(random(-5, 5), random(-5, 5));
      const light = makeLight(intersection);
      lights.push(light);
    }
  }
  iLine.remove();
}

function makeLight(center, pen = pens.GELLY_ROLL_METALLIC_GOLD) {
  const radius = 8;
  const nSteps = 20;
  const nSpirals = 3;
  const points = [];
  for (let i = 0; i < nSteps; i++) {
    const point = center.add(
      math.cos(2 * math.pi * (i * nSpirals / nSteps)) * radius * (i / nSteps),
      math.sin(2 * math.pi * (i * nSpirals / nSteps)) * radius * (i / nSteps)
    );
    points.push(point);
  }
  return pens.withPen(pen, ({ color }) => {
    const path = new Path({
      segments: points,
      strokeColor: color,
      closed: false,
    });
    path.smooth();
    return path;
  });
}

function text(font, point, content, { fontSize = 12, pen = pens.BLACK } = {}) {
  const pathData = font.getPath(content, point.x, point.y, fontSize).toPathData();
  return pens.withPen(pen, ({ color }) => {
    const path = new paper.CompoundPath(pathData);
    path.strokeColor = color;
    path.fillColor = color;
    // path.position = point;
    return path;
  });
}

// Places the text when creating the compondPath rather than the svg data.
function textp(font, point, content, { fontSize = 12, pen = pens.BLACK } = {}) {
  const pathData = font.getPath(content, 0, 0, fontSize).toPathData();
  return pens.withPen(pen, ({ color }) => {
    const path = new paper.CompoundPath(pathData);
    path.strokeColor = color;
    path.fillColor = color;
    path.position = point;
    return path;
  });
}

window.saveAsSvg = function save(name) {
  saveAsSVG(paper.project, name);
}