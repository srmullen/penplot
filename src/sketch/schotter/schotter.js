import paper, { Shape } from 'paper';
import { A4, createCanvas } from 'common/setup';
import { saveAsSVG } from 'common/utils';
import { random } from 'mathjs';

const [width, height] = A4.portrait;
const canvas = createCanvas(A4.portrait);

paper.setup(canvas);
window.paper = paper;

const rows = 17;
const columns = 12;
const hMargin = 25;
const vMargin = 40;
const size = (height - (vMargin * 2)) / rows;
const radius = size / 2;

paper.view.translate(hMargin, vMargin);

let yPos = 0;
for (let row = 0; row < rows; row++) {
  let xPos = 0;
  for (let col = 0; col < columns; col++) {
    const rect = new Shape.Rectangle([xPos, yPos], size);
    rect.strokeColor = 'black';
    rect.translate(
      random((row/rows) * -5, (row/rows) * 5),
      random((row/rows) * -20, (row/rows) * 20)
    );
    const rotation = random((row / rows) * -45, (row / rows) * 45);
    rect.rotate(rotation);
    xPos += size;
  }
  yPos += size;
}

window.saveAsSVG = (name) => {
  saveAsSVG(paper.project, name);
}
