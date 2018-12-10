import math, { random, matrix } from 'mathjs';

export function vec3 (x, y, z, w=1) {
  return matrix([x, y, z, w]);
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
