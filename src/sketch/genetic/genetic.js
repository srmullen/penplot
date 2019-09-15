import paper, { Point, Path, Raster, Group } from 'paper';
import math, { random, randomInt } from 'mathjs';
import please from 'pleasejs';
import { sortBy, take, range } from 'lodash';
import dat from 'dat.gui';
import GPU from 'gpu.js';
import { A4, STRATH_SMALL, ARTIST_SKETCH, createCanvas, loadImage } from 'common/setup';
import {
  saveAsSVG, choose, wchoose, maprange, clipBounds, processOptions, timer
} from 'common/utils';
import * as pens from 'common/pens';
import * as palettes from 'common/palettes';
import { clipToBorder } from 'common/border';

import img from 'images/cocktail.jpg';
// import img from 'images/oliver.jpeg';

window.paper = paper;

function normalize(scores) {
  const total = scores.reduce((acc, score) => acc + score);
  return scores.map(score => score / total);
}

function adaptToFindPoint() {
  const PAPER_SIZE = ARTIST_SKETCH.portrait;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const destination = new Point(width / 2, height / 2);

  class Entity {
    constructor(vector) {
      this.position = new Point(width/2, 50);

      this.vector = vector;
    }

    step() {
      this.position = this.position.add(this.vector);
    }

    draw() {
      if (this.path) {
        this.path.remove();
      }
      this.path = new Path.Circle({
        center: this.position,
        radius: 5,
        fillColor: please.make_color()
      });
    }
  }

  function fitness(entity, destination) {
    return entity.position.getDistance(destination);
  }

  function breed(p1, p2) {
    const angularDist = p2.vector.angle - p1.vector.angle;
    const vector = new Point({
      length: (p1.vector.length + p2.vector.length) / 2,
      angle: p1.vector.angle + angularDist / 2
    });
    return new Entity(vector);
  }

  function createBrood(entities, nChildren) {
    const children = [];
    for (let i = 0; i < nChildren; i++) {
      children.push(breed(choose(entities), choose(entities)));
    }
    return children;
  }

  function runGeneration(entities) {    
    for (let i = 0; i < 200; i++) {
      entities.forEach(entity => {
        entity.step();
        // entity.draw();
      });
    }
    
    const best = sortBy(entities, entity => {
      return fitness(entity, destination);
    });

    return best;
  }

  let entities = [];
  for (let i = 0; i < 10; i++) {
    const vector = new Point({
      length: random(2),
      angle: random(360)
    })
    const entity = new Entity(vector);
    // entity.draw();
    entities.push(entity);
  }
  const nGenerations = 30;
  for (let i = 0; i < nGenerations; i++) {
    const best = runGeneration(entities);
    entities = createBrood(take(best, 5), 10);
  }

  runGeneration(entities);
  entities.forEach(entity => entity.draw());

  new Path.Circle({
    center: destination,
    radius: 5,
    fillColor: 'red'
  });
}
// adaptToFindPoint();

function adaptToGenerateString() {
  const PAPER_SIZE = ARTIST_SKETCH.portrait;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const target = 'oliverpuppy';
  const letters = range(97, 97+26).map(n => String.fromCharCode(n));

  let population = [];
  const populationSize = 100;
  for (let i = 0; i < populationSize; i++) {
    population.push(createEntity(target.length));
  }

  const nGenerations = 200;
  for (let i = 0; i < nGenerations; i++) {
    population = createChildren(population, populationSize);
  }
  console.log(population);

  function createEntity(size) {
    let entity = '';
    for (let i = 0; i < size; i++) {
      entity += choose(letters);
    }
    return entity;
  }

  function fitness(target, entity) {
    let score = 0;
    for (let i = 0; i < target.length; i++) {
      if (target[i] === entity[i]) {
        score++;
      }
    }
    return score * score; // each correct letter makes the score exponentially better.
  }

  function createChildren(population, nChildren) {
    const scores = normalize(population.map(entity => fitness(target, entity)));
    const children = [];
    const cutoff = 1000;
    let count = 0;
    while (children.length < nChildren && count < cutoff) {
      const p1 = wchoose(scores, population);
      const p2 = wchoose(scores, population);
      if (p1 !== p2) {
        children.push(mutation(mate(p1, p2), 0.05));
      }
      count++;
    }
    return children;
  }

  function mate(p1, p2) {
    let child = '';
    for (let i = 0; i < p1.length; i++) {
      child += choose([p1[i], p2[i]]);
    }
    return child;
  }

  // Could be more efficient if integrated into the mate function.
  function mutation(entity, rate = 0.1) {
    let mutated = '';
    for (let i = 0; i < entity.length; i++) {
      mutated += random() < rate ? choose(letters) : entity[i];
    }
    return mutated;
  }
}
// adaptToGenerateString();

async function smartRockets() {
  const PAPER_SIZE = ARTIST_SKETCH.portrait;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  class Rocket {
    constructor(location, velocity, acceleration = new Point(0, 0)) {
      this.location = location;
      this.velocity = velocity;
      this.acceleration = acceleration
    }

    applyForce(force) {
      this.acceleration = this.acceleration.add(force);
    }

    update() {
      this.velocity = this.velocity.add(this.acceleration);
      this.location = this.location.add(this.velocity);
      this.acceleration = this.acceleration.multiply(0);
    }

    draw() {
      this.remove();

      this.path = new Path.Circle({
        center: this.location,
        radius: 5,
        fillColor: 'red'
      });
    }

    remove() {
      if (this.path) {
        this.path.remove();
      }
    }
  }

  const target = new Point(width / 2, 20);
  new Path.Circle({
    center: target,
    radius: 10,
    fillColor: 'black'
  });

  const obstacle = new Path.Rectangle({
    from: [width/2 - 100, height / 2],
    to: [width / 2 + 100, height / 2 + 10],
    fillColor: 'brown'
  });

  const lifetime = 100;
  const populationSize = 100;
  const mutationRate = 0.01;

  let population = [];

  for (let i = 0; i < populationSize; i++) {
    population.push(createEntity(lifetime));
  }

  const nGenerations = 200;
  // const nGenerations = 500;
  for (let i = 0; i < nGenerations; i++) {
    const rockets = await live(population);
    population = reproduction(rockets, population, populationSize, mutationRate);
    rockets.forEach(rocket => rocket.remove());
  }

  function createEntity(lifetime) {
    const maxforce = 0.5;
    const genes = [];
    for (let i = 0; i < lifetime; i++) {
      genes.push(new Point({
        length: random(maxforce),
        angle: random(360)
      }));
    }
    return genes;
  }

  function live(population) {
    const rockets = [];
    for (let i = 0; i < population.length; i++) {
      rockets.push(simulate(population[i]));
    }
    return Promise.all(rockets);
  }

  function hasCollided(obstacle, rocket) {
    return obstacle.hitTest(rocket.location);
  }

  function simulate(dna) {
    const loc = new Point(width / 2, height - 20);
    const vel = new Point(0, 0);
    const rocket = new Rocket(loc, vel);
    let count = 0;
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (count < dna.length) {
          count++;
          if (hasCollided(obstacle, rocket)) {

          } else {
            rocket.applyForce(dna[count]);
            rocket.update();
            rocket.draw();
          }
        } else {
          clearInterval(interval);
          resolve(rocket);
        }
      }, 1);
    });
  }

  function fitness(target, rocket) {
    const dist = rocket.location.getDistance(target);
    return 1 / (dist * dist);
  }

  function reproduction(rockets, dna, populationSize, mutationRate) {
    const scores = normalize(rockets.map(rocket => fitness(target, rocket)));
    const children = [];
    const cutoff = 10000;
    let count = 0;
    while(children.length < populationSize && count < cutoff) {
      count++;
      const p1 = wchoose(scores, dna);
      const p2 = wchoose(scores, dna);
      children.push(mutation(mate(p1, p2), mutationRate));
    }
    return children;
  }

  function mate(p1, p2) {
    let child = [];
    for (let i = 0; i < p1.length; i++) {
      child.push(choose([p1[i], p2[i]]));
    }
    return child;
  }

  // Could be more efficient if integrated into the mate function.
  function mutation(entity, rate = 0.1) {
    let mutated = [];
    const maxforce = 0.1;
    for (let i = 0; i < entity.length; i++) {
      const gene = random() < rate ? new Point({ 
        length: random(maxforce),
        angle: random(360)
      }) : entity[i];
      mutated.push(gene);
    }
    return mutated;
  }
}
// smartRockets();

async function evolveImageReplication() {
  const image = await loadImage(img);
  const orientation = image.width > image.height ? STRATH_SMALL.landscape : STRATH_SMALL.portrait;
  const [width, height] = orientation;
  const canvas = createCanvas(orientation, { hidden: false });
  paper.setup(canvas);

  const target = new Raster(image);
  target.visible = false;
  target.onLoad = () => {
    const rasterWidth = width;
    const rasterHeight = height;
    target.setSize(rasterWidth, rasterHeight);
    target.translate(width / 2, height / 2);
    const targetData = target.getImageData();

    // const glcanvas = createCanvas(orientation, { hidden: true, id: 'glcanvas' });
    // const ctx = glcanvas.getContext('webgl2');
    // const gpu = new GPU({
    //   canvas: glcanvas,
    //   webGL: ctx
    // });

    const populationSize = 50;
    let population = [];
    for (let i = 0; i < populationSize; i++) {
      population.push(createEntity(50));
    }

    const nGenerations = 150;
    for (let i = 0; i < nGenerations; i++) {
      console.log(`Generation: ${i}`);
      const rasterData = population.map(entity => toImageData(entity, target));
      population = reproduce(rasterData, population, populationSize, targetData);
    }

    // console.log(population);
    render(population[0]);

    // console.log(timer(() => fitness(targetData.data, raster.getImageData().data)));
  }

  function createTri() {
    return {
      segments: [
        new Point(random(width), random(height)),
        new Point(random(width), random(height)),
        new Point(random(width), random(height))
      ],
        color: choose(['cyan', 'yellow', 'magenta'])
    };
  }

  function createEntity(nTris) {
    const entity = [];
    for (let i = 0; i < nTris; i++) {
      entity.push(createTri());
    }
    return entity;
  }

  function fitness(target, image) {
    let diff = 0;
    for (let i = 0; i < target.length; i++) {
      if (i % 4 !== 3) { // ignore alpha value
        const val = target[i] - image[i];
        diff += val * val;
      }
    }
    return 1 / (diff * diff);
  }

  function reproduce(rasterData, population, populationSize, targetData) {
    const scores = normalize(rasterData.map(data => fitness(targetData.data, data.data)));
    console.log(math.max(scores));
    const children = [];

    while(children.length < populationSize) {
      const p1 = wchoose(scores, population);
      const p2 = wchoose(scores, population);
      children.push(mutation(mate(p1, p2)));
    }

    return children;
  }

  function mate(p1, p2) {
    let child = [];
    for (let i = 0; i < p1.length; i++) {
      child.push(choose([p1[i], p2[i]]));
    }
    return child;
  }

  function mutation(entity, rate = 0.1) {
    let mutated = [];
    const maxforce = 0.1;
    for (let i = 0; i < entity.length; i++) {
      const gene = random() < rate ? createTri() : entity[i];
      mutated.push(gene);
    }
    return mutated;
  }

  function render(entity) {
    const paths = [];
    for (let tri of entity) {
      const path = new Path({
        segments: tri.segments,
        fillColor: tri.color,
        opacity: 0.1,
        closed: true
      });
      paths.push(path);
    }
    return paths;
  }

  function toImageData(entity, image) {
    const bounds = new Path.Rectangle({
      visible: false,
      point: [0, 0],
      width, height
    });
    const group = new Group([bounds]);
    const children = render(entity);
    group.addChildren(children);
    const raster = group.rasterize(74);
    raster.setSize(width, height);
    const imageData = raster.getImageData();
    raster.remove();
    group.remove();
    return imageData;
  }
}
window.evolveImageReplication = evolveImageReplication;
