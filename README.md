# Neon Wars

A browser-based twin-stick shooter inspired by Geometry Wars. No dependencies, no build step — plain Canvas 2D with additive-blend neon effects.

## Controls

| Action | Controller (Xbox layout) | Keyboard | Mouse |
|---|---|---|---|
| Move | Left stick | W A S D | — |
| Aim + fire | Right stick (auto-fires when deflected past deadzone) | Arrow keys (auto-fire while held) | Aim at cursor, hold left button |
| Fire (no aim) | RT | — | — |
| Pause | Start | P | — |
| Restart (game over) | Start or A | Enter | — |

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
  bullet.js     player projectiles
  enemy.js      chaser enemies
  particle.js   death-burst particles
  ship.js       shared neon drawing helpers
```

## Iteration ideas

- Warp grid that reacts to movement (classic Geometry Wars effect)
- More enemy types (drifters, spinners, splitters), enemy bullets
- Power-ups (spread shot, rapid fire, shield)
- Screen shake and a proper "multiplier" scoring chain
- Sound effects / music via WebAudio
- High scores persisted in `localStorage`
