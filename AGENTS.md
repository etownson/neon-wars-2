# AGENTS.md

Neon Wars: a browser twin-stick shooter. **Vanilla JS ES modules, Canvas 2D — no dependencies, no build step, no tests, no lint/typecheck config.** Do not add a framework, bundler, or package manager.

## Running / verifying changes

- Must be served over HTTP — `index.html` loads `<script type="module">`, so `file://` won't work:
  ```sh
  python3 -m http.server 8000   # or: npx serve .
  ```
- Verification is manual: serve, open in a browser, play. There is no test suite to run.

## Architecture

- `js/main.js` is the only orchestrator: game loop, states (menu/pause/game-over), spawning, collisions, HUD, and the offscreen grid background (rendered once, blitted per frame; DPR capped at 2). All cross-entity logic lives here.
- Entity files are small single-purpose modules: `player.js`, `bullet.js`, `enemy.js`, `particle.js` (exports `burst()`).
- `js/ship.js` holds the shared neon drawing helper (`drawNeonTriangle`) — reuse it instead of adding new inline drawing.
- `js/input.js` unifies gamepad (Xbox layout) + keyboard + mouse behind one `Input` class. Route all input changes through it; don't add direct `keydown`/`pointerdown` listeners elsewhere.
- `css/style.css` is only full-screen canvas setup — no other UI styling.

## Constraints to preserve

- Keep it deployable as-is to GitHub Pages: no absolute paths, no build artifacts, no codegen. `README.md` documents controls and deploy steps — keep it in sync with changes.
- Neon look relies on Canvas additive blending (`lighter` composite) — preserve when adding new visual effects.
