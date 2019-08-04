import paper, { Point, Path } from 'paper';
import math, { random, randomInt } from 'mathjs';
import { range, partition, sortBy, isFunction, sum, last } from 'lodash';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, choose, maprange, radiansToDegrees, clipBounds
} from 'common/utils';
import * as pens from 'common/pens';
import * as palettes from 'common/palettes';
import { WaveGroup, StackedWaveGroup, OverlappedWaveGroup, InterleavedWaveGroup, BufferGroup } from './WaveGroup';

window.math = math;
window.range = range;

const PAPER_SIZE = A4.landscape;
const [width, height] = PAPER_SIZE;
const canvas = createCanvas(PAPER_SIZE);
paper.setup(canvas);

function sine({ freq = 440, amp = 1, phase = 0 } = {}, time) {
  return amp * math.sin((2 * math.PI * freq * time) + phase);
}

// Other waveforms.
function saw() {}
function square() {}
function tri() {}

// TODO: Should be useful as amplitude functions.
function line({ from = 1, to = 0, dur = 1, sampleRate = 44100, mul = 1, add = 0 } = {}) {
  return (n) => {
    const time = n / sampleRate;
    const val = maprange(time, 0, dur, from, to);
    return (val * mul) + add;
  }
}
function adsr() {}

class Wave {
  constructor({ freq = 440, amp = 1, phase = 0, sampleRate = 44100, pen } = {}) {
    this.freq = isFunction(freq) ? freq : () => freq;
    this.amp = isFunction(amp) ? amp : () => amp;
    this.phase = phase;
    this.sampleRate = sampleRate;
    this.pen = pen;
  }

  sample(n) {
    return sine({
      freq: this.freq(n),
      amp: this.amp(n),
      phase: this.phase
    }, n / this.sampleRate);
  }
}

function threeWaves () {
  const sampleRate = 44100 / 4;
  const nSamples = 200;
  const waveWidth = 700;
  const stepSize = waveWidth / nSamples;
  const freqs = [random(50, 150), random(100, 200), random(150, 300)];
  const amps = [random(25, 50), random(25, 50), random(25, 50)];
  const phases = [random(2 * math.PI), random(2 * math.PI), random(2 * math.PI)];
  const waves = [
    new Wave({ freq: freqs[0], amp: () => amps[0], phase: phases[0], sampleRate, pen: pens.STABILO_88_40 }),
    new Wave({ freq: freqs[1], amp: () => amps[1], phase: phases[1], sampleRate, pen: pens.STABILO_88_32 }),
    new Wave({ freq: freqs[2], amp: () => amps[2], phase: phases[2], sampleRate, pen: pens.STABILO_88_36 })
  ];
  const stacked = new StackedWaveGroup(waves);
  const interleaved = new InterleavedWaveGroup(waves);
  const overlapped = new OverlappedWaveGroup(waves);

  const leftMargin = 40;
  const top = new Point(leftMargin, height / 4);
  const middle = new Point(leftMargin, height / 2);
  const bottom = new Point(leftMargin, 3 * height / 4);
  stacked.draw(top, nSamples, waveWidth);
  interleaved.draw(middle, nSamples, waveWidth);
  overlapped.draw(bottom, nSamples, waveWidth);
}

function overtones() {
  const hmargin = 40;
  const sampleRate = 44100 / 4;
  const nSamples = 100;
  const waveWidth = width - (hmargin * 2);
  const stepSize = waveWidth / nSamples;
  const freqs = [random(50, 150), random(100, 200), random(150, 300)];
  const amps = [random(25, 50), random(25, 50), random(25, 50)];
  const phases = [random(2 * math.PI), random(2 * math.PI), random(2 * math.PI)];
  const waves = [];
  const nOvertones = 8;
  const baseFreq = 111;
  // const palette = palettes.palette_blues_and_greens;
  const palette = palettes.palette_hot_and_cold;
  for (let i = 1; i <= nOvertones; i++) {
    waves.push(new Wave({ 
      freq: baseFreq * i, 
      amp: () => 200 / i, 
      phase: phases[0], 
      sampleRate, 
      pen: palette[i-1]
    }));
  }

  const stacked = new StackedWaveGroup(waves);
  const interleaved = new InterleavedWaveGroup(waves);
  const overlapped = new OverlappedWaveGroup(waves);

  const top = new Point(hmargin, height / 4);
  const middle = new Point(hmargin, height / 2);
  const bottom = new Point(hmargin, 3 * height / 4);
  // stacked.draw(middle, nSamples, waveWidth);

  // overlapped.draw(middle, 200, waveWidth);
  // drawOutline(overlapped);

  interleaved.draw(middle, nSamples, waveWidth);
  drawOutline(interleaved);

  function drawOutline(waveGroup) {
    const step = waveGroup.waveWidth / waveGroup.nSamples;
    const topOutline = [];
    const bottomOutline = [];
    for (let i = 0; i < waveGroup.nSamples; i++) {
      const sampleTime = i;
      const samples = waveGroup.waves.map(wave => -wave.sample(sampleTime));
      const [negatives, positives] = partition(samples, n => n < 0);
      const top = waveGroup.pos.add(i * step, negatives.length ? math.min(negatives) : 0);
      const bottom = waveGroup.pos.add(i * step, positives.length ? math.max(positives) : 0);
      topOutline.push(top);
      bottomOutline.push(bottom);
    }
    const vmargin = 50;
    const topBorder = topOutline.map(point => new Point(point.x, vmargin));
    const bottomBorder = bottomOutline.map(point => new Point(point.x, height - vmargin));

    // Create intermediat paths
    createIntermediatPaths(topOutline, topBorder, 50);
    createIntermediatPaths(bottomOutline, bottomBorder, 50);

    function createIntermediatPaths(fromPoints, toPoints, nPaths=2) {
      if (fromPoints.length !== toPoints.length) throw new Error('fromPoints and toPoints must be same length');
      const vectors = [];
      for (let i = 0; i < fromPoints.length; i++) {
        vectors.push(toPoints[i].subtract(fromPoints[i]).divide(nPaths+1));
      }

      const paths = [];
      for (let i = 0; i < nPaths; i++) {
        const path = [];
        for (let j = 0; j < vectors.length; j++) {
          const step = vectors[j];
          const from = fromPoints[j];
          path.push(from.add(step.multiply(i+1)));
        }
        paths.push(path);
      }

      pens.withPen(pens.PRISMA05_BLACK, ({ color }) => {
        paths.map(segments => new Path({ segments, strokeColor: color }));
      });
    }

    pens.withPen(pens.PRISMA05_BLACK, ({ color }) => {
      new Path({
        segments: topOutline,
        strokeColor: color
      });
      new Path({
        segments: bottomOutline,
        strokeColor: color
      });

      new Path({
        segments: topBorder,
        strokeColor: color
      });
      new Path({
        segments: bottomBorder,
        strokeColor: color
      });
    })
  }
}

function pulseDensity () {
  const nSamples = 200;
  const minDist = 2
  const sampleRate = 44100 / 4;
  
  const waveGroup = new WaveGroup([
    new Wave({ freq: random(50, 150), amp: () => 20, phase: random(math.PI * 2), sampleRate, pen: pens.STABILO_88_40 }),
    new Wave({ freq: random(100, 200), amp: () => 40, phase: random(math.PI * 2), sampleRate, pen: pens.STABILO_88_32 }),
    new Wave({ freq: random(150, 250), amp: () => 50, phase: random(math.PI * 2), sampleRate, pen: pens.STABILO_88_36 }),
    new Wave({ freq: 300, amp: () => 15, sampleRate, pen: pens.STABILO_88_22 }),
  ]);

  // waveGroup.drawOverlapped(new Point(20, height/2), 200, 600);
  waveGroup.draw(new Point(20, height / 2), 200, 600);

  const waves = [
    new Wave({ freq: 200, sampleRate }),
    new Wave({ freq: 300, sampleRate })
  ];
  for (let i = 0; i < waves.length; i++) {
    let pos = new Point(10, 10);
    const wave = waves[i];
    for (let j = 0; j < nSamples; j++) {
      const to = pos.add(0, height - 20);
      const segments = waveGroup.interleavedObscure(pos, to);
      for (let segment of segments) {
        new Path.Line({
          from: segment[0],
          to: segment[1],
          strokeColor: 'black'
        });
      }
      const sample = wave.sample(j);
      const step = Math.abs(sample) * 8 + minDist;
      pos = pos.add(step, 0);
    }
  }
}

function randomAmplitudes() {
  const sampleRate = 44100 / 4;
  const waveGroup = new WaveGroup([
    new Wave({ freq: random(50, 150), amp: () => random(20, 50), phase: random(math.PI * 2), sampleRate, pen: pens.STABILO_88_40 }),
    new Wave({ freq: random(100, 200), amp: () => random(20, 50), phase: random(math.PI * 2), sampleRate, pen: pens.STABILO_88_32 }),
    new Wave({ freq: random(150, 250), amp: () => random(20, 50), phase: random(math.PI * 2), sampleRate, pen: pens.STABILO_88_36 }),
    new Wave({ freq: 300, amp: () => 15, sampleRate, pen: pens.STABILO_88_22 }),
  ]);

  waveGroup.drawStacked(new Point(20, height / 2), 500, 600);
}

/**
 * ART1
 * Small waves dying out. Larger ones growing.
 */
function art1() {
  const nGroups = 10;
  const hmargin = 50;
  const vmargin = 50;
  const waveGroups = [];
  const sampleRate = 44100 / 4;
  const palette = palettes.palette_lego;
  for (let i = 0; i < nGroups; i++) {
    const nWaves = randomInt(2, 5);
    const waveWidth = random(200, 500);
    const nSamples = randomInt(50, 150);
    const maxAmp = random(20, 70);
    const pos = new Point(
      random(hmargin, width - (waveWidth + hmargin)), 
      random(hmargin + maxAmp, height - (vmargin + maxAmp))
    );
    // const pos = new Point(hmargin, random(hmargin, height - vmargin));
    const waves = [];
    for (let j = 0; j < nWaves; j++) {
      const [from, to] = (pos.x > width * 1/5) ? [maxAmp, 0] : [0, maxAmp];
      // const from = 0;
      // const to = maxAmp;
      const amp = line({ from, to, dur: nSamples / sampleRate, sampleRate });
      waves.push(new Wave({
        freq: random(250, 550),
        amp,
        phase: random(math.PI * 2),
        sampleRate,
        pen: choose(palette)
      }))
    }
    // const WaveGroupType = StackedWaveGroup;
    // const WaveGroupType = CurveWaveGroup;
    // const WaveGroupType = InterleavedWaveGroup;
    const WaveGroupType = OverlappedWaveGroup;
    const wave = new WaveGroupType(waves);
    wave.draw(pos, nSamples, waveWidth, waveGroups);
    if (random() < 1) {
      waveGroups.push(wave);
    }
  }
}


function amplitudeModulation() {
  const sampleRate = 44100 / 2;
  const amp = (n) => sine({ freq: 50, amp: 100, sampleRate }, n / sampleRate);
  const wave = new CurveWaveGroup([
    new Wave({ freq: 1000, amp, sampleRate, pen: pens.STABILO_88_32 }),
    new Wave({ freq: 300, amp: amp, sampleRate, pen: pens.STABILO_88_40 })
  ]);
  const pos = new Point(10, height/2);
  wave.draw(pos, 2000, 1000);
}
// amplitudeModulation();

function audioApiTest() {
  const sampleRate = 44100 / 4;
  let buffer = null;
  const ctx = new OfflineAudioContext(1, sampleRate * 2, sampleRate);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0.5;
  osc.frequency.value = 50;
  vibrato(ctx, osc.frequency, {rate: 10});
  // osc.frequency.setValueAtTime(random(30, 200), ctx.currentTime + 0.5);
  // osc.frequency.setValueAtTime(random(30, 200), ctx.currentTime + 1);
  // osc.frequency.setValueAtTime(random(30, 200), ctx.currentTime + 1.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 1.5);
  ctx.startRendering().then((renderedBuffer) => {
    buffer = renderedBuffer;
    const pos = new Point(10, height / 2);
    new BufferGroup(renderedBuffer).draw(pos);
  });

  function vibrato(ctx, param, {rate=5, depth=10}={}) {
    const osc = ctx.createOscillator();
    osc.frequency.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = depth;
    osc.connect(gain).connect(param);
    osc.start();
  }

  // Play the audio.
  paper.project.view.onClick = () => {
    const actx = new AudioContext({ sampleRate });
    const sound = actx.createBufferSource();
    sound.buffer = buffer;
    sound.connect(actx.destination);
    sound.start();
  }
}

function overlaps() {
  const margin = 50;
  const sampleRate = 44100 / 4;
  const nSamples = 200;

  // const waves = [
  //   new Wave({ freq: 550, amp: line({ sampleRate, from: 0, to: 50, dur: nSamples / sampleRate }), pen: pens.STABILO_88_22, sampleRate }),
  //   new Wave({ freq: 100, amp: 50, pen: pens.STABILO_88_22, sampleRate }),
  //   new Wave({ freq: 170, amp: line({sampleRate, from: 50, to: 0, dur: nSamples / sampleRate }), pen: pens.STABILO_88_40, sampleRate })
  // ];
  // const poss = [
  //   new Point(margin + 100, height / 2 - 150),
  //   new Point(margin, height / 2),
  //   new Point(margin + 100, height / 2 + 100)
  // ];

  const nWaves = 5;
  const waves = [];
  const poss = [];
  for (let i = 0; i < nWaves; i++) {
    const wave = new Wave({ 
      freq: random(100, 400), 
      amp: line({ sampleRate, from: random(100), to: random(100), dur: nSamples / sampleRate }), 
      pen: pens.STABILO_88_22, 
      sampleRate 
    });
    waves.push(wave);
    poss.push(new Point(margin + random(200), margin + (height / nWaves) * (i)))
  }
  
  // const wave = new CurveWaveGroup([
  //   new Wave({ freq: 100, amp: 50, pen: pens.STABILO_88_22, sampleRate }),
  //   new Wave({ freq: 170, amp: 50, pen: pens.STABILO_88_40, sampleRate })
  // ]);
  // wave.draw(new Point(0, height/ 2), nSamples, width);

  // const inBounds = (point) => (
  //   point.x > margin && point.x < width - margin && point.y > margin && point.y < height - margin
  // );

  let vec = new Point({ angle: 45, length: 100 });
  const step = (width - 2 * margin) / nSamples;
  const paths = [];
  for (let i = 0; i < nSamples; i++) {
    const samples = waves.map(wave => wave.sample(i));
    for (let j = 1; j < waves.length; j++) {
      const s0 = samples[j-1];
      const s1 = samples[j];
      const from = poss[j-1].add(i * step, -s0);
      const to = poss[j].add(i * step, -s1);
      paths.push([from, to]);
    }
  }

  clipToBorder({
    from: [50, 50],
    to: [width - 50, height - 50],
    strokeColor: 'black'
  }, paths).map(segments => {
    return new Path({
      segments,
      strokeColor: 'black',
      strokeWidth: 0.5
    });
  });
}


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
    if (intersections.length !== 1) {
      throw new Error('Something Wrong! Intersections should be equal to 1.');
    }
    line.remove();
    return [from, intersections[0].point];
  } else if (!fromContained && toContained) {
    const line = new Path.Line({
      from,
      to
    });
    const intersections = line.getIntersections(rect);
    if (intersections.length !== 1) {
      throw new Error('Something Wrong! Intersections should be equal to 1.');
    }
    line.remove();
    return [intersections[0].point, to];
  } else {
    throw new Error('Should not reach this point.');
  }
}

function clipToBorder(border, paths) {
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
  // rect.remove();
  return clippedPaths;
}

/* run examples */

// threeWaves();
// overtones();
// pulseDensity();
// randomAmplitudes();
// art1();
// audioApiTest();
overlaps();


window.saveAsSvg = function save(name) {
  saveAsSVG(paper.project, name);
}