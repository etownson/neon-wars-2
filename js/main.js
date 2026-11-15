import { Input } from './input.js';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { burst } from './particle.js';
import { drawNeonTriangle } from './ship.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let W = 0;
let H = 0;
let dpr = 1;
let gridCanvas = null;

// --- Grid background: rendered once offscreen, blitted each frame ---
function buildGrid() {
  gridCanvas = document.createElement('canvas');
  gridCanvas.width = Math.floor(W * dpr);
  gridCanvas.height = Math.floor(H * dpr);
  const g = gridCanvas.getContext('2d');
  g.scale(dpr, dpr);
  const cell = 48;
  g.strokeStyle = 'rgba(35, 55, 110, 0.35)';
  g.lineWidth = 1;
  g.beginPath();
  for (let x = cell; x < W; x += cell) {
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, H);
  }
  for (let y = cell; y < H; y += cell) {
    g.moveTo(0, y + 0.5);
    g.lineTo(W, y + 0.5);
  }
  g.stroke();
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  buildGrid();
}

// --- Game state ---
const input = new Input();
let player;
let bullets = [];
let enemies = [];
let particles = [];
let score = 0;
let elapsed = 0;
let spawnTimer = 1.0;
let state = 'playing'; // 'playing' | 'gameover'
let paused = false;

const wave = () => 1 + Math.floor(elapsed / 25);

function reset() {
  player = new Player(W, H);
  bullets = [];
  enemies = [];
  particles = [];
  score = 0;
  elapsed = 0;
  spawnTimer = 1.0;
  state = 'playing';
  paused = false;
}

function spawnEnemy() {
  const m = 40;
  const edge = Math.floor(Math.random() * 4);
  let x;
  let y;
  if (edge === 0) {
    x = Math.random() * W;
    y = -m;
  } else if (edge === 1) {
    x = W + m;
    y = Math.random() * H;
  } else if (edge === 2) {
    x = Math.random() * W;
    y = H + m;
  } else {
    x = -m;
    y = Math.random() * H;
  }
  const speed = Math.min(240, 80 + wave() * 18 + Math.random() * 30);
  enemies.push(new Enemy(x, y, speed));
}

function update(dt) {
  const inp = input.poll(player.x, player.y);

  // Start / Enter / P toggle pause while playing; restart after game over.
  if (state === 'playing' && (inp.actionPressed || inp.pausePressed)) {
    paused = !paused;
    return;
  }
  if (paused) return;

  if (state === 'gameover') {
    if (inp.actionPressed) {
      reset();
      return;
    }
    // Let death particles finish their burst.
    for (const p of particles) p.update(dt);
    particles = particles.filter((p) => !p.dead);
    return;
  }

  elapsed += dt;

  player.update(dt, inp, W, H);

  if (inp.firing && player.fireCooldown <= 0) {
    bullets.push(player.fire());
  }

  // Ramp up spawn rate over time.
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    if (enemies.length < 40) spawnEnemy();
    const interval = Math.max(0.35, 1.1 - elapsed * 0.011);
    spawnTimer = interval * (0.7 + Math.random() * 0.6);
  }

  for (const b of bullets) b.update(dt, W, H);
  for (const e of enemies) e.update(dt, player);
  for (const p of particles) p.update(dt);

  // Bullets vs enemies.
  for (const b of bullets) {
    if (b.dead) continue;
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = b.x - e.x;
      const dy = b.y - e.y;
      const r = b.radius + e.radius;
      if (dx * dx + dy * dy < r * r) {
        b.dead = true;
        e.dead = true;
        score += 25;
        burst(e.x, e.y, e.color, 22, particles);
        break;
      }
    }
  }

  // Enemies vs player (respect invulnerability window).
  if (player.invuln <= 0) {
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const r = player.radius + e.radius;
      if (dx * dx + dy * dy < r * r) {
        e.dead = true;
        burst(e.x, e.y, e.color, 18, particles);
        burst(player.x, player.y, player.color, 30, particles);
        player.hit();
        if (player.lives <= 0) {
          burst(player.x, player.y, player.color, 60, particles);
          state = 'gameover';
        }
        break;
      }
    }
  }

  bullets = bullets.filter((b) => !b.dead);
  enemies = enemies.filter((e) => !e.dead);
  particles = particles.filter((p) => !p.dead);
}

// --- Rendering ---
function drawHUD() {
  ctx.shadowBlur = 0;
  ctx.font = '600 16px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(140, 220, 255, 0.9)';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${String(score).padStart(6, '0')}`, 16, 14);
  ctx.fillStyle = 'rgba(140, 220, 255, 0.7)';
  ctx.textAlign = 'center';
  ctx.fillText(`WAVE ${wave()}`, W / 2, 14);
  // Lives as little ship icons, top right.
  const spacing = 22;
  const startX = W - 16 - (player.lives - 1) * spacing;
  for (let i = 0; i < player.lives; i++) {
    drawNeonTriangle(ctx, startX + i * spacing, 22, -Math.PI / 2, 8, player.color);
  }
  ctx.shadowBlur = 0;
}

function drawOverlay(title, titleColor, lines) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = titleColor;
  ctx.shadowBlur = 24;
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 48px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(title, W / 2, H / 2 - 44);
  ctx.shadowBlur = 0;
  let y = H / 2 + 4;
  for (const [text, color, size] of lines) {
    ctx.fillStyle = color;
    ctx.font = `${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillText(text, W / 2, y);
    y += size + 14;
  }
}

function draw() {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#04060d';
  ctx.fillRect(0, 0, W, H);
  if (gridCanvas) ctx.drawImage(gridCanvas, 0, 0, W, H);

  // Additive pass: everything glowing.
  ctx.globalCompositeOperation = 'lighter';
  for (const p of particles) p.draw(ctx);
  for (const b of bullets) b.draw(ctx);
  for (const e of enemies) e.draw(ctx);
  player.draw(ctx);

  ctx.globalCompositeOperation = 'source-over';
  drawHUD();
  if (paused && state === 'playing') {
    drawOverlay('PAUSED', '#4df3ff', [
      ['Press P or START to resume', 'rgba(140, 190, 230, 0.7)', 15],
    ]);
  }
  if (state === 'gameover') {
    drawOverlay('GAME OVER', '#ff3df0', [
      [`FINAL SCORE  ${String(score).padStart(6, '0')}`, 'rgba(190, 235, 255, 0.95)', 20],
      ['Press ENTER or START to fly again', 'rgba(140, 190, 230, 0.7)', 15],
    ]);
  }
}

// --- Main loop ---
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  dt = Math.min(dt, 1 / 30); // clamp after tab switches
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
resize();
reset();
requestAnimationFrame(frame);

// Debug hook for the console / devtools (used while iterating on the game).
window.neonDebug = {
  get: () => ({
    state,
    paused,
    score,
    wave: wave(),
    lives: player.lives,
    enemies: enemies.length,
    bullets: bullets.length,
    particles: particles.length,
    elapsed,
    playerAngle: player.angle,
  }),
  reset: () => reset(),
  /** Run one frame synchronously (test hook; independent of rAF visibility). */
  step: (dt = 1 / 60) => {
    update(dt);
    draw();
  },
  /** Spawn an enemy at exact coordinates (for collision testing). */
  spawnEnemyAt: (x, y) => {
    enemies.push(new Enemy(x, y, 20));
  },
  /** Spawn a slow enemy just ahead of the ship's aim (collision testing). */
  spawnAhead: (dist = 30) => {
    if (state !== 'playing') return;
    const x = player.x + Math.cos(player.angle) * (dist + 60);
    const y = player.y + Math.sin(player.angle) * (dist + 60);
    enemies.push(new Enemy(x, y, 60));
  },
  hitPlayer: () => {
    if (state !== 'playing') return;
    burst(player.x, player.y, player.color, 30, particles);
    player.hit();
    if (player.lives <= 0) {
      burst(player.x, player.y, player.color, 60, particles);
      state = 'gameover';
    }
  },
};
