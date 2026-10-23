// Layered parallax scene. Each plane is drawn to its own canvas so depth comes
// from independent translation and scale — no sprites, no images.
// Pure geometry functions live here and are testable without a DOM.

/** Deterministic PRNG so a rebuild of the same scene looks identical. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PLANES = [
  { id: 'sky',      depth: 0.00, scale: 1.00, blur: 0 },
  { id: 'ridgeFar', depth: 0.14, scale: 1.06, blur: 2.2 },
  { id: 'ridgeMid', depth: 0.30, scale: 1.12, blur: 1.0 },
  { id: 'wordmark', depth: 0.52, scale: 1.00, blur: 0 },
  { id: 'ridgeNear',depth: 0.76, scale: 1.22, blur: 0.4 },
  { id: 'grass',    depth: 1.00, scale: 1.34, blur: 0 },
];

/**
 * Where a plane sits for a given scroll progress.
 * `depth` 0 is pinned to the far background, 1 is closest to the viewer,
 * so a deeper plane travels further per unit of scroll.
 */
export function planeOffset(depth, progress, travel = 640) {
  // `+ 0` collapses -0 to 0 so callers comparing against 0 behave predictably.
  return -progress * travel * depth + 0;
}

/** Scale grows slightly with scroll on near planes, which sells forward motion. */
export function planeScale(baseScale, depth, progress) {
  return baseScale * (1 + progress * 0.10 * depth);
}

/** Opacity fade for planes that should dissolve as we push through them. */
export function planeOpacity(depth, progress, fadeStart = 0.62, fadeEnd = 1.0) {
  if (depth < 0.5) return 1;
  const t = Math.min(1, Math.max(0, (progress - fadeStart) / (fadeEnd - fadeStart)));
  return 1 - t * 0.55;
}

/**
 * A ridge silhouette: two out-of-phase sine bands plus a slow drift, sampled
 * into a polygon. Returns points in 0..1 normalised space so the canvas can
 * scale them to any viewport.
 */
export function ridgeProfile(samples, opts = {}) {
  const {
    seed = 1,
    baseline = 0.55,
    amplitude = 0.14,
    roughness = 0.35,
    frequency = 2.4,
  } = opts;

  const rand = rng(seed);
  const phases = [rand() * 6.28, rand() * 6.28, rand() * 6.28];
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = t;
    const a = Math.sin(t * Math.PI * frequency + phases[0]) * amplitude;
    const b = Math.sin(t * Math.PI * frequency * 2.7 + phases[1]) * amplitude * roughness;
    const c = Math.sin(t * Math.PI * frequency * 6.1 + phases[2]) * amplitude * roughness * 0.45;
    const y = baseline - (a + b + c);
    pts.push({ x, y });
  }
  return pts;
}

/** Convert a normalised profile to a closed polygon ready for canvas. */
export function profileToPolygon(profile, width, height) {
  const poly = profile.map((p) => ({ x: p.x * width, y: p.y * height }));
  poly.push({ x: width, y: height });
  poly.push({ x: 0, y: height });
  return poly;
}

/** Clamp a scroll position into 0..1 progress for a scrollable range. */
export function scrollProgress(scrollY, start, length) {
  if (length <= 0) return 0;
  const p = (scrollY - start) / length;
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

/** Which plane should currently occlude the wordmark, for the caption copy. */
export function dominantPlane(progress) {
  let best = PLANES[0];
  let bestD = Infinity;
  for (const p of PLANES) {
    const d = Math.abs(p.depth - progress);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}
