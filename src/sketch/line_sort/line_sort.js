import paper, { Point, Path, Group } from 'paper';
import math, { random, randomInt } from 'mathjs';
import { range } from 'lodash';
import please from 'pleasejs';
import { Noise } from 'noisejs';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, intersects, intersection, radiansToDegrees, gauss, choose, wchoose, lerp, processOptions, clipBounds
} from 'common/utils';
import * as colors from 'common/color';
import * as pens from 'common/pens';
import * as sort from './sort';

const PAPER_SIZE = STRATH_SMALL.landscape;
const [width, height] = PAPER_SIZE;
const canvas = createCanvas(PAPER_SIZE);
paper.setup(canvas);

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

function shuffle(a) {
  for (let i = a.length; i; i--) {
    let j = Math.floor(Math.random() * i);
    [a[i - 1], a[j]] = [a[j], a[i - 1]];
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

function sortLinesByColor(nLines, sortFn, palette) {
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
  }
  
  let sorted = null;
  if (sortFn === sort.radix) {
    const max = Math.max(...arr.map(a => a['val']));
    sorted = [...sortFn(max, exchangeFn, a => a['val'], arr)];
  } else {
    sorted = [...sortFn(exchangeFn, compareObjectByKey.bind(null, 'val'), arr)];
  }

  draw(original, sorted);

}

function draw (original, sorted) {
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
      path.simplify();
      path.smooth({
        type: 'catmull-rom',
        factor: 0.9
      });
      paths.push(path);
    });
  }
}

const palette_evening = [
  pens.STABILO_88_22,
  pens.STABILO_88_45,
  pens.STABILO_88_50,
  pens.STABILO_88_40,
  pens.STABILO_88_54,
  pens.STABILO_88_44,
];

const palette_garden = [
  pens.STABILO_88_54,
  pens.STABILO_88_44,
  pens.STABILO_88_43,
  pens.STABILO_88_33,
  pens.STABILO_88_36,
  pens.STABILO_88_63,
  pens.STABILO_88_53,
];

const palette_frost = [
  pens.STABILO_88_22,
  pens.STABILO_88_41,
  pens.STABILO_88_32,
  pens.STABILO_88_51,
  pens.STABILO_88_57,
  pens.STABILO_88_13,
  pens.STABILO_88_59,
];

// sortLinesByColor(100, sort.cocktail, palette_garden);
// sortLinesByColor(100, sort.selection, palette_garden);
sortLinesByColor(100, sort.insertion, palette_frost);

window.saveAsSvg = function save(name) {
  saveAsSVG(paper.project, name);
}