import paper, { Layer } from 'paper';

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

export const info = {
  [PRISMA05_RED]: {
    color: '#f00',
    strokeWidth: PRISMA_STROKE_WIDTH
  },
  [PRISMA05_GREEN]: {
    color: '#0f0',
    strokeWidth: PRISMA_STROKE_WIDTH
  },
  [PRISMA05_BLUE]: {
    color: '#00f',
    strokeWidth: PRISMA_STROKE_WIDTH
  },
  [PRISMA05_ORANGE]: {
    color: '#ffa500',
    strokeWidth: PRISMA_STROKE_WIDTH
  },
  [PRISMA05_PURPLE]: {
    color: '#800080',
    strokeWidth: PRISMA_STROKE_WIDTH
  },
  [PRISMA05_LBROWN]: {
    color: '#b27300',
    strokeWidth: PRISMA_STROKE_WIDTH
  },
  [PRISMA05_DBROWN]: {
    color: '#7f5200',
    strokeWidth: PRISMA_STROKE_WIDTH
  },
  [PRISMA05_BLACK]: {
    color: '#000',
    strokeWidth: PRISMA_STROKE_WIDTH
  },
}

const layers = {};

export function withPen (pen, fn) {
  const previousLayer = paper.project.activeLayer;
  if (!layers[pen]) {
    layers[pen] = new Layer({name: pen});
  }
  layers[pen].activate();
  const ret = fn(info[pen]);
  previousLayer.activate();
  return ret;
};
