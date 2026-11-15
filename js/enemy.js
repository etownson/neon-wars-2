import { drawNeonSquare } from './ship.js';

const COLORS = ['#ff3df0', '#ff5c57', '#ffb03d'];

/** Simple chaser: homes toward the target while spinning. */
export class Enemy {
  constructor(x, y, speed) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.speed = speed;
    this.radius = 11;
    this.spinAngle = Math.random() * Math.PI * 2;
    this.spin = (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 2);
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.dead = false;
  }

  update(dt, target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.vx += (dx / d) * this.speed * 4 * dt;
    this.vy += (dy / d) * this.speed * 4 * dt;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > this.speed) {
      this.vx = (this.vx / sp) * this.speed;
      this.vy = (this.vy / sp) * this.speed;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.spinAngle += this.spin * dt;
  }

  draw(ctx) {
    drawNeonSquare(ctx, this.x, this.y, this.spinAngle, this.radius * 2, this.color);
  }
}
