import paper, { Path } from 'paper';
import math from 'mathjs';
import { createCanvas } from 'common/setup';

const width = 1000;
const height = 600;
const canvas = createCanvas([width, height]);
paper.setup(canvas);
window.paper = paper;
window.math = math;

const wave = sineWave({
  freq: 8,
  amp: (t, i) => 50 + i * 0.5,
  nSamples: 400,
  sampleRate: 1/1000
});
draw(wave, width - 40, 20, height / 2);

function sineWave ({freq=2, amp=() => 10, nSamples=100, sampleRate = 0.005}) {
  const samples = [];
  for (let i = 0; i < nSamples; i++) {
    const t = i * sampleRate;
    const p = amp(t, i) * math.sin(t * freq * (2 * math.PI));
    samples.push(p);
  }
  return samples;
}

function draw (samples, width, xpos=0, ypos=0) {
  const stepSize = width / samples.length;
  for (let i = 0; i < samples.length; i++) {
    const x = xpos + (i * stepSize);
    if (x < width) {
      const y = samples[i] + ypos;
      const tox = x + (x * i) < width ? x + (x * i) : width
      Path.Line({
        from: [x, y],
        to: [tox, y],
        strokeColor: 'black',
        strokeWidth: 1
      });
    }
  }
}
