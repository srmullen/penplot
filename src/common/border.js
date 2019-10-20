import paper, { Path } from 'paper';
import { last } from 'lodash';

function clipLine(rect, [from, to]) {
  const fromContained = rect.contains(from);
  const toContained = rect.contains(to);
  if (fromContained && toContained) {
    return [from, to];
  } else if (!fromContained && !toContained) {
    return [];
  } else if (fromContained && !toContained) {
    const line = new Path.Line({
      from,
      to
    });
    const intersections = line.getIntersections(rect);
    if (intersections.length === 0) {
      throw new Error('Something Wrong! Intersections should be equal to 1.');
    } else if (intersections.length === 2) {
      // to point lies on border;
      line.remove();
      return [from, intersections[0].point];
    } else {
      line.remove();
      return [from, intersections[0].point];
    }
  } else if (!fromContained && toContained) {
    const line = new Path.Line({
      from,
      to
    });
    const intersections = line.getIntersections(rect);
    if (intersections.length === 0) {
      throw new Error('Something Wrong! Intersections should be equal to 1.');
    } else if (intersections.length === 2) {
      // from point lies on border.
      line.remove();
      return [intersections[1].point, to];
    } else {
      line.remove();
      return [intersections[0].point, to];
    }
  } else {
    throw new Error('Should not reach this point.');
  }
}

export function clipToBorder(border, paths) {
  const rect = new Path.Rectangle(border);
  const clippedPaths = [];
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    let clipped = [];
    for (let j = 1; j < path.length; j++) {
      const points = clipLine(rect, [path[j - 1], path[j]]);
      if (!points.length) {
        if (clipped.length) {
          clippedPaths.push(clipped);
        }
        clipped = [];
      } else if (points[0].equals(last(clipped))) {
        clipped.push(points[1]);
      } else {
        clipped = clipped.concat(points);
      }
    }
    clippedPaths.push(clipped);
    // const intersections = path.getIntersections(rect);
    // if (intersections.length) {
    //   intersections.map(intersection => new Path.Circle({
    //     radius: 2,
    //     strokeColor: 'red',
    //     center: intersection.point
    //   }));
    // }
  }
  rect.remove();
  return clippedPaths;
}

/**
 * 
 * @param {Rectangle config} border 
 * @param {paper.Path[]} paths 
 */
export function clipPathsToBorder(border, paths, opts={}) {
  const rect = new Path.Rectangle(border);
  const clipped = [];
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    const intersection = rect.intersect(path, { trace: true });
    intersection.setStyle(path.style);
    clipped.push(intersection);
    if (opts.remove) {
      path.remove();
    }
  }
  rect.remove();
  return clipped;
}