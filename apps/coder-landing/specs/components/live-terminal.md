# Component: Live terminal demo

A scripted terminal in the [hero](../sections/hero.md) which shows what a real `ptbk coder run` rich terminal session looks like, without running the user project.

## Frame

Same window chrome as the [terminal block](./terminal-block.md) (rounded frame, `#0d1117` body, `#161b22` title bar, traffic lights), with these differences:

-   Title: `ptbk coder run — live terminal`.
-   Instead of a Copy button, a static Promptbook Green dot + `sample run`. The indicator must not pulse or blink.
-   Body height is fixed (~30rem, ~38rem on desktop) and scrolls vertically and horizontally; the view **auto-scrolls to the latest line**.
-   Dashboard rows use fixed-width terminal text. Long output is truncated with `...` inside the box, not wrapped through the border. Full file paths in the `Errors` box are the exception: render them as wrapped `File` rows so every path segment stays visible.

## Script playback

The script is an ordered list of terminal events:

1.  The session starts with a shell prompt line, then the canonical `LIVE_DEMO_RUN_COMMAND` (see [`../content/commands.md`](../content/commands.md)) rendered as a command line: gray non-selectable `$ ` prompt, then the command **typed character by character** (~10ms per character).
2.  The shared agent visual appears as the built-in web avatar canvas centered in the terminal stream. The demo `.book` source is parsed, explicit `META AVATAR` / `META VISUAL` wins, and the landing sample falls back to the real Promptbook Developer `AsciiOctopus` visual. The sample must render the existing shared `<Avatar/>` canvas visual directly instead of recreating or rasterizing the octopus in landing-specific terminal text.
3.  The terminal prints the rich `ptbk coder run` dashboard boxes: `Session`, `Current task`, `Live output`, `Errors`, and `Controls`.
4.  When the script finishes, the terminal stays on the final output. It must not clear, loop, reset, or render a blinking cursor.

## Final Dashboard Content

The final dashboard must tell the same story as an actual limited run:

-   `Session` shows `DONE`, runner `claude-code · fable · thinking xhigh`, context `AGENTS.md`, test `npm run test-for-ptbk-coder`, run limit `1 prompt run`, backlog counts, elapsed time, and a 0% progress bar.
-   `Current task` shows `prompts/2026-07-0200-ptbk-coder-web.md#1` and `Attempt 1/3 · Run limit reached after 1 prompt run.`
-   `Live output` shows the app server local/network URLs, startup readiness, the `punycode` deprecation warning, prerender output, and `🎉 All tests passed!`.
-   `Errors` shows one earlier failed `bash` command and a wrapped full `File` path to `.promptbook/coder-prompts/2026-07-0480-agents-server-browser-preview.sh`.
-   `Controls` shows `P Pause` and `CTRL+C Exit`.

The story the script must always tell: _the user enters `ptbk coder run` → the agent visual starts → the real rich terminal dashboard reaches the final output_. This mirrors the actual CLI workflow in [`../product.md`](../product.md).
