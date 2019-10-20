import paper, { Point, Path } from 'paper';
import math, { random, randomInt } from 'mathjs';
import { range, sortBy, countBy, last, flatten, isArray } from 'lodash';
import dat from 'dat.gui';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, choose, maprange, radiansToDegrees, clipBounds, processOptions
} from 'common/utils';
import * as pens from 'common/pens';
import * as palettes from 'common/palettes';

window.paper = paper;

/**
 * This was implemented with the help of 
 * http://jamie-wong.com/2014/08/19/metaballs-and-marching-squares/
 */

class Ball {
  constructor(pos, radius, opts = {}) {
    this.pos = pos;
    this.radius = radius;
    this.vel = new Point(random(), random());
    this.acc = new Point(0, 0);
  }

  applyForce(force) {
    this.acc = this.acc.add(force);
  }

  update() {
    this.vel = this.vel.add(this.acc);
    this.pos = this.pos.add(this.vel);
    this.acc = new Point(0, 0);
    if (this.item) {
      this.item.translate(this.vel);
    }
  }

  draw() {
    this.item = new Path.Circle({
      center: pos,
      radius,
      ...opts,
    });
  }
}

function circleVal(center, radius, x, y) {
  return Math.pow(radius, 2) / (Math.pow(x - center.x, 2) + Math.pow(y - center.y, 2));
}

/**
 * 
 * @param {Cell.bounds} bounds 
 * @param {Ball[]} balls 
 * @return {[number, number, number, number]} - [BL, BR, TR, TL]
 */
function getVertexValues(bounds, balls) {
  let bl = 0;
  let br = 0;
  let tr = 0;
  let tl = 0;
  for (let ball of balls) {
    // Bottom-left
    bl += circleVal(ball.pos, ball.radius, bounds.left, bounds.bottom);
    // bottom-right
    br += circleVal(ball.pos, ball.radius, bounds.right, bounds.bottom);
    // top-right
    tr += circleVal(ball.pos, ball.radius, bounds.right, bounds.top);
    // top-left
    tl += circleVal(ball.pos, ball.radius, bounds.left, bounds.top);
  }
  return [bl, br, tr, tl];
}

function getCellType([bl, br, tr, tl]) {

  const BL_MASK = 1;
  const BR_MASK = 2;
  const TR_MASK = 4;
  const TL_MASK = 8;
  let type = 0;
  if (bl > 1) {
    type = type | BL_MASK;
  }
  if (br > 1) {
    type = type | BR_MASK;
  }
  if (tr > 1) {
    type = type | TR_MASK;
  }
  if (tl > 1) {
    type = type | TL_MASK;
  }
  return type;
}

/**
 * Returns the value of the x,y position. 1 is the radius of the circle. n < 1 = outside circle. n > 1 = inside circle.
 * @param {Ball[]} balls 
 * @param {Number} x 
 * @param {Number} y 
 */
function ballsContain(balls, x, y) {
  let sum = 0;
  for (let ball of balls) {
    const n = Math.pow(ball.radius, 2) / (Math.pow(x - ball.pos.x, 2) + Math.pow(y - ball.pos.y, 2));
    sum += n;
  }
  return sum;
}

class Cell {
  constructor(from, to, showCell=false) {
    this.from = from;
    this.to = to;
    if (showCell) {
      this.square = new Path.Rectangle(from, to);
      this.square.strokeColor = 'black';
    }
    const top = Math.min(from.y, to.y);
    const left = Math.min(from.x, to.x);
    const bottom = Math.max(from.y, to.y);
    const right = Math.max(from.x, to.x);
    const cx = left + (right - left) / 2;
    const cy = top + (bottom - top) / 2;
    this.bounds = {
      top,
      left,
      bottom,
      right,
      center: { x: cx, y: cy }
    };
  }

  drawPathInterpolation(balls) {
    if (this.path1) {
      this.path1.remove();
    }
    if (this.path2) {
      this.path2.remove();
    }

    const vertexVals = getVertexValues(this.bounds, balls);
    const type = getCellType(vertexVals);
    const [bl, br, tr, tl] = vertexVals;
    
    const left = new Point(
      this.bounds.left,
      lerp(this.bounds.top, this.bounds.bottom, tl, bl)
    );
    const bottom = new Point(
      lerp(this.bounds.left, this.bounds.right, bl, br),
      this.bounds.bottom
    );
    const right = new Point(
      this.bounds.right,
      lerp(this.bounds.top, this.bounds.bottom, tr, br)
    );
    const top = new Point(
      lerp(this.bounds.left, this.bounds.right, tl, tr),
      this.bounds.top
    );

    function lerp(ay, cy, fa, fc) {
      return ay + (cy - ay) * ((1 - fa) / (fc - fa));
    }

    // IDEA: Could the direction of the line indicate which point it contains. Not currently implemented.
    let s1, s2;
    if (type === 1) {
      s1 = [left, bottom];
    } else if (type === 2) {
      s1 = [bottom, right];
    } else if (type === 3) {
      s1 = [left, right];
    } else if (type === 4) {
      s1 = [top, right];
    } else if (type === 5) {
      s1 = [left, top];
      s2 = [right, bottom];
    } else if (type === 6) {
      s1 = [top, bottom];
    } else if (type === 7) {
      s1 = [left, top];
    } else if (type === 8) {
      s1 = [left, top];
    } else if (type === 9) {
      s1 = [top, bottom];
    } else if (type === 10) {
      s1 = [left, bottom];
      s2 = [top, right];
    } else if (type === 11) {
      s1 = [top, right];
    } else if (type === 12) {
      s1 = [left, right];
    } else if (type === 13) {
      s1 = [bottom, right];
    } else if (type === 14) {
      s1 = [left, bottom];
    }
    if (s1) {
      this.path1 = new Path({
        segments: s1,
        strokeColor: 'red'
      });
    }
    if (s2) {
      this.path2 = new Path({
        segments: s2,
        strokeColor: 'red'
      });
    }
  }

  draw(type) {
    if (this.path1) {
      this.path1.remove();
    }
    if (this.path2) {
      this.path2.remove();
    }
    const left = new Point(this.bounds.left, this.bounds.center.y);
    const bottom = new Point(this.bounds.center.x, this.bounds.bottom);
    const right = new Point(this.bounds.right, this.bounds.center.y);
    const top = new Point(this.bounds.center.x, this.bounds.top);
    
    // IDEA: Could the direction of the line indicate which point it contains. Not currently implemented.
    let s1, s2;
    if (type === 1) {
      s1 = [left, bottom]
    } else if (type === 2) {
      s1 = [bottom, right];
    } else if (type === 3) {
      s1 = [left, right];
    } else if (type === 4) {
      s1 = [top, right];
    } else if (type === 5) {
      s1 = [left, top];
      s2 = [right, bottom];
    } else if (type === 6) {
      s1 = [top, bottom];
    } else if (type === 7) {
      s1 = [left, top];
    } else if (type === 8) {
      s1 = [left, top];
    } else if (type === 9) {
      s1 = [top, bottom];
    } else if (type === 10) {
      s1 = [left, bottom];
      s2 = [top, right];
    } else if (type === 11) {
      s1 = [top, right];
    } else if (type === 12) {
      s1 = [left, right];
    } else if (type === 13) {
      s1 = [bottom, right];
    } else if (type === 14) {
      s1 = [left, bottom];
    } else if (type === 15) {
      // s1 = [];
    }
    if (s1) {
      this.path1 = new Path({
        segments: s1,
        strokeColor: 'red'
      });
    }
    if (s2) {
      this.path2 = new Path({
        segments: s2,
        strokeColor: 'red'
      });
    }
  }
}

function bouncyBalls() {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const grid = [];
  const nx = 70;
  const ny = 40;
  const size = 10;
  for (let y = 0; y < ny; y++) {
    const row = [];
    for (let x = 0; x < nx; x++) {
      const from = new Point(x * size, y * size);
      const to = new Point((x + 1) * size, (y + 1) * size);
      const square = new Path.Rectangle(from, to);
      // const cell = new Cell(from, to);
      square.strokeColor = 'black';
      row.push(square);
    }
    grid.push(row);
  }

  function ballsContain(balls, x, y) {
    let sum = 0;
    for (let ball of balls) {
      const n = Math.pow(ball.radius, 2) / (Math.pow(x - ball.pos.x, 2) + Math.pow(y - ball.pos.y, 2));
      sum += n;
    }
    return sum;
  }

  const balls = [];
  for (let i = 0; i < 10; i++) {
    const radius = random(20, 50);
    const center = new Point(random(radius, width-radius), random(radius, height-radius));
    balls.push(new Ball(center, radius, {
      strokeColor: 'green'
    }));
  }

  function step() {
    for (let ball of balls) {
      if(ball.pos.x < ball.radius || ball.pos.x > width - ball.radius) {
        ball.vel.x = -ball.vel.x;
      }
      if (ball.pos.y < ball.radius || ball.pos.y > height - ball.radius) {
        ball.vel.y = -ball.vel.y;
      }

      ball.update();
    }

    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const square = grid[y][x];
        const center = square.position;
        const val = ballsContain(balls, center.x, center.y);
        if (val > 1) {
          square.fillColor = 'green';
        } else {
          square.fillColor = null;
        }
      }
    }
  }

  paper.view.onFrame = () => {
    step();
  }
}
// bouncyBalls();

function marchingSquares() {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  // const nx = 170;
  // const ny = 100;
  // const size = 5;

  const nx = 70;
  const ny = 25;
  const size = 20;

  const grid = [];
  for (let y = 0; y < ny; y++) {
    const row = [];
    for (let x = 0; x < nx; x++) {
      const from = new Point(x * size, y * size);
      const to = new Point((x + 1) * size, (y + 1) * size);
      const cell = new Cell(from, to);
      row.push(cell);
    }
    grid.push(row);
  }

  const balls = [];
  for (let i = 0; i < 20; i++) {
    const radius = random(20, 50);
    const center = new Point(random(radius, width - radius), random(radius, height - radius));
    balls.push(new Ball(center, radius, {
      strokeColor: 'green'
    }));
  }

  outline(grid, balls);

  const palette = palettes.palette_large.map((pen) => pens.info(pen).color);

  function outline(grid, balls,) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const cell = grid[y][x];
        cell.drawPathInterpolation(balls);
      }
    }
  }

  // animate();

  function animate() {
    function step() {
      for (let ball of balls) {
        if (ball.pos.x < ball.radius || ball.pos.x > width - ball.radius) {
          ball.vel.x = -ball.vel.x;
        }
        if (ball.pos.y < ball.radius || ball.pos.y > height - ball.radius) {
          ball.vel.y = -ball.vel.y;
        }

        ball.update();

        outline(grid, balls);
      }
    }

    paper.view.onFrame = () => {
      step();
    }
  }
}
marchingSquares();

function brownianIslands() {
  
}
