import paper, { Point, Path, Group } from 'paper';
import math, { random, randomInt } from 'mathjs';
import { Noise } from 'noisejs';
import P5 from 'p5';
import dat from 'dat.gui';
import { sortBy, isArray } from 'lodash';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, gauss, choose, wchoose, lerp, processOptions, clipBounds
} from 'common/utils';
import * as pens from 'common/pens';

class KDTree {
  constructor() {
    this.points = [];
  }

  /**
   * @param {Point} point
   */
  insert(point) {
    this.points.push(point);
  }
}

function kdtree_test() {
  const PAPER_SIZE = A4.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const tree = new KDTree();
  const point = new Point(random(width), random(height));
  new Path.Circle({
    center: point,
    radius: 5,
    fillColor: 'red'
  })
  tree.insert(point);
}
kdtree_test();

class Circle {
  constructor({center = [0, 0], radius = 1, vector = [0, 0]} = {}) {
    this.center = new Point(center);
    this.radius = radius;
    this.vector = new Point(vector);
  }

  update() {
    this.center = this.center.add(this.vector);
  }

  draw() {
    this.remove();

    this.path = new Path.Circle({
      center: this.center,
      radius: this.radius,
      strokeColor: 'black'
    });
  }

  remove() {
    if (this.path) {
      this.path.remove();
      this.path = undefined;
    }
  }
}

function A_1() {
  const PAPER_SIZE = A4.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const N_CIRCLES = 20;
  const SPEED = 2;

  const circles = [];
  for (let i = 0; i < N_CIRCLES; i++) {
    const radius = random(20, 50);
    const center = [random(radius, width - radius), random(radius, height - radius)];
    const vector = new Point(random(-1, 1), random(-1, 1)).normalize().multiply(SPEED);
    const circle = new Circle({center, radius, vector});
    circle.draw();
    circles.push(circle);
  }

  let updated = circles;
  // paper.view.onFrame = () => {
  //   updated = updated.reduce((acc, circle, i) => {
  //     if (circle.center.x < 0 || circle.center.x > width || circle.center.y < 0 || circle.center.y > height) {
  //       circle.remove();
  //       // console.log(updated.length);
  //       return acc;
  //     }
  //     circle.update();
  //     circle.draw();
  //     for (let j = 0; j < updated.length; j++) {
  //       if (j !== i) {
  //         const intersection = circle.path.intersect(updated[j].path);
  //         intersection.fillColor = 'black';
  //         intersection.opacity = 0.01;
  //       }
  //     }
  //     acc.push(circle);
  //     return acc;
  //   }, []);
  //   if (!updated.length) {
  //     console.log('stop');
  //     paper.view.onFrame = null;
  //   }
  // }

}
// A_1();

function circleIntersection() {
  const SPEED = 1;
  const PAPER_SIZE = A4.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const c1 = new Path.Circle({
    radius: 100,
    center: [width/2 - 50, height/2],
    strokeColor: 'black'
  });
  const c2 = new Path.Circle({
    radius: 100,
    center: [width / 2 + 50, height / 2],
    strokeColor: 'black'
  });
  for (let i = 0; i < 100; i++) {
    const intersection = c1.intersect(c2);
    intersection.strokeColor = 'red';
    c1.translate(2, 1);
    c2.translate(-2, -1);
  }
}
// circleIntersection();