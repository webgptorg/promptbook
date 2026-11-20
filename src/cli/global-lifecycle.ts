import { errorMessage, EXIT, PtbkError, usageError } from '../common/errors.js';
import { observeHost } from '../ui/global-dashboard.js';
import { createTerminalProfile } from '../ui/terminal.js';
import { validateCombinations } from './common.js';
import type { CommandContext } from './context.js';

/**
 * Maximum number of independent project operations waiting for completion at once.
 */
const CONCURRENCY = 4;

/**
 * Applies a lifecycle command to every discovered active project of this OS user, independent of CWD. Each target
 * uses the ordinary local handler with plain, noninteractive output and no dashboard handoff. Stopped/missing
 * projects stay stopped, inaccessible owners are reported, and one failure never prevents the other attempts.
 *
 * @private CLI lifecycle
 */
export async function runGlobalLifecycle(
    context: CommandContext,
    run: (context: CommandContext, expectedInstanceId?: string) => Promise<number>,
): Promise<number> {
    const command = context.path.join(' ');
    for (const name of ['path', 'tasks']) {
        if (context.explicit.has(name)) {
            throw usageError(`--global controls every active project; --${name} would select one project.`, command, `Use \`ptbk ${command} --path <dir>\` for one project, or \`ptbk ${command} --global\` for all active projects.`);
        }
    }
    validateCombinations(context);
    const observation = await observeHost(context.env);
    const targets = observation.rows.filter((row) => row.status === 'live' || row.status === 'unreachable');
    const skipped = observation.rows.length - targets.length;
    const label = `ptbk ${command} --global`;
    if (observation.problem) context.terminal.writeError(`Discovery incomplete: ${observation.problem}\n`);
    if (!targets.length) {
        context.terminal.write(`${label}: no active projects.${skipped ? ` ${skipped} stopped or missing project(s) skipped.` : ''}\n`);
        return observation.problem ? EXIT.failure : EXIT.success;
    }
    context.terminal.write(`${label}: ${targets.length} active project(s).\n`);
    let cursor = 0;
    let succeeded = 0;
    let pending = 0;
    let failed = 0;
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, async () => {
        while (cursor < targets.length) {
            const target = targets[cursor++]!;
            const output: string[] = [];
            const errors: string[] = [];
            const terminal = createTerminalProfile({ raw: true, nonInteractive: true, terminalTitle: false, env: context.env });
            const local: CommandContext = {
                ...context,
                options: { ...context.options, global: false, path: target.projectRoot, raw: true, interactive: false, 'non-interactive': true, dashboard: false },
                explicit: new Set([...context.explicit].filter((name) => !['global', 'interactive'].includes(name)).concat(['path', 'raw', 'non-interactive', 'dashboard'])),
                terminal: { ...terminal, write: (text) => { output.push(text); }, writeError: (text) => { errors.push(text); } },
            };
            let code: number;
            let message: string;
            try {
                code = await run(local, target.engine?.instanceId);
                // Local raw lifecycle output starts with its outcome, followed by the full project status.
                message = (code === EXIT.success ? output.join('') : errors.join('') || output.join('')).trim().split(/\r?\n/)[0] || 'No outcome was reported.';
            } catch (error) {
                code = error instanceof PtbkError ? error.exitCode : EXIT.failure;
                message = [errorMessage(error), ...(error instanceof PtbkError ? [error.details.reason, error.details.next?.[0]] : [])].filter(Boolean).join(' ');
            }
            if (code === EXIT.success) succeeded++;
            else if (code === EXIT.incomplete) pending++;
            else failed++;
            context.terminal.write(`${target.projectName} (${target.projectRoot}): ${code !== EXIT.success && code !== EXIT.incomplete ? 'Failed: ' : ''}${message.replace(/\s+/g, ' ')}\n`);
        }
    }));
    context.terminal.write(`${label}: ${succeeded} succeeded, ${pending} pending, ${failed} failed.${skipped ? ` ${skipped} stopped or missing project(s) skipped.` : ''}\n`);
    return failed || observation.problem ? EXIT.failure : pending ? EXIT.incomplete : EXIT.success;
}
