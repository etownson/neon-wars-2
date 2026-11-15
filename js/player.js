import { Bullet } from './bullet.js';
import { drawNeonTriangle } from './ship.js';

const MAX_SPEED = 330;
const ACCEL = 2800;
const DRAG = 8;
const BULLET_SPEED = 640;
const FIRE_COOLDOWN = 0.11;

export class Player {
  constructor(w, h) {
    this.x = w / 2;
    this.y = h / 2;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2;
    this.radius = 10;
    this.lives = 3;
    this.invuln = 0;
    this.fireCooldown = 0;
    this.color = '#4df3ff';
  }

  update(dt, input, w, h) {
    if (input.moveX !== 0 || input.moveY !== 0) {
      this.vx += input.moveX * ACCEL * dt;
      this.vy += input.moveY * ACCEL * dt;
    }

    const drag = Math.max(0, 1 - DRAG * dt);
    this.vx *= drag;
    this.vy *= drag;

    const sp = Math.hypot(this.vx, this.vy);
    if (sp > MAX_SPEED) {
      this.vx = (this.vx / sp) * MAX_SPEED;
      this.vy = (this.vy / sp) * MAX_SPEED;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Keep inside the arena.
    if (this.x < this.radius) {
      this.x = this.radius;
      this.vx = 0;
    }
    if (this.x > w - this.radius) {
      this.x = w - this.radius;
      this.vx = 0;
    }
    if (this.y < this.radius) {
      this.y = this.radius;
      this.vy = 0;
    }
    if (this.y > h - this.radius) {
      this.y = h - this.radius;
      this.vy = 0;
    }

    if (input.aiming) this.angle = input.aimAngle;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
  }

  /**
   * Spawn a bullet from the muzzle; caller owns the returned bullet.
   * `offset` tilts the shot off the ship's aim (spread-shot).
   */
  fire(offset = 0) {
    const a = this.angle + offset;
    const mx = this.x + Math.cos(a) * (this.radius + 6);
    const my = this.y + Math.sin(a) * (this.radius + 6);
    this.fireCooldown = FIRE_COOLDOWN;
    return new Bullet(mx, my, Math.cos(a) * BULLET_SPEED, Math.sin(a) * BULLET_SPEED);
  }

  hit() {
    this.lives--;
    this.invuln = 2.0;
  }

  draw(ctx) {
    // Blink while invulnerable after a hit.
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) return;
    drawNeonTriangle(ctx, this.x, this.y, this.angle, this.radius + 4, this.color);
  }
}
