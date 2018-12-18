import paper, { Point, Path } from 'paper';
import dat from 'dat.gui';
import { difference } from 'common/polybool';
import Camera from 'common/Camera';
import { STRATH_SMALL, createCanvas } from 'common/setup';
import { saveAsSVG } from 'common/utils';
import math, { random, matrix } from 'mathjs';
import { vec3, rotationXMatrix, rotationYMatrix, rotationZMatrix } from 'common/matrix';

const [width, height] = STRATH_SMALL.landscape;
const canvas = createCanvas(STRATH_SMALL.landscape);

paper.setup(canvas);
window.paper = paper;
window.math = math;

function boat () {
  const verts = [
    [-2.5703,   0.78053,  -2.4e-05], [ -0.89264,  0.022582,  0.018577],
    [1.6878, -0.017131,  0.022032], [   3.4659,  0.025667,  0.018577],
    [-2.5703,   0.78969, -0.001202], [ -0.89264,   0.25121,   0.93573],
    [1.6878,   0.25121,    1.1097], [   3.5031,   0.25293,   0.93573],
    [-2.5703,    1.0558, -0.001347], [ -0.89264,    1.0558,    1.0487],
    [1.6878,    1.0558,    1.2437], [   3.6342,    1.0527,    1.0487],
    [-2.5703,    1.0558,         0], [ -0.89264,    1.0558,         0],
    [1.6878,    1.0558,         0], [   3.6342,    1.0527,         0],
    [-2.5703,    1.0558,  0.001347], [ -0.89264,    1.0558,   -1.0487],
    [1.6878,    1.0558,   -1.2437], [   3.6342,    1.0527,   -1.0487],
    [-2.5703,   0.78969,  0.001202], [ -0.89264,   0.25121,  -0.93573],
    [1.6878,   0.25121,   -1.1097], [   3.5031,   0.25293,  -0.93573],
    [3.5031,   0.25293,         0], [  -2.5703,   0.78969,         0],
    [1.1091,    1.2179,         0], [    1.145,     6.617,         0],
    [4.0878,    1.2383,         0], [  -2.5693,    1.1771, -0.081683],
    [0.98353,    6.4948, -0.081683], [ -0.72112,    1.1364, -0.081683],
    [0.9297,     6.454,         0], [  -0.7929,     1.279,         0],
    [0.91176,    1.2994,         0]
  ].map(p => vec3(...p));

  const numTris = 51;

  const tris = [
     4,   0,   5,   0,   1,   5,   1,   2,   5,   5,   2,   6,   3,   7,   2,
     2,   7,   6,   5,   9,   4,   4,   9,   8,   5,   6,   9,   9,   6,  10,
     7,  11,   6,   6,  11,  10,   9,  13,   8,   8,  13,  12,  10,  14,   9,
     9,  14,  13,  10,  11,  14,  14,  11,  15,  17,  16,  13,  12,  13,  16,
    13,  14,  17,  17,  14,  18,  15,  19,  14,  14,  19,  18,  16,  17,  20,
    20,  17,  21,  18,  22,  17,  17,  22,  21,  18,  19,  22,  22,  19,  23,
    20,  21,   0,  21,   1,   0,  22,   2,  21,  21,   2,   1,  22,  23,   2,
     2,  23,   3,   3,  23,  24,   3,  24,   7,  24,  23,  15,  15,  23,  19,
    24,  15,   7,   7,  15,  11,   0,  25,  20,   0,   4,  25,  20,  25,  16,
    16,  25,  12,  25,   4,  12,  12,   4,   8,  26,  27,  28,  29,  30,  31,
    32,  34,  33
  ];

  // const focalLength = 35;
  // // 35mm full aperture.
  // const filmApertureWidth = 0.980;
  // const filmApertureHeight = 0.735;
  // const nearClippingPlane = 0.1;
  // const farClippingPlane = 1000;

  // const focalLength = 35; // in mm
  // // 35mm Full Aperture in inches
  // const filmApertureWidth = 0.825;
  // const filmApertureHeight = 0.446;
  // const nearClippingPlane = 0.1;
  // const farClipingPlane = 1000;
  // // image resolution in pixels
  // const imageWidth = 512;
  // const imageHeight = 512;

  const inchToMm = 25.4;

  const props = {
    focalLength: 35,
    filmApertureWidth: 0.825,
    filmApertureHeight: 0.446,
    nearClippingPlane: 0.1,
    farClipingPlane: 1000,
    imageWidth: width,
    imageHeight: height,
    fitFilm: ''
  };

  const gui = new dat.GUI();
  gui.add(props, 'focalLength').onChange(run);
  gui.add(props, 'filmApertureWidth').onChange(run);
  gui.add(props, 'filmApertureHeight').onChange(run);
  gui.add(props, 'imageWidth').onChange(run);
  gui.add(props, 'imageHeight').onChange(run);
  gui.add(props, 'fitFilm', ['', 'fill', 'overscan']).onChange(run);

  let group = new paper.Group();

  paper.view.translate(0, height/2);

  run();

  function run () {
    group.remove();

    const filmAspectRatio = props.filmApertureWidth / props.filmApertureHeight;
    const deviceAspectRatio = props.imageWidth / props.imageHeight;

    let xscale = 1;
    let yscale = 1;

    if (props.fitFilm === 'fill') {
      if (deviceAspectRatio > filmAspectRatio) {
        xscale = deviceAspectRatio / filmAspectRatio;
      } else {
        yscale = filmAspectRatio / deviceAspectRatio;
      }
    } else if (props.fitFilm === 'overscan') {
      if (filmAspectRatio > deviceAspectRatio) {
        yscale = filmAspectRatio / deviceAspectRatio;
      } else {
        xscale = deviceAspectRatio / filmAspectRatio;
      }
    }

    const angleOfViewHorizontal = 2 * math.atan((props.filmApertureWidth * inchToMm / 2) / props.focalLength);
    const right = math.tan(angleOfViewHorizontal / 2) * props.nearClippingPlane * xscale
    const angleOfViewVertical = 2 * math.atan((props.filmApertureHeight * inchToMm / 2) / props.focalLength);
    const top = math.tan(angleOfViewVertical / 2) * props.nearClippingPlane * yscale;
    const left = -right;
    const bottom = -top;

    console.log(`Left: ${left}, Right: ${right}, Top: ${top}, Bottom: ${bottom}`);
    console.log(`Film Aspect Ratio: ${filmAspectRatio}, Device Aspect Ratio: ${deviceAspectRatio}`);
    console.log(`Horizontal Angle of View: ${angleOfViewHorizontal}, Vertical Angle of View: ${angleOfViewVertical}`);

    const cameraToWorld = math.matrix([
      [-0.95424,  0,         0.299041,  0],
      [0.0861242, 0.95763,   0.274823,  0],
      [-0.28637,  0.288002, -0.913809,  0],
      [-3.734612, 7.610426, -14.152769, 1]
    ]);

    const worldToCamera = math.inv(cameraToWorld);

    // paper.view.translate(0, height/2);
    group = new paper.Group();
    for (let i = 0; i < numTris; i++) {
      const v0World = verts[tris[i * 3]];
      const v1World = verts[tris[i * 3 + 1]];
      const v2World = verts[tris[i * 3 + 2]];
      const [visible0, v0Raster] = computePixelCoordinates(
        v0World,
        worldToCamera,
        bottom,
        left,
        top,
        right,
        props.nearClippingPlane,
        props.imageWidth,
        props.imageHeight
      );
      const [visible1, v1Raster] = computePixelCoordinates(
        v1World,
        worldToCamera,
        bottom,
        left,
        top,
        right,
        props.nearClippingPlane,
        props.imageWidth,
        props.imageHeight
      );
      const [visible2, v2Raster] = computePixelCoordinates(
        v2World,
        worldToCamera,
        bottom,
        left,
        top,
        right,
        props.nearClippingPlane,
        props.imageWidth,
        props.imageHeight
      );

      const path = new Path({
        strokeColor: 'black',
        segments: [v0Raster, v1Raster, v2Raster],
        closed: true
      });

      group.addChild(path);
    }
  }
}

function computePixelCoordinates (
  pWorld, // vec3
  worldToCamera, // 4X4 matrix
  b, // float
  l, // float
  t, // float
  r, // float
  near, // float
  imageWidth, // int
  imageHeight, // int
  // pRaster // vec2
) {
  const pCamera = math.multiply(pWorld, worldToCamera).toArray();

  const pScreen = [];
  pScreen[0] = pCamera[0] / pCamera[2] * near;
  pScreen[1] = pCamera[1] / pCamera[2] * near;

  const pNDC = [];
  pNDC[0] = (pScreen[0] + r) / (2 * r);
  pNDC[1] = (pScreen[1] + t) / (2 * t);
  const pRaster = [];
  pRaster[0] = pNDC[0] * imageWidth;
  pRaster[1] = (1 - pNDC[1]) * imageHeight;

  let visible = true;
  if (pScreen[0] < l || pScreen[0] > r || pScreen[1] < b || pScreen[1] > t) {
    visible = false;
  }

  return [visible, pRaster];
}

boat();
