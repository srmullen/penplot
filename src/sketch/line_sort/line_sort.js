import paper, { Point, Path } from 'paper';
import math, { randomInt } from 'mathjs';
import { range, reverse } from 'lodash';
import please from 'pleasejs';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, shuffle
} from 'common/utils';
import * as pens from 'common/pens';
import * as sort from './sort';
import * as palettes from 'common/palettes';

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

function bitonicCompare(key, a, b, dir) {
  const UP = 1;
  const DOWN = 0;
  if (a[key] === b[key]) {
    return 0;
  } else if (dir === UP && a[key] > b[key]) {
    return 1;
  } else if (dir === DOWN && a[key] < b[key]) {
    return 1;
  } else {
    return -1;
  }
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
  } else if (sortFn === sort.bogo) {
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

function quickSort(items, opts) {
  const PAPER_SIZE = A4.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const sortFn = sort.quick;
  const exchangeFn = exchangeIndices;

  const original = items.map(a => a);

  const sorted = [...sortFn(exchangeFn, compareObjectByKey.bind(null, 'val'), items)];

  draw(original, sorted, width, height, opts);
}

function mergeSort(items) {
  const PAPER_SIZE = A4.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const sortFn = sort.merge;
  const exchangeFn = copyFromList;

  const original = items.map(a => a);

  const sorted = [...sortFn(exchangeFn, compareObjectByKey.bind(null, 'val'), items)];

  draw(original, sorted, width, height, {smoothing: {type: 'catmull-rom', factor: 0.9}});
}

function heapSort(items) {
  const PAPER_SIZE = A4.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const sortFn = sort.heap;
  const exchangeFn = exchangeIndices;

  const original = items.map(a => a);

  const sorted = [...sortFn(exchangeFn, compareObjectByKey.bind(null, 'val'), items)];

  draw(original, sorted, width, height, {
    type: 'catmull-rom',
    factor: 0.5
  });
}

function bogoSort(items) {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const sortFn = sort.bogo;
  const exchangeFn = shuffle;
  
  const original = items.map(a => a);

  const gen = sortFn(exchangeFn, compareObjectByKey.bind(null, 'val'), items);
  const sorted = [];
  for (let i = 0; i < 100; i++) {
    const { value, done } = gen.next();
    if (done) {
      break;
    }
    sorted.push(value);
  }

  draw(original, sorted, width, height, opts);
}

function cocktailSort(items) {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const original = items.map(a => a);

  const sortFn = sort.cocktail;
  const exchangeFn = exchangeIndices;

  const sorted = [...sortFn(exchangeFn, compareObjectByKey.bind(null, 'val'), items)];

  draw(original, sorted, width, height);
}

function cycleSort(items, opts) {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const original = items.map(a => a);

  const sortFn = sort.cycle;
  const exchangeFn = swapOut;

  const sorted = [...sortFn(exchangeFn, compareObjectByKey.bind(null, 'val'), items)];

  draw(original, sorted, width, height, opts);
}

function shellSort(items, opts, paperType = STRATH_SMALL) {
  const PAPER_SIZE = paperType.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const original = items.map(a => a);

  const sortFn = sort.shell;
  const exchangeFn = exchangeIndices;

  const sorted = [...sortFn(exchangeFn, compareObjectByKey.bind(null, 'val'), items)];

  draw(original, sorted, width, height, opts);
}

function combSort(items, opts, paperType = STRATH_SMALL) {
  const PAPER_SIZE = paperType.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const original = items.map(a => a);

  const sortFn = sort.comb;
  const exchangeFn = exchangeIndices;

  const sorted = [...sortFn(exchangeFn, compareObjectByKey.bind(null, 'val'), items)];

  draw(original, sorted, width, height, opts);
}

function selectionSort(items, opts, paperType = STRATH_SMALL) {
  const PAPER_SIZE = paperType.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const original = items.map(a => a);

  const sortFn = sort.selection;
  const exchangeFn = exchangeIndices;

  const sorted = [...sortFn(exchangeFn, compareObjectByKey.bind(null, 'val'), items)];

  draw(original, sorted, width, height, opts);
}

function radixSort(items, opts, paperType = STRATH_SMALL) {
  const PAPER_SIZE = paperType.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const original = items.map(a => a);

  const sortFn = sort.radix;
  const exchangeFn = copyFromList;

  const max = Math.max(...items.map(a => a['val']));
  const sorted = [...sortFn(max, exchangeFn, a => a['val'], items)];

  draw(original, sorted, width, height, opts);
}

function bitonicSort(items, opts, paperType = STRATH_SMALL) {
  const PAPER_SIZE = paperType.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const original = items.map(a => a);

  const sortFn = sort.bitonic;
  const exchangeFn = exchangeIndices;

  const sorted = [...sortFn(exchangeFn, bitonicCompare.bind(null, 'val'), items)];

  draw(original, sorted, width, height, opts);
}

function uniformRandomItems(nLines, palette) {
  const arr = [];
  for (let i = 0; i < nLines; i++) {
    const val = randomInt(palette.length);
    arr.push({
      id: i,
      val,
      pen: palette[val]
    });
  }
  return arr;
}

function reverseItems(linesPerPen = 10, palette) {
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
  return arr;
}

function repeatItems(times, palette) {
  const arr = [];
  let id = 0;
  for (let i = 0; i < times; i++) {
    for (let j = 0; j < palette.length; j++) {
      arr.push({
        id: id,
        val: j,
        pen: palette[j]
      });
      id++;
    }
  }
  arr.reverse();
  return arr;
}

function draw(original, sorted, width, height, opts = {}) {
  const nLines = original.length;
  const margin = 100;
  const vStepSize = (height - margin) / nLines;
  const hStepSize = (width - margin) / sorted.length;
  const segments = [];
  for (let i = 0; i < nLines; i++) {
    segments.push([]);
  }
  // for (let i = 0; i < original.length; i++) {
  //   const x = -(margin/4);
  //   const y = i * vStepSize;
  //   segments[original[i].id].push([x, y]);
  // }
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
    const pen = opts.reversePen ? sorted[sorted.length - 1].list[i].pen : original[i].pen;
    // const pen = sorted[sorted.length-1].list[i].pen;
    pens.withPen(pen, ({ color }) => {
      const strokeColor = new paper.Color(color);
      strokeColor.alpha = 1;
      const path = new Path({
        segments: s,
        strokeColor
      });
      path.translate(margin / 2);
      if (opts.smoothing) {
        path.smooth(opts.smoothing);
      }
      if (opts.simplify) {
        path.simplify(opts.simplify);
      }
      paths.push(path);
    });
  }
}

function splitReverse(arr, depth=0) {
  const length = Math.floor(arr.length / 2);
  if (!depth) {
    return [
      ...reverse(arr.slice(0, length)),
      ...reverse(arr.slice(length)),
    ]; 
  } else {
    return [
      ...splitReverse(reverse(arr.slice(0, length)), depth - 1),
      ...splitReverse(reverse(arr.slice(length)), depth - 1),

      // ...splitReverse(arr.slice(0, length), depth - 1),
      // ...splitReverse(arr.slice(length), depth - 1),
    ]; 
  }
}

// quickSort(uniformRandomItems(200, palettes.palette_large));
// let items = reverseItems(25, palettes.palette_rgb3);
// items = splitReverse(items, 3);
// quickSort(items, {
//   reversePen: true,
//   smoothing: {
//     type: 'catmull-rom',
//     factor: 0.7
//   }
// });
// quickSort(repeatItems(12, palettes.palette_large));

// mergeSort(uniformRandomItems(200, palettes.palette_large));
// mergeSort(reverseItems(15, palettes.palette_hot_and_cold));
// mergeSort(repeatItems(15, palettes.palette_hot_and_cold));

// heapSort(uniformRandomItems(200, palettes.palette_large));
// heapSort(reverseItems(15, palettes.palette_large));
// heapSort(repeatItems(15, palettes.palette_hot_and_cold));

// bogoSort(repeatItems(4, palettes.palette_neon));

// cocktailSort(reverseItems(14, palettes.palette_hot_and_cold));
// palettes.palette_blues_and_greens.reverse();
// cocktailSort(reverseItems(14, palettes.palette_blues_and_greens));

// cycleSort(splitReverse(repeatItems(14, palettes.palette_hot_and_cold), 0), {
//   smoothing: {
//     type: 'catmull-rom',
//     factor: 0.9
//   }
// });

// cycleSort(splitReverse(reverseItems(14, palettes.palette_hot_and_cold), 2), {
//   smoothing: {
//     type: 'catmull-rom',
//     factor: 0.9
//   }
// });

// shellSort(uniformRandomItems(100, palettes.palette_hot_and_cold));
// shellSort(repeatItems(14, palettes.palette_hot_and_cold));
// shellSort(reverseItems(25, palettes.palette_lego));
// shellSort(reverseItems(14, palettes.palette_large), {}, A4);

// combSort(uniformRandomItems(100, palettes.palette_hot_and_cold));
// combSort(repeatItems(14, palettes.palette_hot_and_cold));
// combSort(splitReverse(repeatItems(20, palettes.palette_hot_and_cold), 4));
// combSort(splitReverse(reverseItems(16, palettes.palette_flowers), 0));
// combSort(reverseItems(14, palettes.palette_large), {}, A4);

// selectionSort(splitReverse(reverseItems(14, palettes.palette_garden), 0), {
//   reversePen: true,
//   smoothing: {
//     type: 'catmull-rom',
//     factor: 0.9
//   }
// });

// selectionSort(reverseItems(14, palettes.palette_garden), {
//   reversePen: true,
//   smoothing: {
//     type: 'catmull-rom',
//     factor: 0.9
//   }
// });

// sortLinesByColor(100, sort.radix, palettes.palette_large);
// sortLinesByColor(200, sort.merge, palette_large);
// sortLinesByColor(100, sort.cycle, palettes.palette_large);
// sortLinesByColor(100, sort.selection, palettes.palette_garden, {
//   smoothing: {
//     type: 'catmull-rom',
//     factor:0.9
//   }
// });

// radixSort(uniformRandomItems(100, palettes.palette_hot_and_cold));
// radixSort(reverseItems(5, palettes.palette_large), {}, A4);
// radixSort(reverseItems(15, palettes.palette_hot_and_cold), {}, A4);
// radixSort(reverseItems(14, palettes.palette_large), {}, A4);

// bitonicSort(uniformRandomItems(100, palettes.palette_hot_and_cold));
// bitonicSort(repeatItems(25, palettes.palette_rgb3), {}, A4);
// bitonicSort(reverseItems(20, palettes.palette_large), {}, A4);
bitonicSort(repeatItems(20, palettes.palette_large), {}, A4);
// bitonicSort(reverseItems(14, palettes.palette_large), {}, A4);

window.saveAsSvg = function save(name) {
  saveAsSVG(paper.project, name);
}