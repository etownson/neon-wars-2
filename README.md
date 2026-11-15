# Neon Wars

A browser-based twin-stick shooter inspired by Geometry Wars. No dependencies, no build step — plain Canvas 2D with additive-blend neon effects.

## Controls

| Action | Controller (Xbox layout) | Keyboard | Mouse |
|---|---|---|---|
| Move | Left stick | W A S D | — |
| Aim + fire | Right stick (auto-fires when deflected past deadzone) | Arrow keys (auto-fire while held) | Aim at cursor, hold left button |
| Fire (no aim) | RT | — | — |
| Bomb (screen wipe) | B | Space | Right click |
| Pause | Start | P | — |
| Restart (game over) | Start or A | Enter | — |

## Enemies

| Type | Behavior |
|---|---|
| Chasers (pink/red/orange) | Home straight at you, 1 hit |
| Drifters (green diamonds) | Weave across the screen, fire along their path |
| Spinners (purple, wave 2+) | Orbit and close in, fire aimed shots |
| Splitters (orange, wave 3+) | Slow tank, 3 hits, splits into two fast minis |

## Pick-ups

Destroyed enemies occasionally drop a pick-up (15s on screen before it fades):

| Pick-up | Effect |
|---|---|
| Bomb (orange) | +1 bomb, up to 3 — press B / Space / right-click to wipe the screen |
| Extra life (cyan ship) | +1 life, up to 5 |
| Spread shot (lime) | 3-way spread fire for 10s; picking up again resets the timer |

Bomb count and the spread-shot countdown show in the HUD at the top of the screen.

## High score

Your best score is saved in `localStorage` and shown in the HUD (top-right) and on the game-over screen. It persists across sessions in the same browser; "NEW BEST!" appears when you beat it.

## Playing locally

Any static server works, e.g.:

```sh
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed URL.

## Deploying to GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repo: **Settings → Pages → Source → Deploy from a branch** → branch `main` (or your default), folder `/ (root)`.
3. Wait a minute, and your game is live at `https://<user>.github.io/<repo>/`.

No configuration changes needed — the game has no absolute paths or build output.

## Structure

```
index.html      entry point
css/style.css   full-screen canvas
js/
  main.js       game loop, states, spawning, collisions, HUD
  input.js      gamepad (Xbox) + keyboard + mouse unification
  player.js     ship movement, firing, lives
  bullet.js     projectiles (player + enemy)
  enemy.js      chasers, drifters, spinners, splitters
  pickup.js     bomb / extra-life / spread-shot drops
  particle.js   death-burst particles
  ship.js       shared neon drawing helpers
```

## Iteration ideas

- Warp grid that reacts to movement (classic Geometry Wars effect)
- More power-ups (rapid fire, shield)
- Screen shake and a proper "multiplier" scoring chain
- Sound effects / music via WebAudio
