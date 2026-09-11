# Section: Hero

First content block under the header. Two-column on desktop (text left, live terminal right), single column on mobile (text first). A soft Promptbook-Blue gradient glow sits behind the section, and a second one lights the terminal window from behind on desktop.

Both columns are as tall as the taller one of them. The copy column carries the height of the tallest headline claim (see below), which brings it close to the height of the [live terminal](../components/live-terminal.md), whose text size is tuned a step below the size a standalone terminal block uses to meet it halfway - so the copy is optically centered against the terminal window instead of leaving a gap above and below itself, and the terminal window fills the column whenever the copy is the taller one. The hero copy is written to be read at hero size: the headline and the subheadline grow with the viewport, but only as far as their own column can carry them.

## Left column

1. **Badge** (pill, blue-dark border and tint): `Part of Promptbook`. This is the only mention of Promptbook above the footer, kept subtle by design (see [`footer.md`](./footer.md) for the full attribution).
2. **Headline** (Outfit bold, ~2.25rem on a phone up to ~3.25rem on a wide desktop) which rotates through every claim written in [`src/data/heroClaims.ts`](../../src/data/heroClaims.ts), the single place every claim is configured:

    > Your coding agents,
    > **running your backlog.**

    > Focus on what matters,
    > **automate the rest.**

    > You shouldn't
    > **babysit your backlog.**

    > Ship a backlog,
    > **not a stream of interruptions.**

    > Let your coding agents
    > **handle the rest.**

    > Automate your coding,
    > **focus on what truly matters.**

    > Let your coding agents
    > **take care of the mundane tasks.**

    Each claim is set as two lines: the lead line in white, the accent line (bold above) in a Promptbook Blue → Promptbook Green gradient text fill. A line longer than the column wraps with balanced lines, so a long claim breaks into even lines instead of leaving one trailing word. The claims crossfade with a slight vertical slide - the claim which leaves rises out of the headline while the next one rises into it from below - and each claim stays for a little over four seconds. All claims are stacked in the very same grid cell, so the headline is always as tall as the tallest of them and the rotation never shifts the layout around it. Visitors whose system prefers reduced motion get the first claim, the primary one, without any rotation. The primary claim also feeds the page tagline (see [`../metadata.md`](../metadata.md)).

3. **Subheadline** (~1.125rem on a phone up to ~1.375rem on a wide desktop, gray-300):

    > **ptbk coder** drives Claude Code, OpenAI Codex, Gemini CLI and other coding agents through a queue of plain-markdown prompts. It runs your tests after every task, commits what passes and pushes it. You do not have to be at the keyboard for any of it.

4. **Install terminal**: a [terminal block](../components/terminal-block.md) with the canonical `INSTALL_COMMAND` (`npm install ptbk`, see [`../content/commands.md`](../content/commands.md)).
5. **CTA row**:

    - Primary (filled Promptbook Blue): `Get started in 3 commands` → `#quickstart`
    - Secondary (outlined): `How it works` → `#how-it-works`

    The install terminal and the CTA row are one block, because installing and starting belong together.

## Right column

The [live terminal demo](../components/live-terminal.md) playing the scripted `ptbk coder run` rich terminal session.
