import math, { random, matrix } from 'mathjs';

const handler = {
  get (target, name) {
    switch (name) {
      case 'x':
        return target.get([0]);
      case 'y':
        return target.get([1]);
      case 'z':
        return target.get([2]);
      case 'w':
        return target.get([3]);
      case '0':
        return target.get([0]);
      case '1':
        return target.get([1]);
      case '2':
        return target.get([2]);
      case '3':
        return target.get([3]);
      default:
        return target[name];
    }
  }
};
export function vec3 (x, y, z, w=1) {
  return new Proxy(matrix([x, y, z, w]), handler);
}

/**
 * @param {Array} - 3d vector.
 * @return {Array} - 3d vector of length 1 with same direction as input vector.
 */
export function normalize ([x, y, z]) {
  const dist  = math.sqrt(math.pow(x, 2) + math.pow(y, 2) + math.pow(z, 2));
  return [x/dist, y/dist, z/dist];
}

export function rotationXMatrix (theta) {
  return matrix([
    [1,  0,               0,               0],
    [0,  math.cos(theta), math.sin(theta), 0],
    [0, -math.sin(theta), math.cos(theta), 0],
    [0,  0,               0,               1]
  ]);
}

export function rotationYMatrix (theta) {
  return matrix([
    [math.cos(theta),  0, -math.sin(theta), 0],
    [0,                1,  0,               0],
    [math.sin(theta), 0,  math.cos(theta), 0],
    [0,                0,  0,               1]
  ]);
}

export function rotationZMatrix (theta) {
  return matrix([
    [math.cos(theta), math.sin(theta),  0, 0],
    [-math.sin(theta), math.cos(theta), 0, 0],
    [0,               0,                1, 0],
    [0,               0,                0, 1]
  ]);
}
