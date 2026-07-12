# Component: Live terminal demo

A fake terminal in the [hero](../sections/hero.md) which replays a scripted `ptbk coder run` dashboard in an endless loop, giving the visitor a "live" preview of the product without running anything.

## Frame

Same window chrome as the [terminal block](./terminal-block.md) (rounded frame, `#0d1117` body, `#161b22` title bar, traffic lights), with these differences:

-   Title: `ptbk coder run - live dashboard`.
-   Instead of a Copy button, a **live indicator**: a small pulsing green dot + the word `live` in Promptbook Green.
-   The title bar includes the shared animated agent avatar as a compact visual next to the live indicator.
-   Body height is fixed and scrolls vertically and horizontally when the dashboard is wider than the viewport.
-   The command prompt stays at the top of the body, followed by the dashboard panels.

## Script playback

1. The session starts with the canonical `LIVE_TERMINAL_RUN_COMMAND` (see [`../content/commands.md`](../content/commands.md)) rendered as a command line: gray non-selectable `$ ` prompt, then the command typed character by character.
2. After the command is typed, the dashboard appears and advances through `LOADING`, `RUNNING`, `VERIFYING`, and `DONE` snapshots.
3. The dashboard mirrors the real rich CLI structure from `ptbk coder run`:
    -   `Session`
    -   `Current task`
    -   `Live output`
    -   `Controls`
4. When the final `DONE` snapshot finishes, the terminal pauses ~5 seconds, clears, and replays from the start.

## Agent visual

The agent visual must use the shared `src/avatars` rendering code, not a landing-page-only illustration. This keeps the visual consistent with Agents Server avatar rendering and with the `ptbk coder` terminal ASCII bridge, which also starts from the shared avatar renderer.

## Dashboard content

The scripted dashboard should show the same kind of state that a real limited `ptbk coder run` shows:

-   Runner: `claude-code  ·  fable  ·  thinking xhigh`
-   Context: `AGENTS.md`
-   Test: `npm run test-for-ptbk-coder`
-   Current task: `prompts/2026-07-0200-ptbk-coder-web.md#1`
-   Scope: priority filter, `--limit 1`, and prompts that must be written first
-   Live output: server URLs, readiness lines, runner warnings, rendered-page output, and `All tests passed`

The story the script must always tell: *one prompt from the queue is selected -> the coding agent runs -> verification runs -> the rich terminal dashboard reaches the run-limit `DONE` state*. This mirrors the core workflow in [`../product.md`](../product.md).
