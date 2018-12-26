import paper, { Point, Path } from 'paper';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import { saveAsSVG, intersects, radiansToDegrees, timer } from 'common/utils';
import math, { random } from 'mathjs';

math.config({randomSeed: 101});

const [width, height] = STRATH_SMALL.landscape;
const canvas = createCanvas(STRATH_SMALL.landscape);

paper.setup(canvas);
window.paper = paper;

const branches = [];
const NODE_RADIUS = 10;
const NODE_BRANCHES = 3;
const DEPTH = 25;

function Node (pos, direction, radius) {
  this.pos = pos;
  this.direction = direction.normalize();
  this.radius = radius;
}

function Branch (start, end) {
  this.start = start;
  this.end = end;
}

Branch.prototype.show = function () {
  new Path.Line({
    from: this.start.pos,
    to: this.end.pos,
    strokeColor: 'black'
  });
}

function drawOnce () {
  const pointDist = 25;
    // Does and entire tree before moving on to the next. needs to take a step for each tree.
    const n1 = new Node(new Point(width/2 - pointDist, height/2 - pointDist), random2D(), NODE_RADIUS);
    const n2 = new Node(new Point(width/2 + pointDist, height/2 - pointDist), random2D(), NODE_RADIUS);
    const n3 = new Node(new Point(width/2 - pointDist, height/2 + pointDist), random2D(), NODE_RADIUS);
    const n4 = new Node(new Point(width/2 + pointDist, height/2 + pointDist), random2D(), NODE_RADIUS);

    let done = false;
    const tree1 = treeGen(n1, DEPTH);
    const tree2 = treeGen(n2, DEPTH);
    const tree3 = treeGen(n3, DEPTH);
    const tree4 = treeGen(n4, DEPTH);
    while (!done) {
      const y1 = tree1.next();
      const y2 = tree2.next();
      const y3 = tree3.next();
      const y4 = tree4.next();
      done = (y1.done && y2.done && y3.done && y4.done);
    }
    console.log("Done");
}

function random2D () {
  return new Point(random(-1, 1), random(-1, 1)).normalize();
}

/**
 * @param {Number} radius
 * @param {Vector} direction
 */
function getRadius (radius, direction) {
  return NODE_RADIUS;

  // return p5.random(5, 20);

  // if (radius < 3) {
  //   return radius;
  // } else {
  //   return radius / 1.3;
  // }
}

function getNumBranches () {
  // Constant
  return NODE_BRANCHES;

  // Random Number
  // return Math.floor(p5.random(1, 4));

  // Other options.
  // 1. weighted random.
  // 2. Probability dist.
}

function rotation () {
  return radiansToDegrees(random(-0.5, 0.5));
  // return p5.random(-1, 1);

  // Other options
  // 1. Use a flow field.
}

function* treeGen (node, depth) {
  const layer = [];
  const nbranches = getNumBranches();
  for (let i = 0; i < nbranches; i++) {
    const b = branch(node, branches);
    if (b) {
      b.show();
      layer.push(b);
      branches.push(b);
    }
    yield b;
  }

  if (depth > 0) {
    for (let i = 0; i < layer.length; i++) {
      const branch = layer[i];
      if (withinBoundary(branch.end.pos)) {
        yield* treeGen(branch.end, depth-1);
      }
    }
  }
}

function branch (node, branches) {
  // Randomly adjust the direction slightly.
  // let direction = Vector.fromAngle(node.direction.heading() + rotation());
  let direction = new Point({
    length: node.radius,
    angle: node.direction.angle + rotation()
  });
  // let branchEnd = node.pos.add(direction.multiply(node.radius));
  let branchEnd = node.pos.add(direction);
  const intersections = branches.map(branch => {
    return intersects(
      branch.start.pos.x, branch.start.pos.y, branch.end.pos.x, branch.end.pos.y,
      node.pos.x, node.pos.y, branchEnd.x, branchEnd.y
    );
  });
  if (!intersections.length || !intersections.some(i => i)) {
    return new Branch(node, new Node(branchEnd, direction, getRadius(node.radius, direction)));
  }
}

const boundaryRadius = 300;

function withinBoundary (point) {
  // const center = p5.createVector(p5.width/2, p5.height/2);
  // return p5.dist(p5.width/2, p5.height/2, point.x, point.y) < boundaryRadius;
  const center = new Point(width / 2, height / 2);
  return center.getDistance(point) < boundaryRadius;
}

// function drawBoundary () {
//   p5.stroke(0);
//   p5.ellipse(p5.width/2, p5.height/2, boundaryRadius * 2, boundaryRadius * 2);
// }

drawOnce();

// Time without lzstring: 92502
// Time with lzstring.compress: 89443 Not loading in Inkscape!
window.saveAsSVG = (name) => {
  timer(() => saveAsSVG(paper.project, name));
}
