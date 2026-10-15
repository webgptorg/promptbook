import { EXIT } from '../../common/errors.js';
import { ENGINE_VERSION, detectInstallation } from '../../common/version.js';
import { wrap } from '../../ui/ansi.js';
import { badgeFace, badgeIdentity } from '../../ui/badges.js';
import { renderPanel } from '../../ui/panels.js';
import type { CommandContext } from '../context.js';

/**
 * `ptbk about`: product overview and the running engine (offline, no side effects).
 *
 * @private command
 */
export default async function about(context: CommandContext): Promise<number> {
    const installation = detectInstallation();
    const text = [
        'Promptbook (ptbk) operates readable agents and tasks over a Git project. Agents carry lasting roles, goals and rules; tasks describe bounded work. The agenda executes one task at a time, routes missing assignments through Manager, verifies results with your project check and commits each accepted result together with its completion record.',
        'Everything lives in files: Books in agents/ and tasks/, configuration in ptbk.json, runtime state in the Git-ignored .ptbk/ folder.',
    ];
    const facts: Array<[string, string]> = [
        ['Engine', `ptbk ${ENGINE_VERSION}`],
        ['Installation', `${installation.scope}${installation.ownerProject ? ` (project ${installation.ownerProject})` : ''}`],
        ['Location', installation.root],
        ['Node.js', process.version],
        ['Website', 'https://ptbk.io/'],
    ];
    const { terminal } = context;
    if (!terminal.pretty) {
        terminal.write(`${text.join('\n\n')}\n\n${facts.map(([label, value]) => `${label}: ${value}`).join('\n')}\n`);
        return EXIT.success;
    }
    const width = Math.min(terminal.columns(), 96);
    const lines = [
        `${terminal.style.color256(75, badgeFace(badgeIdentity('Expert'), 'working'))}  ${terminal.style.bold('Promptbook')}`,
        '',
        ...text.flatMap((paragraph, index) => [...wrap(paragraph, width - 4), ...(index < text.length - 1 ? [''] : [])]),
        '',
        ...facts.map(([label, value]) => `${terminal.style.muted(label.padEnd(13))}${value}`),
    ];
    terminal.write(`${renderPanel({ title: 'About', titleRight: `ptbk ${ENGINE_VERSION}`, lines, width, tone: 'accent', unicode: terminal.unicode, style: terminal.style }).join('\n')}\n`);
    return EXIT.success;
}
