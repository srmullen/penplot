import { Point, Group, Path } from 'paper';
import { flatten } from 'lodash';
import { constrain, processOptions, choose } from 'common/utils';
import { random } from 'mathjs';

// export function createField (rows, columns, {noise_rate = 0.01}={}) {
export function createField (rows, columns, {length, angle}={}) {
  const field = [];
  for (let i = 0; i < columns; i++) {
    const column = [];
    for (let j = 0; j < rows; j++) {
      const vec = new Point({
        // length: 1,
        // angle: math.random(0, 360)
        length: length({i, j}),
        angle: angle({i, j})
      });
      column.push(vec);
    }
    field.push(column);
  }
  return field;
}

export function lookup (field, boxWidth, boxHeight, x, y) {
  const column = Math.floor(x / boxWidth);
  const row = Math.floor(y / boxHeight);
  try {
    return field[column][row];
  } catch (e) {
    console.log(x, y, column, row);
    console.error("Not in Field");
  }
}

export function drawField (field, boxWidth, boxHeight) {
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

export class Particle {
  constructor ({
    pos, maxPoints = 20, maxSpeed = 2, pen,
    bounds = {}
  }) {
    this.pos = new Point(pos);
    this.points = [this.pos];
    this.velocity = new Point(0, 0);
    this.acceleration = new Point(0, 0);
    this.maxSpeed = maxSpeed;
    this.maxPoints = maxPoints;
    this.dead = false;
    this.pen = pen;
    this.bounds = bounds;
  }

  applyForce (force) {
    this.acceleration = this.acceleration.add(force);
  }

  // Apply the position from the accumulated forces and save the result.
  update () {
    this.velocity = this.velocity.add(this.acceleration);
    this.velocity.length = this.maxSpeed;
    const pos = this.pos.add(this.velocity);
    if (pos.x <= this.bounds.left || pos.x >= this.bounds.right) {
      this.kill();
    } else if (pos.y <= this.bounds.top || pos.y >= this.bounds.bottom) {
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

  static randomParticles (numParticles, opts) {
    const particles = [];
    for (let i = 0; i < numParticles; i++) {
      const pos = [random(opts.bounds.left, opts.bounds.right), random(opts.bounds.top, opts.bounds.bottom)];
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
    const step = (opts.bounds.bottom - opts.bounds.top) / nParticles;
    for (let i = 0; i < nParticles; i++) {
      const x = constrain(xPos + random(-2, 2), opts.bounds.left, opts.bounds.right);
      const y = constrain(
        (opts.bounds.top + step/2) + (i * step) + random(-2, 2),
        opts.bounds.top,
        opts.bounds.bottom
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
    const step = (opts.bounds.right - opts.bounds.left) / nColumns;
    const particles = [];
    for (let i = 0; i < nColumns; i++) {
      particles.push(this.particleColumn(particlesPerColumn, opts.bounds.left + (i * step), opts));
    }
    return flatten(particles);
  }
}
