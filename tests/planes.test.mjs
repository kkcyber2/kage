import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rng, PLANES, planeOffset, planeScale, planeOpacity,
  ridgeProfile, profileToPolygon, scrollProgress, dominantPlane,
} from '../js/planes.js';

test('rng is deterministic and in range', () => {
  const a = rng(9); const b = rng(9);
  for (let i = 0; i < 40; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
  }
});

test('PLANES is ordered far-to-near with unique ids', () => {
  assert.ok(PLANES.length >= 6);
  const ids = PLANES.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (let i = 1; i < PLANES.length; i++) {
    assert.ok(PLANES[i].depth >= PLANES[i - 1].depth, 'planes must stay ordered by depth');
  }
  assert.ok(ids.includes('wordmark'), 'the wordmark must be one of the planes');
});

test('the wordmark plane sits between ridges so it can be occluded', () => {
  const wm = PLANES.find((p) => p.id === 'wordmark');
  const near = PLANES.find((p) => p.id === 'ridgeNear');
  const mid = PLANES.find((p) => p.id === 'ridgeMid');
  assert.ok(wm.depth > mid.depth, 'wordmark must be in front of the mid ridge');
  assert.ok(wm.depth < near.depth, 'wordmark must be behind the near ridge so it can be masked');
});

test('planeOffset is zero at the top and moves further for deeper planes', () => {
  for (const p of PLANES) assert.equal(planeOffset(p.depth, 0), 0);
  const far = planeOffset(0.2, 1);
  const near = planeOffset(1.0, 1);
  assert.ok(Math.abs(near) > Math.abs(far), 'near planes must travel further');
  assert.ok(near < 0, 'scrolling down pulls planes upward');
});

test('planeOffset is monotonic in progress', () => {
  let prev = 0;
  for (let i = 1; i <= 10; i++) {
    const v = planeOffset(0.8, i / 10);
    assert.ok(v <= prev + 1e-9, 'offset must decrease as progress increases');
    prev = v;
  }
});

test('planeScale only grows near planes and never shrinks any', () => {
  for (const p of PLANES) {
    const at0 = planeScale(p.scale, p.depth, 0);
    const at1 = planeScale(p.scale, p.depth, 1);
    assert.equal(at0, p.scale);
    assert.ok(at1 >= at0, 'scale must not shrink');
  }
  assert.ok(planeScale(1, 1, 1) > planeScale(1, 0.1, 1));
});

test('planeOpacity leaves background planes alone and fades near ones', () => {
  assert.equal(planeOpacity(0.1, 1), 1, 'background planes stay opaque');
  const faded = planeOpacity(1.0, 1);
  assert.ok(faded < 1, 'near planes fade at the end of the scroll');
  assert.ok(faded > 0.4, 'but must not vanish entirely');
  assert.equal(planeOpacity(1.0, 0), 1, 'fully opaque at the start');
});

test('ridgeProfile returns normalised points and takes its seed', () => {
  const a = ridgeProfile(60, { seed: 3 });
  const b = ridgeProfile(60, { seed: 3 });
  const c = ridgeProfile(60, { seed: 4 });
  assert.equal(a.length, 61);
  for (const p of a) {
    assert.ok(p.x >= 0 && p.x <= 1);
    assert.ok(p.y > 0 && p.y < 1, `ridge y out of range: ${p.y}`);
  }
  assert.deepEqual(a, b, 'same seed must give the same ridge');
  assert.notDeepEqual(a, c, 'different seeds must give different ridges');
});

test('ridgeProfile is smooth — no sawtooth jumps between samples', () => {
  const pts = ridgeProfile(400, { seed: 11, frequency: 2.4 });
  for (let i = 1; i < pts.length; i++) {
    const dy = Math.abs(pts[i].y - pts[i - 1].y);
    assert.ok(dy < 0.02, `ridge discontinuity at ${i}: ${dy}`);
  }
});

test('profileToPolygon closes the shape down to the baseline', () => {
  const prof = ridgeProfile(10, { seed: 2 });
  const poly = profileToPolygon(prof, 1000, 500);
  assert.equal(poly.length, prof.length + 2);
  const last = poly[poly.length - 1];
  assert.equal(last.y, 500, 'polygon must close at the bottom edge');
  assert.equal(poly[poly.length - 2].x, 1000);
  assert.equal(last.x, 0);
});

test('scrollProgress clamps at both ends', () => {
  assert.equal(scrollProgress(0, 100, 400), 0);
  assert.equal(scrollProgress(100, 100, 400), 0);
  assert.equal(scrollProgress(300, 100, 400), 0.5);
  assert.equal(scrollProgress(500, 100, 400), 1);
  assert.equal(scrollProgress(99999, 100, 400), 1);
  assert.equal(scrollProgress(50, 0, 0), 0, 'zero length must not divide by zero');
});

test('dominantPlane always returns a real plane', () => {
  for (const p of [0, 0.3, 0.52, 1, 2, -1]) {
    const d = dominantPlane(p);
    assert.ok(PLANES.some((x) => x.id === d.id));
  }
  assert.equal(dominantPlane(1.0).id, 'grass');
});
