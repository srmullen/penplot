import paper, { Group, Layer, Color } from 'paper';
import { isArray } from 'lodash';

export const PRISMA05_RED = 'PRISMA05_RED';
export const PRISMA05_GREEN = 'PRISMA05_GREEN';
export const PRISMA05_BLUE = 'PRISMA05_BLUE';
export const PRISMA05_ORANGE = 'PRISMA05_ORANGE';
export const PRISMA05_PURPLE = 'PRISMA05_PURPLE';
export const PRISMA05_LBROWN = 'PRISMA05_LBROWN';
export const PRISMA05_DBROWN = 'PRISMA05_DBROWN';
export const PRISMA05_BLACK = 'PRISMA05_BLACK';

export const prisma05 = [
  PRISMA05_RED,
  PRISMA05_GREEN,
  PRISMA05_BLUE,
  PRISMA05_ORANGE,
  PRISMA05_PURPLE,
  PRISMA05_LBROWN,
  PRISMA05_DBROWN,
  PRISMA05_BLACK
];

const PRISMA_STROKE_WIDTH = 2;

export const penInfo = {
  [PRISMA05_RED]: {
    color: new Color('#f00'),
    strokeWidth: PRISMA_STROKE_WIDTH
  },
  [PRISMA05_GREEN]: {
    color: new Color('#0f0'),
    strokeWidth: PRISMA_STROKE_WIDTH
  },
  [PRISMA05_BLUE]: {
    color: new Color('#00f'),
    strokeWidth: PRISMA_STROKE_WIDTH
  },
  [PRISMA05_ORANGE]: {
    color: new Color('#ffa500'),
    strokeWidth: PRISMA_STROKE_WIDTH
  },
  [PRISMA05_PURPLE]: {
    color: new Color('#800080'),
    strokeWidth: PRISMA_STROKE_WIDTH
  },
  [PRISMA05_LBROWN]: {
    color: new Color('#b27300'),
    strokeWidth: PRISMA_STROKE_WIDTH
  },
  [PRISMA05_DBROWN]: {
    color: new Color('#7f5200'),
    strokeWidth: PRISMA_STROKE_WIDTH
  },
  [PRISMA05_BLACK]: {
    color: new Color('#000'),
    strokeWidth: PRISMA_STROKE_WIDTH
  },
}

export function info (pen) {
  return penInfo[pen];
}

const layers = {};
window.penLayers = layers;

export function withPen (pen, fn) {
  const previousLayer = paper.project.activeLayer;
  if (!layers[pen]) {
    layers[pen] = new Layer({name: pen});
    // layers[pen] = new Group({name: pen});
  }
  layers[pen].activate();
  const ret = fn(info(pen));
  // if (isArray(ret)) {
  //   layers[pen].addChildren(ret);
  // } else {
  //   layers[pen].addChild(ret);
  // }
  previousLayer.activate();
  return ret;
};

// export function withPen (pen, fn) {
//   // const previousLayer = paper.project.activeLayer;
//   if (!layers[pen]) {
//     // layers[pen] = new Layer({name: pen});
//     layers[pen] = new Group({name: pen});
//   }
//   // layers[pen].activate();
//   const ret = fn(info(pen));
//   if (isArray(ret)) {
//     layers[pen].addChildren(ret);
//   } else {
//     layers[pen].addChild(ret);
//   }
//   // previousLayer.activate();
//   return ret;
// };
