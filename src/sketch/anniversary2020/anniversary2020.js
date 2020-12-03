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

console.log('its our anniversary');