import { drawNeonSquare, drawNeonPolygon, drawNeonCircle } from './ship.js';
import { Bullet } from './bullet.js';

const COLORS = ['#ff3df0', '#ff5c57', '#ffb03d'];
const BULLET_COLOR = '#ffd24a';
const BULLET_RADIUS = 3.5;

/**
 * Shared enemy basics: position, size, hp, score, spin, firing cooldown.
 * Subclasses implement their own `update` (and optionally `maybeFire`).
 */
class BaseEnemy {
  constructor(x, y, radius, color, hp = 1, score = 25) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.hp = hp;
    this.score = score;
    this.vx = 0;
    this.vy = 0;
    this.dead = false;
    this.spinAngle = Math.random() * Math.PI * 2;
    this.spin = (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 2);
    this.fireCooldown = 1 + Math.random() * 1.5;
  }

  update(dt) {
    this.spinAngle += this.spin * dt;
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
  }

  /** Home toward the target, capped at `this.speed`. */
  home(dt, target) {
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
  }

  /** Return a new enemy bullet when it's time to fire, else null. */
  maybeFire() {
    return null;
  }

  /** Enemies spawned at this position when it dies. */
  children() {
    return [];
  }

  /** A straight shot from this enemy toward (x, y). */
  fireAt(x, y, speed) {
    const dx = x - this.x;
    const dy = y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    return new Bullet(this.x, this.y, (dx / d) * speed, (dy / d) * speed, BULLET_COLOR, BULLET_RADIUS);
  }

  draw(ctx) {
    drawNeonSquare(ctx, this.x, this.y, this.spinAngle, this.radius * 2, this.color);
  }
}

/** Simple chaser: homes toward the target while spinning. Drawn as a triangle. */
export class Enemy extends BaseEnemy {
  constructor(x, y, speed) {
    super(x, y, 11, COLORS[Math.floor(Math.random() * COLORS.length)], 1, 25);
    this.speed = speed;
  }

  update(dt, target) {
    super.update(dt);
    this.home(dt, target);
  }

  draw(ctx) {
    drawNeonPolygon(ctx, this.x, this.y, this.spinAngle, this.radius * 1.1, 3, this.color);
  }
}

/** Weaves along a straight line with a sine wobble; fires along its path. */
export class Drifter extends BaseEnemy {
  constructor(x, y, w, h) {
    super(x, y, 13, '#5cff8a', 1, 30);
    // Drift roughly toward the arena center with a spread of angles.
    const toCenter = Math.atan2(h / 2 - y, w / 2 - x);
    const a = toCenter + (Math.random() - 0.5) * 1.2;
    const speed = 90 + Math.random() * 50;
    this.vx = Math.cos(a) * speed;
    this.vy = Math.sin(a) * speed;
    this.t = Math.random() * Math.PI * 2;
    this.wobbleFreq = 2 + Math.random() * 2;
    this.wobbleAmp = 40 + Math.random() * 50;
    this.fireEvery = 2 + Math.random() * 1.5;
  }

  update(dt, target, w, h) {
    super.update(dt);
    this.t += dt;
    const sp = Math.hypot(this.vx, this.vy) || 1;
    const px = -this.vy / sp;
    const py = this.vx / sp;
    const wob = Math.sin(this.t * this.wobbleFreq) * this.wobbleAmp;
    this.x += (this.vx + px * wob) * dt;
    this.y += (this.vy + py * wob) * dt;
    // Cull once fully outside the arena.
    const m = 60;
    if (this.x < -m || this.x > w + m || this.y < -m || this.y > h + m) this.dead = true;
  }

  maybeFire() {
    if (this.fireCooldown > 0) return null;
    this.fireCooldown = this.fireEvery;
    const sp = Math.hypot(this.vx, this.vy) || 1;
    return new Bullet(this.x, this.y, (this.vx / sp) * 230, (this.vy / sp) * 230, BULLET_COLOR, BULLET_RADIUS);
  }

  draw(ctx) {
    // Diamond silhouette, tumbling as it drifts.
    drawNeonSquare(ctx, this.x, this.y, this.spinAngle + Math.PI / 4, this.radius * 2, this.color);
  }
}

/** Spirals in around the player: constant tangential speed while the radius
 *  decays smoothly toward a minimum, then keeps circling. One continuous
 *  motion — no phase switch, no sudden speed change. Fires aimed shots. */
export class Spinner extends BaseEnemy {
  constructor(x, y, target, speed = 140) {
    super(x, y, 12, '#b06bff', 1, 40);
    const dx = x - target.x;
    const dy = y - target.y;
    this.orbitAngle = Math.atan2(dy, dx);
    // Seed the radius with the true spawn distance so the spiral starts
    // exactly where the spinner spawned — it never teleports.
    this.orbitRadius = Math.max(90, Math.hypot(dx, dy));
    this.orbitDir = Math.random() < 0.5 ? -1 : 1;
    // Linear speed along the circle stays constant as the radius shrinks.
    this.tangential = speed * (0.7 + Math.random() * 0.3);
    // Exponential close-in: brisk while far, gentle once it's hugging you.
    this.decay = 0.15 + Math.random() * 0.1;
    this.spin = 6 + Math.random() * 4;
    this.fireEvery = 1.6 + Math.random() * 1.2;
  }

  update(dt, target) {
    super.update(dt);
    this.orbitRadius = Math.max(90, this.orbitRadius * (1 - this.decay * dt));
    this.orbitAngle += this.orbitDir * (this.tangential / this.orbitRadius) * dt;
    this.x = target.x + Math.cos(this.orbitAngle) * this.orbitRadius;
    this.y = target.y + Math.sin(this.orbitAngle) * this.orbitRadius;
  }

  maybeFire(target) {
    if (this.fireCooldown > 0) return null;
    this.fireCooldown = this.fireEvery;
    return this.fireAt(target.x, target.y, 260);
  }

  draw(ctx) {
    // Ring with a slowly rotating core — reads as a different shape at a glance.
    drawNeonCircle(ctx, this.x, this.y, this.radius * 1.15, this.color);
    drawNeonCircle(ctx, this.x, this.y, this.radius * 0.45, this.color);
  }
}

/** Big slow tank that splits into two fast minis when destroyed. */
export class Splitter extends BaseEnemy {
  constructor(x, y, speed) {
    super(x, y, 20, '#ff7a2f', 3, 60);
    this.speed = speed * 0.6;
    this.spin = 0.8;
  }

  update(dt, target) {
    super.update(dt);
    this.home(dt, target);
  }

  children() {
    return [new MiniChaser(this.x, this.y), new MiniChaser(this.x, this.y)];
  }

  draw(ctx) {
    // Hexagon armor shell with a counter-rotating hexagon core.
    drawNeonPolygon(ctx, this.x, this.y, this.spinAngle, this.radius * 1.1, 6, this.color);
    drawNeonPolygon(ctx, this.x, this.y, -this.spinAngle, this.radius * 0.55, 6, this.color);
  }
}

/** Small, fast chaser spawned by Splitter deaths. */
export class MiniChaser extends BaseEnemy {
  constructor(x, y, speed = 170 + Math.random() * 40) {
    super(x, y, 8, '#ff3df0', 1, 15);
    this.speed = speed;
    this.spin = 4 + Math.random() * 3;
  }

  update(dt, target) {
    super.update(dt);
    this.home(dt, target);
  }

  draw(ctx) {
    // Small inverted triangle — a fast splinter off the splitter's hexagon.
    drawNeonPolygon(ctx, this.x, this.y, this.spinAngle + Math.PI, this.radius * 1.1, 3, this.color);
  }
}
