# Section: Hero

First content block under the header. Two-column on desktop (text left, live terminal right), single column on mobile (text first). A soft Promptbook-Blue gradient glow sits behind the section, and a second one lights the terminal window from behind on desktop.

Both columns are as tall as the taller one of them, which is the [live terminal](../components/live-terminal.md), because the terminal is as tall as the session it plays. The copy is therefore optically centered against the terminal window instead of leaving a gap above and below itself, and the terminal window fills the column whenever the copy is the taller one. The hero copy is written to be read at hero size: the headline and the subheadline grow with the viewport, but only as far as their own column can carry them, so the headline keeps its two lines at every width.

## Left column

1. **Badge** (pill, blue-dark border and tint): `Part of Promptbook`. This is the only mention of Promptbook above the footer, kept subtle by design (see [`footer.md`](./footer.md) for the full attribution).
2. **Headline** (Outfit bold, ~2.25rem on a phone up to ~3.25rem on a wide desktop):

    > Your coding agents,
    > **running your backlog.**

    The second line uses a Promptbook Blue → Promptbook Green gradient text fill.

3. **Subheadline** (~1.125rem on a phone up to ~1.375rem on a wide desktop, gray-300):

    > **ptbk coder** drives Claude Code, OpenAI Codex, Gemini CLI and other coding agents through a queue of plain-markdown prompts. It runs your tests after every task, commits what passes and pushes it. You do not have to be at the keyboard for any of it.

4. **Install terminal**: a [terminal block](../components/terminal-block.md) with the canonical `INSTALL_COMMAND` (`npm install ptbk`, see [`../content/commands.md`](../content/commands.md)).
5. **CTA row**:

    - Primary (filled Promptbook Blue): `Get started in 3 commands` → `#quickstart`
    - Secondary (outlined): `How it works` → `#how-it-works`

    The install terminal and the CTA row are one block, because installing and starting belong together.

## Right column

The [live terminal demo](../components/live-terminal.md) playing the scripted `ptbk coder run` rich terminal session.
