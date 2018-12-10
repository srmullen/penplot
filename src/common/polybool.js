import polybool from 'polybooljs';

export function difference (s1, s2) {
  const r1 = {
    regions: [s1],
    inverted: false
  };
  const r2 = {
    regions: [s2],
    inverted: false
  };
  return polybool.difference(r1, r2);
}
