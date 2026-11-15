/**
 * Unified input: Xbox-layout gamepad, keyboard, and mouse.
 *
 * Gamepad (standard Xbox mapping):
 *   Left stick  = move
 *   Right stick = aim, auto-fires once deflected past the deadzone
 *   RT (button 7) = fire in last-aimed direction
 *   Start (9) / A (0) = pause (while playing) or restart (game over)
 *   B (1)             = use bomb
 *
 * Keyboard: WASD move, arrow keys aim + auto-fire, Enter action, P pause,
 *           Space bomb.
 * Mouse: aim at cursor, hold left button to fire, right button bomb.
 */

const DEADZONE = 0.25;

function deadzone(v, dz = DEADZONE) {
  const a = Math.abs(v);
  if (a < dz) return 0;
  return Math.sign(v) * ((a - dz) / (1 - dz));
}

export class Input {
  constructor() {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false, right: false, used: false };
    this.padIndex = null;
    this.prev = { start: false, pause: false, bomb: false };

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.used = true;
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouse.down = true;
        this.mouse.used = true;
      }
      if (e.button === 2) {
        this.mouse.right = true;
        this.mouse.used = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.right = false;
    });
    // Right-click is the bomb trigger; suppress the context menu.
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('gamepadconnected', (e) => {
      this.padIndex = e.gamepad.index;
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      if (this.padIndex === e.gamepad.index) this.padIndex = null;
    });
  }

  getPad() {
    if (!navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    if (this.padIndex != null && pads[this.padIndex]) return pads[this.padIndex];
    // Fallback: first connected pad (covers pads connected before page load).
    for (const p of pads) if (p && p.connected) return p;
    return null;
  }

  /**
   * Poll once per frame.
   * @param {number} px player x (for mouse aiming)
   * @param {number} py player y
   */
  poll(px, py) {
    const pad = this.getPad();
    const out = {
      moveX: 0,
      moveY: 0,
      aimX: 0,
      aimY: 0,
      aiming: false,
      firing: false,
      aimAngle: -Math.PI / 2,
      actionPressed: false, // Start / A / Enter edge: pause or restart
      pausePressed: false, // P key edge
      bombPressed: false, // B / Space / right-click edge: use a bomb
    };

    // --- Movement: left stick, fallback WASD ---
    if (pad) {
      out.moveX = deadzone(pad.axes[0] || 0);
      out.moveY = deadzone(pad.axes[1] || 0);
    }
    if (!out.moveX && !out.moveY) {
      let mx = 0;
      let my = 0;
      if (this.keys.has('KeyW')) my -= 1;
      if (this.keys.has('KeyS')) my += 1;
      if (this.keys.has('KeyA')) mx -= 1;
      if (this.keys.has('KeyD')) mx += 1;
      out.moveX = mx;
      out.moveY = my;
    }

    // --- Aim: right stick, then arrow keys, then mouse ---
    if (pad) {
      const rx = deadzone(pad.axes[2] || 0);
      const ry = deadzone(pad.axes[3] || 0);
      if (rx !== 0 || ry !== 0) {
        out.aimX = rx;
        out.aimY = ry;
        out.aiming = true;
        out.aimAngle = Math.atan2(ry, rx);
        out.firing = true; // auto-fire when stick is deflected past deadzone
      } else if (pad.buttons[7] && pad.buttons[7].pressed) {
        out.firing = true; // RT fires along the ship's last aim
      }
    }
    if (!out.aiming) {
      let ax = 0;
      let ay = 0;
      if (this.keys.has('ArrowUp')) ay -= 1;
      if (this.keys.has('ArrowDown')) ay += 1;
      if (this.keys.has('ArrowLeft')) ax -= 1;
      if (this.keys.has('ArrowRight')) ax += 1;
      if (ax !== 0 || ay !== 0) {
        out.aimX = ax;
        out.aimY = ay;
        out.aiming = true;
        out.aimAngle = Math.atan2(ay, ax);
        out.firing = true;
      } else if (!pad && this.mouse.used) {
        // Mouse aims only when there's no gamepad. With a pad connected,
        // releasing the right stick leaves `aiming` false so the ship holds
        // its last aim direction instead of snapping to the cursor.
        const dx = this.mouse.x - px;
        const dy = this.mouse.y - py;
        if (Math.hypot(dx, dy) > 4) {
          out.aiming = true;
          out.aimAngle = Math.atan2(dy, dx);
        }
        out.firing = out.firing || this.mouse.down;
      }
    }

    // --- Action button edge: Start (9), A (0), or Enter ---
    const startNow =
      (pad && pad.buttons[9] && pad.buttons[9].pressed) ||
      (pad && pad.buttons[0] && pad.buttons[0].pressed) ||
      this.keys.has('Enter');
    out.actionPressed = startNow && !this.prev.start;
    this.prev.start = startNow;

    // --- Pause edge: P key ---
    const pauseNow = this.keys.has('KeyP');
    out.pausePressed = pauseNow && !this.prev.pause;
    this.prev.pause = pauseNow;

    // --- Bomb edge: B (1), Space, right mouse ---
    const bombNow =
      (pad && pad.buttons[1] && pad.buttons[1].pressed) ||
      this.keys.has('Space') ||
      this.mouse.right;
    out.bombPressed = bombNow && !this.prev.bomb;
    this.prev.bomb = bombNow;

    return out;
  }
}
