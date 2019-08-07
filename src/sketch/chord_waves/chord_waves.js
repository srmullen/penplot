import paper, { Point, Path } from 'paper';
import math, { random, randomInt } from 'mathjs';
import { range, partition, sortBy, isFunction, sum, last, remove } from 'lodash';
import { A4, STRATH_SMALL, createCanvas } from 'common/setup';
import {
  saveAsSVG, choose, maprange, radiansToDegrees, clipBounds
} from 'common/utils';
import * as pens from 'common/pens';
import * as palettes from 'common/palettes';
import { WaveGroup, StackedWaveGroup, OverlappedWaveGroup, InterleavedWaveGroup, BufferGroup } from './WaveGroup';
import { palette_blues_and_greens } from '../../common/palettes';

window.math = math;
window.range = range;

function sine({ freq = 440, amp = 1, phase = 0 } = {}, time) {
  return amp * math.sin((2 * math.PI * freq * time) + phase);
}

// Other waveforms.
function saw() {}
function square() {}
function tri() {}

function line({ from = 1, to = 0, dur = 1, mul = 1, add = 0 } = {}) {
  return (time) => {
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
      freq: this.freq(n / this.sampleRate),
      amp: this.amp(n / this.sampleRate),
      phase: this.phase
    }, n / this.sampleRate);
  }

  at(time) {
    return sine({
      freq: this.freq(time),
      amp: this.amp(time),
      phase: this.phase
    }, time);
  }
}

function threeWaves () {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

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
  const PAPER_SIZE = A4.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

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
  const PAPER_SIZE = A4.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

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
      const segments = waveGroup.obscure(pos, to);
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
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const sampleRate = 44100 / 4;
  const waveGroup = new WaveGroup([
    new Wave({ freq: random(50, 150), amp: () => random(20, 50), phase: random(math.PI * 2), sampleRate, pen: pens.STABILO_88_40 }),
    new Wave({ freq: random(100, 200), amp: () => random(20, 50), phase: random(math.PI * 2), sampleRate, pen: pens.STABILO_88_32 }),
    new Wave({ freq: random(150, 250), amp: () => random(20, 50), phase: random(math.PI * 2), sampleRate, pen: pens.STABILO_88_36 }),
    new Wave({ freq: 300, amp: () => 15, sampleRate, pen: pens.STABILO_88_22 }),
  ]);

  waveGroup.draw(new Point(20, height / 2), 500, 600);
}

/**
 * ART1
 * Small waves dying out. Larger ones growing.
 */
function art1() {
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const nGroups = 100;
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
      const amp = line({ from, to, dur: nSamples / sampleRate });
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
  const PAPER_SIZE = STRATH_SMALL.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

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

function overlaps1() {
  const PAPER_SIZE = A4.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const margin = 50;
  const sampleRate = 44100 / 4;
  const nSamples = 200;
  const duration = 1; // seconds

  const nWaves = 5;
  const waves = [];
  const poss = [];
  for (let i = 0; i < nWaves; i++) {
    const wave = new Wave({ 
      freq: random(100, 400), 
      amp: line({ from: random(100), to: random(100), dur: nSamples / sampleRate }), 
      pen: pens.STABILO_88_22, 
      sampleRate 
    });
    waves.push(wave);
    poss.push(new Point(margin + random(200), margin + (height / nWaves) * (i)));
    // poss.push(new Point(margin, margin + (height / nWaves) * (i)));
  }
  
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

function overlaps2() {
  const PAPER_SIZE = A4.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const margin = 25;
  const duration = 0.1; // seconds

  // const nWaves = 20;
  const nWaves = palettes.palette_large.length + 1;
  const freq = 10;

  const waves = createHarmonicSeries(freq, nWaves, duration);
  const poss = [];
  for (let i = nWaves-1; i >= 0; i--) {
    // poss.push(new Point(margin, margin + (height / (nWaves + 2)) * (i + 1)));
    poss.push(new Point(0, (height / (nWaves + 2)) * (i + 1)));
  }

  const nextTime = (time, i, phase) => {
    return time +  0.0001 * Math.abs(Math.sin(i * 0.01 * 2 * Math.PI + phase)) + 0.0004;
  }

  const wavePoints = [];
  const paths = [];
  for (let i = 0; i < waves.length; i++) {
    const wave = waves[i];
    const pos = poss[i];
    const waveForm = [];
    const phase = math.phi * i;
    for (let time = 0, j = 0; time < duration && j < 20000; time = nextTime(time, j, phase), j++) {
      const sample = wave.at(time);

      const from = pos.add((time / duration) * width, 0);
      const to = from.add(0, sample);
      waveForm.push(to);
    }
    wavePoints.push(waveForm);
  }

  const nSamples = math.min(wavePoints.map(s => s.length));
  for (let i = 1; i < waves.length; i++) {
    const lines = [];
    for (let j = 0; j < nSamples; j++) {
      const from = wavePoints[i - 1][j];
      const to = wavePoints[i][j];
      lines.push([from, to]);
    }
    paths.push(lines);
  }

  // const palette = palettes.palette_hot_and_cold;
  // const palette = palettes.palette_lego;
  const palette = palettes.palette_large;
  // const palette = palettes.palette_rgb3;
  paths.forEach((lines, i) => {
    pens.withPen(palette[i % palette.length], ({ color }) => {
      clipToBorder({
        // from: [margin, margin],
        // to: [width - margin, height - margin],
        from: [0, 0],
        to: [width, height],
        strokeColor: 'black'
      }, lines).map(segments => {
        return new Path({
          segments,
          strokeColor: color,
          strokeWidth: 1
        });
      });
    });  
  });
}

function harmonicSeries() {
  const PAPER_SIZE = A4.landscape;
  const [width, height] = PAPER_SIZE;
  const canvas = createCanvas(PAPER_SIZE);
  paper.setup(canvas);

  const margin = 20;

  const sampleRate = 44100;
  const duration = 0.2;
  const nHarmonics = 14;
  const ctxs = [];
  const harmonics = [];
  const freq = 5;
  const amp = 100;
  let harmonicIdxs = range(nHarmonics);
  for (let i = 0; i < nHarmonics; i++) {
    const ctx = new OfflineAudioContext(1, Math.floor(sampleRate * duration), sampleRate);
    ctxs.push(ctx);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    // gain.gain.value = maxGain / (i+1);
    // const maxGain = amp / ((i+1)/2);
    const maxGain = amp;
    
    // const peakTime = ctx.currentTime + duration - (ctx.currentTime + (i * (duration / nHarmonics)));

    const peakTime = ctx.currentTime + (i * (duration / nHarmonics));

    // const harmIdx = choose(harmonicIdxs);
    // harmonicIdxs = remove(harmonicIdxs, el => el === harmIdx);
    // const peakTime = ctx.currentTime + (harmIdx * (duration / nHarmonics));

    gain.gain.linearRampToValueAtTime(maxGain, peakTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    // gain.gain.exponentialRampToValueAtTime(maxGain, peakTime);
    // gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.frequency.value = freq * (i + 1);
    // vibrato(ctx, osc.frequency, { rate: 10 });
    // vibrato(ctx, gain.gain, { rate: 50, depth: 50 });
    osc.connect(gain);
    gain.connect(ctx.destination);
    harmonics.push(osc);
  }

  harmonics.forEach((osc, i) => {
    osc.start();
    osc.stop(ctxs[i].currentTime + 1.5);
  });

  const buffers = [];
  Promise.all(ctxs.map(ctx => {
    return ctx.startRendering();
  })).then((renderedBuffers) => {
    renderedBuffers.forEach(buffer => {
      buffers.push(buffer);
      const pos = new Point(10, random(height));
    });
    drawBuffers(renderedBuffers);
  });

  function drawBuffers(buffers) {
    const poss = [];
    for (let i = buffers.length - 1; i >= 0; i--) {
      poss.push(new Point(0, (height / (buffers.length + 2)) * (i + 1)));
    }

    const nextTime = (time, i, phase) => {
      const minDist = 0.00005;
      const amp = 0.0005; // maxDist
      const freq = 0.01;
      return time + amp * Math.abs(Math.sin(i * freq * 2 * Math.PI + phase)) + minDist;
    }

    const wavePoints = [];
    const paths = [];
    const converge = new Point(width, height / 2);
    for (let i = 0; i < buffers.length; i++) {
      const buffer = buffers[i];
      const channel = buffer.getChannelData(0);
      const pos = poss[i];
      // const vec = converge.subtract(pos).divide(channel.length/50);
      const waveForm = [];
      const phase = math.phi * i;
      for (let time = 0, j = 0; time < duration && j < 20000; time = nextTime(time, j, phase), j++) {
        const sample = channel[Math.floor(time * sampleRate)];

        const from = pos.add((time / duration) * width, 0);
        const to = from.add(0, sample);
        waveForm.push(to);
      }
      wavePoints.push(waveForm);
    }

    const nSamples = math.min(wavePoints.map(s => s.length));
    for (let i = 1; i < buffers.length; i++) {
      const lines = [];
      for (let j = 0; j < nSamples; j++) {
        const from = wavePoints[i - 1][j];
        const to = wavePoints[i][j];
        lines.push([from, to]);
      }
      paths.push(lines);
    }

    /* Clip paths and draw. */

    // create light colored palette!
    // const palette = palettes.palette_blues_and_greens;
    // const palette = palettes.palette_frost_plus;
    // const palette = palettes.palette_hot_and_cold;
    // const palette = palettes.palette_lego;
    // const palette = palettes.palette_large;
    const palette = palettes.palette_rgb3;
    // const palette = palettes.palette_neon;
    // const palette = palettes.palette_cym;
    paths.forEach((lines, i) => {
      pens.withPen(palette[i % palette.length], ({ color }) => {
        clipToBorder({
          from: [margin, margin],
          to: [width - margin, height - margin],
          // from: [0, 0],
          // to: [width, height],
          strokeColor: 'black'
        }, lines).map(segments => {
          return new Path({
            segments,
            strokeColor: color,
            strokeWidth: 1
          });
        });
      });
    });
  }

  function vibrato(ctx, param, { rate = 5, depth = 10 } = {}) {
    const osc = ctx.createOscillator();
    osc.frequency.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = depth;
    osc.connect(gain).connect(param);
    osc.start();
  }

  // const actx = new AudioContext({ sampleRate });
  // // Play the audio.
  // paper.project.view.onClick = () => {
  //   buffers.forEach(buffer => {
  //     const sound = actx.createBufferSource();
  //     sound.buffer = buffer;
  //     sound.connect(actx.destination);
  //     sound.start();
  //   });
  // }
}

function createHarmonicSeries(freq = 100, nHarmonics = 7, duration=1) {
  const waves = [];
  for (let i = 0; i < nHarmonics; i++) {
    const wave = new Wave({
      freq: freq * (i + 1),
      amp: line({ from: 200 / ((i+1)/2), to: 0, dur: duration })
    });
    waves.push(wave);
  }
  return waves;
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
  rect.remove();
  return clippedPaths;
}

/* run examples */

// threeWaves();
// overtones();
// pulseDensity();
// randomAmplitudes();
// art1();
// audioApiTest();
// overlaps1();
// overlaps2();
harmonicSeries();


window.saveAsSvg = function save(name) {
  saveAsSVG(paper.project, name);
}