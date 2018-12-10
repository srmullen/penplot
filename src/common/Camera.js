import math from 'mathjs';

export default class Camera {
  constructor (focalLength = 500, matrix = math.identity(4)) {
    this.matrix = matrix;
    this.focalLength = focalLength;
  }

  rotate (matrix) {
    this.matrix = math.multiply(this.matrix, matrix);
  }
}
