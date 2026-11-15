/**
 * Shared neon drawing helpers: glowing stroke primitives.
 *
 * Performance note: shadowBlur is the most expensive Canvas 2D operation
 * (a blur pass per draw call), so each shape is rendered exactly once —
 * with its glow baked in — into a small offscreen canvas. Per-frame
 * drawing is a cheap, GPU-accelerated drawImage of that sprite.
 * All drawing happens on top of a black background with
 * additive blending enabled by the caller.
 */

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const cache = new Map();

/**
 * Get (or lazily build) the sprite for `key`.
 * `half` is the sprite's half-size in CSS px (canvas is `half * 2` square,
 * shape centered on the origin); it should exceed the shape's extent by
 * at least the blur radius so the glow isn't clipped.
 * `build(g)` draws the shape centered at (0, 0) on a fresh 2D context.
 */
export function getSprite(key, half, build) {
  let s = cache.get(key);
  if (!s) {
    const h = Math.ceil(half);
    const px = Math.ceil(h * 2 * DPR);
    const c = document.createElement('canvas');
    c.width = px;
    c.height = px;
    const g = c.getContext('2d');
    g.scale(DPR, DPR);
    g.translate(h, h);
    build(g);
    s = { canvas: c, half: h, w: h * 2 };
    cache.set(key, s);
  }
  return s;
}

/** Blit a square sprite centered on (x, y), optionally rotated by `angle`. */
export function blitSprite(ctx, s, x, y, angle) {
  if (angle === 0) {
    ctx.drawImage(s.canvas, x - s.half, y - s.half, s.w, s.w);
  } else {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(s.canvas, -s.half, -s.half, s.w, s.w);
    ctx.restore();
  }
}

function stroke(g, color, blur, width, pathFn) {
  g.strokeStyle = color;
  g.shadowColor = color;
  g.shadowBlur = blur;
  g.lineWidth = width;
  pathFn();
  g.stroke();
}

/** Stroke setup (kept for any caller that draws directly on the main ctx). */
export function setNeon(ctx, color, blur = 12, width = 2) {
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.lineWidth = width;
}

/** Arrow-style player ship pointing along `angle`. */
export function drawNeonTriangle(ctx, x, y, angle, size, color) {
  const s = getSprite(`tri|${color}|${size}`, size + 18, (g) =>
    stroke(g, color, 12, 2, () => {
      g.beginPath();
      g.moveTo(size, 0);
      g.lineTo(-size * 0.7, size * 0.62);
      g.lineTo(-size * 0.35, 0);
      g.lineTo(-size * 0.7, -size * 0.62);
      g.closePath();
    }),
  );
  blitSprite(ctx, s, x, y, angle);
}

/**
 * Regular n-sided polygon centered on (x, y), `radius` to each vertex.
 * sides=3 for a triangle, sides=6 for a hexagon, etc.
 */
export function drawNeonPolygon(ctx, x, y, angle, radius, sides, color) {
  const s = getSprite(`poly${sides}|${color}|${radius}`, radius + 18, (g) =>
    stroke(g, color, 12, 2, () => {
      g.beginPath();
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        if (i === 0) g.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
        else g.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
      }
      g.closePath();
    }),
  );
  blitSprite(ctx, s, x, y, angle);
}

/** Glowing circle. */
export function drawNeonCircle(ctx, x, y, radius, color) {
  const s = getSprite(`circ|${color}|${radius}`, radius + 18, (g) =>
    stroke(g, color, 12, 2, () => {
      g.beginPath();
      g.arc(0, 0, radius, 0, Math.PI * 2);
    }),
  );
  blitSprite(ctx, s, x, y, 0);
}

/** Spinning square used for enemies. */
export function drawNeonSquare(ctx, x, y, angle, size, color) {
  const h = size / 2;
  const s = getSprite(`sq|${color}|${size}`, h + 18, (g) =>
    stroke(g, color, 12, 2, () => {
      g.beginPath();
      g.rect(-h, -h, size, size);
    }),
  );
  blitSprite(ctx, s, x, y, angle);
}
