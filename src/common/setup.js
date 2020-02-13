export const A4 = {
  landscape: [1052, 742],
  portrait: [742, 1052]
};

export const STRATH_SMALL = {
  landscape: [765, 495],
  portrait: [495, 765]
};

export const ARTIST_SKETCH = {
  landscape: [765, 459],
  portrait: [459, 765]
};

export const WEDDING_SAVE_THE_DATE = {
  landscape: [564, 406],
  portrait: [406, 564]
};

export function createCanvas ([width, height], {hidden = false, id} = {}) {
  const root = document.getElementById('root');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style = 'border: 1px solid black';
  canvas.hidden = hidden;
  if (id) {
    canvas.id = id;
  }
  root.appendChild(canvas);

  return canvas;
}

export function loadImage (path, {hidden = true} = {}) {
  const promise = new Promise((resolve, reject) => {
    const root = document.getElementById('root');
    const image = document.createElement('img');
    image.src = path;
    image.hidden = hidden;
    image.onload = () => resolve(image);
    root.appendChild(image);
  });

  return promise;
}