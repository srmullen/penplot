function sum(ns = []) {
  return ns.reduce((acc, n) => acc + n, 0);
}

function length(vec) {
  return Math.sqrt(sum(vec.map(n => Math.pow(n, 2))));
}

function normalize(ns) {
  const total = length(ns);
  return ns.map(n => n / total);
}

function randomNormal2d() {
  return normalize([Math.random() * 2 - 1, Math.random() * 2 - 1]);
}

function randomNormal3d() {
  return normalize([
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random() * 2 - 1
  ]);
}

export function addPerlinNoise2d(gpu) {
  gpu.addFunction(function constrain(n, low, high) {
    return Math.max(Math.min(n, high), low);
  });

  gpu.addFunction(function maprange(n, start1, stop1, start2, stop2) {
    var newval = (n - start1) / (stop1 - start1) * (stop2 - start2) + start2;
    if (start2 < stop2) {
      return constrain(newval, start2, stop2);
    } else {
      return constrain(newval, stop2, start2);
    }
  });

  gpu.addFunction(function lerp(from, to, val) {
    return from + val * (to - from);
  });

  gpu.addFunction(function interpolate(from, to, val) {
    const nval = val * val * (3 - 2 * val);
    return from + nval * (to - from);
  });

  gpu.addFunction(function getGradient(a, b, x, y) {
    //  return a[((y * b) % a.length) + (x % b)];
    const offset = (x * 2) + ((b - y) * b * 2);
    // const offset = ((y * b) % Math.pow(b, 2) * 2) + (x % b);
    return [a[offset], a[offset + 1]];
  });

  gpu.addFunction(function dot2(a, b, c, d) {
    return a * c + b * d;
  });

  gpu.addFunction(function noise(a, b, x, y) {
    const xpix = Math.floor(x) % b;
    const ypix = Math.floor(y) % b;
    const xoff = x - Math.floor(x);
    const yoff = y - Math.floor(y);
    const g1 = getGradient(a, b, xpix, ypix); // top left
    const g2 = getGradient(a, b, xpix + 1, ypix); // top right
    const g3 = getGradient(a, b, xpix + 1, ypix + 1); // bottom right
    const g4 = getGradient(a, b, xpix, ypix + 1); // bottom left

    const v1 = [xoff, yoff];
    const v2 = [xoff - 1, yoff];
    const v3 = [xoff - 1, yoff - 1];
    const v4 = [xoff, yoff - 1];

    const d1 = dot2(g1[0], g1[1], v1[0], v1[1]);
    const d2 = dot2(g2[0], g2[1], v2[0], v2[1]);
    const d3 = dot2(g3[0], g3[1], v3[0], v3[1]);
    const d4 = dot2(g4[0], g4[1], v4[0], v4[1]);

    const ab = interpolate(d1, d2, xoff);
    const cd = interpolate(d4, d3, xoff);
    return interpolate(ab, cd, yoff);
  });
}

export function createPerlinNoise2dKernel(gpu) {
  addPerlinNoise2d(gpu);
  /**
   * {a} - [Number] grid
   * {b} - Number  gridSize
   * {rate} - Number[] - noise rates
   */
  return gpu.createKernel(function (a, b, rates) {
    const rx = rates[0] * this.thread.x;
    const ry = rates[1] * this.thread.y;
    const red = maprange(noise(a, b, rx, ry), -1, 1, 0, 1);

    const gx = rates[2] * this.thread.x;
    const gy = rates[3] * this.thread.y;
    const green = maprange(noise(a, b, gx, gy), -1, 1, 0, 1);

    const bx = rates[4] * this.thread.x;
    const by = rates[5] * this.thread.y;
    const blue = maprange(noise(a, b, bx, by), -1, 1, 0, 1);
    this.color(red, green, blue, 1);
    return [red, green, blue];
  }, {
    output: [750, 750],
    graphical: true,
    returnType: 'Array(3)'
  });
}

export function createPerlinNoise2dFn(gpu, gridSize) {
  const grid = [];
  for (let i = 0; i < Math.pow(gridSize, 2); i++) {
    // Create a flat array to better work with gpu.js
    // Need to adjust accordingly when getting the gradients.
    const normal = randomNormal2d();
    grid.push(normal[0]);
    grid.push(normal[1]);
  }

  const kernel = createPerlinNoise2dKernel(gpu).setOutput([750, 750]).setGraphical(true);

  return (rate) => {
    return kernel(grid, gridSize, rate);
  }
}

export function addPerlinNoise3d(gpu) {
  gpu.addFunction(function constrain(n, low, high) {
    return Math.max(Math.min(n, high), low);
  });

  gpu.addFunction(function maprange(n, start1, stop1, start2, stop2) {
    var newval = (n - start1) / (stop1 - start1) * (stop2 - start2) + start2;
    if (start2 < stop2) {
      return constrain(newval, start2, stop2);
    } else {
      return constrain(newval, stop2, start2);
    }
  });

  gpu.addFunction(function lerp(from, to, val) {
    return from + val * (to - from);
  });

  gpu.addFunction(function interpolate(from, to, val) {
    const nval = val * val * (3 - 2 * val);
    return from + nval * (to - from);
  });

  gpu.addFunction(function getGradient(a, b, x, y, z) {
    // Mod by b to ensure no jumps when wrapping grid.
    const offset = ((x * 3) % b) + ((y * b * 3) % Math.pow(b, 2)) + ((z * b * b * 3) % Math.pow(b, 3));
    return [a[offset], a[offset + 1], a[offset + 2]];
  })

  gpu.addFunction(function dot3(a, b, c, d, e, f) {
    return a * d + b * e + c * f;
  });

  gpu.addFunction(function noise(a, b, x, y, z) {
    const xpix = Math.floor(x) % b;
    const ypix = Math.floor(y) % b;
    const zpix = Math.floor(z) % b;
    const xoff = x - Math.floor(x);
    const yoff = y - Math.floor(y);
    const zoff = z - Math.floor(z);

    const g1 = getGradient(a, b, xpix, ypix, zpix);             // front top left
    const g2 = getGradient(a, b, xpix + 1, ypix, zpix);         // front top right
    const g3 = getGradient(a, b, xpix + 1, ypix + 1, zpix);     // front bottom right
    const g4 = getGradient(a, b, xpix, ypix + 1, zpix);         // front bottom left
    const g5 = getGradient(a, b, xpix, ypix, zpix + 1);         // back top left
    const g6 = getGradient(a, b, xpix + 1, ypix, zpix + 1);     // back top right
    const g7 = getGradient(a, b, xpix + 1, ypix + 1, zpix + 1); // back bottom right
    const g8 = getGradient(a, b, xpix, ypix + 1, zpix + 1);      // back bottom left

    const v1 = [xoff, yoff, zoff];
    const v2 = [xoff - 1, yoff, zoff];
    const v3 = [xoff - 1, yoff - 1, zoff];
    const v4 = [xoff, yoff - 1, zoff];
    const v5 = [xoff, yoff, zoff - 1];
    const v6 = [xoff - 1, yoff, zoff - 1];
    const v7 = [xoff - 1, yoff - 1, zoff - 1];
    const v8 = [xoff, yoff - 1, zoff - 1];

    const d1 = dot3(g1[0], g1[1], g1[2], v1[0], v1[1], v1[2]);
    const d2 = dot3(g2[0], g2[1], g2[2], v2[0], v2[1], v2[2]);
    const d3 = dot3(g3[0], g3[1], g3[2], v3[0], v3[1], v3[2]);
    const d4 = dot3(g4[0], g4[1], g4[2], v4[0], v4[1], v4[2]);
    const d5 = dot3(g5[0], g5[1], g5[2], v5[0], v5[1], v5[2]);
    const d6 = dot3(g6[0], g6[1], g6[2], v6[0], v6[1], v6[2]);
    const d7 = dot3(g7[0], g7[1], g7[2], v7[0], v7[1], v7[2]);
    const d8 = dot3(g8[0], g8[1], g8[2], v8[0], v8[1], v8[2]);

    const fab = interpolate(d1, d2, xoff);
    const fcd = interpolate(d4, d3, xoff);
    const frontVal = interpolate(fab, fcd, yoff);

    const bab = interpolate(d5, d6, xoff);
    const bcd = interpolate(d8, d7, xoff);
    const backVal = interpolate(bab, bcd, yoff);

    return interpolate(frontVal, backVal, zoff);
  });
}

export function createPerlinNoise3dKernel(gpu) {
  addPerlinNoise3d(gpu);
  /**
   * {a} - [Number] grid
   * {b} - Number  gridSize
   * {rate} - Number[] - noise rates
   */
  return gpu.createKernel(function (a, b, rates, zInp) {
    const rx = rates[0] * this.thread.x;
    const ry = rates[1] * this.thread.y;
    const rz = rates[2] * zInp;
    const red = maprange(noise(a, b, rx, ry, rz), -1, 1, 0, 1);

    const gx = rates[3] * this.thread.x;
    const gy = rates[4] * this.thread.y;
    const gz = rates[5] * zInp;
    const green = maprange(noise(a, b, gx, gy, gz), -1, 1, 0, 1);

    const bx = rates[6] * this.thread.x;
    const by = rates[7] * this.thread.y;
    const bz = rates[8] * zInp;
    const blue = maprange(noise(a, b, bx, by, bz), -1, 1, 0, 1);

    this.color(red, green, blue, 1);
    return red;
  }, {
    returnType: 'Float'
  });
}

export function createPerlinNoise3dFn(gpu, gridSize) {
  const grid = [];
  for (let i = 0; i < Math.pow(gridSize, 3); i++) {
    // Create a flat array to better work with gpu.js
    // Need to adjust accordingly when getting the gradients.
    const normal = randomNormal3d();
    grid.push(normal[0]);
    grid.push(normal[1]);
    grid.push(normal[2]);
  }

  const kernel = createPerlinNoise3dKernel(gpu).setOutput([750, 750]).setGraphical(true);

  return (rate, zInp) => {
    return kernel(grid, gridSize, rate, zInp);
  }
}

export function oneChannel2dKernel(gpu) {
  return gpu.createKernel(function (a, b, rates) {
    const x = rates[0] * this.thread.x;
    const y = rates[1] * this.thread.y;
    const val = noise(a, b, x, y);

    // const gx = rates[2] * this.thread.x;
    // const gy = rates[3] * this.thread.y;
    // const green = noise(a, b, gx, gy);

    // const bx = rates[4] * this.thread.x;
    // const by = rates[5] * this.thread.y;
    // const blue = noise(a, b, bx, by);
    this.color(val, val, val, 1);
    return val;
  }, {
    output: [750, 750],
    // graphical: true,
    returnType: 'Float'
  });
}