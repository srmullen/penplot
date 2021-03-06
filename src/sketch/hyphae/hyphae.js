import paper, { Point, Path, Group } from 'paper';
import { sortBy } from 'lodash';
import { Noise } from 'noisejs';
import math, { random, randomInt } from 'mathjs';
import dat from 'dat.gui';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import { saveAsSVG, intersects, radiansToDegrees, gauss } from 'common/utils';
import * as pens from 'common/pens';

const [width, height] = STRATH_SMALL.landscape;
const canvas = createCanvas(STRATH_SMALL.landscape);

const noise = new Noise();
paper.setup(canvas);
window.paper = paper;

// const PEN_SET = [
//   // pens.PRISMA05_RED,
//   pens.PRISMA05_ORANGE,
//   pens.PRISMA05_LBROWN,
//   pens.PRISMA05_DBROWN,
//   // pens.PRISMA05_PURPLE,
//   // pens.PRISMA05_BLACK,
//   // pens.PRISMA05_BLUE,
//   // pens.PRISMA05_GREEN
// ];

const PEN_SET = [
  pens.PRISMA05_BLACK,
  pens.PRISMA05_DBROWN,
  pens.PRISMA05_LBROWN,
  pens.PRISMA05_ORANGE,
].reverse();

function Node (pos, direction, radius) {
  this.pos = pos;
  this.direction = direction.normalize();
  this.radius = radius;
}

function Branch (start, end, {treeId, depth}) {
  this.start = start;
  this.end = end;
  this.treeId = treeId;
  this.depth = depth;
}

Branch.prototype.show = function (pen) {
  return pens.withPen(pen, ({color, strokeWidth}) => {
    return new Path.Line({
      from: this.start.pos,
      to: this.end.pos,
      strokeColor: color
    });
  })
}

function penByNoise (pens, pos, noiseRate = 0.001) {
  const x = pos[0] * noiseRate;
  const y = pos[1] * noiseRate;
  const i = Math.floor(Math.abs(noise.simplex2(x, y)) * pens.length);
  return pens[i];
}

function penByDepth (pens, maxDepth, depth) {
  // let index;
  // if (depth === maxDepth) {
  //   index = pens.length - 1;
  // } else {
    const index = Math.floor((1 - depth / maxDepth) * pens.length);
  // }
  // if (index >= pens.length) {
  //   console.log(maxDepth, depth);
  // }
  // console.log(index, maxDepth, depth);
  return pens[index >= pens.length ? pens.length - 1 : index];
}

function animateBranchDrawing (branches, {rate = 10, getPen}={}) {
  let bn = 0;
  const group = new Group();
  const interval = setInterval(() => {
    if (branches[bn]) {
      const branch = branches[bn];
      const pen = penByNoise(PEN_SET, [branch.start.pos.x, branch.start.pos.y], 0.01);
      group.addChild(branch.show(pen));
      ++bn;
    } else {
      clearInterval(interval);
    }
  }, rate);
  return {
    interval,
    group
  };
}

function withinCircle (center, radius, point) {
  return center.getDistance(point) < radius;
}

function withinRectangle (top, left, width, height, point) {
  const bottom = top + height;
  const right = left + width;
  const x = point.x;
  const y = point.y;
  return !(x < left || x > right || y < top || y > bottom);
}

function randomRoots (nRoots = 4, {getRadius, withinBoundary}) {
  const roots = [];
  while (roots.length < nRoots) {
    const point = new Point(random(0, width), random(0, height));
    if (withinBoundary(point)) {
      roots.push(new Node(point, random2D(), getRadius()));
    }
  }
  return roots;
}

function spacedRoots (pointDist = 25, getRadius) {
  return [
    new Node(new Point(width/2 - pointDist, height/2 - pointDist), random2D(), getRadius()),
    new Node(new Point(width/2 + pointDist, height/2 - pointDist), random2D(), getRadius()),
    new Node(new Point(width/2 - pointDist, height/2 + pointDist), random2D(), getRadius()),
    new Node(new Point(width/2 + pointDist, height/2 + pointDist), random2D(), getRadius())
  ];
}

function random2D () {
  return new Point(random(-1, 1), random(-1, 1)).normalize();
}

function* treeGen (node, depth, branches, fns, group, treeId) {
  const {getRadius, getNumBranches, withinBoundary, rotation} = fns;
  const layer = [];
  const nbranches = getNumBranches();
  for (let i = 0; i < nbranches; i++) {
    const b = branch(node, branches, getRadius, rotation, treeId, depth);
    if (b) {
      if (group) {
        group.addChild(b.show());
      }
      layer.push(b);
      branches.push(b);
    }
    yield b;
  }

  if (depth > 0) {
    for (let i = 0; i < layer.length; i++) {
      const branch = layer[i];
      if (withinBoundary(branch.end.pos)) {
        yield* treeGen(branch.end, depth-1, branches, fns, group, treeId);
      }
    }
  }
}

function branch (node, branches, getRadius, rotation, treeId, depth) {
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
    return new Branch(
      node,
      new Node(branchEnd, direction, getRadius(node.radius, direction)),
      {treeId, depth}
    );
  }
}

function start () {
  const props = {
    seed: 0,
    radiusMin: 10,
    radiusMax: 10,
    radiusDistribution: 'uniform',
    branchesMin: 3,
    branchesMax: 3,
    rotationMin: -0.5,
    rotationMax: 0.5,
    branchesDistribution: 'uniform',
    roots: 4,
    depth: 15,
    boundaryRadius: 300,
    animate: false,
    run
  };

  const gui = new dat.GUI();
  gui.add(props, 'seed');
  gui.add(props, 'radiusMin');
  gui.add(props, 'radiusMax');
  gui.add(props, 'branchesMin').step(1);
  gui.add(props, 'branchesMax').step(1);
  gui.add(props, 'rotationMin');
  gui.add(props, 'rotationMax');
  gui.add(props, 'depth');
  gui.add(props, 'boundaryRadius');
  gui.add(props, 'roots').step(1);
  gui.add(props, 'animate');
  gui.add(props, 'run');

  let group = new Group();

  let interval = null;
  function run () {
    group.remove();
    clearInterval(interval);

    if (props.seed) {
      math.config({randomSeed: props.seed});
    }

    const center = new Point(width / 2, height / 2);
    const fns = {
      getRadius: () => random(props.radiusMin, props.radiusMax),
      getNumBranches: () => randomInt(props.branchesMin, props.branchesMax),
      withinBoundary: (point) => {
        // return withinCircle(center, props.boundaryRadius, point);
        return withinRectangle(100, 100, width - 200, height - 200, point);
      },
      rotation: () => {
        return radiansToDegrees(random(props.rotationMin, props.rotationMax));
      }
    };

    // const roots = spacedRoots(25, fns.getRadius);
    const roots = randomRoots(props.roots, fns);
    let done = false;
    // group = new Group();
    group = null;
    const branches = [];
    const trees = roots.map((root, i) => treeGen(root, props.depth, branches, fns, group, i+1));
    while (!done) {
      const nexts = trees.map(tree => tree.next());
      done = nexts.every(({done}) => done);
    }
    console.log("Done");

    if (props.animate) {
      const animation = animateBranchDrawing(sortBy(branches, branch => branch.treeId));
      interval = animation.interval;
      group = animation.group;
    } else {
      group = new Group();
      group.addChildren(sortBy(branches, branch => branch.treeId).map(branch => {
        // const pen = penByNoise(PEN_SET, [branch.start.pos.x, branch.start.pos.y], 0.01);
        const pen = penByDepth(PEN_SET, props.depth, branch.depth);
        return branch.show(pen);
      }));
    }
  }

  run();
}

start();

window.saveAsSVG = (name) => {
  timer(() => saveAsSVG(paper.project, name));
}
