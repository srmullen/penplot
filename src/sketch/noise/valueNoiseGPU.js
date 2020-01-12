// import { IKernelFunctionThis } from 'gpu.js'

const gridSize = 16;
const grid = [];

for (let i = 0; i < Math.pow(gridSize, 2); i++) {
  grid.push(Math.random());
}

export function createValueNoise2dKernel(gpu) {
  gpu.addFunction(function lerp(from, to, val) {
    return from + val * (to - from);
  });

  gpu.addFunction(function interpolate(from, to, val) {
    const nval = val * val * (3 - 2 * val);
    return from + nval * (to - from);
  });

  /**
   * {a} - [Number] grid
   * {b} - Number  gridSize
   * {rate} - Number - noise rate
   */
  return gpu.createKernel(function (a, b, rate) {
    const x = rate * this.thread.x;
    const y = rate * this.thread.y;
    const xpix = Math.floor(x) % b;
    const ypix = Math.floor(y) % b;
    const xoff = x - Math.floor(x);
    const yoff = y - Math.floor(y);
    const topLeft = a[ypix * b + xpix];
    const topRight = a[ypix * b + xpix + 1];
    const bottomRight = a[(ypix + 1) * b + xpix + 1];
    const bottomLeft = a[(ypix + 1) * b + xpix];
    const ab = interpolate(topLeft, topRight, xoff);
    const cd = interpolate(bottomLeft, bottomRight, xoff);
    const val = interpolate(ab, cd, yoff);
    this.color(val, val, val, 1);
  }, {
    output: [750, 750],
    graphical: true,
    returnType: 'Float'
  });
}

class ValueNoise3d {
  constructor() {
    this.gridSize = 16;
    this.grid = [];
    // Create an array of random values. Just change the power to 3 here.
    for (let i = 0; i < Math.pow(this.gridSize, 3); i++) {
      this.grid.push(Math.random());
    }
  }

  /**
   * 
   * @param {[Float]} g - grid
   * @param {Integer} s - gridSize
   * @param {Integer} x
   * @param {Integer} y 
   * @param {Integer} z 
   */
  getValue(g, s, x, y, z) {
    // We use the modulo operator to make sure the pixels wrap. Otherwise there would be visible 
    // lines as artifacts where the noise begins to repeat.
    return g[
      (z * s * s % g.length) +
      (y * s % Math.pow(s, 2)) +
      x % s
    ];
  }

  noise(x, y, z) {
    const xpix = Math.floor(x) % this.gridSize;
    const ypix = Math.floor(y) % this.gridSize;
    const zpix = Math.floor(z) % this.gridSize;
    const xoff = x - Math.floor(x);
    const yoff = y - Math.floor(y);
    const zoff = z - Math.floor(z);

    // Front cube face.
    const fTopLeft = this.getValue(xpix, ypix, zpix);
    const fTopRight = this.getValue(xpix + 1, ypix, zpix);
    const fBottomRight = this.getValue(xpix + 1, ypix + 1, zpix);
    const fBottomLeft = this.getValue(xpix, ypix + 1, zpix);
    // Back cube face.
    const bTopLeft = this.getValue(xpix, ypix, zpix + 1);
    const bTopRight = this.getValue(xpix + 1, ypix, zpix + 1);
    const bBottomRight = this.getValue(xpix + 1, ypix + 1, zpix + 1);
    const bBottomLeft = this.getValue(xpix, ypix + 1, zpix + 1);

    // const interpolate = lerp;
    // const interpolate = cerp;
    const interpolate = smoothStep;

    const fab = interpolate(fTopLeft, fTopRight, xoff);
    const fcd = interpolate(fBottomLeft, fBottomRight, xoff);
    const frontVal = interpolate(fab, fcd, yoff);

    const bab = interpolate(bTopLeft, bTopRight, xoff);
    const bcd = interpolate(bBottomLeft, bBottomRight, xoff);
    const backVal = interpolate(bab, bcd, yoff);

    return interpolate(frontVal, backVal, zoff);
  }
}

export function createValueNoise3dKernel(gpu) {
  // const grid = [];
  // for (let i = 0; i < Math.pow(gridSize, 3); i++) {
  //   grid.push(Math.random());
  // }

  gpu.addFunction(function interpolate(from, to, val) {
    const nval = val * val * (3 - 2 * val);
    return from + nval * (to - from);
  });

  /**
   * Get the x,y,z coord from Array representation of 3d space.
   * @param {[Float]} g - grid
   * @param {Integer} s - gridSize
   * @param {Integer} x
   * @param {Integer} y 
   * @param {Integer} z 
   */
  gpu.addFunction(function getValue(g, s, x, y, z) {
    // We use the modulo operator to make sure the pixels wrap. Otherwise there would be visible 
    // lines as artifacts where the noise begins to repeat.
    return g[
      (z * s * s % Math.pow(s, 3)) +
      (y * s % Math.pow(s, 2)) +
      x % s
    ];
  });

  gpu.addFunction(function noise(a, b, x, y, z) {
    // const x = rate * this.thread.x;
    // const y = rate * this.thread.y;
    // const z = rate * zInp
    const xpix = Math.floor(x) % b;
    const ypix = Math.floor(y) % b;
    const zpix = Math.floor(z) % b;
    const xoff = x - Math.floor(x);
    const yoff = y - Math.floor(y);
    const zoff = z - Math.floor(z);

    // Front cube face.
    const fTopLeft = getValue(a, b, xpix, ypix, zpix);
    const fTopRight = getValue(a, b, xpix + 1, ypix, zpix);
    const fBottomRight = getValue(a, b, xpix + 1, ypix + 1, zpix);
    const fBottomLeft = getValue(a, b, xpix, ypix + 1, zpix);
    // Back cube face.
    const bTopLeft = getValue(a, b, xpix, ypix, zpix + 1);
    const bTopRight = getValue(a, b, xpix + 1, ypix, zpix + 1);
    const bBottomRight = getValue(a, b, xpix + 1, ypix + 1, zpix + 1);
    const bBottomLeft = getValue(a, b, xpix, ypix + 1, zpix + 1);

    const fab = interpolate(fTopLeft, fTopRight, xoff);
    const fcd = interpolate(fBottomLeft, fBottomRight, xoff);
    const frontVal = interpolate(fab, fcd, yoff);

    const bab = interpolate(bTopLeft, bTopRight, xoff);
    const bcd = interpolate(bBottomLeft, bBottomRight, xoff);
    const backVal = interpolate(bab, bcd, yoff);

    return interpolate(frontVal, backVal, zoff);
  });

  const kernel = gpu.createKernel(function (a, b, rates, zInp) {
    const rx = rates[0] * this.thread.x;
    const ry = rates[1] * this.thread.y;
    const rz = rates[2] * zInp;
    const red = noise(a, b, rx, ry, rz);

    const gx = rates[3] * this.thread.x;
    const gy = rates[4] * this.thread.y;
    const gz = rates[5] * zInp;
    const green = noise(a, b, gx, gy, gz);

    const bx = rates[6] * this.thread.x;
    const by = rates[7] * this.thread.y;
    const bz = rates[8] * zInp;
    const blue = noise(a, b, bx, by, bz);
    
    this.color(red, green, blue, 1);
    return red;
  }, {
    returnType: 'Float'
  });

  return kernel;
}


export function createValueNoise3dFn(gpu, gridSize) {
  const grid = [];
  for (let i = 0; i < Math.pow(gridSize, 3); i++) {
    grid.push(Math.random());
  }

  const kernel = createValueNoise3dKernel(gpu).setOutput([750, 750]).setGraphical(true);

  return (rate, zInp) => {
    return kernel(grid, gridSize, rate, zInp);
  }
}
