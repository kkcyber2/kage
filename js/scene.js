// Draws the six depth planes and drives them from one scroll value.
import {
  PLANES, planeOffset, planeScale, planeOpacity,
  ridgeProfile, profileToPolygon, scrollProgress,
} from './planes.js';

const stage = document.getElementById('stage');
const canvases = {};
let dpr = 1;
let VW = 0;
let VH = 0;
let isMobile = false;

/* ------------------------------------------------------------------ palette */
const C = {
  skyTop: '#0a1210',
  skyMid: '#16241f',
  skyLow: '#2b3a2c',
  far: '#1d2a24',
  mid: '#152019',
  near: '#0d1512',
  grass: '#060b09',
  ink: '#e8efe6',
};

/* ---------------------------------------------------------------- canvases */
function setupCanvases() {
  isMobile = window.matchMedia('(max-width: 780px)').matches;
  dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
  VW = window.innerWidth;
  VH = window.innerHeight;
  for (const id of ['p-sky', 'p-ridgeFar', 'p-ridgeMid', 'p-ridgeNear', 'p-grass']) {
    const cv = document.getElementById(id);
    // far planes get less resolution — they are blurred anyway
    const quality = id === 'p-ridgeFar' ? 0.6 : id === 'p-ridgeMid' ? 0.8 : 1;
    cv.width = Math.floor(VW * dpr * quality);
    cv.height = Math.floor(VH * dpr * quality);
    cv.style.width = '100%';
    cv.style.height = '100%';
    canvases[id] = { el: cv, ctx: cv.getContext('2d'), quality };
  }
}

/* ------------------------------------------------------------------- paint */
function paintSky() {
  const { el, ctx } = canvases['p-sky'];
  const w = el.width; const h = el.height;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, C.skyTop);
  g.addColorStop(0.55, C.skyMid);
  g.addColorStop(1, C.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // a low, cold sun smeared behind the far ridge
  const sunY = h * 0.52;
  const sunX = w * 0.68;
  const rg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.42);
  rg.addColorStop(0, 'rgba(226,236,196,0.30)');
  rg.addColorStop(0.35, 'rgba(190,208,160,0.10)');
  rg.addColorStop(1, 'rgba(190,208,160,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);
}

function paintRidge(id, opts) {
  const { el, ctx } = canvases[id];
  const w = el.width; const h = el.height;
  ctx.clearRect(0, 0, w, h);
  const prof = ridgeProfile(220, opts);
  const poly = profileToPolygon(prof, w, h);

  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fillStyle = opts.fill;
  ctx.fill();
}

function paintGrass() {
  const { el, ctx } = canvases['p-grass'];
  const w = el.width; const h = el.height;
  ctx.clearRect(0, 0, w, h);

  // The grass is the plane that actually covers the letters: tall blades rising
  // from the bottom edge, denser in the middle third.
  ctx.fillStyle = C.grass;
  const N = isMobile ? 90 : 220;
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < N; i++) {
    const x = (i / N) * w + rand() * (w / N);
    const centreBias = 1 - Math.abs(x / w - 0.5) * 1.1;
    const height = h * (0.16 + rand() * 0.24) * (0.55 + centreBias * 0.75);
    const lean = (rand() - 0.5) * w * 0.018;
    const width = Math.max(1.2, (w / N) * (0.22 + rand() * 0.35));

    ctx.beginPath();
    ctx.moveTo(x - width / 2, h);
    ctx.quadraticCurveTo(x + lean * 0.5, h - height * 0.55, x + lean, h - height);
    ctx.quadraticCurveTo(x + lean * 0.5 + width * 0.6, h - height * 0.5, x + width / 2, h);
    ctx.closePath();
    ctx.fill();
  }

  // solid base so nothing shows through at the very bottom
  ctx.fillStyle = C.grass;
  ctx.fillRect(0, h - h * 0.045, w, h * 0.045);
}

function paintAll() {
  paintSky();
  paintRidge('p-ridgeFar', { seed: 7, baseline: 0.50, amplitude: 0.16, roughness: 0.30, frequency: 2.1, fill: C.far });
  paintRidge('p-ridgeMid', { seed: 19, baseline: 0.62, amplitude: 0.13, roughness: 0.45, frequency: 3.0, fill: C.mid });
  paintRidge('p-ridgeNear', { seed: 31, baseline: 0.78, amplitude: 0.11, roughness: 0.55, frequency: 2.4, fill: C.near });
  paintGrass();
}

/* ------------------------------------------------------------------- drive */
const wordmark = document.getElementById('p-wordmark');
const progressBar = document.getElementById('bar');
const cue = document.getElementById('cue');

const SCENE_SCROLL = () => Math.max(1, window.innerHeight * 2.4);

let lastY = -1;
let ticking = false;

function render() {
  const y = window.scrollY;
  if (y === lastY) { ticking = false; return; }
  lastY = y;

  const progress = scrollProgress(y, 0, SCENE_SCROLL());

  // stage is pinned for the first viewport, then released
  stage.style.transform = y < window.innerHeight * 1.4 ? 'translate3d(0,0,0)' : 'translate3d(0,0,0)';

  for (const p of PLANES) {
    if (p.id === 'sky') continue;
    const off = planeOffset(p.depth, progress);
    const sc = planeScale(p.scale, p.depth, progress);
    const op = planeOpacity(p.depth, progress);
    const el = p.id === 'wordmark' ? wordmark : canvases['p-' + p.id]?.el;
    if (!el) continue;
    el.style.transform = `translate3d(0, ${off}px, 0) scale(${sc})`;
    el.style.opacity = String(op);
  }

  progressBar.style.transform = `scaleX(${progress})`;
  cue.style.opacity = progress > 0.05 ? '0' : '1';
  ticking = false;
}

function onScroll() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(render);
  }
}

/* -------------------------------------------------------------------- boot */
function boot() {
  setupCanvases();
  paintAll();
  render();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    setupCanvases();
    paintAll();
    lastY = -1;
    render();
  });

  document.documentElement.classList.add('ready');
}

boot();
