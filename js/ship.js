/**
 * Shared neon drawing helpers: glowing stroke primitives.
 * All drawing happens on top of a black background with
 * additive blending enabled by the caller.
 */

export function setNeon(ctx, color, blur = 12, width = 2) {
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.lineWidth = width;
}

/** Arrow-style player ship pointing along `angle`. */
export function drawNeonTriangle(ctx, x, y, angle, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.7, size * 0.62);
  ctx.lineTo(-size * 0.35, 0);
  ctx.lineTo(-size * 0.7, -size * 0.62);
  ctx.closePath();
  setNeon(ctx, color);
  ctx.stroke();
  ctx.restore();
}

/** Spinning square used for enemies. */
export function drawNeonSquare(ctx, x, y, angle, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const h = size / 2;
  ctx.beginPath();
  ctx.rect(-h, -h, size, size);
  setNeon(ctx, color);
  ctx.stroke();
  ctx.restore();
}
