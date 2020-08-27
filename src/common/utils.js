import axios from 'axios';
import pako from 'pako';
import { randomInt } from 'mathjs';
import weightedRandom from 'weighted-random';
import { isFunction } from 'lodash';

export function saveAsSVG (project, name='default') {
  console.log('Saving');
  const content = timer(() => {
    return project.exportSVG({asString: true});
  });
  const body = {
    name,
    content: pako.deflate(content, {to: 'string'})
  }

  axios.put('/api/svg', body, {headers: {'content-type': 'application/json'}}).then(res => {
    console.log(res);
  }).catch(err => {
    console.error(err);
  });
}

export function mod (r, n) {
  return ((r % n) + n) % n;
}

// returns true iff the line from (a,b)->(c,d) intersects with (p,q)->(r,s)
export function intersects (a,b,c,d,p,q,r,s) {
  var det, gamma, lambda;
  det = (c - a) * (s - q) - (r - p) * (d - b);
  if (det === 0) {
    return false;
  } else {
    lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
    gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }
};

/**
 * Adapted from https://www.geeksforgeeks.org/program-for-point-of-intersection-of-two-lines/
 */
export function intersection (a, b, p, q) {
  // Line ab represented as a1x + b1y = c1
  const a1 = b.y - a.y;
  const b1 = a.x - b.x;
  const c1 = a1 * a.x + b1 * a.y;

  // Line pq represented as a2x + b2y = c2
  const a2 = q.y - p.y;
  const b2 = p.x - q.x;
  const c2 = a2 * p.x + b2 * p.y;

  const determinant = a1 * b2 - a2 * b1;
  if (determinant === 0) {
    // Lines are parrallel
    return false;
  } else {
    const x = (b2 * c1 - b1 * c2) / determinant;
    const y = (a1 * c2 - a2 * c1) / determinant;
    return {x, y};
  }
}

export function radiansToDegrees (n) {
  return (n * 180) / Math.PI;
}

export function degreesToRadians(n) {
  return n * Math.PI / 180;
}

export function timer (fn) {
  const now = Date.now();
  const ret = fn();
  if (ret instanceof Promise) {
    ret.then(() => {
      const dur = Date.now() - now;
      console.log(dur);
    });
  } else {
    const dur = Date.now() - now;
    console.log(dur);
  }
  return ret;
}

/**
 * @param a - The height of the curve.
 * @param b - The position of the peak.
 * @param c - Non-zero standard deviation.
 * @param x - The input.
 */
export function gauss (a, b, c, x) {
  return a * Math.pow(Math.E, -(Math.pow(x - b, 2) / (2 * Math.pow(c, 2))));
}

export function constrain (n, low, high) {
  return Math.max(Math.min(n, high), low);
}

export function lerp (start, stop, amt) {
  return amt * (stop - start) + start;
}

// Cosine interpolation
export function cerp(from, to, val) {
  return lerp(from, to, -Math.cos(Math.PI * val) / 2 + 0.5);
}

// Smooth step interpolation
export function smoothStep(from, to, val) {
  return lerp(from, to, val * val * (3 - 2 * val));
}

export function choose (arr) {
  return arr[randomInt(arr.length)];
}

/**
 * Choose n items from array with replacement
 * @param {Array} arr
 * @param {Number?} n
 * @param {boolean} replacement
 */
export function chooseN(arr, n) {
  const ret = [];
  for (let i = 0; i < n; i++) {
    ret.push(choose(arr));
  }
  return ret;
}

export function wchoose (weights, arr) {
  const index = weightedRandom(weights);
  return arr[index];
}

export function processOptions (options, input) {
  const ret = {};
  for (let name in options) {
    if (isFunction(options[name])) {
      ret[name] = options[name](input);
    } else {
      ret[name] = options[name];
    }
  }
  return ret;
}

/**
 * Remove points from paths are out of bounds. If points out of bounds are in the middle of
 * paths then break the path into seperate paths.
 * DOES NOT create new point on the boundary.
 * @param inBounds {Function} - Returns true if point is in bounds, fasle otherwise.
 * @param paths Point[][] - Array of point arrays.
 */
export function clipBounds (inBounds, paths) {
  return paths.reduce((acc, path) => {
    const clipped = [];
    let np;
    let continuation = false;
    for (let i = 0, l = path.length; i < l; i++) {
      const p = path[i];
      if (inBounds(p)) {
        if (!continuation) {
          np = [];
          continuation = true;
        }
        np.push(p);
      } else {
        if (continuation) {
          continuation = false;
          clipped.push(np);
          np = [];
        }
      }
    }
    // Push np if last point in path isn't clipped.
    if (np && np.length) {
      clipped.push(np);
    }
    return acc.concat(clipped);
  }, []);
}

// From p5.map
export function maprange (n, start1, stop1, start2, stop2, withinBounds) {
  var newval = (n - start1) / (stop1 - start1) * (stop2 - start2) + start2;
  if (!withinBounds) {
    return newval;
  }
  if (start2 < stop2) {
    return constrain(newval, start2, stop2);
  } else {
    return constrain(newval, stop2, start2);
  }
};

/**
 * In-place array shuffle.
 * @param {Array} a 
 */
export function shuffle(a) {
  for (let i = a.length; i; i--) {
    let j = Math.floor(Math.random() * i);
    [a[i - 1], a[j]] = [a[j], a[i - 1]];
  }
}

export function insert(arr, i, el) {
  return [
    ...arr.slice(0, i),
    el,
    ...arr.slice(i)
  ];
}

// Draw circles in the topleft corner center and bottom right corner of the page
// in order to help test axidraw placement.
export function sizeTest() {
  new Path.Circle({
    radius: 10,
    strokeColor: 'black',
    center: [11, 11]
  });
  new Path.Circle({
    radius: 10,
    strokeColor: 'black',
    center: [width / 2, height / 2]
  });
  new Path.Circle({
    radius: 10,
    strokeColor: 'black',
    center: [width - 11, height - 11]
  });
}