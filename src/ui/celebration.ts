import { badgeFace, badgeIdentity } from './badges.js';
import { InlineRenderer } from './screen.js';
import type { TerminalProfile } from './terminal.js';

/**
 * Confetti glyphs (Unicode and ASCII fallbacks).
 */
const CONFETTI = { unicode: ['✦', '✧', '·', '˚', '*', '°', '•'], ascii: ['*', '+', '.', 'o', "'"] };

/**
 * Restrained confetti colors (xterm-256).
 */
const COLORS = [75, 114, 215, 176, 222, 141];

/**
 * A brief, finite celebration of confirmed success with Expert: a short confetti flourish in place, ending in one
 * static line. Raw output gets nothing; reduced motion or limited terminals get only the static line.
 *
 * @private initialization experience
 */
export async function celebrate(terminal: TerminalProfile, message: string): Promise<void> {
    if (!terminal.pretty) return;
    const { style } = terminal;
    const identity = badgeIdentity('Expert');
    const face = style.bold(style.color256(identity.terminalColor, badgeFace(identity, 'completed')));
    const final = `  ${terminal.unicode ? '✨' : '*'} ${face} ${style.bold('Expert')}  ${style.success(message)}`;
    if (terminal.reducedMotion || !terminal.interactive || !process.stdout.isTTY) {
        terminal.write(`${final}\n`);
        return;
    }
    const glyphs = terminal.unicode ? CONFETTI.unicode : CONFETTI.ascii;
    const width = Math.min(terminal.columns() - 2, 60);
    const renderer = new InlineRenderer();
    const frames = 12;
    for (let frame = 0; frame < frames; frame++) {
        const rows = [0, 1].map((row) => {
            let line = '';
            for (let column = 0; column < width; column++) {
                const seed = (column * 7 + row * 13 + frame * 5) % 23;
                line += seed < 3 && column % 2 === (frame + row) % 2 ? style.color256(COLORS[(column + frame) % COLORS.length]!, glyphs[(column + row + frame) % glyphs.length]!) : ' ';
            }
            return line;
        });
        const bounce = frame % 2 ? `${style.bold(style.color256(identity.terminalColor, badgeFace(identity, 'working', 1)))}` : face;
        renderer.render([rows[0]!, `  ${bounce} ${style.bold('Expert')}`, rows[1]!]);
        await new Promise((resolve) => setTimeout(resolve, 85));
    }
    renderer.finish([final]);
}
