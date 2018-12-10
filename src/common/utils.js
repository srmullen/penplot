import axios from 'axios';

export function createCanvas (width=300, height=150) {
  const root = document.getElementById('root');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style = 'border: 1px solid black';
  root.appendChild(canvas);

  return canvas;
}

export function saveAsSVG (project, name='default') {
  const serializer = new XMLSerializer();
  const svg = project.exportSVG();
  const content = serializer.serializeToString(svg);
  const body = {
    name,
    content
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
