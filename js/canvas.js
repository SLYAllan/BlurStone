// canvas.js — Pixelation rendering engine

// Pixel block sizes in display px (level 0 = most pixelated = biggest blocks)
// Values ordered: clearest → most pixelated, then reversed so level 0 = 258px blocks
const PIXEL_BLOCK_SIZES = [8, 16, 32, 64, 128, 175, 258];
const PIXEL_LEVELS = PIXEL_BLOCK_SIZES.slice().reverse(); // [258,175,128,64,32,16,8]
const CANVAS_SIZE = 512; // display size in px
const SOURCE_MAX = 512;  // source image size

let _canvas = null;
let _ctx = null;
let _sourceImage = null;
let _currentLevel = 0;
let _revealAnimTimer = null;
let _corsAvailable = true;

function initCanvas(canvasEl) {
  _canvas = canvasEl;
  _ctx = canvasEl.getContext('2d');
  _canvas.width = CANVAS_SIZE;
  _canvas.height = CANVAS_SIZE;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      _sourceImage = img;
      _corsAvailable = true;
      resolve(img);
    };
    img.onerror = () => {
      const img2 = new Image();
      img2.onload = () => {
        _sourceImage = img2;
        _corsAvailable = false;
        resolve(img2);
      };
      img2.onerror = () => {
        showImageError();
        reject(new Error('Failed to load card art'));
      };
      img2.src = url;
    };
    img.src = url;
  });
}

function showImageError() {
  if (!_ctx) return;
  _ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  _ctx.fillStyle = '#0e0b08';
  _ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  _ctx.fillStyle = '#6a5840';
  _ctx.font = '16px sans-serif';
  _ctx.textAlign = 'center';
  _ctx.fillText('Image indisponible', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 10);
  _ctx.fillText('Image unavailable', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 10);
}

/**
 * Render the image at a given pixelation level (0-6).
 * Higher level = clearer image. Level 6 = full resolution.
 */
function renderLevel(level) {
  if (!_ctx || !_sourceImage) return;
  _currentLevel = level;

  const blockSize = PIXEL_LEVELS[level] || 1;
  // Convert block size (display px) → sample count
  let gridSize = Math.max(1, Math.round(CANVAS_SIZE / blockSize));
  if (gridSize > SOURCE_MAX) gridSize = SOURCE_MAX;

  if (blockSize <= 1 || !_corsAvailable) {
    _canvas.style.imageRendering = 'auto';
    _ctx.imageSmoothingEnabled = true;
    _ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    _ctx.drawImage(_sourceImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    return;
  }

  _canvas.style.imageRendering = 'pixelated';
  _ctx.imageSmoothingEnabled = false;

  // Draw scaled down to gridSize then back up without smoothing
  _ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  _ctx.drawImage(_sourceImage, 0, 0, gridSize, gridSize);

  try {
    const tiny = _ctx.getImageData(0, 0, gridSize, gridSize);
    _ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const offscreen = document.createElement('canvas');
    offscreen.width = gridSize;
    offscreen.height = gridSize;
    const offCtx = offscreen.getContext('2d');
    offCtx.putImageData(tiny, 0, 0);

    _ctx.imageSmoothingEnabled = false;
    _ctx.drawImage(offscreen, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  } catch (e) {
    _corsAvailable = false;
    _canvas.style.imageRendering = 'auto';
    _ctx.imageSmoothingEnabled = true;
    _ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    _ctx.drawImage(_sourceImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }
}

function animateReveal(startLevel, onDone) {
  if (_revealAnimTimer) clearTimeout(_revealAnimTimer);

  const target = PIXEL_LEVELS.length - 1;
  let level = startLevel;

  function step() {
    renderLevel(level);
    if (level < target) {
      level++;
      _revealAnimTimer = setTimeout(step, 100);
    } else {
      // Final full render
      _canvas.style.imageRendering = 'auto';
      _ctx.imageSmoothingEnabled = true;
      _ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      if (_sourceImage) _ctx.drawImage(_sourceImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      _revealAnimTimer = null;
      if (onDone) onDone();
    }
  }

  step();
}

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
