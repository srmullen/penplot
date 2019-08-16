import paper, { Point, Path } from 'paper';
import math, { random, randomInt } from 'mathjs';
import { range, sortBy, last, flatten } from 'lodash';
import dat from 'dat.gui';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, choose, maprange, radiansToDegrees, clipBounds, processOptions
} from 'common/utils';
import { Queue, OrderedSet } from 'common/datastructures';
import { Problem, breadthFirstFlood } from 'common/search';
import * as pens from 'common/pens';

window.paper = paper;

const seed = randomInt(2000);
// const seed = 17; // needs fix to hatch function
// const seed = 208;
// console.log(seed);
// noise.seed(seed);
math.config({ randomSeed: seed });

const TILES = {
  B: 'black',
  W: 'white',
  H: 'horizontal',
  D: 'diagonal',
}

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


const stateKey = (state) => `${state.position[0]}-${state.position[1]}-${state.position[2]}`;

class StateSet extends OrderedSet {
  key(state) {
    return stateKey(state);
  }
}

class TileQueue extends Queue {
  contains(item) {
    return this.items.findIndex(el => stateKey(el.state) === stateKey(item.state)) > -1;
  }
}

class GridProblem extends Problem {
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

class Grid {

  static drawOutline() {

  }

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
          const problem = new GridProblem({
            position: [i, j],
            grid,
            previous: []
          });
          const nodeSet = breadthFirstFlood(problem, {
            frontier: new TileQueue(),
            explored: new StateSet()
          });
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
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

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
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

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
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

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

function randomWalk() {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

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
// randomWalk();

function hatchingTest() {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

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

function pathfinding() {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

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

  Grid.drawShapes(grid, [6, 6], size[0]);
}
// pathfinding();

class TriGrid {

  /**
   * Positions is an array of x,y coords for the white tiles. Converts to the trigrid format.
   * @param {[number, number]} size 
   * @param {[number, number][]} positions 
   */
  static createGrid(size = [10, 10], positions = []) {
    const grid = [];
    for (let i = 0; i < size[0]; i++) {
      const row = [];
      for (let j = 0; j < size[1]; j++) {
        if (positions.findIndex(([x, y]) => x === i && y === j) > -1) {
          row.push([TILES.W, TILES.W]);
        } else {
          row.push([TILES.D, TILES.D]);
        }
      }
      grid.push(row);
    }

    TriGrid.fill(grid, size);

    return grid;
  }

  static fill(grid, size) {
    for (let i = 0; i < size[0]; i++) {
      for (let j = size[1] - 1; j >= 0; j--) {
        const [NW, SE] = grid[i][j]; // North-west and south-east sections of the tile.
        if (NW !== TILES.W) {
          // Get the surrounding tiles.
          const south = TriGrid.getTile(grid, [i, j + 1, 0]);
          const west = TriGrid.getTile(grid, [i - 1, j, 1]);
          if (south === TILES.W) {
            if (west === TILES.W) {
              grid[i][j] = [TILES.B, TILES.H];
            } else if (west === TILES.H) {
              grid[i][j] = [TILES.H, TILES.H];
            } else {
              grid[i][j] = [TILES.D, TILES.H];
            }
          } else if (west === TILES.W) {
            if (south === TILES.W) {
              grid[i][j] = [TILES.B, TILES.H];
            } else if (south === TILES.B) {
              grid[i][j] = [TILES.B, TILES.B];
            } else {
              grid[i][j] = [TILES.B, TILES.D];
            }
          } else if (west === TILES.H) {
            if (south === TILES.B) {
              grid[i][j] = [TILES.H, TILES.B];
            }
          } else {
            grid[i][j] = [TILES.D, TILES.D];
          }
        }
      }
    }
  }

  static drawOutline(grid, gridSize, tileSize, position = new Point(0, 0)) {
    const paths = [];
    for (let i = 0; i < gridSize[0]; i++) {
      const x = i * tileSize;
      for (let j = 0; j < gridSize[1]; j++) {
        const y = j * tileSize;
        const tile = TriGrid.getTile(grid, [i, j]);
        const fillColor = tile[0] === TILES.W ? 'silver' : 'white';
        const path = new Path.Rectangle({
          point: position.add(x, y),
          size: [tileSize, tileSize],
          strokeColor: 'black',
          fillColor
        });
        paths.push(path);
      }
    }

    return paths;
  }

  static getTile(grid, pos, direction = [0, 0, 0]) {
    let dim = grid;
    for (let idx of pos) {
      const tmp = dim[idx] || null;
      if (!tmp) {
        return tmp;
      } else {
        dim = tmp;
      }
    }
    return dim;
  }

  static drawShapes(grid, gridSize, tileSize, position = new Point(0, 0)) {
    const paths = [];
    const explored = new Set();
    const shapes = [];

    const positionKey = ([x, y, z]) => `${x}-${y}-${z}`;

    for (let i = 0; i < gridSize[0]; i++) {
      for (let j = 0; j < gridSize[1]; j++) {
        for (let k = 0; k < 2; k++) {
          if (!explored.has(positionKey([i, j, k]))) {
            const problem = new TriGridProblem({
              position: [i, j, k],
              grid,
              previous: []
            });
            const nodeSet = breadthFirstFlood(problem, {
              frontier: new TileQueue(),
              explored: new StateSet()
            });
            const nodes = nodeSet.toArray();

            const tris = nodes.map(node => {
              explored.add(positionKey(node.position));
              const point = position.add(node.position[0] * tileSize, node.position[1] * tileSize);
              if (node.position[2] === 0) {
                return rightTriangle(point, [tileSize, tileSize]);
              } else {
                return rightTriangle(point.add(tileSize), [-tileSize, -tileSize]);
              }
            });

            const tile = grid[i][j][k];

            const shape = tris.reduce((acc, tri) => {
              return acc ? acc.unite(tri) : tri;
            });
            paths.push(shape);

            if (tile === TILES.W) {
              shape.visible = true;
              shape.strokeColor = 'black';
            } else if (tile === TILES.D) {
              paths.push(hatch(shape, D_TILE_OPTS));
              tris.map(tri => tri.remove());
            } else if (tile === TILES.B) {
              paths.push(hatch(shape, B_TILE_OPTS));
              tris.map(tri => tri.remove());
            } else if (tile === TILES.H) {
              paths.push(hatch(shape, H_TILE_OPTS));
              tris.map(tri => tri.remove());
            }
          }
        }
      }
    }
    return paths;
  }
}

class TriGridProblem extends Problem {
  /**
 * Return the list of actions that can be executed from the given state.
 * @param {any} state 
 */
  actions(state) {
    const [x, y, z] = state.position;
    const z0steps = [[-1, 0, 1], [0, -1, 1], [0, 0, 1]];
    const z1steps = [[0, 0, -1], [1, 0, -1], [0, 1, -1]];
    const actions = [];
    const currentTile = TriGrid.getTile(state.grid, [x, y, z]);
    if (z === 0) {
      for (let step of z0steps) {
        const [nx, ny, nz] = [x + step[0], y + step[1], z + step[2]];
        const tile = TriGrid.getTile(state.grid, [nx, ny, nz]);
        if (
          currentTile === tile &&
          state.previous.findIndex(prev => prev[0] === nx && prev[1] === ny && prev[2] === nz) === -1
        ) {
          actions.push(step);
        }
      }
    }

    if (z === 1) {
      for (let step of z1steps) {
        const [nx, ny, nz] = [x + step[0], y + step[1], z + step[2]];
        const tile = TriGrid.getTile(state.grid, [nx, ny, nz]);
        if (
          currentTile === tile &&
          state.previous.findIndex(prev => prev[0] === nx && prev[1] === ny && prev[2] === nz) === -1
        ) {
          actions.push(step);
        }
      }
    }

    return actions;
  }

  /**
   * Return the state that results from executing the given action
   * @param {any} state 
   * @param {Action} action 
   */
  result({ position, grid, previous }, action) {
    const next = [position[0] + action[0], position[1] + action[1], position[2] + action[2]];
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

function rightTriangle(point, size, opts = {}) {
  const p1 = point.add(0, size[1]);
  const p2 = point.add(size[0], 0);
  return pens.withPen(opts.pen, ({ color }) => {
    return new Path({
      segments: [point, p1, p2],
      closed: true,
      visible: false,
      strokeColor: color,
      ...opts
    });
  });
}

function tri_cubo() {

  const PAPER_SIZE = A4.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  function randomShape(nBlocks, gridSize) {
    const positions = [[randomInt(gridSize[0]), randomInt(gridSize[1])]];
    const directions = Object.keys(CARDINAL_DIRECTIONS);
    for (let i = 1; i < nBlocks; i++) {
      const prev = positions[i - 1];
      const dir = CARDINAL_DIRECTIONS[choose(directions)];
      positions.push([prev[0] + dir[0], prev[1] + dir[1]]);
    }
    return positions;
  }

  const vmargin = 25;
  const gridSize = [24, 24];
  const tileSize = (height - vmargin * 2) / gridSize[1];
  const hmargin = (width - tileSize * gridSize[0]) / 2
  
  const positions = [
    ...randomShape(15, gridSize), 
    ...randomShape(15, gridSize),
    ...randomShape(15, gridSize),
    ...randomShape(15, gridSize)
  ];

  const grid = TriGrid.createGrid(gridSize, positions);

  TriGrid.drawShapes(grid, gridSize, tileSize, new Point(hmargin, vmargin));
}
// tri_cubo();

function interactiveGrid() {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const gui = new dat.GUI();

  const topLeft = new Point(0, 0);
  const nXTiles = 8;
  const nYTiles = 8;
  const size = [height / nYTiles, height / nYTiles];
  const isWhiteBox = (box) => box[0] === TILES.W && box[1] === TILES.W;
  // Create and fill grid.
  const grid = TriGrid.createGrid([nXTiles, nYTiles]);
  let paths = [];

  const guifns = {
    run: () => {
      flatten(paths).forEach(path => path.remove());
      TriGrid.fill(grid, [nXTiles, nYTiles]);
      paths = TriGrid.drawShapes(grid, [nXTiles, nYTiles], size[0]);
    },
    reset: () => {
      flatten(paths).forEach(path => path.remove());
      for (let i = 0; i < nXTiles; i++) {
        for (let j = 0; j < nXTiles; j++) {
          grid[i][j] = [];
        }
      }
      paths = TriGrid.drawOutline(grid, [nXTiles, nYTiles], size[0])
    }
  }
  gui.add(guifns, 'run');
  gui.add(guifns, 'reset');

  paths = TriGrid.drawOutline(grid, [nXTiles, nYTiles], size[0])

  paper.view.onClick = (event) => {
    // clear grid of all non-raised tiles
    for (let i = 0; i < nXTiles; i++) {
      for (let j = 0; j < nYTiles; j++) {
        const box = grid[i][j];
        if (!isWhiteBox(box)) {
          grid[i][j] = [];
        }
      }
    }

    flatten(paths).forEach(path => path.remove());
    const tileOffset = event.point.subtract(topLeft).divide(size);
    const tilePos = [Math.floor(tileOffset.x), Math.floor(tileOffset.y)];
    const box = TriGrid.getTile(grid, tilePos);
    if (isWhiteBox(box)) {
      grid[tilePos[0]][tilePos[1]] = [TILES.D, TILES.D];
    } else {
      grid[tilePos[0]][tilePos[1]] = [TILES.W, TILES.W];
    }

    TriGrid.fill(grid, [nXTiles, nYTiles]);

    paths = TriGrid.drawOutline(grid, [nXTiles, nYTiles], size[0]);
  }
}
interactiveGrid();

window.saveAsSvg = function save(name) {
  saveAsSVG(paper.project, name);
}