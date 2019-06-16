import { Point, Path, Group } from 'paper';
import { lerp } from 'common/utils';
import { random } from 'mathjs';
import { isArray } from 'util';

const DEFAULT_PROPS = {
  deform: 0,
  noiseRate: 0.001,
  nSteps: 100,
  sections: 1
};

export class Disc {
  /**
   * @param noise - function for generating noise.
   */
  constructor (props, noise) {
    this.props = Object.assign({}, DEFAULT_PROPS, props);
    this.noise = noise;
  }

  contains (point) {
    const vec = point.subtract(this.props.center);
    const scaledVec = vec.normalize().multiply(this.props.radius);
    const boundingPoint = this.getPoint(scaledVec);
    const boundingVec = boundingPoint.subtract(this.props.center);
    return vec.length <= boundingVec.length;
  }

  /**
   * Get the point on the circle at the given angle.
   * @param angle - Angle in degrees.
   */
  getPoint (vec) {
    // get the point on a regular circle.
    const cpoint = this.props.center.add(vec);
    // use noise to offset the point.
    const point = cpoint.add(
      lerp(-this.props.deform, this.props.deform, this.noise(cpoint.x * this.props.noiseRate, cpoint.y * this.props.noiseRate))
    );
    return point;
  }

  getIntersections (path) {
    const [boundary] = this.outlineSection(this.props.radius, [], {clip: false});
    return boundary.getIntersections(path);
  }

  /**
   * @param disc - Array of discs lying above this one.
   */
  draw ({discs=[], opts={}} = {}) {
    this.group = new Group();
    const radiusStep = this.props.radius / this.props.sections;
    let radius = radiusStep;
    for (let i = 1; i <= this.props.sections; i++) {
      radius = i * radiusStep;
      const options = isArray(opts) ? opts[i-1] : opts;
      this.group.addChildren(this.outlineSection(radius, discs, options));
    }
  }

  getPoints (radius) {
    const { nSteps } = this.props;
    const points = [];
    let vec = new Point({
      length: radius,
      angle: 0
    });
    const rotation = 360 / nSteps;
    for (let i = 0; i <= nSteps; i++) {
      points.push(this.getPoint(vec));
      vec = vec.rotate(rotation);
    }
    return points;
  }

  outlineSection (
    radius,
    discs,
    { strokeColor = null, clip = true, inBounds = () => true } = {}
  ) {
    const {center, deform, nSteps, noiseRate} = this.props;
    const segments = [];
    let vec = new Point({
      length: radius,
      angle: random(360)
    });

    const rotation = 360 / nSteps;
    let section = [];
    for (let i = 0; i <= nSteps; i++) {
      const point = this.getPoint(vec);
      if (clip && (!inBounds(point) || discs.some(disc => disc.contains(point)))) {
        if (section.length) {
          segments.push(section);
          section = [];
        }
        vec = vec.rotate(rotation);
      } else {
        section.push(point);
        vec = vec.rotate(rotation);
      }
    }
    if (section.length) {
      segments.push(section);
    }

    return segments.map(seg => new Path({
      segments: seg,
      strokeColor,
      closed: false
    }));
  }


}
