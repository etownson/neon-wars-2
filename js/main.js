import { Input } from './input.js';
import { Player } from './player.js';
import { Enemy, Drifter, Spinner, Splitter } from './enemy.js';
import { burst } from './particle.js';
import { Pickup } from './pickup.js';
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
let enemyBullets = [];
let enemies = [];
let particles = [];
let score = 0;
let elapsed = 0;
let spawnTimer = 1.0;
let state = 'playing'; // 'playing' | 'gameover'
let paused = false;

// --- Pick-ups ---
let pickups = [];
let bombs = 0;
let spreadTimer = 0; // seconds of spread shot remaining
let flash = 0; // bomb screen flash, decays to 0

const MAX_BOMBS = 3;
const MAX_LIVES = 5;
const SPREAD_DURATION = 10;
const SPREAD_ANGLE = 0.18; // radians off-center per side
const MAX_PICKUPS = 3; // on screen at once
const DROP_CHANCE = 0.07;

const wave = () => 1 + Math.floor(elapsed / 25);

// --- High score (localStorage) ---
const HIGHSCORE_KEY = 'neon-wars-highscore';
let highScore = loadHighScore();
let newBest = false;

function loadHighScore() {
  try {
    const v = parseInt(localStorage.getItem(HIGHSCORE_KEY), 10);
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0; // storage unavailable (private mode) — session-only high score
  }
}

function saveHighScore() {
  try {
    localStorage.setItem(HIGHSCORE_KEY, String(highScore));
  } catch {
    // ignore — high score stays in-memory only
  }
}

function gameOver() {
  state = 'gameover';
  // Authoritative check: the last score gain may land in the same frame as
  // the final hit, after the live update() check already ran.
  if (score > highScore) {
    highScore = score;
    newBest = true;
  }
  saveHighScore();
}

function reset() {
  player = new Player(W, H);
  bullets = [];
  enemyBullets = [];
  enemies = [];
  particles = [];
  pickups = [];
  bombs = 0;
  spreadTimer = 0;
  flash = 0;
  score = 0;
  elapsed = 0;
  spawnTimer = 1.0;
  state = 'playing';
  paused = false;
  newBest = false;
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
  const w = wave();
  const roll = Math.random();
  // New types join the pool as waves progress.
  if (w >= 3 && roll < 0.15) {
    enemies.push(new Splitter(x, y, speed));
  } else if (w >= 2 && roll < 0.4) {
    enemies.push(new Spinner(x, y, player, speed));
  } else if (roll < (w >= 2 ? 0.75 : 0.55)) {
    enemies.push(new Drifter(x, y, W, H));
  } else {
    enemies.push(new Enemy(x, y, speed));
  }
}

/** Bomb effect: wipe every enemy and enemy bullet on screen. */
function detonate() {
  for (const e of enemies) {
    if (e.dead) continue;
    e.dead = true;
    score += e.score;
    burst(e.x, e.y, e.color, 22, particles);
  }
  for (const b of enemyBullets) {
    if (b.dead) continue;
    b.dead = true;
    burst(b.x, b.y, b.color, 6, particles);
  }
  flash = 1;
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

  // Track best live so the HUD updates as the player passes it.
  if (score > highScore) {
    highScore = score;
    newBest = true;
  }

  // Bomb: wipe every enemy and enemy bullet on screen.
  if (inp.bombPressed && bombs > 0) {
    bombs--;
    detonate();
  }

  if (spreadTimer > 0) spreadTimer = Math.max(0, spreadTimer - dt);
  if (flash > 0) flash = Math.max(0, flash - dt * 2.5);

  player.update(dt, inp, W, H);

  if (inp.firing && player.fireCooldown <= 0) {
    if (spreadTimer > 0) {
      bullets.push(player.fire(-SPREAD_ANGLE), player.fire(0), player.fire(SPREAD_ANGLE));
    } else {
      bullets.push(player.fire());
    }
  }

  // Ramp up spawn rate over time.
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    if (enemies.length < 40) spawnEnemy();
    const interval = Math.max(0.35, 1.1 - elapsed * 0.011);
    spawnTimer = interval * (0.7 + Math.random() * 0.6);
  }

  for (const b of bullets) b.update(dt, W, H);
  for (const b of enemyBullets) b.update(dt, W, H);
  const fired = [];
  for (const e of enemies) {
    e.update(dt, player, W, H);
    const b = e.maybeFire(player);
    if (b) fired.push(b);
  }
  if (fired.length) enemyBullets.push(...fired);
  for (const p of particles) p.update(dt);
  for (const p of pickups) p.update(dt);

  // Bullets vs enemies (some enemies take multiple hits and split on death).
  const spawned = [];
  for (const b of bullets) {
    if (b.dead) continue;
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = b.x - e.x;
      const dy = b.y - e.y;
      const r = b.radius + e.radius;
      if (dx * dx + dy * dy < r * r) {
        b.dead = true;
        e.hp--;
        if (e.hp <= 0) {
          e.dead = true;
          score += e.score;
          burst(e.x, e.y, e.color, 22, particles);
          if (pickups.length < MAX_PICKUPS && Math.random() < DROP_CHANCE) {
            const roll = Math.random();
            const type = roll < 0.4 ? 'bomb' : roll < 0.8 ? 'spread' : 'life';
            pickups.push(new Pickup(e.x, e.y, type));
          }
          for (const c of e.children()) {
            c.x += (Math.random() - 0.5) * 16;
            c.y += (Math.random() - 0.5) * 16;
            spawned.push(c);
          }
        } else {
          burst(b.x, b.y, e.color, 4, particles);
        }
        break;
      }
    }
  }
  if (spawned.length) enemies.push(...spawned);

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
          gameOver();
        }
        break;
      }
    }
  }

  // Enemy bullets vs player (same invulnerability window).
  if (player.invuln <= 0) {
    for (const b of enemyBullets) {
      if (b.dead) continue;
      const dx = player.x - b.x;
      const dy = player.y - b.y;
      const r = player.radius + b.radius;
      if (dx * dx + dy * dy < r * r) {
        b.dead = true;
        burst(b.x, b.y, b.color, 10, particles);
        burst(player.x, player.y, player.color, 30, particles);
        player.hit();
        if (player.lives <= 0) {
          burst(player.x, player.y, player.color, 60, particles);
          gameOver();
        }
        break;
      }
    }
  }

  // Player vs pick-ups.
  for (const p of pickups) {
    if (p.dead) continue;
    const dx = player.x - p.x;
    const dy = player.y - p.y;
    const r = player.radius + p.radius + 6;
    if (dx * dx + dy * dy < r * r) {
      p.dead = true;
      burst(p.x, p.y, p.color, 14, particles);
      if (p.type === 'bomb') {
        if (bombs < MAX_BOMBS) bombs++;
      } else if (p.type === 'life') {
        if (player.lives < MAX_LIVES) player.lives++;
      } else if (p.type === 'spread') {
        spreadTimer = SPREAD_DURATION; // each pick-up resets to 10s
      }
    }
  }

  bullets = bullets.filter((b) => !b.dead);
  enemyBullets = enemyBullets.filter((b) => !b.dead);
  enemies = enemies.filter((e) => !e.dead);
  particles = particles.filter((p) => !p.dead);
  pickups = pickups.filter((p) => !p.dead);
}

// --- Rendering ---
function drawHUD() {
  ctx.shadowBlur = 0;
  ctx.font = '600 16px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  // Lives as little ship icons, far left.
  const spacing = 22;
  for (let i = 0; i < player.lives; i++) {
    drawNeonTriangle(ctx, 16 + i * spacing, 22, -Math.PI / 2, 8, player.color);
  }
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(140, 220, 255, 0.9)';
  ctx.fillText(`SCORE  ${String(score).padStart(6, '0')}`, 28 + player.lives * spacing, 14);

  // Bombs: label + one circle per slot (filled = owned).
  ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = 'rgba(255, 176, 61, 0.75)';
  ctx.fillText('BOMB', 16, 40);
  for (let i = 0; i < MAX_BOMBS; i++) {
    const cx = 56 + i * 16;
    const cy = 45;
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    if (i < bombs) {
      ctx.fillStyle = '#ffb03d';
      ctx.shadowColor = '#ffb03d';
      ctx.shadowBlur = 8;
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255, 176, 61, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.stroke();
    }
  }

  // Spread shot: countdown while active.
  if (spreadTimer > 0) {
    ctx.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = 'rgba(182, 255, 61, 0.85)';
    ctx.shadowColor = '#b6ff3d';
    ctx.shadowBlur = 6;
    ctx.fillText(`SPREAD  ${spreadTimer.toFixed(1)}s`, 16, 58);
  }
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(140, 220, 255, 0.7)';
  ctx.textAlign = 'center';
  ctx.fillText(`WAVE ${wave()}`, W / 2, 14);
  ctx.shadowBlur = 0;

  // High score, top-right.
  ctx.font = '600 16px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = 'rgba(255, 216, 77, 0.8)';
  ctx.textAlign = 'right';
  ctx.fillText(`BEST  ${String(highScore).padStart(6, '0')}`, W - 16, 14);
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
  for (const p of pickups) p.draw(ctx);
  for (const b of bullets) b.draw(ctx);
  for (const b of enemyBullets) b.draw(ctx);
  for (const e of enemies) e.draw(ctx);
  player.draw(ctx);

  ctx.globalCompositeOperation = 'source-over';
  if (flash > 0) {
    ctx.fillStyle = `rgba(200, 245, 255, ${(flash * 0.3).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }
  drawHUD();
  if (paused && state === 'playing') {
    drawOverlay('PAUSED', '#4df3ff', [
      ['Press P or START to resume', 'rgba(140, 190, 230, 0.7)', 15],
    ]);
  }
  if (state === 'gameover') {
    const overLines = [
      [`FINAL SCORE  ${String(score).padStart(6, '0')}`, 'rgba(190, 235, 255, 0.95)', 20],
    ];
    if (newBest) {
      overLines.push(['NEW BEST!', '#ffd84d', 18]);
    } else {
      overLines.push([`BEST  ${String(highScore).padStart(6, '0')}`, 'rgba(255, 216, 77, 0.7)', 15]);
    }
    overLines.push(['Press ENTER or START to fly again', 'rgba(140, 190, 230, 0.7)', 15]);
    drawOverlay('GAME OVER', '#ff3df0', overLines);
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
    highScore,
    newBest,
    wave: wave(),
    lives: player.lives,
    bombs,
    spreadTimer,
    enemies: enemies.length,
    bullets: bullets.length,
    enemyBullets: enemyBullets.length,
    particles: particles.length,
    pickups: pickups.length,
    elapsed,
    playerAngle: player.angle,
  }),
  reset: () => reset(),
  /** Set the score directly (testing / demo). */
  setScore: (v) => {
    score = Math.max(0, Math.floor(Number(v) || 0));
  },
  /** Drop a pick-up at exact coordinates: 'bomb'|'life'|'spread'. */
  spawnPickupAt: (x, y, type = 'bomb') => {
    pickups.push(new Pickup(x, y, type));
  },
  /** Use a bomb (screen wipe), like pressing the bomb button. */
  useBomb: () => {
    if (state !== 'playing' || bombs <= 0) return;
    bombs--;
    detonate();
  },
  /** Run one frame synchronously (test hook; independent of rAF visibility). */
  step: (dt = 1 / 60) => {
    update(dt);
    draw();
  },
  /** Spawn an enemy at exact coordinates (for collision testing). */
  spawnEnemyAt: (x, y) => {
    enemies.push(new Enemy(x, y, 20));
  },
  /** Spawn any enemy type at exact coordinates: 'chaser'|'drifter'|'spinner'|'splitter'. */
  spawnAt: (x, y, type = 'chaser') => {
    const t = String(type).toLowerCase();
    if (t === 'drifter') enemies.push(new Drifter(x, y, W, H));
    else if (t === 'spinner') enemies.push(new Spinner(x, y, player));
    else if (t === 'splitter') enemies.push(new Splitter(x, y, 100));
    else enemies.push(new Enemy(x, y, 20));
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
      gameOver();
    }
  },
  /** Wipe the stored high score. */
  clearHighScore: () => {
    highScore = 0;
    newBest = false;
    try {
      localStorage.removeItem(HIGHSCORE_KEY);
    } catch {
      // ignore
    }
  },
};
