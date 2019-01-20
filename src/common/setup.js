export const A4 = {
  landscape: [1052, 742],
  portrait: [742, 1052]
};

export const STRATH_SMALL = {
  landscape: [765, 495],
  portrait: [495, 765]
};

export function createCanvas ([width, height], {hidden = false} = {}) {
  const root = document.getElementById('root');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style = 'border: 1px solid black';
  canvas.hidden = hidden;
  root.appendChild(canvas);

  return canvas;
}
