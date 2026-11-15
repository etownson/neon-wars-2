import { drawNeonCircle, drawNeonTriangle } from './ship.js';

/**
 * Power-up drop from destroyed enemies.
 * Types:
 *  - bomb   : +1 bomb (screen wipe), limited by the game to 3
 *  - life   : +1 life, limited by the game to 5
 *  - spread : 10s of 3-way spread shot; picking up again resets the timer
 */
const STYLES = {
  bomb: { color: '#ffb03d', radius: 9 },
  life: { color: '#4df3ff', radius: 8 },
  spread: { color: '#b6ff3d', radius: 9 },
};

export const PICKUP_TYPES = Object.keys(STYLES);

export class Pickup {
  constructor(x, y, type) {
    this.type = type;
    this.x = x;
    this.y = y;
    // Gentle random drift.
    const a = Math.random() * Math.PI * 2;
    const sp = 18 + Math.random() * 20;
    this.vx = Math.cos(a) * sp;
    this.vy = Math.sin(a) * sp;
    this.radius = STYLES[type].radius;
    this.color = STYLES[type].color;
    this.life = 15; // seconds on screen before it fades away
    this.t = Math.random() * Math.PI * 2;
    this.dead = false;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }
    this.t += dt * 2.2;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx) {
    const bob = Math.sin(this.t) * 2;
    const y = this.y + bob;
    // Fade out during the last 2 seconds.
    ctx.globalAlpha = Math.min(1, this.life / 2);
    if (this.type === 'bomb') {
      // Fused-bomb: outer shell with a hot core.
      drawNeonCircle(ctx, this.x, y, this.radius, this.color);
      drawNeonCircle(ctx, this.x, y, this.radius * 0.45, this.color);
    } else if (this.type === 'life') {
      // A little ship.
      drawNeonTriangle(ctx, this.x, y, -Math.PI / 2, this.radius, this.color);
    } else {
      // Spread: three shots fanning upward.
      for (const o of [-0.55, 0, 0.55]) {
        drawNeonCircle(
          ctx,
          this.x + Math.sin(o) * this.radius,
          y - Math.cos(o) * this.radius * 0.9,
          2.5,
          this.color,
        );
      }
    }
    ctx.globalAlpha = 1;
  }
}
