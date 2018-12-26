import math, { matrix } from 'mathjs';
import { vec3, rotationXMatrix, rotationYMatrix, rotationZMatrix, normalize } from 'common/matrix';

const inchToMm = 25.4;

const defaultProps = {
  focalLength: 35,
  filmApertureWidth: 0.825,
  filmApertureHeight: 0.446,
  nearClippingPlane: 1,
  farClipingPlane: 1000,
  // imageWidth: width,
  // imageHeight: height,
  fitFilm: ''
};

export default class Camera {
  // constructor (focalLength = 500, matrix = math.identity(4)) {
  //   this.matrix = matrix; // camera-to-world matrix
  //   this.focalLength = focalLength;
  // }

  constructor (props = {}, matrix = math.identity(4)
  ) {
    this.matrix = matrix; // camera-to-world matrix
    this.props = Object.assign({}, defaultProps, props);
    this.updateWorldToCamera();
    this.update();
  }

  rotate (x=0, y=0, z=0) {
    const rotation = math.multiply(
      rotationXMatrix(x),
      rotationYMatrix(y),
      rotationZMatrix(z)
    );

    this.matrix = math.multiply(this.matrix, rotation);
    this.updateWorldToCamera();

    return this;
  }

  translate (x=0, y=0, z=0) {
    const trans = matrix([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [x, y, z, 0]
    ]);

    this.matrix = math.add(this.matrix, trans);
    this.updateWorldToCamera();

    return this;
  }

  /**
   * @param {Array} from - The camera location.
   * @param {Array} to - The point to look at.
   */
  look (from, to) {
    // const forward = normalize(math.subtract(from, to));
    // const right = math.cross(forward, [0, 1, 0]);
    // const up = math.cross(right, forward);

    const forward = normalize(math.subtract(from, to));
    const right = math.cross([0, 1, 0], forward);
    const up = math.cross(forward, right);

    this.matrix = matrix([
      [right[0],   right[1],   right[2],   0],
      [up[0],      up[1],      up[2],      0],
      [forward[0], forward[1], forward[2], 0],
      [...from, 1]
    ]);
  }

  updateWorldToCamera () {
    this.worldToCamera = math.inv(this.matrix);
  }

  setProps (props) {
    this.props = Object.assign({}, this.props, props);
    this.update();
  }

  update () {
    const filmAspectRatio = this.props.filmApertureWidth / this.props.filmApertureHeight;
    const deviceAspectRatio = this.props.imageWidth / this.props.imageHeight;

    let xscale = 1;
    let yscale = 1;

    if (this.props.fitFilm === 'fill') {
      if (deviceAspectRatio > filmAspectRatio) {
        xscale = deviceAspectRatio / filmAspectRatio;
      } else {
        yscale = filmAspectRatio / deviceAspectRatio;
      }
    } else if (this.props.fitFilm === 'overscan') {
      if (filmAspectRatio > deviceAspectRatio) {
        yscale = filmAspectRatio / deviceAspectRatio;
      } else {
        xscale = deviceAspectRatio / filmAspectRatio;
      }
    }

    // The top/bottom, right/left variables are swapped here because of paperjs coordinate system.
    const angleOfViewHorizontal = 2 * math.atan((this.props.filmApertureWidth * inchToMm / 2) / this.props.focalLength);
    const left = math.tan(angleOfViewHorizontal / 2) * this.props.nearClippingPlane * xscale
    const angleOfViewVertical = 2 * math.atan((this.props.filmApertureHeight * inchToMm / 2) / this.props.focalLength);
    const bottom = math.tan(angleOfViewVertical / 2) * this.props.nearClippingPlane * yscale;
    const right = -left;
    const top = -bottom;

    this._computed = {
      right,
      top,
      left,
      bottom
    };
  }

  /**
   * @param {vec3} pWorld - The point in world space.
   */
  computePixelCoordinates (pWorld) {
    const near = this.props.nearClippingPlane;
    const { bottom, left, top, right } = this._computed;
    const pCamera = math.multiply(pWorld, this.worldToCamera).toArray();

    const pScreen = [];
    pScreen[0] = pCamera[0] / pCamera[2] * near;
    pScreen[1] = pCamera[1] / pCamera[2] * near;

    const pNDC = [];
    pNDC[0] = (pScreen[0] + right) / (2 * right);
    pNDC[1] = (pScreen[1] + top) / (2 * top);
    const pRaster = [];
    pRaster[0] = pNDC[0] * this.props.imageWidth;
    pRaster[1] = (1 - pNDC[1]) * this.props.imageHeight;

    let visible = true;
    if (pScreen[0] < left || pScreen[0] > right || pScreen[1] < bottom || pScreen[1] > top) {
      visible = false;
    }

    return [visible, pRaster];
  }
}
