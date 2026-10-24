# Kage

A scroll-linked parallax scene where the wordmark sits **inside** the landscape instead
of on top of it. Six independent depth planes, each drawn at runtime, with the
typography threaded between them so the near ridge and the grass genuinely take
letters away from you as you scroll.

## What it is

Most parallax sites move layers at different speeds. That is motion, not depth.
Depth is when something in front removes something behind from view.

`KAGE` is composited between the mid ridge and the near ridge, so as the scroll
progresses the foreground climbs across the letters and the grass closes over their
lower third. Nothing is faked with an overlay — it is a real stacking order.

## Running it

```bash
npm start          # http://localhost:4400
```

No build step and no runtime dependencies. Any static server works:

```bash
python3 -m http.server 4400
```

## Tests

```bash
npm test           # node --test
```

12 tests over the layer maths, run without a browser.

What they pin:

- plane ordering — the wordmark must sit between the mid and near ridges, otherwise
  the whole occlusion idea is decorative rather than real
- offset monotonicity and that nearer planes travel further than distant ones
- scale only ever grows, and opacity only fades the planes nearest the camera
- ridge profiles are smooth (no sawtooth), deterministic per seed, and differ per seed
- `scrollProgress` clamps at both ends and cannot divide by zero
- `planeOffset` never returns `-0` (it broke strict equality downstream)

## How it works

```
js/planes.js   layer maths — depths, offsets, scales, ridge profiles (pure, testable)
js/scene.js    painting and the scroll driver
```

**Six canvases, one stage.** The sky, three ridges and the grass each get their own
canvas; the wordmark is a DOM layer between them. Because each plane owns its own
surface, depth costs nothing more than a transform — no per-frame re-rendering of
the entire scene.

**Every ridge is a sine sum.** Three out-of-phase bands at different frequencies and
roughness, sampled into a polygon and filled. Change the seed and you get a different
mountain. There are no image assets and no SVG files in this repo.

**One animation frame.** All six planes read from a single scroll value inside one
`requestAnimationFrame` pass, and the pass is skipped entirely when the scroll
position has not changed. An idle page costs nothing.

## Controls

Just scroll. There is no navigation by design — the scroll *is* the interface.

## Accessibility

- The narrative is plain HTML in reading order, so it is fully readable with JS off.
- `prefers-reduced-motion` disables the plane transitions.
- The decorative stage is `aria-hidden`; it carries no information that the copy
  does not state directly.
- Text meets contrast on the darkest plane; the copy is never placed over the grass.

## Honest limits

- **The scroll is the only input.** There is no keyboard-operable equivalent for the
  visual effect, because the effect is decorative — the content stands without it.
- **Grass is drawn, not simulated.** Blades are quadratic curves at fixed density per
  breakpoint; they do not sway or respond to pointer movement.
- **Mobile drops quality deliberately.** Far planes render at 0.6 resolution and the
  blur passes are skipped under 780px, which keeps the frame budget but softens the
  far ridge noticeably.
- **One scene.** There are no routes. This is a single scroll narrative, not a site.

## Licence

MIT — see [LICENSE](LICENSE).

Built by **Konain Sultan Khan (KK)** · <kkdev9715@gmail.com>
[github.com/kkcyber2](https://github.com/kkcyber2) · LinkedIn: _add profile URL_
