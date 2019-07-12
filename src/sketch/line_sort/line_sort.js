import paper, { Point, Path } from 'paper';
import math, { randomInt } from 'mathjs';
import { range } from 'lodash';
import please from 'pleasejs';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, shuffle
} from 'common/utils';
import * as pens from 'common/pens';
import * as sort from './sort';
import * as palettes from './palettes';

const seed = randomInt(2000);
// const seed = 1456;
console.log(seed);
math.config({ randomSeed: seed });

/*
 * Exchange position of two elements in an array.
 */
export function exchangeIndices(arr, a, b) {
  const temp = arr[a];
  arr[a] = arr[b];
  arr[b] = temp;
}

/*
 * Copys the index from one list into another list.
 * Does not mutate the copy list.
 */
export function copyFromList(copy, into, copyIndex, intoIndex) {
  into[intoIndex] = copy[copyIndex];
}

/*
 * Places the item at the given position in the array and returns the item
 * that was previously at the position.
 */
export function swapOut(arr, pos, item) {
  const prev = arr[pos];
  arr[pos] = item;
  return prev;
}

function compareNumber(a, b) {
  if (a < b) {
    return -1;
  } else if (a > b) {
    return 1;
  } else if (a === b) {
    return 0;
  } else {
    throw new Error(`Cannot compare ${a} to ${b}`);
  }
}

function compareObjectByKey(key, a, b) {
  if (a[key] < b[key]) {
    return -1;
  } else if (a[key] > b[key]) {
    return 1;
  } else if (a[key] === b[key]) {
    return 0;
  } else {
    throw new Error(`Cannot compare ${a} to ${b}`);
  }
}

function sortLinesByNumber () {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const sortFn = sort.selection;
  let exchangeFn = exchangeIndices;
  if (sortFn === sort.cycle) {
    exchangeFn = swapOut;
  } else if (sortFn === sort.merge || sortFn === sort.radix) {
    exchangeFn = copyFromList;
  }
  const nLines = 50;
  const arr = range(nLines);
  shuffle(arr);
  let sorted = null;
  if (sortFn === sort.radix) {
    const max = Math.max(...arr.map(a => a));
    sorted = [...sortFn(max, exchangeFn, a => a, arr)];
  } else {
    sorted = [...sortFn(exchangeFn, compareNumber, arr)];
  }
  
  const vStepSize = (height / nLines);
  const hStepSize = width / sorted.length;
  const segments = [];
  for (let i = 0; i < nLines; i++) {
    segments.push([]);
  }
  for (let i = 0; i < sorted.length; i++) {
    const step = sorted[i];
    const x = i * hStepSize;
    for (let j = 0; j < nLines; j++) {
      const y = step.list[j] * vStepSize + vStepSize / 2;
      segments[j].push([x, y]);
    }
  }
  for (let segment of segments) {
    new Path({
      segments: segment,
      strokeColor: please.make_color()
    });
  }
}
// sortLinesByNumber();

function sortLinesByColor(nLines, sortFn, palette, smoothing) {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  // create items to sort
  const arr = [];
  for (let i = 0; i < nLines; i++) {
    const val = randomInt(palette.length);
    arr.push({
      id: i,
      val,
      pen: palette[val]
    });
  }
  const original = arr.map(a => a);
  
  let exchangeFn = exchangeIndices;
  if (sortFn === sort.cycle) {
    exchangeFn = swapOut;
  } else if (sortFn === sort.merge || sortFn === sort.radix) {
    exchangeFn = copyFromList;
  } else if (sortFn === sort.bogo) {
    exchangeFn = shuffle;
  }
  
  let sorted = null;
  if (sortFn === sort.radix) {
    const max = Math.max(...arr.map(a => a['val']));
    sorted = [...sortFn(max, exchangeFn, a => a['val'], arr)];
  } if (sortFn === sort.bogo) {
    sorted = [];
    const gen = sortFn(exchangeFn, compareObjectByKey.bind(null, 'val'), arr);
    for (let i = 0; i < 100; i++) {
      const { value, done } = gen.next();
      if (done) {
        break;
      }
      sorted.push(value);
    }
  } else {
    sorted = [...sortFn(exchangeFn, compareObjectByKey.bind(null, 'val'), arr)];
  }
  
  draw(original, sorted, width, height, smoothing);

}

function quickSort(nLines, palette) {
  const PAPER_SIZE = A4.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const sortFn = sort.quick;
  const exchangeFn = exchangeIndices;

  // create items to sort
  const arr = [];
  for (let i = 0; i < nLines; i++) {
    const val = randomInt(palette.length);
    arr.push({
      id: i,
      val,
      pen: palette[val]
    });
  }
  const original = arr.map(a => a);

  const sorted = [...sortFn(exchangeFn, compareObjectByKey.bind(null, 'val'), arr)];

  draw(original, sorted, width, height, { type: 'catmull-rom', factor: 0.7 });
}

function mergeSort(nLines, palette) {
  const PAPER_SIZE = A4.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const sortFn = sort.merge;
  const exchangeFn = copyFromList;

  // create items to sort
  const arr = [];
  for (let i = 0; i < nLines; i++) {
    const val = randomInt(palette.length);
    arr.push({
      id: i,
      val,
      pen: palette[val]
    });
  }
  const original = arr.map(a => a);

  const sorted = [...sortFn(exchangeFn, compareObjectByKey.bind(null, 'val'), arr)];

  draw(original, sorted, width, height, {type: 'catmull-rom', factor: 0.9});
}

function heapSort(nLines, palette) {
  const PAPER_SIZE = A4.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const sortFn = sort.heap;
  const exchangeFn = exchangeIndices;

  // create items to sort
  const arr = [];
  for (let i = 0; i < nLines; i++) {
    const val = randomInt(palette.length);
    arr.push({
      id: i,
      val,
      pen: palette[val]
    });
  }
  const original = arr.map(a => a);

  const sorted = [...sortFn(exchangeFn, compareObjectByKey.bind(null, 'val'), arr)];

  draw(original, sorted, width, height, {
    type: 'catmull-rom',
    factor: 0.5
  });
}

function bogoSort(palette) {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const sortFn = sort.bogo;
  const exchangeFn = exchangeIndices;

  // create items to sort
  const arr = [...palette, ...palette].map((pen, i) => ({
    id: i, 
    val: palette.indexOf(pen),
    pen
  }));
  shuffle(arr);
  
  const original = arr.map(a => a);

  const gen = sortFn(exchangeFn, compareObjectByKey.bind(null, 'val'), arr);
  const sorted = [];
  for (let i = 0; i < 100; i++) {
    const { value, done } = gen.next();
    if (done) {
      break;
    }
    sorted.push(value);
  }

  draw(original, sorted, width, height, {
    type: 'catmull-rom',
    factor: 0.5
  });
}

function cocktailSort(palette, linesPerPen=10) {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  // create items to sort
  const arr = [];
  let id = 0;
  for (let i = 0; i < palette.length; i++) {
    for (let j = 0; j < linesPerPen; j++) {
      arr.push({
        id: id,
        val: i,
        pen: palette[i]
      });
      id++;
    }
  }
  arr.reverse();
  const original = arr.map(a => a);

  const sortFn = sort.cocktail;
  const exchangeFn = exchangeIndices;

  const sorted = [...sortFn(exchangeFn, compareObjectByKey.bind(null, 'val'), arr)];

  draw(original, sorted, width, height);
}

function draw(original, sorted, width, height, smoothing) {
  const nLines = original.length;
  const margin = 100;
  const vStepSize = (height - margin) / nLines;
  const hStepSize = (width - margin) / sorted.length;
  const segments = [];
  for (let i = 0; i < nLines; i++) {
    segments.push([]);
  }
  for (let i = 0; i < sorted.length; i++) {
    const step = sorted[i];
    const x = i * hStepSize;
    for (let j = 0; j < nLines; j++) {
      const y = j * vStepSize + vStepSize / 2;
      segments[step.list[j].id].push([x, y]);
    }
  }
  const paths = [];
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    // add starting point and end point
    const start = new Point(segment[0]).subtract(margin / 4, 0);
    const end = new Point(segment[segment.length - 1]).add(margin / 4, 0);
    const s = [start, ...segment, end];
    const pen = original[i].pen
    pens.withPen(pen, ({ color }) => {
      const path = new Path({
        segments: s,
        strokeColor: color
      });
      path.translate(margin / 2);
      // if (smoothing) {
      //   path.smooth(smoothing);
      // }
      path.simplify({tolerance: 0.5});
      paths.push(path);
    });
  }
}

// sortLinesByColor(5, sort.bogo, palette_neon,
//   {
//     type: 'catmull-rom',
//     factor: 0.5
//   }
// );

// quickSort(200, palette_large);
// mergeSort(200, palette_large);
// heapSort(200, palette_large);
// bogoSort(palette_neon);
cocktailSort(palettes.palette_hot_and_cold, 14);

// sortLinesByColor(200, sort.quick, palette_large);
// sortLinesByColor(200, sort.merge, palette_large);

window.saveAsSvg = function save(name) {
  saveAsSVG(paper.project, name);
}