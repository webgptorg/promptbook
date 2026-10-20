import { PtbkError } from '../common/errors.js';
import { compareVersions } from '../common/semver.js';
import { ENGINE_VERSION } from '../common/version.js';
import { checkForEngineUpdate, updateEngine } from '../project/self-update.js';
import { confirm } from '../ui/prompts.js';
import type { CommandContext } from './context.js';

/**
 * The project was configured by a newer engine: offer the ordinary self-update of this installation (interactive)
 * and stop either way — the project is never downgraded or started with an older engine.
 *
 * @private CLI compatibility gate
 */
export async function requireEngineUpdate(context: CommandContext, saved: string): Promise<never> {
    const { terminal } = context;
    if (terminal.interactive) {
        const check = await checkForEngineUpdate().catch(() => undefined);
        if (check?.newer && check.latest && (compareVersions(check.latest, saved) ?? -1) >= 0) {
            const answer = await confirm(terminal, { frame: { title: 'ptbk', step: 'Update required' }, question: `This project was configured by ptbk ${saved}; this ptbk is ${ENGINE_VERSION}. Update this ${check.installation.scope} installation to ${check.latest} now?`, defaultYes: true });
            if (answer === true) {
                const message = await updateEngine(check, (line) => terminal.write(`    ${line}\n`));
                throw new PtbkError(message, { kind: 'incomplete', effect: 'Nothing in the project was changed.', next: ['Run the same command again with the updated ptbk.'] });
            }
        }
    }
    throw new PtbkError(`This project was configured by ptbk ${saved}; the running ptbk ${ENGINE_VERSION} is older.`, {
        kind: 'unsupported',
        project: context.cwd,
        reason: 'An older engine never downgrades or rewrites a newer configuration.',
        effect: 'Nothing was started or changed.',
        next: [`Update ptbk to ${saved} or newer (\`npm install -g ptbk@latest\`, or the project's local dependency), then rerun.`],
    });
}

