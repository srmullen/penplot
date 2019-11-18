/**
 * 
 * This File Requires CCapture be loaded onto the page
 */

export function renderAnimation(fn, steps) {
  let step = 0;
  function animate() {
    step++;
    fn(step);
    if (step < steps) {
      requestAnimationFrame(animate);
    }
  }
  animate();
}

export function recordAnimation(fn, steps) {
  const capturer = new CCapture({ format: 'webm' });
  let step = 0;
  capturer.start();
  function animate() {
    step++;
    fn(step);
    capturer.capture(canvas);
    if (step < steps) {
      requestAnimationFrame(animate);
    } else {
      capturer.stop();
      capturer.save();
    }
  }
  animate();
}