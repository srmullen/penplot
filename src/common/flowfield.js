import { Point } from 'paper';

export function createField (rows, columns, {noise_rate = 0.01}) {
  const field = [];
  for (let i = 0; i < columns; i++) {
    const column = [];
    for (let j = 0; j < rows; j++) {
      const vec = new Point({
        // length: 1,
        // angle: math.random(0, 360)
        length: noise.simplex2(i * 0.1, j * 0.1),
        angle: noise.simplex2(i * noise_rate, j * noise_rate) * 360
      });
      column.push(vec);
    }
    field.push(column);
  }
  return field;
}

export function lookup (field, boxWidth, boxHeight, x, y) {
  const column = Math.floor(x / boxWidth);
  const row = Math.floor(y / boxHeight);
  try {
    return field[column][row];
  } catch (e) {
    console.log(x, y, column, row);
    console.error("Not in Field");
    // paper.view.onFrame = () => {}

  }
}
