import paper, { Point, Path } from 'paper';
import { createCanvas, saveAsSVG, intersects, radiansToDegrees, timer } from 'common/utils';
import math, { random } from 'mathjs';

// paper.setup(canvas);
// window.paper = paper;

window.onload = function() {
  const width = 742;
  const height = 1052;
  const canvas = createCanvas(width, height);
	const context = canvas.getContext("2d");
	const fl = 300;
	const cards = [];
	const numCards = 200;
	const centerZ = 2000;
	const radius = 1000;
	let baseAngle = 0;
	const rotationSpeed = 0.01;


	for(var i = 0; i < numCards; i += 1) {
		var card = {
			angle: 0.2 * i,
			y: 2000 - 4000 / numCards * i
		};
		card.x = Math.cos(card.angle + baseAngle) * radius;
		card.z = centerZ + Math.sin(card.angle + baseAngle) * radius;
		cards.push(card);
	}

	context.translate(width / 2, height / 2);

	// document.body.addEventListener("mousemove", function(event) {
	// 	rotationSpeed = (event.clientX - width / 2) * 0.00005;
	// 	ypos = (event.clientY - height / 2) * 2;
	// });

	update();

	function update() {
		baseAngle += rotationSpeed;
		context.clearRect(-width / 2, -height / 2, width, height);
		for(var i = 0; i < numCards; i += 1) {
			var card = cards[i],
				perspective = fl / (fl + card.z);

			context.save();
			context.scale(perspective, perspective);
			context.translate(card.x, card.y);

			context.beginPath();
			context.arc(0, 0, 40, 0, Math.PI * 2, false);
			context.fill();

			context.restore();

			card.x = Math.cos(card.angle + baseAngle) * radius;
			card.z = centerZ + Math.sin(card.angle + baseAngle) * radius;
		}
		requestAnimationFrame(update);
	}

	function zsort(cardA, cardB) {
		return cardB.z - cardA.z;
	}
};

// import paper, { Point, Path } from 'paper';
// import { createCanvas, saveAsSVG, intersects, radiansToDegrees, timer } from 'utils';
// import math, { random } from 'mathjs';
//
// const width = 742;
// const height = 1052;
// const canvas = createCanvas(width, height);
//
// paper.setup(canvas);
// window.paper = paper;
//
// paper.view.translate(width/2, height/2);
// const fl = 200;
// const dots = [];
// const numDots = 200;
// const centerZ = 2000;
// const radius = width / 4;
// let baseAngle = 0;
// const rotationSpeed = 0.01;
//
// for (let i = 0; i < numDots; i++) {
//   const angle = 0.2 * i;
//   const x = Math.cos(angle + baseAngle) * radius;
//   const y = ((height / numDots) * i) - height / 2;
//   const z = centerZ + Math.sin(baseAngle + angle) * radius;
//   const perspective = fl / (fl + z);
//   const point = new Point(x, y);
//   const dot = new Path.Circle({
//     fillColor: 'black',
//     radius: 100,
//     center: point
//   });
//   dot.scale(perspective);
//   dots.push(dot);
// }
//
// // update();
//
// function update () {
//   baseAngle += rotationSpeed;
//   for (let i = 0; i < numDots; i++) {
//     const angle = 0.2 * i;
//     const dot = dots[i];
//     const z = centerZ + Math.sin(baseAngle + angle) * radius;
//     const perspective = fl / (fl + z);
//     dot.position.x = Math.cos(angle + baseAngle) * radius;
//     dot.scale(perspective);
//   }
//   requestAnimationFrame(update);
// }
