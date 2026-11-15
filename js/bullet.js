import { getSprite, blitSprite } from './ship.js';

export class Bullet {
  constructor(x, y, vx, vy, color = '#b6f7ff', radius = 3) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.dead = false;
    this.color = color;
  }

  update(dt, w, h) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -20 || this.x > w + 20 || this.y < -20 || this.y > h + 20) {
      this.dead = true;
    }
  }

  draw(ctx) {
    // Short glowing streak trailing behind the tip. Speed is constant per
    // bullet, so the streak length is too — one cached sprite per color.
    const speed = Math.hypot(this.vx, this.vy) || 1;
    const len = speed * 0.025;
    const s = getSprite(`streak|${Math.round(len)}|${this.color}`, len / 2 + 14, (g) => {
      g.strokeStyle = this.color;
      g.shadowColor = this.color;
      g.shadowBlur = 10;
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(0, -len / 2);
      g.lineTo(0, len / 2);
      g.stroke();
    });
    // Segment midpoint, rotated onto the bullet's travel direction.
    const mx = this.x - this.vx * 0.0125;
    const my = this.y - this.vy * 0.0125;
    blitSprite(ctx, s, mx, my, Math.atan2(this.vy, this.vx) + Math.PI / 2);
  }
}
