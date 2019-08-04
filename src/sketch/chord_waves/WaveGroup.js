import { range, partition, sortBy, isFunction, sum } from 'lodash';
import { Path, Point } from 'paper';
import * as pens from 'common/pens';

export class WaveGroup {
  constructor(waves) {
    this.waves = waves;
  }

  draw(pos, nSamples, waveWidth, obscurors = []) {
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
          const segments = obscureSegment(obscurors, [from, to]);
          for (let [from, to] of segments) {
            new Path.Line({
              from,
              to,
              strokeColor: color
            });
          }
        });
      }
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

  /**
   * Return true if the point is above the wave.
   * @return {Bool}
   */
  above(point) {
    const time = point.subtract(this.pos);
  }
}

export class InterleavedWaveGroup extends WaveGroup {
  constructor(waves) {
    super();
    this.waves = waves;
  }

  draw(pos, nSamples, waveWidth, obscurors = []) {
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

      drawInterleavedSamples(
        samples,
        pos.add(stepSize * i, 0),
        pos.add(stepSize * (i + 1), 0),
        obscurors
      );
    }
  }
}

export class CurveWaveGroup extends WaveGroup {
  constructor(waves) {
    super();
    this.waves = waves;
  }

  draw(pos, nSamples, waveWidth, obscurors = []) {
    this.pos = pos;
    this.nSamples = nSamples;
    this.waveWidth = waveWidth;

    const stepSize = waveWidth / nSamples;
    for (let i = 0; i < this.waves.length; i++) {
      const wave = this.waves[i];
      const segments = [];
      for (let j = 0; j < nSamples; j++) {
        const sample = wave.sample(j);
        segments.push(pos.add(stepSize * j, -sample));
      }
      pens.withPen(wave.pen, ({ color }) => {
        new Path({
          segments,
          strokeColor: color
        });
      });
    }
  }

  obscure(from, to) {
    return [[from, to]];
  }
}

export class OverlappedWaveGroup extends WaveGroup {
  constructor(waves) {
    super();
    this.waves = waves;
  }

  draw(pos, nSamples, waveWidth, obscurors = []) {
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

      drawOverlapSamples(samples, pos.add(stepSize * i, 0), obscurors);
    }
  }
}

export class StackedWaveGroup extends WaveGroup {
  constructor(waves) {
    super();
    this.waves = waves;
  }

  draw(pos, nSamples, waveWidth, obscurors = []) {
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

      drawStackedSamples(samples, pos.add(stepSize * i, 0), obscurors);
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

      const top = this.pos.add(pos.x, sum(negatives));
      const bottom = this.pos.add(pos.x, sum(positives));

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
}

export class BufferGroup {
  constructor(buffer) {
    this.buffer = buffer;
  }

  draw(pos) {
    const scale = 50;
    const channel = this.buffer.getChannelData(0);
    const segments = [];
    const stepSize = 1000 / channel.length;
    for (let i = 0; i < channel.length; i++) {
      const sample = scale * channel[i];
      segments.push(pos.add(i * stepSize, sample));
    }
    new Path({
      segments,
      strokeColor: 'black'
    });
  }
}

function obscureSegment(obscurors, segment) {
  if (!obscurors.length) {
    return [segment];
  } else {
    return obscurors.reduce((acc, obs) => {
      let ret = [];
      for (let [from, to] of acc) {
        ret = ret.concat(obs.obscure(from, to));
      }
      return ret;
    }, [segment]);
  }
}

function drawOverlapSamples(samples, base, obscurors) {
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
        const segments = obscureSegment(obscurors, [from, to]);
        for (let segment of segments) {
          new Path.Line({
            from: segment[0],
            to: segment[1],
            strokeColor: color
          });
        }
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
        const segments = obscureSegment(obscurors, [from, to]);
        for (let segment of segments) {
          new Path.Line({
            from: segment[0],
            to: segment[1],
            strokeColor: color
          });
        }
      });
      previousSample = wave.sample;
      from = to;
    }
  }
}

function drawStackedSamples(samples, base, obscurors) {
  const [negatives, positives] = partition(samples, n => n.sample < 0);

  {
    let from = base;
    for (let i = 0; i < positives.length; i++) {
      const wave = positives[i];
      const to = from.subtract(0, wave.sample);
      pens.withPen(wave.pen, ({ color }) => {
        const segments = obscureSegment(obscurors, [from, to]);
        for (let segment of segments) {
          new Path.Line({
            from: segment[0],
            to: segment[1],
            strokeColor: color
          });
        }
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
        const segments = obscureSegment(obscurors, [from, to]);
        for (let segment of segments) {
          new Path.Line({
            from: segment[0],
            to: segment[1],
            strokeColor: color
          });
        }
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
function drawInterleavedSamples(samples, start, end, obscurors) {
  const stepSize = end.subtract(start).x / samples.length;
  for (let i = 0; i < samples.length; i++) {
    const wave = samples[i];
    const from = start.add(stepSize * i, 0);
    const to = from.subtract(0, wave.sample);
    pens.withPen(wave.pen, ({ color }) => {
      const segments = obscureSegment(obscurors, [from, to]);
      for (let segment of segments) {
        new Path.Line({
          from: segment[0],
          to: segment[1],
          strokeColor: color
        });
      }
    });
  }
}