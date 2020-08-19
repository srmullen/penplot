import paper, { Point, Path } from 'paper';
import Voronoi from 'voronoi';
import math, { random, randomInt } from 'mathjs';
import { A4, STRATH_SMALL, ARTIST_SKETCH, createCanvas } from 'common/setup';
import {
  saveAsSVG, choose, maprange, radiansToDegrees, clipBounds, processOptions, lerp
} from 'common/utils';
import * as pens from 'common/pens';
import * as palettes from 'common/palettes';
import { hatch } from 'common/hatch';

window.lerp = lerp;
window.paper = paper;
// const PAPER_SIZE = A4.landscape;
const PAPER_SIZE = ARTIST_SKETCH.landscape;
const [width, height] = PAPER_SIZE;
const canvas = createCanvas(PAPER_SIZE);
paper.setup(canvas);

function randomPoints(nPoints, margin = 0) {
  const points = [];
  for (let i = 0; i < nPoints; i++) {
    points.push(new Point(random(margin, width - margin), random(margin, height - margin)));
  }
  return points;
}

function completeEdge(edge) {
  return (
    edge.lSite &&
    edge.rSite &&
    edge.lSite.x > 0 && 
    edge.lSite.y > 0 && 
    edge.rSite.x > 0 && 
    edge.rSite.y > 0
  );
}

function drawVoronoiEdges(diagram) {
  // Draw Edges
  diagram.edges.map(edge => {
    if (completeEdge(edge)) {
      new Path.Line({
        from: edge.va,
        to: edge.vb,
        strokeColor: 'black'
      });
    }
  });
}

function drawTriangleEdges(diagram) {
  const lines = [];
  diagram.edges.map(edge => {
    if (completeEdge(edge)) {
      lines.push(new Path.Line({
        from: edge.lSite,
        to: edge.rSite,
        strokeColor: 'black'
      }));
    }
  });
  return lines;
}


function fillCells(diagram) {
  const palette = palettes.palette_evening;
  return diagram.cells.map(cell => {
    const points = cell.halfedges.map(halfedge => {
      return new Point(halfedge.edge.vb);
    });
    return pens.withPen(choose(palette), ({ color }) => {
      return new Path({
        segments: points,
        closed: true,
        fillColor: color
      });
    })
  });
}

function draw() {
  const voronoi = new Voronoi();
  const bbox = { xl: 0, xr: width, yt: 0, yb: height };
  const points = randomPoints(100);
  const diagram = voronoi.compute(points, bbox);
  console.log(diagram);

  // Draw Edges
  
  // drawTriangleEdges(diagram);
  // drawVoronoiEdges(diagram);

  // Draw Cell
  if (diagram) {
    fillCells(diagram);
  }

  // Draw Points
  points.map((point) => {
    new Path.Circle({
      center: point,
      radius: 2,
      fillColor: 'red'
    });
  })
}

// draw();
// drawVoronoiEdges();
// drawTriangleEdges();

// Two color gradient voronoi
(() => {
  // Initialize some constants
  const margin = 50;
  const nPoints = 100;
  // Initialize the Voronoi object
  const voronoi = new Voronoi();
  // Create a bounding box. Value stand for x-left, x-right, y-top, y-bottom.
  const bbox = { xl: margin, xr: width - margin, yt: margin, yb: height - margin };
  // Create points. Just doing random here. Could use other point placing strategies.
  const points = randomPoints(nPoints, margin);
  // Compute the voronoi diagram. 
  // This mutates the points array. It adds a voronoiId onto each point so you can get it's associated cell.
  const diagram = voronoi.compute(points, bbox);

  // Need to check the diagram exists because it might not be possible to compute the diagram from the given points.
  if (diagram) {
    for (let i = 0; i < points.length; i++) {
      const site = points[i];
      const cell = diagram.cells[site.voronoiId];
      // Cell might not be computable or exist outside the bounding box.
      // Also need to make sure there are atleast three halfedges since all shapes have at least that many edges.
      // It is called a helfedge because there might be another cell that shares the same edge, so each border between cells
      // is two half edges, creating a full edge. For the purpose of drawing the diagram you may only wnat to draw the edge once.
      if (cell && cell.halfedges.length > 2) {
        const endpoints = cell.halfedges.map(edge => edge.getEndpoint());
        createPath(endpoints, site);
      }
    }
  }

  function createPath(points, center) {
    const palette = palettes.palette_evening;
    const path = new Path({
      segments: points,
      closed: true
    });
    // TODO: Need to write about this hatching algorithm. Create more hatching algos.
    const angle = random(360);
    // const stepSize = (center.x / width) * 5
    const stepSize = lerp(1, 5, center.x / width);
    hatch(path, { 
      pen: palette[0],
      stepSize,
      angle
    });
    hatch(path, {
      pen: palette[1] ,
      // pen: pens.BLACK,
      stepSize: 6 - stepSize,
      angle: angle + 5
    });
    path.remove();
  }
});

// Three color gradient voronoi
(() => {
  // Initialize some constants
  const margin = 50;
  const nPoints = 100;
  const voronoi = new Voronoi();
  const bbox = { xl: margin, xr: width - margin, yt: margin, yb: height - margin };
  const points = randomPoints(nPoints, margin);
  const diagram = voronoi.compute(points, bbox);

  // Need to check the diagram exists because it might not be possible to compute the diagram from the given points.
  if (diagram) {
    for (let i = 0; i < points.length; i++) {
      const site = points[i];
      const cell = diagram.cells[site.voronoiId];
      if (cell && cell.halfedges.length > 2) {
        const endpoints = cell.halfedges.map(edge => edge.getEndpoint());
        createPath(endpoints, site);
      }
    }
  }

  function createPath(points, center) {
    const palette = palettes.palette_evening;
    const path = new Path({
      segments: points,
      closed: true
    });
    // TODO: Need to write about this hatching algorithm. Create more hatching algos.
    const angle = random(360);
    const minStep = 1;
    const maxStep = 7;
    const stepSize = lerp(minStep, maxStep, (center.x - margin) / (width - (margin*2)));
    hatch(path, {
      pen: palette[0],
      stepSize,
      angle
    });
    hatch(path, {
      pen: palette[1],
      stepSize: (maxStep + minStep) - stepSize,
      angle: angle + 5
    });
    hatch(path, {
      pen: palette[5],
      stepSize: lerp(minStep, maxStep, Math.abs((((center.x - margin)  / (width - margin * 2)) * 2) - 1)),
      angle: angle + 10
    });
    path.remove();
  }
})();

window.saveAsSvg = function save(name) {
  saveAsSVG(paper.project, name);
}