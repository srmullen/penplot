import paper, { Point, Path } from 'paper';
import math, { random, randomInt } from 'mathjs';
import { range, sortBy, isFunction, flatten } from 'lodash';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, choose, maprange, radiansToDegrees, clipBounds, processOptions
} from 'common/utils';
import * as pens from 'common/pens';

window.paper = paper;

const PAPER_SIZE = STRATH_SMALL.landscape;
const [width, height] = PAPER_SIZE;
const canvas = createCanvas(PAPER_SIZE);
paper.setup(canvas);

const seed = randomInt(2000);
// const seed = 492;
// const seed = 613;
console.log(seed);
// noise.seed(seed);
math.config({ randomSeed: seed });


const stateKey = (state) => `${state.position[0]}-${state.position[1]}`;

class Queue {
  constructor(items = []) {
    this.items = items;
    this.length = this.items.length;
  }

  push(item) {
    this.items.push(item);
    this.length++;
  }

  pop() {
    const [item, ...rest] = this.items;
    this.items = rest;
    this.length = rest.length;
    return item;
  }

  contains(fn) {
    return this.items.findIndex(fn) > -1;
  }
}

class StateSet {
  constructor(items = []) {
    this.order = [];
    this.items = items.reduce((acc, item) => {
      const key = this.key(item);
      this.order.push(key);
      return { ...acc, [key]: item };
    }, {});
  }

  add(item) {
    const key = this.key(item);
    if (!this.items[key]) {
      this.order.push(key);
      this.items[key] = item;
    }
  }

  contains(item) {
    const key = this.key(item);
    return !!this.items[key];
  }

  remove(item) {
    const key = this.key(item);
    delete this.items[key];
  }

  key(state) {
    return stateKey(state);
  }

  toArray() {
    return this.order.map(key => this.items[key]);
  }
}

class Problem {
  constructor(init, goal) {
    this.init = init;
    this.goal = goal;
  }

  /**
   * Return the list of actions that can be executed from the given state.
   * @param {any} state 
   */
  actions(state) {
    const dirs = [];
    const currentTile = Grid.getTile(state.grid, state.position);
    for (let dir in CARDINAL_DIRECTIONS) {
      const direction = CARDINAL_DIRECTIONS[dir];
      const tile = Grid.getTile(state.grid, state.position, direction);
      const nextPos = [state.position[0] + direction[0], state.position[1] + direction[1]];
      if (
        currentTile === tile &&
        state.previous.findIndex(prev => prev[0] === nextPos[0] && prev[1] === nextPos[1]) === -1
      ) {
        dirs.push(dir);
      }
    }
    return dirs;
  }

  /**
   * Return the state that results from executing the given action
   * @param {any} state 
   * @param {Action} action 
   */
  result({ position, grid, previous }, action) {
    const dir = DIRECTIONS[action];
    const next = [position[0] + dir[0], position[1] + dir[1]];
    return {
      position: next,
      grid,
      previous: [position, ...previous]
    };
  }

  /**
   * Returns true if the goal has been reached.
   * @param {any} state 
   */
  isGoal(state) {
    return this.actions(state).length === 0;
  }
}

class Node {
  constructor(state, parent, action, cost = 0) {
    this.state = state;
    this.parent = parent;
    this.action = action;
    this.cost = cost;
  }

  /**
   * List the nodes reachable in one step from this node.
   */
  expand(problem) {
    const actions = problem.actions(this.state);
    return actions.map(action => this.child(problem, action));
  }

  /**
   * 
   */
  child(problem, action) {
    const next = problem.result(this.state, action);
    return new Node(next, this, action, 0);
  }

  /**
   * returns the sequence of actions to go from the root to this node.
   */
  solution() {
  }

  /**
   * Returns the list of nodes forming the path from the root node to this node.
   */
  path() {

  }
}


class Grid {
  static getTile(grid, pos, direction = [0, 0]) {
    const x = pos[0] + direction[0];
    const y = pos[1] + direction[1];
    const col = grid[x];
    return col ? col[y] : null;
  }

  /**
  *
  * @param {[number, number]} size
  * @param {tile[][]} grid
  */
  static fill(grid, size) {
    for (let i = 0; i < size[0]; i++) {
      for (let j = size[1] - 1; j >= 0; j--) {
        const tile = grid[i][j];
        if (tile !== wTile) {
          // Get the surrounding tiles.
          const south = Grid.getTile(grid, [i, j], DIRECTIONS.S);
          const west = Grid.getTile(grid, [i, j], DIRECTIONS.W);
          if (south === wTile) {
            if (west === wTile) {
              grid[i][j] = bhTile;
            } else if (west === hTile || west === dhTile || west === bhTile) {
              grid[i][j] = hTile;
            } else {
              grid[i][j] = dhTile;
            }
          } else if (west === wTile) {
            if (south === wTile) {
              grid[i][j] = bhTile;
            } else if (south === bTile || south === bdTile || south === bhTile) {
              grid[i][j] = bTile;
            } else {
              grid[i][j] = bdTile;
            }
          } else if (west === hTile || west === bhTile || west === dhTile) {
            if (south === bTile || south === bhTile || south === bdTile) {
              grid[i][j] = hbTile;
            }
          } else {
            grid[i][j] = dTile;
          }
        }
      }
    }
  }

  static draw(grid, gridSize, tileSize, position = new Point(0, 0)) {
    const tiles = [];
    for (let i = 0; i < gridSize[0]; i++) {
      const x = i * tileSize;
      for (let j = 0; j < gridSize[1]; j++) {
        const y = j * tileSize;
        const tile = grid[i][j]; // || (() => {}) // dTile;
        const point = position.add(x, y);
        tiles.push(tile(point, [tileSize, tileSize]));
      }
    }
    return tiles;
  }

  static drawShapes(grid, gridSize, tileSize, position = new Point(0, 0)) {
    const tiles = [];
    const explored = new Set();
    const shapes = [];

    const positionKey = ([x, y]) => `${x}-${y}`;

    for (let i = 0; i < gridSize[0]; i++) {
      for (let j = 0; j < gridSize[1]; j++) {
        if  (!explored.has(positionKey([i, j]))) {
          const problem = new Problem({
            position: [i, j],
            grid,
            previous: []
          });
          const nodeSet = breadthFirstFlood(problem);
          const nodes = nodeSet.toArray();
          if (nodes.length === 1) {
            const node = nodes[0];
            const [i, j] = node.position;
            explored.add(positionKey([i, j]));
            const tile = grid[i][j];
            const point = position.add(i * tileSize, j * tileSize);
            tiles.push(tile(point, [tileSize, tileSize]));
          } else {
            const rects = nodes.map(node => {
              explored.add(positionKey(node.position));
              const point = position.add(node.position[0] * tileSize, node.position[1] * tileSize);
              const rect = new Path.Rectangle({
                point,
                size: [tileSize, tileSize]
              });
              return rect;
            });

            const tile = grid[i][j];

            const shape = rects.reduce((acc, rect) => {
              return acc ? acc.unite(rect) : rect;
            });
            shapes.push(shape);

            if (tile === wTile) {
              shape.strokeColor = 'black';
            } else if (tile === dTile) {
              hatch(shape, D_TILE_OPTS);
            } else if (tile === bTile) {
              hatch(shape, B_TILE_OPTS);
            } else if (tile === hTile) {
              hatch(shape, H_TILE_OPTS);
            }
          }          
        }
      }
    }
    return tiles;
  }
}

function hatch(shape, opts = {}) {
  const {
    stepSize = 5,
    wobble = 0,
    angle,
    pen,
    debug
  } = processOptions(opts);

  const center = new Point(shape.bounds.centerX, shape.bounds.centerY);
  const disectionVec = new Point({
    length: 1,
    angle: angle + 90
  });
  const disectionFrom = center.add(disectionVec.multiply(shape.bounds.width + shape.bounds.height));
  const disectionTo = center.subtract(disectionVec.multiply(shape.bounds.width + shape.bounds.height));

  if (debug) {
    new Path.Line({
      from: disectionFrom,
      to: disectionTo,
      strokeColor: 'red'
    });
  }

  const traceVec = disectionVec.rotate(90);
  const width = 1000;
  const trace = new Path.Line({
    visible: false,
    from: disectionFrom.subtract(traceVec.multiply(width)),
    to: disectionFrom.add(traceVec.multiply(width)),
    strokeColor: 'blue'
  });

  const disectionLength = disectionFrom.getDistance(disectionTo);
  const steps = disectionLength / stepSize;

  const xrand = () => {
    return random(-wobble, wobble);
  }

  const yrand = () => {
    return random(-wobble, wobble);
  }

  const paths = [];
  for (let i = 0; i < steps; i++) {
    trace.translate(disectionVec.normalize().multiply(-stepSize));
    let intersections = shape.getIntersections(trace);
    console.log(intersections.length);
    if (intersections.length === 3) {
      // Both ends of the hatching line should always begin outside the shape, so assume
      // the mid-point come from clipping a corner.
      // FIXME: Need to extend this to handle all odd-numbered intersections.
      const from = intersections[0].point.add(xrand(), yrand());
      const to = intersections[2].point.add(xrand(), yrand());
      const segments = i % 2 === 0 ? [from, to] : [to, from] // reverse the direction of each stroke for faster drawing.
      pens.withPen(pen, ({ color, strokeWidth }) => {
        const path = new Path({
          segments,
          strokeWidth: strokeWidth,
          strokeColor: color
        });
        paths.push(path);
      });
    } else if (intersections.length && intersections.length % 2 === 0) {
      intersections = sortBy(intersections, loc => loc.point.x);
      for (let j = 0; j < intersections.length; j += 2) {
        const fromIdx = j;
        const toIdx = j + 1;
        const from = intersections[fromIdx].point.add(xrand(), yrand());
        const to = intersections[toIdx].point.add(xrand(), yrand());
        const segments = i % 2 === 0 ? [from, to] : [to, from] // reverse the direction of each stroke for faster drawing.
        pens.withPen(pen, ({ color, strokeWidth }) => {
          const path = new Path({
            segments,
            strokeWidth: strokeWidth,
            strokeColor: color
          });
          paths.push(path);
        });
      }
    }
  }
  trace.remove();
  return paths;
}

const B_TILE_OPTS = { pen: pens.BLACK, stepSize: 1, pen: pens.BLACK };
const H_TILE_OPTS = { stepSize: 5, wobble: 0, angle: 0, pen: pens.BLACK };
const D_TILE_OPTS = { stepSize: 10, wobble: 0, angle: -45, pen: pens.BLACK };

/* Primary Tiles */

function wTile(point, size, { tileOpts = {} } = {}) {
  const tile = new Path.Rectangle({
    point,
    size,
    strokeColor: 'black',
    ...tileOpts
  });
  return [tile];
}

function bTile(point, size, { hatchOpts = {}, tileOpts = {} } = {}) {
  const tile = new Path.Rectangle({
    point,
    size,
    ...tileOpts
  });
  const hatches = hatch(tile, Object.assign({}, B_TILE_OPTS, hatchOpts));
  return [tile, ...hatches];
}

function hTile(point, size, { hatchOpts = {}, tileOpts = {} } = {}) {
  const tile = new Path.Rectangle({
    point, size,
    ...tileOpts
  });
  const hatches = hatch(tile, H_TILE_OPTS);
  return [tile, ...hatches];
}

function dTile(point, size, { hatchOpts = {}, tileOpts = {} } = {}) {
  const tile = new Path.Rectangle({
    point, size,
    ...tileOpts
  });
  const hatches = hatch(tile, Object.assign({}, D_TILE_OPTS, hatchOpts));
  return [tile, ...hatches];
}

/* Connective Tiles */
function dhTile(point, size, { hatchOpts = {}, tileOpts = {} } = {}) {
  const [t1, t2] = triBox(point, size, tileOpts);
  return [
    t1, 
    t2, 
    ...hatch(t1, Object.assign({}, D_TILE_OPTS, hatchOpts)),
    ...hatch(t2, Object.assign({}, H_TILE_OPTS, hatchOpts))
  ];
}

function hbTile(point, size, { hatchOpts = {}, tileOpts = {} } = {}) {
  const [t1, t2] = triBox(point, size, tileOpts);
  return [
    t1,
    t2,
    ...hatch(t1, Object.assign({}, H_TILE_OPTS, hatchOpts)),
    ...hatch(t2, Object.assign({}, B_TILE_OPTS, hatchOpts))
  ];
}

function bdTile(point, size, { hatchOpts = {}, tileOpts = {} } = {}) {
  const [t1, t2] = triBox(point, size, tileOpts);
  return [
    t1,
    t2,
    ...hatch(t1, Object.assign({}, B_TILE_OPTS, hatchOpts)),
    ...hatch(t2, Object.assign({}, D_TILE_OPTS, hatchOpts))
  ];
}

function bhTile(point, size, { hatchOpts = {}, tileOpts = {} } = {}) {
  const [t1, t2] = triBox(point, size, tileOpts);
  return [
    t1, 
    t2,
    ...hatch(t1, Object.assign({}, B_TILE_OPTS, hatchOpts)),
    ...hatch(t2, Object.assign({}, H_TILE_OPTS, hatchOpts))
  ];
}

/**
 * Returns two triangles forming a box.
 * @param {Point} point 
 * @param {[number, number]} size 
 */
function triBox(point, size, opts={}) {
  // const {
  //   pen = pens.BLACK
  // } = opts;
  const p1 = point.add(0, size[1]);
  const p2 = point.add(size[0], 0);
  return pens.withPen(opts.pen, ({ color }) => {
    return [
      new Path({
        segments: [point, p1, p2],
        closed: true,
        visible: false,
        strokeColor: color,
        ...opts
      }),
      new Path({
        segments: [point.add(size), p1, p2],
        closed: true,
        visible: false,
        strokeColor: color,
        ...opts
      })
    ];
  });
}

function displayAllTiles() {
  const size = [50, 50];
  const margin = 50;
  const tiles = [wTile, bTile, hTile, dTile, dhTile, hbTile, bdTile, bhTile];
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    tile(new Point(margin + size[0] * i, height / 2), size);
  }
}
// displayAllTiles();

function cubeExample() {
  const topLeft = new Point(100, 100);
  const size = [50, 50];
  const tiles = [
    [dTile, dhTile, hTile, hTile, hbTile],
    [dhTile, hTile, hTile, hbTile, bTile],
    [wTile, wTile, wTile, bTile, bTile],
    [wTile, bhTile, wTile, bTile, bdTile],
    [wTile, wTile, wTile, bdTile, dTile]
  ];
  for (let i = 0; i < 5; i++) {
    const x = i * size[0];
    for (let j = 0; j < 5; j++) {
      const y = j * size[0];
      const tile = tiles[j][i];
      const point = topLeft.add(x, y);
      tile(point, size);
    }
  }
}
// cubeExample();

function randomTiles() {
  const topLeft = new Point(0, 0);
  const nXTiles = 20;
  const nYTiles = 20;
  const size = [height / nYTiles, height / nYTiles];
  const tiles = [wTile, bTile, hTile, dTile, dhTile, hbTile, bdTile, bhTile];
  for (let i = 0; i < nXTiles; i++) {
    const x = i * size[0];
    for (let j = 0; j < nYTiles; j++) {
      const y = j * size[0];
      const tile = tiles[randomInt(tiles.length)];
      const point = topLeft.add(x, y);
      tile(point, size);
    }
  }
}
// randomTiles();

const CARDINAL_DIRECTIONS = {
  N: [0, -1],
  E: [1, 0],
  S: [0, 1],
  W: [-1, 0]
};

const INTER_CARDINAL_DIRECTIONS = {
  NE: [1, -1],
  SE: [1, 1],
  SW: [-1, 1],
  NW: [-1, -1]
}

const DIRECTIONS = {
  ...CARDINAL_DIRECTIONS,
  ...INTER_CARDINAL_DIRECTIONS
};

function randomWalk() {
  const topLeft = new Point(0, 0);
  const nXTiles = 10;
  const nYTiles = 10;
  const size = [height / nYTiles, height / nYTiles];
  const tiles = [wTile, bTile, hTile, dTile, dhTile, hbTile, bdTile, bhTile];
  // Create and fill grid.
  const grid = [];
  for (let i = 0; i < nXTiles; i++) {
    grid.push([]);
  }

  const nRaisedTiles = 10;
  let pos = [randomInt(nXTiles), randomInt(nYTiles)];
  grid[pos[0]][pos[1]] = wTile;

  for (let i = 0; i < nRaisedTiles-1; i++) {
    const keys = Object.keys(CARDINAL_DIRECTIONS);
    const dir = CARDINAL_DIRECTIONS[keys[randomInt(keys.length)]];
    let nextPos = [pos[0] + dir[0], pos[1] + dir[1]];
    if (
      nextPos[0] > -1 && nextPos[0] < nXTiles && 
      nextPos[1] >= -1 && nextPos[1] < nYTiles &&
      !grid[nextPos[0]][nextPos[1]]
    ) {
      grid[nextPos[0]][nextPos[1]] = wTile;
      pos = nextPos;
    }
  }

  // Now for each tile in the grid, determine its type based on surrounding raised tiles.
  // Might be easiest to work through tiles from bottom left.
  Grid.fill(grid, [nXTiles, nYTiles]);  

  Grid.drawShapes(grid, [nXTiles, nYTiles], size[0]);
}
randomWalk();

function interactiveGrid() {
  const topLeft = new Point(0, 0);
  const nXTiles = 10;
  const nYTiles = 10;
  const size = [height / nYTiles, height / nYTiles];
  const tiles = [wTile, bTile, hTile, dTile, dhTile, hbTile, bdTile, bhTile];
  // Create and fill grid.
  const grid = [];
  for (let i = 0; i < nXTiles; i++) {
    grid.push([]);
  }

  const nRaisedTiles = 10;
  let pos = [randomInt(nXTiles), randomInt(nYTiles)];
  grid[pos[0]][pos[1]] = wTile;

  // Now for each tile in the grid, determine its type based on surrounding raised tiles.
  // Might be easiest to work through tiles from bottom left.
  Grid.fill(grid, [nXTiles, nYTiles]);

  let paths = Grid.draw(grid, [nXTiles, nYTiles], size[0]);

  paper.view.onClick = (event) => {
    // clear grid of all non-raised tiles
    for (let i = 0; i < nXTiles; i++) {
      for (let j = 0; j < nYTiles; j++) {
        const tile = grid[i][j];
        if (tile !== wTile) {
          grid[i][j] = undefined;
        }
      }
    }

    flatten(paths).forEach(path => path.remove());
    const tileOffset = event.point.subtract(topLeft).divide(size);
    const tilePos = [Math.floor(tileOffset.x), Math.floor(tileOffset.y)];
    const tile = Grid.getTile(grid, tilePos);
    console.log(tilePos, tile);
    if (tile === wTile) {
      grid[tilePos[0]][tilePos[1]] = undefined;
    } else {
      grid[tilePos[0]][tilePos[1]] = wTile;
    }

    Grid.fill(grid, [nXTiles, nYTiles]);

    paths = Grid.draw(grid, [nXTiles, nYTiles], size[0]);
  }
}
// interactiveGrid();

function hatchingTest() {
  const size = 50;
  const rects = [];
  const positions = [
    [0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1],
    [0, 3], [0, 4], [2, 3]
  ];
  const topleft = new Point(100, 100);
  for (let [x, y] of positions) {
    const point = topleft.add(x * size, y * size);
    rects.push(new Path.Rectangle({
      point, 
      size: [size, size],
      // strokeColor: 'black'
    }));
  }
  const doughnut = rects.reduce((acc, rect) => {
    return acc ? acc.unite(rect) : rect;
  });

  // doughnut.fillColor = 'green';
  doughnut.strokeColor = 'red';
  hatch(doughnut, {...D_TILE_OPTS, ...{wobble: 2}});
}
// hatchingTest();

function breadthFirstSearch(problem) {
  const node = new Node(problem.init);
  if (problem.isGoal(problem.init)) {
    return node;
  }
  const frontier = new Queue([node]);
  const explored = new StateSet();
  let count = 0;
  while (frontier.length && count < 1000) {
    count++;
    const node = frontier.pop();
    explored.add(node.state);
    for (let child of node.expand(problem)) {
      if (
        !explored.contains(child.state) && 
        !frontier.contains(el => stateKey(el.state) === stateKey(child.state))
      ) {
        if (problem.isGoal(child.state)) {
          return child;
        }
        frontier.push(child);
      }
    }
  }
}

function breadthFirstFlood(problem) {
  const node = new Node(problem.init);
  const frontier = new Queue([node]);
  const explored = new StateSet();
  let count = 0;
  const maxCount = 10000;
  while (frontier.length && count < maxCount) {
    count++;
    const node = frontier.pop();
    explored.add(node.state);
    for (let child of node.expand(problem)) {
      if (
        !explored.contains(child.state) &&
        !frontier.contains(el => stateKey(el.state) === stateKey(child.state))
      ) {
        frontier.push(child);
      }
    }
  }
  if (count >= maxCount) {
    console.log('Max count reached: ', count);
  }
  return explored;
}

function pathfinding() {
  const topLeft = new Point(100, 100);
  const size = [50, 50];
  const grid = [
    [wTile, wTile],
    [wTile],
    [wTile, wTile],
    [null, wTile, wTile],
    [],
    [],
    []
  ];

  Grid.fill(grid, [6, 6]);

  // const problem = new Problem({
  //   position: [0, 0],
  //   grid,
  //   previous: []
  // });
  // const nodes = breadthFirstFlood(problem).toArray();
  // console.log(nodes);

  Grid.drawShapes(grid, [6, 6], size[0]);
}
// pathfinding();