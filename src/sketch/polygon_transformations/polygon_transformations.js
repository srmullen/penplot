import paper, { Point, Path, Group } from 'paper';
import math, { random, randomInt } from 'mathjs';
import uuid from 'uuid/v4';
import { Noise } from 'noisejs';
import dat from 'dat.gui';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, gauss, choose, wchoose, lerp, processOptions, clipBounds, radiansToDegrees
} from 'common/utils';
import * as pens from 'common/pens';
import { Queue } from 'common/datastructures';

window.paper = paper;

function polygonGUI() {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const guiOpts = {
    radius: 100,
    sides: 5,
    nShapes: 5,
    shapeStep: 10,
    rotation: 0,
    waveRate: 0.2
  };

  const gui = new dat.GUI();
  gui.add(guiOpts, 'radius').min(10).onChange(run);
  gui.add(guiOpts, 'sides').step(1).min(3).onChange(run);
  gui.add(guiOpts, 'nShapes').step(1).min(0).onChange(run);
  gui.add(guiOpts, 'shapeStep').onChange(run);
  gui.add(guiOpts, 'rotation').step(0.01).onChange(run);
  gui.add(guiOpts, 'waveRate').step(0.01).onChange(run);

  function run() {
    paper.project.clear();
    const polygons = [];

    for (let i = 0; i < guiOpts.nShapes; i++) {
      const radius = guiOpts.radius - (i * guiOpts.shapeStep);
      const polygon = new Path.RegularPolygon({
        center: [width / 2, height / 2],
        sides: guiOpts.sides,
        radius,
        strokeColor: 'black'
      });
      const rotation = radiansToDegrees(guiOpts.rotation * math.sin(math.pi * i * guiOpts.waveRate));
      polygon.rotate(rotation);
      polygons.push(polygon);
    }
  }

  run();
}

function hexTile() {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const HEX_POSITIONS = {
    TOP: 'TOP',
    TOPLEFT: 'TOPLEFT',
    TOPRIGHT: 'TOPRIGHT',
    BOTTOM: 'BOTTOM',
    BOTTOMLEFT: 'BOTTOMLEFT',
    BOTTOMRIGHT: 'BOTTOMRIGHT'
  };

  const radius = 20;

  const root = hexagon(new Point(width / 2, height / 2), radius);
  const graph = hexagonGraph(makeNode(root, {}), 10);
  
  // BFS to draw hexagons
  const order = fillBFS(graph);

  console.log(order);
  const groups = order.map(({ id, value }) => {
    return fill(value, { 
      nShapes: randomInt(5, 10), 
      // nShapes: 5,
      shapeStep: 4, 
      rotation: random(0.1, 0.5), 
      waveRate: 0.2, 
      innerRadius: 2,
      // color: choose(['red', 'green', 'blue', 'orange', 'purple'])
      // color: 'black'
    });
  });

  const border = new Path.Rectangle({
    from: [50, 50],
    to: [width-50, height-50],
    // strokeColor: 'red'
  });

  groups.map(group => {
    const intersection = border.intersect(group);
    intersection.strokeColor = 'black';
    // intersection.fillColor = 'black'
  });

  function fill(
    hex,
    {
      nShapes = 5, shapeStep = 10, waveRate = 0, rotation = 0, innerRadius = 10,
      color = 'black'
    } = {}
  ) {
    const paths = [];
    const step = (hex.radius - innerRadius) / nShapes;
    for (let i = 1; i < nShapes; i++) {
      const radius = hex.radius - (i * step);
      const inner = hexagon(hex.center, radius);
      const polygon = new Path({
        segments: inner.points,
        strokeColor: color,
        closed: true
      });
      polygon.rotate(radiansToDegrees(rotation * math.sin(math.pi * i * waveRate)));
      paths.push(polygon);
    }
    return new paper.CompoundPath({ children: paths, fillRule: 'evenodd' });
  }

  function makeNode(hex, children) {
    return {
      id: uuid(),
      value: hex,
      children
    };
  }

  function hexagonGraph(node, depth=0) {
    if (depth <= 0) {
      return node;
    }

    for (let key of Object.keys(HEX_POSITIONS)) {
      const pos = HEX_POSITIONS[key];
      if (!node.children[pos]) {
        const child = hexagon(tileFrom(node.value, pos), node.value.radius);
        const childNode = makeNode(child, {});
        node.children[pos] = childNode;
      }
    }

    // Set the children of the tiles. Children can also be siblings.
    for (let key of Object.keys(HEX_POSITIONS)) {
      const pos = HEX_POSITIONS[key];
      const child = node.children[pos];

      if (pos === HEX_POSITIONS.TOP) { // if it is the top child
        if (!child.children[HEX_POSITIONS.BOTTOMLEFT]) {
          child.children[HEX_POSITIONS.BOTTOMLEFT] = node.children[HEX_POSITIONS.TOPLEFT];
        }
        if (!child.children[HEX_POSITIONS.BOTTOM]) {
          child.children[HEX_POSITIONS.BOTTOM] = node;
        }
        if (!child.children[HEX_POSITIONS.BOTTOMRIGHT]) {
          child.children[HEX_POSITIONS.BOTTOMRIGHT] = node.children[HEX_POSITIONS.TOPRIGHT];
        }
      } else if (pos === HEX_POSITIONS.TOPLEFT) {
        if (!child.children[HEX_POSITIONS.BOTTOM]) {
          child.children[HEX_POSITIONS.BOTTOM] = node.children[HEX_POSITIONS.BOTTOMLEFT];
        }
        if (!child.children[HEX_POSITIONS.BOTTOMRIGHT]) {
          child.children[HEX_POSITIONS.BOTTOMRIGHT] = node;
        }
        if (!child.children[HEX_POSITIONS.TOPRIGHT]) {
          child.children[HEX_POSITIONS.TOPRIGHT] = node.children[HEX_POSITIONS.TOP];
        }
      } else if (pos === HEX_POSITIONS.TOPRIGHT) {
        if (!child.children[HEX_POSITIONS.TOPLEFT]) {
          child.children[HEX_POSITIONS.TOPLEFT] = node.children[HEX_POSITIONS.TOP];
        }
        if (!child.children[HEX_POSITIONS.BOTTOMLEFT]) {
          child.children[HEX_POSITIONS.BOTTOMLEFT] = node;
        }
        if (!child.children[HEX_POSITIONS.BOTTOM]) {
          child.children[HEX_POSITIONS.BOTTOM] = node.children[HEX_POSITIONS.BOTTOMRIGHT];
        }
      } else if (pos === HEX_POSITIONS.BOTTOM) {
        if (!child.children[HEX_POSITIONS.TOPLEFT]) {
          child.children[HEX_POSITIONS.TOPLEFT] = node.children[HEX_POSITIONS.BOTTOMLEFT];
        }
        if (!child.children[HEX_POSITIONS.TOP]) {
          child.children[HEX_POSITIONS.TOP] = node;
        }
        if (!child.children[HEX_POSITIONS.TOPRIGHT]) {
          child.children[HEX_POSITIONS.TOPRIGHT] = node.children[HEX_POSITIONS.BOTTOMRIGHT];
        }
      } else if (pos === HEX_POSITIONS.BOTTOMLEFT) {
        if (!child.children[HEX_POSITIONS.TOP]) {
          child.children[HEX_POSITIONS.TOP] = node.children[HEX_POSITIONS.BOTTOMLEFT];
        }
        if (!child.children[HEX_POSITIONS.TOPRIGHT]) {
          child.children[HEX_POSITIONS.TOPRIGHT] = node;
        }
        if (!child.children[HEX_POSITIONS.BOTTOMRIGHT]) {
          child.children[HEX_POSITIONS.BOTTOMRIGHT] = node.children[HEX_POSITIONS.BOTTOM];
        }
      } else if (pos === HEX_POSITIONS.BOTTOMRIGHT) {
        if (!child.children[HEX_POSITIONS.BOTTOMLEFT]) {
          child.children[HEX_POSITIONS.BOTTOMLEFT] = node.children[HEX_POSITIONS.BOTTOM];
        }
        if (!child.children[HEX_POSITIONS.TOPLEFT]) {
          child.children[HEX_POSITIONS.TOPLEFT] = node;
        }
        if (!child.children[HEX_POSITIONS.TOP]) {
          child.children[HEX_POSITIONS.TOP] = node.children[HEX_POSITIONS.TOPRIGHT];
        }
      }
    }

    for (let pos of Object.keys(HEX_POSITIONS)) {
      const child = node.children[HEX_POSITIONS[pos]];
      node.children[HEX_POSITIONS[pos]] = hexagonGraph(child, depth - 1);
    }

    return node;
  }

  function hasAllChildren(node) {
    return (
      node.children[HEX_POSITIONS.TOP] &&
      node.children[HEX_POSITIONS.TOPLEFT] &&
      node.children[HEX_POSITIONS.TOPRIGHT] &&
      node.children[HEX_POSITIONS.BOTTOM] &&
      node.children[HEX_POSITIONS.BOTTOMLEFT] &&
      node.children[HEX_POSITIONS.BOTTOMRIGHT]
    );
  }

  function fillBFS(root) {
    const frontier = new Queue();
    frontier.push(root);
    const explored = [];
    let guard = 1000;
    while (frontier.length && guard > 0) {
      const node = frontier.pop();
      explored.push(node);
      for (let pos of Object.keys(HEX_POSITIONS)) {
        const child = node.children[HEX_POSITIONS[pos]];
        if (
          child && 
          !explored.some(n => n.id === child.id) && 
          !frontier.contains(child)
        ) {
          frontier.push(child);
        }
      }
      if (!frontier.length) {
        break;
      }
      guard--;
    }
    return explored;
  }

  function hexagon(center, radius) {
    const points = [];
    const hex = {
      center,
      radius
    };
    // const colors = ['red', 'green', 'blue', 'orange', 'black', 'purple'];
    for (let i = 0; i < 6; i++) {
      const x = radius * math.cos(i * 2 * math.pi / 6);
      const y = radius * math.sin(i * 2 * math.pi / 6);
      const point = center.add(x, y);
      points.push(point);
    }
    const a = points[1].subtract(points[0]).divide(2).length;
    const b = math.sqrt(radius * radius - a * a);
    hex.points = points;
    hex.b = b;
    return hex;
  }

  /**
   * 
   * @param {Object} hex - hexagon object
   * @param {String} position - string describing the position to draw the tile.
   */
  function tileFrom(hex, position) {
    let angle;
    if (position === HEX_POSITIONS.TOP) {
      angle = 9 * Math.PI / 6;      
    } else if (position === HEX_POSITIONS.TOPLEFT) {
      angle = 7 * Math.PI / 6;
    } else if (position === HEX_POSITIONS.TOPRIGHT) {
      angle = 11 * Math.PI / 6;
    } else if (position === HEX_POSITIONS.BOTTOM) {
      angle = 3 * Math.PI / 6;
    } else if (position === HEX_POSITIONS.BOTTOMLEFT) {
      angle = 5 * Math.PI / 6;
    } else if (position === HEX_POSITIONS.BOTTOMRIGHT) {
      angle = 1 * Math.PI / 6;
    }
    const x = hex.b * 2 * math.cos(angle);
    const y = hex.b * 2 * math.sin(angle);
    return hex.center.add(x, y);
  }
}


// polygonGUI();
hexTile();

window.saveAsSvg = function save(name) {
  saveAsSVG(paper.project, name);
}