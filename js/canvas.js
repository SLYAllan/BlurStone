// canvas.js — Pixelation rendering engine

// Pixel grid sizes for each level (0 = most pixelated, 6 = full res)
const PIXEL_LEVELS = [5, 8, 14, 24, 40, 72, 256];
const CANVAS_SIZE = 280; // display size in px

let _canvas = null;
let _ctx = null;
let _sourceImage = null;
let _currentLevel = 0;
let _revealAnimTimer = null;

function initCanvas(canvasEl) {
  _canvas = canvasEl;
  _ctx = canvasEl.getContext('2d');
  _canvas.width = CANVAS_SIZE;
  _canvas.height = CANVAS_SIZE;
}

/**
 * Load an image from URL into the canvas engine.
 * Returns a Promise that resolves when the image is loaded and drawn.
 */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      _sourceImage = img;
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Render the image at a given pixelation level (0-6).
 * Level 6 = full resolution.
 */
function renderLevel(level) {
  if (!_ctx || !_sourceImage) return;
  _currentLevel = level;

  const gridSize = PIXEL_LEVELS[level];

  if (gridSize >= 256) {
    // Full resolution — draw directly
    _canvas.style.imageRendering = 'auto';
    _ctx.imageSmoothingEnabled = true;
    _ctx.drawImage(_sourceImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    return;
  }

  // Draw tiny version then scale up without smoothing
  _canvas.style.imageRendering = 'pixelated';
  _ctx.imageSmoothingEnabled = false;

  // Step 1: draw scaled down
  _ctx.drawImage(_sourceImage, 0, 0, gridSize, gridSize);

  // Step 2: read the tiny pixels and draw them back at full size
  const tiny = _ctx.getImageData(0, 0, gridSize, gridSize);

  // Clear canvas
  _ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Create offscreen canvas for the tiny image
  const offscreen = document.createElement('canvas');
  offscreen.width = gridSize;
  offscreen.height = gridSize;
  const offCtx = offscreen.getContext('2d');
  offCtx.putImageData(tiny, 0, 0);

  // Scale back up without smoothing
  _ctx.imageSmoothingEnabled = false;
  _ctx.drawImage(offscreen, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

/**
 * Animate through levels from `startLevel` to 6, calling onDone when complete.
 * @param {number} startLevel
 * @param {function} onDone
 */
function animateReveal(startLevel, onDone) {
  if (_revealAnimTimer) clearTimeout(_revealAnimTimer);

  let level = startLevel;

  function step() {
    renderLevel(level);
    if (level < 6) {
      level++;
      _revealAnimTimer = setTimeout(step, 120);
    } else {
      _revealAnimTimer = null;
      if (onDone) onDone();
    }
  }

  step();
}

/**
 * Immediately show full resolution with a smooth transition.
 */
function revealFull(onDone) {
  animateReveal(_currentLevel, onDone);
}

function getCurrentLevel() {
  return _currentLevel;
}

function clearCanvas() {
  if (_revealAnimTimer) {
    clearTimeout(_revealAnimTimer);
    _revealAnimTimer = null;
  }
  _sourceImage = null;
  _currentLevel = 0;
  if (_ctx) {
    _ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }
}
