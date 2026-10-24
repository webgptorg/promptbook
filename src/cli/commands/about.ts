import { EXIT } from '../../common/errors.js';
import { PRODUCT_LINKS, PRODUCT_OVERVIEW } from '../../common/branding.js';
import { ENGINE_VERSION, detectInstallation } from '../../common/version.js';
import { wrap } from '../../ui/ansi.js';
import { badgeFace, badgeIdentity } from '../../ui/badges.js';
import { renderPanel } from '../../ui/panels.js';
import type { CommandContext } from '../context.js';

/**
 * `ptbk about`: a compact visual product box — name, the shared product introduction, actual engine version and
 * installation, website and GitHub — never another command reference (offline, no side effects; raw output keeps the
 * same authored copy and facts as plain text).
 *
 * @private command
 */
export default async function about(context: CommandContext): Promise<number> {
    const installation = detectInstallation();
    const text = PRODUCT_OVERVIEW;
    const facts: Array<[string, string]> = [
        ['Engine', `ptbk ${ENGINE_VERSION}`],
        ['Installation', `${installation.scope}${installation.ownerProject ? ` (project ${installation.ownerProject})` : ''}`],
        ['Location', installation.root],
        ['Node.js', process.version],
        ['Website', PRODUCT_LINKS.website],
        ['GitHub', PRODUCT_LINKS.repository],
    ];
    const { terminal } = context;
    if (!terminal.pretty) {
        terminal.write(`Promptbook\n\n${text.join('\n\n')}\n\n${facts.map(([label, value]) => `${label}: ${value}`).join('\n')}\n`);
        return EXIT.success;
    }
    const width = Math.min(terminal.columns(), 96);
    const lines = [
        `${terminal.style.color256(75, badgeFace(badgeIdentity('Expert'), 'working'))}  ${terminal.style.bold('Promptbook')}`,
        '',
        ...text.flatMap((paragraph, index) => [...wrap(paragraph, width - 4), ...(index < text.length - 1 ? [''] : [])]),
        '',
        ...facts.flatMap(([label, value]) => {
            const labelWidth = 13;
            const available = width - 4;
            if (available < labelWidth + 20) return [terminal.style.muted(label), ...wrap(value, available)];
            return wrap(value, available - labelWidth).map((line, index) => `${terminal.style.muted(index === 0 ? label.padEnd(labelWidth) : ' '.repeat(labelWidth))}${line}`);
        }),
    ];
    terminal.write(`${renderPanel({ title: 'About', titleRight: `ptbk ${ENGINE_VERSION}`, lines, width, tone: 'accent', unicode: terminal.unicode, style: terminal.style }).join('\n')}\n`);
    return EXIT.success;
}
