# Component: Live terminal demo

A scripted terminal in the [hero](../sections/hero.md) which shows what a real `ptbk coder run` rich terminal session looks like, without running the user project.

## Frame

Same window chrome as the [terminal block](./terminal-block.md) (rounded frame, `#0d1117` body, `#161b22` title bar, traffic lights), with these differences:

-   Title: `ptbk coder run`, the command the session is running.
-   Instead of a Copy button, a static Promptbook Green dot + `sample run`. The indicator must not pulse or blink.
-   The body is a character grid fitted to the width available to it, the same way a terminal emulator fits its grid into its window: as many character cells as fit at the preferred terminal text size, clamped to the same 56–96 columns the real `ptbk coder run` frame is clamped to, and a smaller text size when even 56 columns would not fit. The dashboard is drawn for that column count, so the terminal **never scrolls horizontally** at any viewport width.
-   The body is as tall as the whole scripted session, so the session never scrolls vertically either and the agent visual **stays fully visible** once the sample has finished. The view must not auto-scroll away from it.
-   A character which the terminal font does not provide — the box drawing characters, the shade of the progress bar, the status marks — is drawn from a fallback font in a different width. Such text is pulled back onto the character grid by letter spacing, so every row stays exactly as wide as the cells it is counted as and the box borders line up.
-   Dashboard rows use fixed-width terminal text. Long output is truncated with `...` inside the box, not wrapped through the border. Full file paths in the `Errors` box are the exception: render them as wrapped `File` rows so every path segment stays visible. The typed command is real terminal output, so it wraps onto the following rows instead of being truncated.

## Script playback

The script is an ordered list of terminal events:

1.  The session starts with a shell prompt line, then the canonical `LIVE_DEMO_RUN_COMMAND` (see [`../content/commands.md`](../content/commands.md)) rendered as a command line: gray non-selectable `$ ` prompt, then the command **typed character by character** (~10ms per character).
2.  The shared agent visual appears as the same animated terminal ASCII text centered in the terminal stream as in `ptbk coder run`. The demo `.book` source is passed to the shared terminal-avatar renderer and its `META VISUAL ascii-octopus` selects the same `AsciiOctopus` visual the real Promptbook Developer coder agent uses — the visual always comes from the agent book, never from a landing-specific fallback. The browser maps the renderer's ANSI foreground colors to text spans; it must not use a canvas or recreate the octopus in landing-specific text.
3.  The terminal prints the rich `ptbk coder run` dashboard boxes: `Session`, `Current task`, `Live output`, `Errors`, and `Controls`.
4.  When the script finishes, the terminal stays on the final output. It must not clear, loop, reset, or render a blinking cursor.

## Final Dashboard Content

The final dashboard must tell the same story as an actual limited run:

-   `Session` shows `DONE`, runner `claude-code · fable · thinking xhigh`, context `AGENTS.md`, test `npm run test-for-ptbk-coder`, run limit `1 prompt run`, backlog counts, elapsed time, and a 0% progress bar.
-   `Current task` shows `prompts/2026-07-0200-ptbk-coder-web.md#1` and `Attempt 1/3 · Run limit reached after 1 prompt run.`
-   `Live output` shows the app server local/network URLs, startup readiness, the `punycode` deprecation warning, prerender output, and `🎉 All tests passed!`.
-   `Errors` shows one earlier failed `bash` command and a wrapped full `File` path to `.promptbook/coder-prompts/2026-07-0480-agents-server-browser-preview.sh`.
-   `Controls` shows `P Pause`, `X End with this prompt`, and `CTRL+C Exit` because this scripted final frame is already `DONE`; the live CLI shows `S Skip current waiting` only during a waiting phase.

The story the script must always tell: _the user enters `ptbk coder run` → the agent visual starts → the real rich terminal dashboard reaches the final output_. This mirrors the actual CLI workflow in [`../product.md`](../product.md).
