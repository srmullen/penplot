import { Point } from 'paper';

/**
 * @param distance {number} - The distance at which points will begin ignoring each other.
 * @param stepDist {number} - The size of the step taken away from a point.
 */
function relaxationDisplacementStep(points, { distance = 20, stepDist = 1 } = {}) {
  const ret = [];
  let changed = false;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    let force = new Point(0, 0);
    for (let j = 0; j < points.length; j++) {
      if (i !== j) {
        const vec = points[j].subtract(point);
        if (vec.length < distance) {
          force = force.subtract(vec.normalize().multiply(stepDist));
          changed = true;
        }
      }
    }
    ret.push(point.add(force));
  }
  return [ret, changed];
}

// http://compform.net/strategy/#relaxation-displacement
export default function relaxationDisplacement(points, opts) {
  let changed = true;
  let displaced = points;
  while (changed) {
    [displaced, changed] = relaxationDisplacementStep(displaced, opts);
  }
  return displaced;
}