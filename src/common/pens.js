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

// Artist's loft
// FIXME: Should maybe make pens and stroketype seperate.
export const AL_N2_BRUSH = 'AL_N2_BRUSH';
export const AL_N3_BRUSH = 'AL_N3_BRUSH';
export const AL_N5_BRUSH = 'AL_N5_BRUSH';
export const AL_N6_BRUSH = 'AL_N6_BRUSH';
export const AL_N8_BRUSH = 'AL_N8_BRUSH';
export const AL_N10_BRUSH = 'AL_N10_BRUSH';

export const AL_N2_FINE = 'AL_N2_FINE';
export const AL_N3_FINE = 'AL_N3_FINE';
export const AL_N5_FINE = 'AL_N5_FINE';
export const AL_N6_FINE = 'AL_N6_FINE';
export const AL_N8_FINE = 'AL_N8_FINE';
export const AL_N10_FINE = 'AL_N10_FINE';

export const AL_N2_FAT = 'AL_N2_FAT';
export const AL_N3_FAT = 'AL_N3_FAT';
export const AL_N5_FAT = 'AL_N5_FAT';
export const AL_N6_FAT = 'AL_N6_FAT';
export const AL_N8_FAT = 'AL_N8_FAT';
export const AL_N10_FAT = 'AL_N10_FAT';

/**
 * Stabilo
 * position - center on red dot. Pen height down = 42, pen height up = 70.
 **/ 
const STABILO_88_STROKE_WIDTH = 1;
export const STABILO_88_44 = 'STABILO_88_44';
export const STABILO_88_33 = 'STABILO_88_33';
export const STABILO_88_43 = 'STABILO_88_43';
export const STABILO_88_36 = 'STABILO_88_36';
export const STABILO_88_53 = 'STABILO_88_53';
export const STABILO_88_63 = 'STABILO_88_63';

export const STABILO_88_54 = 'STABILO_88_54';
export const STABILO_88_40 = 'STABILO_88_40';
export const STABILO_88_50 = 'STABILO_88_50';
export const STABILO_88_45 = 'STABILO_88_45';
export const STABILO_88_22 = 'STABILO_88_22';

export const STABILO_88_41 = 'STABILO_88_41';
export const STABILO_88_32 = 'STABILO_88_32'; 
export const STABILO_88_51 = 'STABILO_88_51'; 
export const STABILO_88_13 = 'STABILO_88_13'; 
export const STABILO_88_55 = 'STABILO_88_55';
export const STABILO_88_56 = 'STABILO_88_56'; 
export const STABILO_88_57 = 'STABILO_88_57'; 
export const STABILO_88_58 = 'STABILO_88_58';
export const STABILO_88_59 = 'STABILO_88_59'; 

export const STABILO_88_94 = 'STABILO_88_94';
export const STABILO_88_96 = 'STABILO_88_96';
export const STABILO_88_46 = 'STABILO_88_46';

// Neon
export const STABILO_88_033 = 'STABILO_88_033';
export const STABILO_88_056 = 'STABILO_88_056';
export const STABILO_88_040 = 'STABILO_88_040';
export const STABILO_88_024 = 'STABILO_88_024';
export const STABILO_88_054 = 'STABILO_88_054';


export const stabilo88 = [
  STABILO_88_44,
  STABILO_88_33,
  STABILO_88_43,
  STABILO_88_36,
  STABILO_88_53,
  STABILO_88_63
];

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

  [STABILO_88_44]: {
    color: new Color('#FFD700'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_33]: {
    color: new Color('#6B8E23'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_43]: {
    color: new Color('#00FF7F'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_36]: {
    color: new Color('#008000'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_53]: {
    color: new Color('#008B8B'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_63]: {
    color: new Color('#556B2F'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_54]: {
    color: new Color('#FFA500'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_40]: {
    color: new Color('#FF0000'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_50]: {
    color: new Color('#DC143C'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_45]: {
    color: new Color('#A52A2A'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_22]: {
    color: new Color('#191970'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },

  [STABILO_88_41]: {
    color: new Color('#7B68EE'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_32]: {
    color: new Color('#4169E1'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_51]: {
    color: new Color('#008B8B'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_57]: {
    color: new Color('#00CED1'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_13]: {
    color: new Color('#7FFFD4'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_59]: {
    color: new Color('#DDA0DD'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_94]: {
    color: new Color('#C0C0C0'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_96]: {
    color: new Color('#696969'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_46]: {
    color: new Color('#000000'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_58]: {
    color: new Color('#8B008B'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_55]: {
    color: new Color('#9370DB'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_033]: {
    color: new Color('#00FF00'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_056]: {
    color: new Color('#FF00CC'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_040]: {
    color: new Color('#FF0099'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_024]: {
    color: new Color('#FFFF33'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_054]: {
    color: new Color('#FF6700'),
    strokeWidth: STABILO_88_STROKE_WIDTH
  },
  [STABILO_88_56]: {
    color: new Color('#C71585'),
    strokeWidth: STABILO_88_STROKE_WIDTH
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
