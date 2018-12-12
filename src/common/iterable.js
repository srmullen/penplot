export function map (fn, iterable) {
  const ret = [];
  let i = 0;
  for (let v of iterable) {
    ret.push(fn(v, i));
    i++;
  }
  return ret;
}

export function reduce (fn, iterable, init) {
  let ret = init;
  let i = 0;
  for (let v of iterable) {
    ret = fn(init, v, i);
    i++;
  }
  return ret;
}
