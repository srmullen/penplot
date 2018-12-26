import paper, { Point, Path, Group } from 'paper';
import { last, flatten, isFunction } from 'lodash';
import please from 'pleasejs';
import { Noise } from 'noisejs';
import dat from 'dat.gui';
import { STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, radiansToDegrees, choose, constrain
} from 'common/utils';
import math, { random } from 'mathjs';
import * as pens from 'common/pens';

const [width, height] = STRATH_SMALL.landscape;
const canvas = createCanvas(STRATH_SMALL.landscape);

paper.setup(canvas);
window.paper = paper;
window.math = math;

const noise = new Noise();
window.noise = noise;

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

const LEFT_BOUNDARY = paper.view.bounds.left + H_MARGIN;
const RIGHT_BOUNDARY = paper.view.bounds.right - H_MARGIN;
const TOP_BOUNDARY = paper.view.bounds.top + V_MARGIN;
const BOTTOM_BOUNDARY = paper.view.bounds.bottom - V_MARGIN;

class Particle {
  constructor ({pos, maxPoints = 20, maxSpeed = 2, pen=choose(pens.prisma05)}) {
    this.pos = new Point(pos);
    this.points = [this.pos];
    this.velocity = new Point(0, 0);
    this.acceleration = new Point(0, 0);
    this.maxSpeed = maxSpeed;
    this.maxPoints = maxPoints;
    this.dead = false;
    this.pen = pen;
  }

  applyForce (force) {
    this.acceleration = this.acceleration.add(force);
  }

  // Apply the position from the accumulated forces and save the result.
  update () {
    this.velocity = this.velocity.add(this.acceleration);
    this.velocity.length = this.maxSpeed;
    const pos = this.pos.add(this.velocity);
    if (pos.x <= LEFT_BOUNDARY || pos.x >= RIGHT_BOUNDARY) {
      this.kill();
    } else if (pos.y <= TOP_BOUNDARY || pos.y >= BOTTOM_BOUNDARY) {
      this.kill();
    } else if (this.points.length > this.maxPoints) {
      this.kill();
    } else {
      this.pos = pos;
      this.points.push(this.pos);
      this.acceleration = this.acceleration.multiply(0);
    }
  }

  kill () {
    this.dead = true;
    if (this.path) {
      this.path.simplify();
      this.path.smooth({type: 'geometric'});
    }
  }

  path = null;

  draw (pen) {
    if (this.path) {
      this.path.remove();
    }
    pens.withPen(this.pen, ({color, strokeWidth}) => {
      this.path = new Path({
        strokeColor: color,
        segments: this.points,
        strokeWidth
      });
    });
  }

  static randomParticles (numParticles, opts) {
    const particles = [];
    for (let i = 0; i < numParticles; i++) {
      const pos = [random(LEFT_BOUNDARY, RIGHT_BOUNDARY), random(TOP_BOUNDARY, BOTTOM_BOUNDARY)];
      const pOpts = processOptions(opts, {pos});
      particles.push(new Particle({
        pos,
        ...pOpts
      }));
    }
    return particles;
  }

  static particleColumn (nParticles, xPos, opts) {
    const particles = [];
    const step = (BOTTOM_BOUNDARY - TOP_BOUNDARY) / nParticles;
    for (let i = 0; i < nParticles; i++) {
      const x = constrain(xPos + random(-2, 2), LEFT_BOUNDARY, RIGHT_BOUNDARY);
      const y = constrain(
        (TOP_BOUNDARY + step/2) + (i * step) + random(-2, 2),
        TOP_BOUNDARY,
        BOTTOM_BOUNDARY
      );
      const pos = [x, y];
      const pOpts = processOptions(opts, {pos});
      particles.push(new Particle({
        pos,
        ...pOpts
      }));
    }
    return particles;
  }

  static particleColumns (nColumns = 30, particlesPerColumn = 20, opts) {
    const step = (RIGHT_BOUNDARY - LEFT_BOUNDARY) / nColumns;
    const particles = [];
    for (let i = 0; i < nColumns; i++) {
      particles.push(this.particleColumn(particlesPerColumn, LEFT_BOUNDARY + (i * step), opts));
    }
    return flatten(particles);
  }
}

function basic () {
  // TODO:
  // 2. Adjust field vectors while running.
  // 4. Smoothing options

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
        pen: ({pos}) => choosePen(PEN_SET, pos)
      };
      // const opts = {maxPoints: () => choose([10, 100])};
      return Particle.randomParticles(props.num_particles, opts);
    },
    columns: () => {
      const { particle_columns, particlesPerColumn } = props.particle_column;
      const opts = {
        maxPoints: props.max_points,
        pen: ({pos}) => choosePen(PEN_SET, pos)
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
    const field = createField(props.rows, props.columns, {noise_rate: props.noise_rate});
    if (props.show_vectors) {
      fieldGroup = drawField(field, boxWidth, boxHeight);
    }

    const particles = createParticles();

    paper.view.onFrame = () => {
      particles.forEach(particle => {
        if (!particle.dead) {
          const {x, y} = particle.pos;
          const vec = lookup(field, boxWidth, boxHeight, x, y);
          particle.applyForce(vec);
          particle.update();
          particle.draw();
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

function createField (rows, columns, {noise_rate = 0.01}) {
  const field = [];
  for (let i = 0; i < columns; i++) {
    const column = [];
    for (let j = 0; j < rows; j++) {
      const vec = new Point({
        // length: 1,
        // angle: math.random(0, 360)
        length: noise.simplex2(i * 0.1, j * 0.1),
        angle: noise.simplex2(i * noise_rate, j * noise_rate) * 360
      });
      column.push(vec);
    }
    field.push(column);
  }
  return field;
}

function lookup (field, boxWidth, boxHeight, x, y) {
  const column = Math.floor((x - H_MARGIN) / boxWidth);
  const row = Math.floor((y - V_MARGIN) / boxHeight);
  try {
    return field[column][row];
  } catch (e) {
    console.log(x, y, column, row);
    console.error("Not in Field");
    // paper.view.onFrame = () => {}

  }
}

// Pen Choice
function choosePen (pens, pos, noiseRate = 0.001) {
  const x = pos[0] * noiseRate;
  const y = pos[1] * noiseRate;
  const i = Math.floor(Math.abs(noise.simplex2(x, y)) * pens.length);
  return pens[i];
}

function followMouse () {
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
        particle.draw()
      }
    });
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
