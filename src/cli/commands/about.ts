import { EXIT } from '../../common/errors.js';
import { ENGINE_VERSION } from '../../common/version.js';
import { wrap } from '../../ui/ansi.js';
import { badgeFace, badgeIdentity } from '../../ui/badges.js';
import { renderPanel } from '../../ui/panels.js';
import type { CommandContext } from '../context.js';

/**
 * Website of the product.
 */
const WEBSITE = 'https://www.ptbk.io/';

/**
 * One-line purpose of the product.
 */
const PURPOSE = 'Readable agents, tasks and chats that keep working on your Git project.';

/**
 * `ptbk about`: a compact visual product box — name, actual engine version, purpose and website — never another
 * command reference (offline, no side effects; raw output keeps the same information as plain text).
 *
 * @private command
 */
export default async function about(context: CommandContext): Promise<number> {
    const { terminal } = context;
    if (!terminal.pretty) {
        terminal.write(`Promptbook\nVersion: ptbk ${ENGINE_VERSION}\nPurpose: ${PURPOSE}\nWebsite: ${WEBSITE}\n`);
        return EXIT.success;
    }
    const { style } = terminal;
    const mascot = style.color256(75, badgeFace(badgeIdentity('Expert'), 'working'));
    const width = Math.min(terminal.columns(), 72);
    // The purpose wraps inside the box (panel borders and padding take four columns).
    const lines = [`${mascot}  ${style.bold('Promptbook')}  ${style.muted(`ptbk ${ENGINE_VERSION}`)}`, '', ...wrap(PURPOSE, Math.max(20, width - 4)), '', `${style.muted('Website')}  ${style.accent(WEBSITE)}`, style.muted('Commands: ptbk help')];
    terminal.write(`${renderPanel({ title: 'About', lines, width, tone: 'accent', unicode: terminal.unicode, style }).join('\n')}\n`);
    return EXIT.success;
}
