export class Bullet {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 3;
    this.dead = false;
    this.color = '#b6f7ff';
  }

  update(dt, w, h) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -20 || this.x > w + 20 || this.y < -20 || this.y > h + 20) {
      this.dead = true;
    }
  }

  draw(ctx) {
    // Short glowing streak trailing behind the tip.
    const tx = this.x - this.vx * 0.025;
    const ty = this.y - this.vy * 0.025;
    ctx.strokeStyle = this.color;
    ctx.shadowColor = '#4df3ff';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
  }
}
