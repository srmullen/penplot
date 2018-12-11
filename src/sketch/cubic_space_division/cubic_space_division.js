import paper, { Point, Path } from 'paper';
import { minBy, maxBy } from 'lodash';
import PolyBool from 'polybooljs';
import { A4, createCanvas } from 'common/setup';
import {
  saveAsSVG, intersects, intersection, radiansToDegrees
} from 'common/utils';
import math, { random, matrix } from 'mathjs';
import { vec3, rotationXMatrix, rotationYMatrix, rotationZMatrix } from 'common/matrix';

const [width, height] = A4.landscape;
const canvas = createCanvas(A4.landscape);
paper.setup(canvas);
window.PolyBool = PolyBool;

let viewProjectionMatrix;

const lw = 0.25; // Line width?
const ll = 5; // Camera distance?
const dim = 14; // Number of layers?

const polygons = [];
function walk (i) {
  // for (let i = 0; i < 200; i++) {
  //   const polygon = new Polygon();
  //   polygon.createPoly(
  //     math.random(width),
  //     math.random(height),
  //     math.randomInt(3, 8), math.random(10, 30), 0
  //   );
  //   polygons.map(poly => {
  //     polygon.diff(poly);
  //   });
  //   polygon.draw();
  //   polygons.push(polygon);
  // }

  const poly1 = {
    regions: [
      [[50,50], [150,50], [150,150], [50, 150]]
    ],
    inverted: false
  }
  const poly2 = {
    regions: [
      [[150,50], [250,50], [250,150], [150, 150]]
    ],
    inverted: false
  }
  // drawPath(poly1);
  // drawPath(poly2);
  drawPath(PolyBool.difference(poly2, poly1));
}

function drawPath (poly) {
  const paths = poly.regions.map(region => {
    return new Path({
      strokeColor: 'black',
      segments: region,
      closed: true
    });
  });
  return paths;
}

function LineSegment (p1, p2) {
  this.p1 = p1;
  this.p2 = p2;
}

function Polygon () {
  this.cp = []; // Clip path: array of [x, y] pairs.
  this.dp = []; // 2d line to draw: array of linesegments
}

Polygon.prototype.genDrawPath = function () {
  this.dp = [];
  for (let i = 0, l = this.cp.length; i < l; i++) {
    this.dp.push(this.cp[i]);
  }
}

/**
 * @param {Number} x - Center x position.
 * @param {Number} y - Center y position.
 * @param {Number} c - Number of vertices in the polygon.
 * @param {Number} r - Radius of the polygon.
 * @param {Number} a - Angle
 */
Polygon.prototype.createPoly = function (x, y, c, r, a) {
  this.cp = [];
  for (let i = 0; i < c; i++) {
    this.cp.push([
      x + Math.sin(i * Math.PI*2 / c + a) * r,
      y + Math.cos(i * Math.PI*2 / c + a) * r
    ]);
  }
  this.genDrawPath();
}

Polygon.prototype.draw = function () {
  if (this.dp.length === 0 ) {
    return;
  }

  const path = new Path({
    strokeColor: 'black',
    segments: [...this.dp, this.dp[0]]
  });
}

Polygon.prototype.diff = function (p) {
  const diff = PolyBool.difference({
    regions: [this.dp],
  }, {
    regions: [p.dp]
  });

  this.dp = diff.regions[0] || [];
}

Polygon.prototype.inside = function (p) {
  // find number of i ntersection points from p to far away
  // if even your outside
  const p1 = [0.1, -1000];
  let int = 0;
  for (let i = 0, l = this.cp.length; i < l; i++) {
    if (vec2_find_segment_intersect(p, p1, this.cp[i], this.cp[(i+1)%l])) {
      int++;
    }
  }
  return int & 1;
}

function vec2_find_segment_intersect (l1p1, l1p2, l2p1, l2p2) {
  const d = (l2p2[1] - l2p1[1]) * (l1p2[0] - l1p1[0]) - (l2p2[0] - l2p1[0]) * (l1p2[1] - l1p1[1]);
  const n_a = (l2p2[0] - l2p1[0]) * (l1p1[1] - l2p1[1]) - (l2p2[1] - l2p1[1]) * (l1p1[0] - l2p1[0]);
  const n_b = (l1p2[0] - l1p1[0]) * (l1p1[1] - l2p1[1]) - (l1p2[1] - l1p1[1]) * (l1p1[0] - l2p1[0]);
  if (d == 0) {
      return false;
  }
  const ua = n_a / d;
  const ub = n_b / d;
  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
      return [l1p1[0] + (ua * (l1p2[0] - l1p1[0])), l1p1[1] + (ua * (l1p2[1] - l1p1[1])) ];
  }
  return false;
}

walk();
