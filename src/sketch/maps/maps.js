import paper, { Point, Path, Group } from 'paper';
import math, { random, randomInt } from 'mathjs';
import please from 'pleasejs';
import { range, sortBy, countBy, last, flatten, isArray } from 'lodash';
import dat from 'dat.gui';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, choose, chooseN, maprange, radiansToDegrees, clipBounds, processOptions
} from 'common/utils';
import * as pens from 'common/pens';
import * as palettes from 'common/palettes';
import { clipToBorder, clipPathsToBorder } from 'common/border';
import * as topojson from 'topojson';
// import atlas from 'us-atlas/states-albers-10m.json';
import atlas from 'us-atlas/counties-albers-10m.json';
import data from 'data/selected_data.json'; // from https://public.opendatasoft.com/

window.paper = paper;
window.atlas = atlas;
window.data = data;
window.topojson = topojson;

const stateGeoms = atlas.objects.states.geometries.reduce((acc, geom) => {
  return Object.assign({}, acc, { [geom.properties.name]: geom });
}, {});

// main();
statesFallingAway();
// stateFlowField();
// trumpism_is_an_std();

function main() {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  // Draw all given states as one mesh.
  function drawStates(states = []) {
    const mesh = topojson.mesh(atlas, createGeometryCollection(stateGeoms, states));
    return drawMesh(mesh);
  }

  // const group = drawStates(chooseN(Object.keys(stateGeoms), 20));
  // const group = drawStates(Object.keys(stateGeoms));
  // const group = drawAmericaStates();
  const group = drawGeometryCollection(atlas.objects.counties);
  group.scale(0.5);
  group.position = [width/2, height/2];
}

function createGeometryCollection(states, names = []) {
  const geometries = names.map(name => states[name]);
  return {
    type: 'GeometryCollection',
    geometries
  };
}

function drawGeometryCollection(collection) {
  const mesh = topojson.mesh(atlas, collection);
  return drawMesh(mesh);
}

function drawAmericaStates() {
  const mesh = topojson.mesh(atlas, atlas.objects.states);
  const america = drawMesh(mesh);
  return america;
}

function drawMesh(mesh) {
  const paths = mesh.coordinates.map(segments => {
    const path = new Path({
      strokeColor: 'black',
      segments
    });
    return path;
  });
  return new Group({ children: paths });
}

function statesFallingAway() {
  const PAPER_SIZE = A4.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const palette = palettes.palette_rgb3;

  const transform = {
    scale: [0.85, 0.85],
    translate: [100, 100]
  };

  const tfn = topojson.transform(transform);

  const stateNames = Object.keys(stateGeoms);

  for (let name of stateNames) {
    const mesh = topojson.mesh(atlas, stateGeoms[name]);
    for (let i = 0; i < mesh.coordinates.length; i++) {
      const segments = mesh.coordinates[i].map((p) => tfn(p));
      const path = new Path({
        segments,
        strokeColor: 'black'
      });
      const position = path.bounds.center;
      const hatch1 = hatchOpts1(position);
      const hatch2 = hatchOpts2(position);
      const hatch3 = hatchOpts3(position);

      const paths = [];
      paths.push(hatch(path, hatch1));
      path.rotate(random(-10, 10));
      path.translate(random(-10, 10), random(-10, 10));
      path.scale(1.5);
      paths.push(hatch(path, hatch2));
      path.rotate(random(-20, 20));
      path.translate(random(-20, 20), random(-20, 20));
      path.scale(1.5);
      paths.push(hatch(path, hatch3));
      for (let pathlist of paths) {
        clipPathsToBorder({ from: [20, 20], to: [width-20, height-20], strokeColor: 'black' }, pathlist, { remove: true });
      }
      path.remove();
    }
  }

  function hatchOpts1(position) {
    return {
      pen: choose(palette),
      // pen: palette[0],
      stepSize: 10,
      angle: 45
    };
  }

  function hatchOpts2(position) {
    return {
      pen: choose(palette),
      // pen: palette[3],
      stepSize: 10,
      wobble: 0,
      angle: -45
    };
  }

  function hatchOpts3(position) {
    return {
      pen: choose(palette),
      // pen: palette[8],
      stepSize: 10,
      wobble: 0,
      // angle: random(-45, 45)
      angle: 90
    };
  }
}

function stateFlowField() {
  const PAPER_SIZE = A4.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);


}

function trumpism_is_an_std() {
  const PAPER_SIZE = A4.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const countyGeoms = atlas.objects.counties.geometries.reduce((acc, geom) => {
    return Object.assign({}, acc, { [geom.id]: geom });
  }, {});

  const countyFips = Object.keys(data);
  const paths = [];
  for (let fip of countyFips) {
    const geom = countyGeoms[fip];
    if (geom) {
      const mesh = topojson.mesh(atlas, geom);
      const county = data[fip];

      // drawCountyHatches(mesh, county);
      drawCountyLines(mesh,county)
    }
  }

  function drawCountyLines(mesh, county) {
    const clintonPen = pens.STABILO_88_41;
    const trumpPen = pens.STABILO_88_40;
    const percentTrump = county.votes16_trumpd / county.total16 || 0;
    const percentClinton = county.votes16_clintonh / county.total16 || 0;
    const stdPerVote = county.sexually_transmitted_infections / county.total16;

    const transform = {
      scale: [0.95, 0.95],
      translate: [75, 50]
    };
    const tfn = topojson.transform(transform);
    for (let i = 0; i < mesh.coordinates.length; i++) {
      const segments = mesh.coordinates[i].map((p) => tfn(p));
      const paths = [];
      const palette = palettes.palette_hot_and_cold;
      // const palette = palettes.palette_large;
      for (let j = 0; j < palette.length; j++) {
        const path = pens.withPen(palette[j], ({ color }) => {
          return new Path({
            segments,
            strokeColor: color
          });
        });
        path.translate(j * 10);
        paths.push(path);
      }

      // path1.translate(percentClinton * -100, percentTrump * -100);
      // path2.translate(percentTrump * 100, percentClinton * 100);

      // path.remove();
      // path2.remove();
    }
  }

  function drawCountyHatches(mesh, county) {
    const clintonPen = pens.STABILO_88_41;
    const trumpPen = pens.STABILO_88_40;
    const percentTrump = county.votes16_trumpd / county.total16 || 0;
    const percentClinton = county.votes16_clintonh / county.total16 || 0;
    const stdPerVote = county.sexually_transmitted_infections / county.total16;

    const transform = {
      scale: [0.95, 0.95],
      translate: [75, 50]
    };
    const tfn = topojson.transform(transform);

    for (let i = 0; i < mesh.coordinates.length; i++) {
      const path = new Path({
        segments: mesh.coordinates[i].map((p) => tfn(p)),
        strokeColor: 'black',
        fillColor: 'red'
      });

      const path2 = path.clone();
      path2.fillColor = 'blue';

      path.translate(0, percentTrump * -100);
      path2.translate(0, percentClinton * 100);

      const voteHatch = {
        pen: percentClinton > percentTrump ? clintonPen : trumpPen,
        wobble: 0,
        stepSize: 4,
        angle: 45
      };
      const stdHatch = {
        pen: pens.STABILO_88_33,
        wobble: 0,
        stepSize: 4 * (1 - stdPerVote),
        angle: -45
      }
      hatch(path, {
        pen: trumpPen,
        wobble: 0,
        stepSize: 4,
        angle: 45
      });
      hatch(path2, {
        pen: clintonPen,
        wobble: 0,
        stepSize: 4,
        angle: -45
      });
      path.remove();
      path2.remove();
    }
  }
}

function hatch(shape, opts = {}) {
  const {
    stepSize = 5,
    wobble = 0,
    angle,
    pen,
    debug
  } = processOptions(opts);

  const center = new Point(shape.bounds.centerX, shape.bounds.centerY);
  const disectionVec = new Point({
    length: 1,
    angle: angle + 90
  });
  const disectionFrom = center.add(disectionVec.multiply(shape.bounds.width + shape.bounds.height));
  const disectionTo = center.subtract(disectionVec.multiply(shape.bounds.width + shape.bounds.height));

  if (debug) {
    new Path.Line({
      from: disectionFrom,
      to: disectionTo,
      strokeColor: 'red'
    });
  }

  const traceVec = disectionVec.rotate(90);
  const width = 10000;
  const trace = new Path.Line({
    visible: false,
    from: disectionFrom.subtract(traceVec.multiply(width)),
    to: disectionFrom.add(traceVec.multiply(width)),
    strokeColor: 'blue'
  });

  const disectionLength = disectionFrom.getDistance(disectionTo);
  const steps = disectionLength / stepSize;

  const xrand = () => {
    return random(-wobble, wobble);
  }

  const yrand = () => {
    return random(-wobble, wobble);
  }

  const paths = [];
  for (let i = 0; i < steps; i++) {
    trace.translate(disectionVec.normalize().multiply(-stepSize));
    let intersections = shape.getIntersections(trace);
    if (intersections.length === 3) {
      // Both ends of the hatching line should always begin outside the shape, so assume
      // the mid-point come from clipping a corner.
      // FIXME: Need to extend this to handle all odd-numbered intersections.
      const from = intersections[0].point.add(xrand(), yrand());
      const to = intersections[2].point.add(xrand(), yrand());
      const segments = i % 2 === 0 ? [from, to] : [to, from] // reverse the direction of each stroke for faster drawing.
      pens.withPen(pen, ({ color, strokeWidth }) => {
        const path = new Path({
          segments,
          strokeWidth: strokeWidth,
          strokeColor: color
        });
        paths.push(path);
      });
    } else if (intersections.length && intersections.length % 2 === 0) {
      intersections = sortBy(intersections, loc => loc.point.x);
      for (let j = 0; j < intersections.length; j += 2) {
        const fromIdx = j;
        const toIdx = j + 1;
        const from = intersections[fromIdx].point.add(xrand(), yrand());
        const to = intersections[toIdx].point.add(xrand(), yrand());
        const segments = i % 2 === 0 ? [from, to] : [to, from] // reverse the direction of each stroke for faster drawing.
        pens.withPen(pen, ({ color, strokeWidth }) => {
          const path = new Path({
            segments,
            strokeWidth: strokeWidth,
            strokeColor: color
          });
          paths.push(path);
        });
      }
    }
  }
  trace.remove();
  return paths;
}

window.saveAsSvg = function save(name) {
  saveAsSVG(paper.project, name);
}