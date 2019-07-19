import paper, { Point, Path } from 'paper';
import math, { random, randomInt } from 'mathjs';
import { range, partition, sortBy, isFunction, sum } from 'lodash';
import please from 'pleasejs';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, shuffle, choose, maprange
} from 'common/utils';
import * as pens from 'common/pens';
import * as palettes from 'common/palettes';

window.math = math;

const PAPER_SIZE = STRATH_SMALL.landscape;
const [width, height] = PAPER_SIZE;
const canvas = createCanvas(PAPER_SIZE);
paper.setup(canvas);

function sine(time, { freq = 440, amp = 1, phase = 0 } = {}) {
  return amp * math.sin((2 * math.PI * freq * time) + phase);
}

// Other waveforms.
function saw() {}
function square() {}
function tri() {}

// TODO: Should be useful as amplitude functions.
function line({ from = 1, to = 0, dur = 1, sampleRate = 44100 }) {
  return (n) => {
    const time = n / sampleRate;
    const val = maprange(time, 0, dur, from, to);
    return val;
  }
}
function adsr() {}

class Wave {
  constructor({ freq = 440, amp = 1, phase = 0, sampleRate = 44100, pen } = {}) {
    this.freq = isFunction(freq) ? freq : () => freq;
    this.amp = isFunction(amp) ? amp : () => amp;
    this.phase = 0;
    this.sampleRate = sampleRate;
    this.pen = pen;
  }

  sample(n) {
    return sine(n / this.sampleRate, {
      freq: this.freq(n),
      amp: this.amp(n),
      phase: this.phase
    });
  }
}

class WaveGroup {
  constructor(waves) {
    this.waves = waves;
  }

  draw(pos, nSamples, waveWidth, obscurors=[]) {
    this.pos = pos;
    this.nSamples = nSamples;
    this.waveWidth = waveWidth;

    const stepSize = waveWidth / nSamples;
    for (let i = 0; i < this.waves.length; i++) {
      const wave = this.waves[i];
      for (let j = 0; j < nSamples; j++) {
        const sample = wave.sample(j);
        const from = pos.add(stepSize * j, 0);
        const to = from.subtract(0, sample);
        pens.withPen(wave.pen, ({ color }) => {
          if (!obscurors.length) {
            new Path.Line({
              from,
              to,
              strokeColor: color
            });
          } else {
            const segments = obscurors.reduce((acc, obs) => {
              let ret = [];
              for (let [from, to] of acc) {
                ret = ret.concat(obs.obscure(from, to));
              }
              return ret;
            }, [[from, to]]);

            for (let [from, to] of segments) {
              new Path.Line({
                from,
                to,
                strokeColor: color
              });
            }
          }
        });
      }
    }
  }

  drawStacked(pos, nSamples, waveWidth) {
    this.pos = pos;
    this.nSamples = nSamples;
    this.waveWidth = waveWidth;

    const stepSize = waveWidth / nSamples;
    for (let i = 0; i < nSamples; i++) {
      const samples = [];
      for (let j = 0; j < this.waves.length; j++) {
        const wave = this.waves[j];
        samples.push({
          sample: wave.sample(i),
          pen: wave.pen
        });
      }

      drawStackedSamples(samples, pos.add(stepSize * i, 0));
    }
  }

  drawInterleaved(pos, nSamples, waveWidth) {
    this.pos = pos;
    this.nSamples = nSamples;
    this.waveWidth = waveWidth;

    const stepSize = waveWidth / nSamples;
    for (let i = 0; i < nSamples; i++) {
      const samples = [];
      for (let j = 0; j < this.waves.length; j++) {
        const wave = this.waves[j];
        samples.push({
          sample: wave.sample(i),
          pen: wave.pen
        });
      }

      drawInterleavedSamples(samples, pos.add(stepSize * i, 0), pos.add(stepSize * (i + 1), 0));
    }
  } 

  drawOverlapped(pos, nSamples, waveWidth) {
    this.pos = pos;
    this.nSamples = nSamples;
    this.waveWidth = waveWidth;

    const stepSize = waveWidth / nSamples;
    for (let i = 0; i < nSamples; i++) {
      const samples = [];
      for (let j = 0; j < this.waves.length; j++) {
        const wave = this.waves[j];
        samples.push({
          sample: wave.sample(i),
          pen: wave.pen
        });
      }

      drawOverlapSamples(samples, pos.add(stepSize * i, 0));
    }
  }

  stackedObscure(from, to) {
    const step = this.waveWidth / this.nSamples;
    const pos = from.subtract(this.pos);
    const sampleTime = pos.x / step;
    const samples = this.waves.map(wave => -wave.sample(sampleTime));
    if (pos.x < 0 || pos.x > this.waveWidth) {
      return [[from, to]];
    } else {
      const [negatives, positives] = partition(samples, n => n < 0);

      const top = this.pos.add(pos.x, sum(negatives));
      const bottom = this.pos.add(pos.x, sum(positives));

      // FIXME: This doesn't when from or to start between top or bottom.
      const segments = [];
      if (from.y < top.y) {
        segments.push([from, top]);
      } else if (from.y > bottom.y) {
        segments.push([from, bottom]);
      }

      if (to.y < top.y) {
        segments.push([to, top]);
      } else if (to.y > bottom.y) {
        segments.push([to, bottom]);
      }

      return segments;
    }
  }

  obscure(from, to) {
    const step = this.waveWidth / this.nSamples;
    const pos = from.subtract(this.pos);
    const sampleTime = pos.x / step;
    const samples = this.waves.map(wave => -wave.sample(sampleTime));
    if (pos.x < 0 || pos.x > this.waveWidth) {
      return [[from, to]];
    } else {
      const [negatives, positives] = partition(samples, n => n < 0);

      const top = this.pos.add(pos.x, negatives.length ? math.min(negatives) : 0);
      const bottom = this.pos.add(pos.x, positives.length ? math.max(positives) : 0);

      // FIXME: This doesn't when from or to start between top or bottom.
      const segments = [];
      if (
        (from.y < top.y && to.y < top.y) || // both points are above wave.
        (from.y > bottom.y && to.y > bottom.y) // both points are below wave.
      ) {
        segments.push([from, to]);
        return segments;
      }

      if (from.y < top.y) {
        segments.push([from, top]);
      } else if (from.y > bottom.y) {
        segments.push([from, bottom]);
      }

      if (to.y < top.y) {
        segments.push([to, top]);
      } else if (to.y > bottom.y) {
        segments.push([to, bottom]);
      }

      return segments;
    }
  }

  interleavedObscure = this.obscure;

  overlappedObscure = this.obscure;
}

function sineWave({ freq = 440, amp = () => 1, nSamples = 100, sampleRate = 44100 } = {}) {
  const samples = [];
  for (let i = 0; i < nSamples; i++) {
    const t = i * sampleRate;
    const p = amp(t, i) * math.sin(t * freq * (2 * math.PI));
    samples.push(p);
  }
  return samples;
}

// function drawWave (wave, start) {
//   const paths = [];
//   for (let i = 0; i < wave.length; i++) {
//     const from = start.add(i * 5, 0);
//     const to = from.add(0, wave[i] * 15);
//     paths.push(new Path.Line({
//       from,
//       to,
//       strokeColor: 'red'
//     }));
//   }
// }

// const wave1 = sineWave();
// const wave2 = sineWave({ freq: 10 });
// drawWave(wave1, new Point(10, height / 2));
// drawWave(wave2, new Point(12, height / 2));

function twoWaves() {
  const start = new Point(10, height / 2);
  const sampleRate = 44100 / 4;
  const nSamples = 200;
  const stepSize = 700 / nSamples;
  const freq1 = random(50, 200);
  const freq2 = random(100, 300);
  for (let i = 0; i < nSamples; i++) {
    const samples = [
      { 
        id: 0, 
        sample: sine(i / sampleRate, { freq: freq1, amp: () => 100 }),
        color: 'red'
      },
      { 
        id: 1, 
        sample: sine(i / sampleRate, { freq: freq2, amp: () => 100 }),
        color: 'blue'
      }
    ];
    const base = start.add(stepSize * i, 0);
    drawOverlapSamples(samples, base);
  }
}
// twoWaves();

function drawOverlapSamples(samples, base) {
  const [negatives, positives] = partition(samples, n => n.sample < 0);

  const negSorted = sortBy(negatives, wave => Math.abs(wave.sample));
  const posSorted = sortBy(positives, wave => wave.sample);

  {
    let from = base;
    let previousSample = 0;
    for (let i = 0; i < posSorted.length; i++) {
      const wave = posSorted[i];
      const to = from.subtract(0, wave.sample - previousSample);
      pens.withPen(wave.pen, ({ color }) => {
        new Path.Line({
          from,
          to,
          strokeColor: color
        });
      });
      previousSample = wave.sample;
      from = to;
    }
  }

  {
    let from = base;
    let previousSample = 0;
    for (let i = 0; i < negSorted.length; i++) {
      const wave = negSorted[i];
      const to = from.subtract(0, wave.sample - previousSample);
      pens.withPen(wave.pen, ({ color }) => {
        new Path.Line({
          from,
          to,
          strokeColor: color
        });
      });
      previousSample = wave.sample;
      from = to;
    }
  }
}

function drawStackedSamples(samples, base) {
  const [negatives, positives] = partition(samples, n => n.sample < 0);

  {
    let from = base;
    for (let i = 0; i < positives.length; i++) {
      const wave = positives[i];
      const to = from.subtract(0, wave.sample);
      pens.withPen(wave.pen, ({ color }) => {
        new Path.Line({
          from,
          to,
          strokeColor: color
        });
      });
      from = to;
    }
  }

  {
    let from = base;
    for (let i = 0; i < negatives.length; i++) {
      const wave = negatives[i];
      const to = from.subtract(0, wave.sample);
      pens.withPen(wave.pen, ({ color }) => {
        new Path.Line({
          from,
          to,
          strokeColor: color
        });
      });
      from = to;
    }
  }
}

/**
 * 
 * @param {*} samples - array of waves
 * @param {*} from - point where the sample drawing begins
 * @param {*} to - point where the last sample drawing ends, not inclusive.
 */
function drawInterleavedSamples(samples, start, end) {
  const stepSize = end.subtract(start).x / samples.length;
  for (let i = 0; i < samples.length; i++) {
    const wave = samples[i];
    const from = start.add(stepSize * i, 0);
    const to = from.subtract(0, wave.sample);
    pens.withPen(wave.pen, ({color}) => {
      new Path.Line({
        from,
        to,
        strokeColor: color
      });
    });
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
    new Wave({ freq: freqs[2], amp: () => amps[2], phase: phases[2], sampleRate, pen: pens.STABILO_88_36 }),
    new Wave({ freq: 300, amp: () => 15, sampleRate, pen: pens.STABILO_88_22 }),
  ];
  const waveGroup = new WaveGroup(waves);
  for (let i = 0; i < nSamples; i++) {
    const samples = [];
    for (let wave of waves) {
      samples.push({
        sample: wave.sample(i),
        pen: wave.pen
      });
    }
  }
  const leftMargin = 40
  const top = new Point(leftMargin, height / 4);
  const middle = new Point(leftMargin, height / 2);
  const bottom = new Point(leftMargin, 3 * height / 4);
  waveGroup.drawStacked(top, nSamples, waveWidth);
  waveGroup.drawInterleaved(middle, nSamples, waveWidth);
  waveGroup.drawOverlapped(bottom, nSamples, waveWidth);
}
// threeWaves();

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
// pulseDensity();

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
// randomAmplitudes();

/**
 * ART1
 * Small waves dying out. Larger ones growing.
 */
function art1() {
  const nWaves = 10;
  const hmargin = 50;
  const vmargin = 50;
  const waves = [];
  const sampleRate = 44100 / 4;
  const nSamples = 300
  for (let i = 0; i < nWaves; i++) {
    const pos = new Point(hmargin, random(hmargin, height - vmargin));
    // const pos = new Point(hmargin, height / 2);
    const wave = new WaveGroup([new Wave({
      freq: random(50, 250),
      amp: line({ from: 0, to: 50, dur: 300/sampleRate, sampleRate }),
      phase: random(math.PI * 2),
      sampleRate,
      pen: choose(palettes.palette_hot_and_cold)
    })]);
    wave.draw(pos, nSamples, 600);
    waves.push(wave);
  }
}
art1();

window.saveAsSvg = function save(name) {
  saveAsSVG(paper.project, name);
}