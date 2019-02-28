import space from 'color-space';
import deltae from 'delta-e';

export function distance ([r1, g1, b1], [r2, g2, b2]) {
  const c1 = space.rgb.lab([r1, g1, b1]);
  const c2 = space.rgb.lab([r2, g2, b2]);
  return deltae.getDeltaE00({L: c1[0], A: c1[1], B: c1[2]}, {L: c2[0], A: c2[1], B: c2[2]});
}
