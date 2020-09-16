import paper, { Point, Path } from 'paper';
import { ARTIST_SKETCH, createCanvas } from 'common/setup';
import please from 'pleasejs';
import convert from 'convert-length';
import math, { random, randomInt } from 'mathjs';

export const disect = disect_v1;

// Disection
(() => {
  const DIMENSIONS = [9, 12]; // inches
  const PAPER_SIZE = DIMENSIONS.map(n => {
    return convert(n, 'in', 'px', { pixelsPerInch: 96 });
  });
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  // I am going to create an algorithm to take a path item and disect the path along a line.
  // The result will be two path items.

  // First let's create a path to disect. We'll begin with just simple rectangle.
  const rect = new Path.Rectangle({
    from: [100, 100],
    to: [300, 500],
    strokeColor: 'red'
  });

  // Now I'll create a line that runs through the rectangle.
  const line = new Path.Line({
    from: [50, 200],
    to: [350, 350],
    strokeColor: 'blue'
  });

  console.log(line.curves[0]);
  console.log(rect.curves);

  // Iterate through the 'curves' of the rect and get the intersections.
  rect.curves.forEach(curve => {
    const intersections = curve.getIntersections(line.curves[0]);
    if (intersections.length) {
      new Path.Circle({
        center: intersections[0].point,
        radius: 3,
        fillColor: 'green'
      });
    }
  });

  // now let's create some arrays to hold the points for each path. We'll hold them in an array so we can update
  // and index into the array to know which path we're adding points to.
  const paths = [[], []];
  let idx = 0;
  rect.curves.forEach(curve => {
    const intersections = curve.getIntersections(line.curves[0]);
    if (!intersections.length) {
      // Both points go  in the current path.
      const path = paths[idx];
      path.push(curve.point1);
      // path.push(curve.point2);
    } else {
      const path = paths[idx];
      path.push(curve.point1);
      path.push(intersections[0].point);
      idx = (idx + 1) % 2;
      paths[idx].push(intersections[0].point);
    }
  });

  paths.forEach(segments => {
    new Path({
      segments,
      fillColor: please.make_color()
    });
  });

  // First let's find the points that the paths intersect.
  // const intersections = rect.getIntersections(line);

  // And I'll draw those points, just to make sure everything look correct.
  // intersections.forEach(intersection => {
  //   new Path.Circle({
  //     // Intersections is an array of CurveLocations. We just want the point.
  //     center: intersection.point,
  //     radius: 3,
  //     fillColor: 'green'
  //   });

  //   new Path.Circle({
  //     center: intersection.curve.point1,
  //     radius: 3,
  //     fillColor: 'red'
  //   });

  //   new Path.Circle({
  //     center: intersection.curve.point2,
  //     radius: 3,
  //     fillColor: 'blue'
  //   });
  // });

  // That looks good. Now comes the hard part. How do we take these two points and determine which points belong
  // to one path and which points belong to the other path.
  // We know that bot paths will contain the two intersection points. I'll start by adding  those points to our new path.
  // const segments1 = [intersections[0].point, intersection[1].point];

  // Hmm... I'm not coming up with an easy way to determine which path each point belongs

  // We could check the intersections of each segment of the path individually.. Each time an intersection is found
  // you can start adding points to the other path.
  // rect.segments.forEach(segment => {
  //   const intersections = line.getIntersections(segment);
  //   console.log(intersections);
  // })

  // Let's turn that into a function
  function disect(path, line) {
    const disection = [[], []];
    let idx = 0;
    path.curves.forEach(curve => {
      const intersections = curve.getIntersections(line.curves[0]);
      if (!intersections.length) {
        // Both points go  in the current path.
        const half = disection[idx];
        half.push(curve.point1);
        // path.push(curve.point2);
      } else {
        const half = disection[idx];
        half.push(curve.point1);
        half.push(intersections[0].point);
        idx = (idx + 1) % 2;
        disection[idx].push(intersections[0].point);
      }
    });
    return disection;
  }

  // Now use the function instead.
  const rect2 = new Path.Rectangle({
    from: [500, 100],
    to: [700, 500],
    strokeColor: 'green'
  });

  const line2 = new Path.Line({
    from: [450, 300],
    to: [750, 200],
    strokeColor: 'blue'
  });

  const disection = disect(rect2, line2);
  disection.forEach(segments => {
    new Path({
      segments,
      fillColor: please.make_color()
    });
  });
});

// Circle Disection
(() => {
  const seed = randomInt(20000);
  // const seed = 9406;
  // const seed = 3214
  console.log(seed);
  math.config({ randomSeed: seed });

  const PAPER_SIZE = ARTIST_SKETCH.portrait;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const center = new Point(width / 2, height / 2);

  const circle = new Path.Circle({
    center,
    radius: 100,
    strokeColor: 'black'
  })

  const trace = lineThrough(center, 0);

  const disection = disect_v2(circle, trace);

  console.log(disection);

  // const segments = disection[1];
  // console.log(segments);
  // new Path({
  //   segments,
  //   closed: true,
  //   fillColor: please.make_color(),
  // });

  disection.forEach(segments => {
    console.log(segments);
    return new Path({
      segments,
      closed: true,
      fillColor: please.make_color(),
      selected: true
    });
  });

  function lineThrough(point, angle = 0, length = 1000) {
    // const center = new Point(random(margin, width - margin), random(margin, height - margin));
    const vec = new Point(1, 0).rotate(angle).multiply(length);
    return Path.Line({
      from: point.subtract(vec),
      to: point.add(vec),
      strokeColor: 'red'
    });
  }
})();

export function disect_v2(path, line) {
  const disection = [[], []];
  let idx = 0;
  path.curves.forEach(curve => {
    const intersections = curve.getIntersections(line.curves[0]);
    console.log(intersections);
    if (!intersections.length) {
      // Both points go  in the current path.
      const half = disection[idx];
      // By changing the point to the curve segment we get more information about the curve handles.
      // This isn't completely correct though
      half.push(curve.segment1);
    } else {
      const half = disection[idx];
      half.push(curve.segment1);
      half.push(intersections[0].curve);
      idx = (idx + 1) % 2;
      disection[idx].push(intersections[0].curve);
    }
  });
  return disection;
}

export function disect_v1(path, line) {
  const disection = [[], []];
  let idx = 0;
  path.curves.forEach(curve => {
    const intersections = curve.getIntersections(line.curves[0]);
    if (!intersections.length) {
      // Both points go  in the current path.
      const half = disection[idx];
      half.push(curve.point1);
      // path.push(curve.point2);
    } else {
      const half = disection[idx];
      half.push(curve.point1);
      half.push(intersections[0].point);
      idx = (idx + 1) % 2;
      disection[idx].push(intersections[0].point);
    }
  });
  return disection;
}