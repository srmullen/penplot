import paper, { Point, Path } from 'paper';
import math, { random, randomInt } from 'mathjs';
import { ARTIST_SKETCH, createCanvas } from 'common/setup';
import {
  saveAsSVG, choose, maprange, radiansToDegrees, clipBounds, processOptions, lerp, cerp, smoothStep, mod, repeat
} from 'common/utils';
import * as pens from 'common/pens';
import * as palettes from 'common/palettes';
import { hatch } from 'common/hatch';
import paperSizes from 'common/paper_sizes';
import please from 'pleasejs';
import { clipToBorder } from 'common/border';
import convert from 'convert-length';
import { fill } from 'lodash';

function main_lineStiches() {
  const DIMENSIONS = [12, 9]; // inches
  const PAPER_SIZE = DIMENSIONS.map(n => {
    return convert(n, 'in', 'px', { pixelsPerInch: 96 });
  });
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const margin = 50;
  const stepSize = 5;

  const vPattern = [
    {
      pen: pens.STABILO_88_44,
      stiches: 10,
      stepSize,
      length: height - 2 * margin
    }, {
      pen: pens.STABILO_88_50,
      stiches: 10,
      stepSize,
      length: height - 2 * margin
    }, {
      pen: pens.STABILO_88_51,
      stiches: 10,
      stepSize,
      length: height - 2 * margin
    }
  ];

  const hPattern = [
    {
      pen: pens.STABILO_88_44,
      stiches: 10,
      stepSize,
      length: width - 2 * margin
    }, {
      pen: pens.STABILO_88_50,
      stiches: 10,
      stepSize,
      length: width - 2 * margin
    }, {
      pen: pens.STABILO_88_51,
      stiches: 10,
      stepSize,
      length: width - 2 * margin
    }
  ];

  const vPaths = drawVerticalPattern(vPattern, 21);
  const hPaths = drawHorizontalPattern(hPattern, 16);

  function verticalStitch(opts = {}) {
    const { 
      pen, 
      stiches, 
      start = new Point(0, 0), 
      length,
      stepSize = 5
    } = processOptions(opts);
    
    return pens.withPen(pen, ({ color }) => {
      const paths = [];
      for (let i = 0; i < stiches; i++) {
        paths.push(new Path.Line({
          from: [start.x + stepSize * i, start.y],
          to: [start.x + stepSize * i, start.y + length],
          strokeColor: color
        }));
      }
      return paths;
    });
  }

  function horizontalStitch(opts = {}) {
    const {
      pen,
      stiches,
      start = new Point(0, 0),
      length,
      stepSize = 5
    } = processOptions(opts);

    return pens.withPen(pen, ({ color }) => {
      const paths = [];
      for (let i = 0; i < stiches; i++) {
        paths.push(new Path.Line({
          from: [start.x, start.y + stepSize * i],
          to: [start.x + length, start.y + stepSize * i],
          strokeColor: color
        }));
      }
      return paths;
    });
  }

  function drawVerticalPattern(pattern, steps = 1) {
    let paths = [];
    let start = new Point(margin, margin);
    // const repeats = 4;
    for (let i = 0; i < steps; i++) {
      const idx = mod(i, pattern.length);
      if (i > 0) {
        const prev = mod(idx - 1, pattern.length);
        start = start.add(pattern[prev].stiches * stepSize, 0);
      }
      paths = paths.concat(verticalStitch({ ...pattern[idx], start }));
    }
    return paths;
  }

  function drawHorizontalPattern(pattern, steps = 1) {
    let paths = [];
    let start = new Point(margin, margin);
    // const repeats = 4;
    for (let i = 0; i < steps; i++) {
      const idx = mod(i, pattern.length);
      if (i > 0) {
        const prev = mod(idx - 1, pattern.length);
        start = start.add(0, pattern[prev].stiches * stepSize);
      }
      paths = paths.concat(horizontalStitch({ ...pattern[idx], start }));
    }
    return paths;
  }
}

/**
 * Create all the points first. then drawn the pattern through the points.
 */
function main_dotGrid() {
  const DIMENSIONS = [8.5, 5.5]; // inches
  const PAPER_SIZE = DIMENSIONS.map(n => {
    return convert(n, 'in', 'px', { pixelsPerInch: 96 });
  });
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const margin = 50;
  const size = [width - margin * 2, height - margin * 2];

  const stepSize = 4;

  const nx = Math.floor(size[0] / stepSize);
  const ny = Math.floor(size[1] / stepSize);

  const grid = [];
  for (let x = 0; x < nx; x++) {
    const column = [];
    const u = nx <= 1 ? 0.5 : (x / (nx - 1));
    for (let y = 0; y < ny; y++) {
      const v = ny <= 1 ? 0.5 : (y / (ny - 1));
      column.push([ u, v ]);
    }
    grid.push(column);
  }

  const mvmt = 0;
  const pointGrid = [];
  for (let i = 0; i < grid.length; i++) {
    const col = [];
    for (let j = 0; j < grid[i].length; j++) {
      let point = new Point(grid[i][j]).multiply(size).add(margin);
      if (mvmt) {
        point = point.add(random(-mvmt, mvmt), random(-mvmt, mvmt));
      }
      col.push(point);
    }
    pointGrid.push(col);
  }

  // Buffalo Plaid
  const vpattern = [
    ...repeat(5, pens.STABILO_88_40),
    ...repeat(10, pens.STABILO_88_22),
    ...repeat(5, pens.STABILO_88_40),
  ];

  const hpattern = [
    ...repeat(5, pens.STABILO_88_22),
    ...repeat(10, pens.STABILO_88_40),
    ...repeat(5, pens.STABILO_88_22)
  ];

  eachColumn(pointGrid, (col, i) => {
    const pen = vpattern[i % vpattern.length];
    if (i && i < grid.length - 1) {
      pens.withPen(pen, ({ color }) => {
        new Path({
          segments: col,
          strokeColor: color
        });
      });
    }
  });

  eachRow(pointGrid, (row, i) => {
    const pen = hpattern[i % hpattern.length];
    if (i && i !== pointGrid[0].length-1) { // Don't draw first and last rows
      pens.withPen(pen, ({ color }) => {
        new Path({
          segments: row,
          strokeColor: color
        });
      });
    }
  });

  function eachColumn(grid, fn) {
    for (let i = 0; i < grid.length; i++) {
      const col = grid[i];
      fn(col, i);
    }
  }

  function eachRow(grid, fn) {
    for (let i = 0; i < grid[0].length; i++) {
      const row = [];
      for (let j = 0; j < grid.length; j++) {
        const point = grid[j][i];
        row.push(point);
      }
      fn(row, i);
    }
  }
}

// main_lineStiches();
main_dotGrid();

window.saveAsSvg = function save(name) {
  saveAsSVG(paper.project, name);
}