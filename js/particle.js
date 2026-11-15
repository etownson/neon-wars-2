import { getSprite, blitSprite } from './ship.js';

export class Particle {
  constructor(x, y, color) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 240;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(a) * s;
    this.vy = Math.sin(a) * s;
    this.life = 0.4 + Math.random() * 0.6;
    this.maxLife = this.life;
    this.size = 1 + Math.random() * 2;
    this.color = color;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const drag = Math.max(0, 1 - 2.5 * dt);
    this.vx *= drag;
    this.vy *= drag;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    const t = this.life / this.maxLife;
    // Pre-rendered glow dot (size bucketed to 1-3px); blitting is far
    // cheaper than a shadowBlur fill per particle.
    const size = Math.max(1, Math.round(this.size));
    const s = getSprite(`dot|${size}|${this.color}`, size / 2 + 12, (g) => {
      g.fillStyle = this.color;
      g.shadowColor = this.color;
      g.shadowBlur = 8;
      g.fillRect(-size / 2, -size / 2, size, size);
    });
    ctx.globalAlpha = t;
    blitSprite(ctx, s, this.x, this.y, 0);
    ctx.globalAlpha = 1;
  }
}

/** Push `count` particles of `color` centered on (x, y) into `arr`. */
export function burst(x, y, color, count, arr) {
  for (let i = 0; i < count; i++) arr.push(new Particle(x, y, color));
}
