import paper, { Point, Path, Group, Raster } from 'paper';
import { last, isFunction } from 'lodash';
import please from 'pleasejs';
import { Noise } from 'noisejs';
import dat from 'dat.gui';
import { STRATH_SMALL, createCanvas, loadImage } from 'common/setup';
import {
  saveAsSVG, radiansToDegrees, choose, constrain
} from 'common/utils';
import * as flowfield from 'common/flowfield';
import { Particle } from 'common/flowfield';
import math, { random } from 'mathjs';
import * as pens from 'common/pens';
import img from 'images/oliver.jpeg';
import regression from 'regression';

// window.paper = paper;
// window.math = math;

const noise = new Noise();

// const PEN_SET = [pens.PRISMA05_ORANGE, pens.PRISMA05_LBROWN, pens.PRISMA05_DBROWN, pens.PRISMA05_PURPLE];
// const PEN_SET = pens.prisma05;
const PEN_SET = [
  pens.PRISMA05_RED,
  pens.PRISMA05_ORANGE,
  pens.PRISMA05_LBROWN,
  pens.PRISMA05_DBROWN,
  pens.PRISMA05_PURPLE,
  pens.PRISMA05_BLACK,
  pens.PRISMA05_BLUE,
  pens.PRISMA05_GREEN
];

const H_MARGIN = 50;
const V_MARGIN = 30;

function drawParticle (particle) {
  if (particle.path) {
    particle.path.remove();
  }
  pens.withPen(particle.pen, ({color, strokeWidth}) => {
    particle.path = new Path({
      strokeColor: color,
      segments: particle.points,
      strokeWidth
    });
  });
}

function basic () {
  // TODO:
  // 2. Adjust field vectors while running.
  // 4. Smoothing options

  const [width, height] = STRATH_SMALL.landscape;
  const canvas = createCanvas(STRATH_SMALL.landscape);
  paper.setup(canvas);

  const LEFT_BOUNDARY = paper.view.bounds.left + H_MARGIN;
  const RIGHT_BOUNDARY = paper.view.bounds.right - H_MARGIN;
  const TOP_BOUNDARY = paper.view.bounds.top + V_MARGIN;
  const BOTTOM_BOUNDARY = paper.view.bounds.bottom - V_MARGIN;
  const bounds = {
    left: LEFT_BOUNDARY,
    right: RIGHT_BOUNDARY,
    top: TOP_BOUNDARY,
    bottom: BOTTOM_BOUNDARY
  };

  let particeles = [];
  const props = {
    seed: 0,
    rows: 10,
    columns: 20,
    noise_rate: 0.01,
    num_particles: 200,
    show_vectors: false,
    max_points: 100,
    particle_method: 'random',
    particle_column: {
      particle_columns: 30,
      particlesPerColumn: 20,
    },
    run: () => {
      particles.forEach(p => p.path.remove());
      particles = run();
    },
    stop: () => {
      paper.view.pause();
    },
    name: 'flow_field',
    save
  };

  const particleCreators = {
    random: () => {
      const opts = {
        maxPoints: props.max_points,
        pen: ({pos}) => choosePen(PEN_SET, pos),
        bounds
      };
      // const opts = {maxPoints: () => choose([10, 100])};
      return Particle.randomParticles(props.num_particles, opts);
    },
    columns: () => {
      const { particle_columns, particlesPerColumn } = props.particle_column;
      const opts = {
        maxPoints: props.max_points,
        pen: ({pos}) => choosePen(PEN_SET, pos),
        bounds
      };
      return Particle.particleColumns(particle_columns, particlesPerColumn, opts);
    }
  };

  const gui = new dat.GUI();
  gui.add(props, 'seed');
  gui.add(props, 'rows');
  gui.add(props, 'columns');
  gui.add(props, 'noise_rate');
  gui.add(props, 'show_vectors');
  gui.add(props, 'num_particles');
  gui.add(props, 'max_points');
  gui.add(props, 'particle_method', ['random', 'columns']);
  const particleColumnFolder = gui.addFolder('particle_columns');
  particleColumnFolder.add(props.particle_column, 'particle_columns');
  particleColumnFolder.add(props.particle_column, 'particlesPerColumn');
  gui.add(props, 'run');
  gui.add(props, 'stop');
  gui.add(props, 'name');
  gui.add(props, 'save');

  let fieldGroup = new Group();

  function run () {
    paper.view.play();
    let createParticles = particleCreators[props.particle_method];

    if (props.seed) {
      math.config({randomSeed: props.seed});
      noise.seed(props.seed);
    }

    noise.seed(props.seed || random(100));
    fieldGroup.remove();
    const boxHeight = (BOTTOM_BOUNDARY - TOP_BOUNDARY) / props.rows;
    const boxWidth = (RIGHT_BOUNDARY - LEFT_BOUNDARY) / props.columns;
    const length = ({i, j}) => noise.simplex2(i * 0.1, j * 0.1);
    const angle = ({i, j}) => noise.simplex2(i * 0.01, j * 0.01) * 360;
    const field = flowfield.createField(props.rows, props.columns, {length, angle});
    if (props.show_vectors) {
      fieldGroup = drawField(field, boxWidth, boxHeight);
    }

    const particles = createParticles();

    paper.view.onFrame = () => {
      particles.forEach(particle => {
        if (!particle.dead) {
          const {x, y} = particle.pos;
          const vec = flowfield.lookup(field, boxWidth, boxHeight, x - H_MARGIN, y - V_MARGIN);
          particle.applyForce(vec);
          particle.update();
          // particle.draw();
          drawParticle(particle);
        }
      });
    }
    return particles;
  }

  let particles = run();

  function save () {
    saveAsSVG(paper.project, props.name);
  }
}

// Field functions
function drawField (field, boxWidth, boxHeight) {
  const group = new Group();
  for (let i = 0; i < field.length; i++) {
    for (let j = 0; j < field[i].length; j++) {
      const vec = field[i][j];
      const from = new Point((boxWidth / 2) + boxWidth * i, (boxHeight / 2) + boxHeight * j);
      const to = from.add(vec.multiply(10));
      group.addChild(new Path.Circle({fillColor: 'red', radius: 2, center: from}));
      group.addChild(new Path.Line({
        strokeColor: 'black',
        from,
        to
      }));
    }
  }
  return group;
}

// Pen Choice
function choosePen (pens, pos, noiseRate = 0.001) {
  const x = pos[0] * noiseRate;
  const y = pos[1] * noiseRate;
  const i = Math.floor(Math.abs(noise.simplex2(x, y)) * pens.length);
  return pens[i];
}

function followMouse () {
  const [width, height] = STRATH_SMALL.landscape;
  const canvas = createCanvas(STRATH_SMALL.landscape);
  paper.setup(canvas);

  const LEFT_BOUNDARY = paper.view.bounds.left + H_MARGIN;
  const RIGHT_BOUNDARY = paper.view.bounds.right - H_MARGIN;
  const TOP_BOUNDARY = paper.view.bounds.top + V_MARGIN;
  const BOTTOM_BOUNDARY = paper.view.bounds.bottom - V_MARGIN;
  const bounds = {
    left: LEFT_BOUNDARY,
    right: RIGHT_BOUNDARY,
    top: TOP_BOUNDARY,
    bottom: BOTTOM_BOUNDARY
  };

  const particles = [];
  for (let i = 0; i < 20; i++) {
    particles.push(new Particle({
      pos: [random(width), random(height)],
      maxPoints: 1000,
      maxSpeed: 10
    }));
  }
  let mouse = new Point(width / 2, height / 2);
  paper.view.onMouseMove = (event) => {
    mouse = event.point;
  }

  paper.view.onFrame = () => {
    particles.forEach(particle => {
      if (!particle.dead) {
        if (particle.path) particle.path.remove();
        const distance = particle.pos.getDistance(mouse);
        const vec = mouse.subtract(particle.pos);
        vec.length = distance / 100;
        particle.applyForce(vec);
        particle.update();
        // particle.draw();
        drawParticle(particle);
      }
    });
  }
}

async function fromImage () {
  const image = await loadImage(img);
  const orientation = image.width > image.height ? STRATH_SMALL.landscape : STRATH_SMALL.portrait;
  const [width, height] = orientation;
  const canvas = createCanvas(orientation, {hidden: false});
  paper.setup(canvas);
  const raster = new Raster(img);
  raster.onLoad = () => {
    const scale = Math.max(width, height) / Math.max(raster.width, raster.height) * 0.8;
    raster.setSize(raster.width * scale, raster.height * scale);
    raster.translate(width/2, height/2);

    const box = new Path.Rectangle({
      from: [100, 200],
      to: [200, 300]
    });
    kmeans(raster, box);
  }

  /**
   * Find angle by getting average
   */
  function kmeans (raster, box) {
    // Can I use linear regression to find edges in images?
    const average = raster.getAverageColor(box);
    box.fillColor = average;
    const nCentroids = 2;
    const centroids = [];
    for (let i = 0; i < nCentroids; i++) {
      centroids.push(new Point([random(box.bounds.left, box.bounds.right), random(box.bounds.top, box.bounds.bottom)]));
    }

    for (let i = 0; i < nCentroids; i++) {
      new Path.Circle({
        fillColor: 'red',
        radius: 2,
        center: centroids[i]
      });
    }

    const centroidVector = centroids[1].subtract(centroids[0]);
    const meanCenter = centroids[0].add(centroidVector.divide(2));
    const perpendicular = centroidVector.normalize().rotate(90);
    const boundaryLine = new Path.Line({
      from: meanCenter.add(perpendicular.multiply(centroidVector.length)),
      to: meanCenter.subtract(perpendicular.multiply(centroidVector.length)),
      strokeColor: 'red'
    });

    // Now start moving the points.
  }
}

function processOptions (options, input) {
  const ret = {};
  for (let name in options) {
    if (isFunction(options[name])) {
      ret[name] = options[name](input);
    } else {
      ret[name] = options[name];
    }
  }
  return ret;
}

basic();
// followMouse();
// fromImage();
