import { Path, Tool } from 'paper';
import { minBy } from 'lodash';

export class AdjustablePathTool {
  constructor(paths) {
    this.paths = paths;
    this.paths.forEach(path => path.selected = true);
    const allSegments = this.paths.reduce((acc, path) => {
      return acc.concat(path.segments);
    }, []);
    this.highlight = null;

    this.tool = new Tool();
    let closestPoint;
    this.tool.onMouseMove = (event) => {
      // find closest segment point.
      const point = event.point;
      const closest = minBy(allSegments, segment => point.getDistance(segment.point));
      if (closest !== closestPoint) {
        closestPoint = closest;
        if (this.highlight) this.highlight.remove();
        if (point.getDistance(closestPoint.point) < 15) {
          this.highlight = new Path.Circle({
            radius: 10,
            center: closest.point,
            fillColor: 'red'
          });
        } else {
          closestPoint = null;
        }
      }
    }

    this.tool.onMouseDrag = (event) => {
      if (closestPoint) {
        closestPoint.point = event.point;
      }
    }
  }

  disable() {
    if (this.highlight) this.highlight.remove();
    this.tool.remove();
    this.paths.forEach(path => path.selected = false);
  }
}

export class DrawTool {
  
  subscibers = [];

  constructor() {
    this.tool = new Tool();
    let path = null;
    this.tool.onMouseDown = (event) => {
      path = new Path();
      path.add(event.point);
    }

    this.tool.onMouseDrag = (event) => {
      path.add(event.point);
    }

    this.tool.onMouseUp = (event) => {
      path.add(event.point);
      this.publish(path);
    }
  }

  publish(path) {
    this.subscibers.map(subscription(path));
  }

  subscribe(subscription) {
    this.subscibers.push(subsciption);
  }
}