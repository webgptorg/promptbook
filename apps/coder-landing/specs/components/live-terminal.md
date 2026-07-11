# Component: Live terminal demo

A fake terminal in the [hero](../sections/hero.md) which replays a scripted `ptbk coder server` session in an endless loop, giving the visitor a "live" preview of the product without running anything.

## Frame

Same window chrome as the [terminal block](./terminal-block.md) (rounded frame, `#0d1117` body, `#161b22` title bar, traffic lights), with two differences:

-   Title: `ptbk coder server — live preview`.
-   Instead of a Copy button, a **live indicator**: a small pulsing green dot + the word `live` in Promptbook Green.
-   Body height is fixed (~20rem, ~24rem on desktop) and scrolls vertically; the view **auto-scrolls to the latest line**.

## Script playback

The script is an ordered list of lines, each with a *tone*, *text* and *delay before appearing*:

1.  The session starts with the canonical `SERVER_COMMAND` (see [`../content/commands.md`](../content/commands.md)) rendered as a command line: gray non-selectable `$ ` prompt, then the command **typed character by character** (~12ms per character).
2.  All other lines appear at once after their delay, colored by tone:
    -   `success` (`✔ …` lines) → Promptbook Green
    -   `info` (`● …` queue-status lines) → Promptbook Blue
    -   `accent` (`▶ …` headings: app name, prompt file names) → Promptbook Blue, semibold
    -   `muted` (prompt excerpts, spinner "working…" lines) → mid gray
    -   `plain` (diff stats, empty spacer lines) → light gray
3.  A pulsing block cursor `▊` is rendered at the end of the newest line.
4.  When the script finishes, the terminal pauses ~5 seconds, clears, and replays from the start.

## Scripted session (verbatim)

After the typed `SERVER_COMMAND`, the following lines play (tone → text; delays are ~200–900ms, with ~1.6s on the two "working…" lines):

```text
accent   ▶ Promptbook Coder
success  ✔ Working tree clean
success  ✔ Agent identity: Promptbook Coding Agent <coding-agent@promptbook.studio>
success  ✔ Kanban UI running at http://localhost:4441
info     ● Queue: 3 prompts waiting
plain    (empty line)
accent   ▶ prompts/add-dark-mode.md
muted      Add a dark mode toggle to the settings page…
muted      ⠋ claude-code (fable, thinking: max) is working…
plain      4 files changed (+182 −23)
success    ✔ npm run test-for-ptbk-coder → 128 passed
success    ✔ Committed a1b2c3d "Add dark mode toggle to settings"
plain    (empty line)
accent   ▶ prompts/fix-login-redirect.md
muted      Fix the redirect loop after login on expired sessions…
muted      ⠋ claude-code (fable, thinking: max) is working…
plain      2 files changed (+41 −7)
success    ✔ npm run test-for-ptbk-coder → 128 passed
success    ✔ Committed b4e5f6a "Fix login redirect loop"
plain    (empty line)
info     ● Queue: 1 prompt waiting — watching prompts/ for new files…
```

The story the script must always tell: *queue of prompt files → agent works → tests pass → signed commit → next prompt → server keeps watching*. This mirrors the core workflow in [`../product.md`](../product.md).
