import { userInfo } from 'node:os';
import { EXIT, usageError } from '../../common/errors.js';
import { clockTime } from '../../common/time.js';
import { projectAt } from '../../project/workspace.js';
import { forceStopEngine, type ForceStopResult } from '../../service/launcher.js';
import { observeHost, type GlobalRow } from '../../ui/global-dashboard.js';
import { CANCELLED, confirm } from '../../ui/prompts.js';
import { symbols } from '../../ui/terminal.js';
import { flag, type CommandContext } from '../context.js';

/**
 * Every accessible active engine of this OS user: verified live owners and recorded owners that do not answer (an
 * unresponsive or HTTP-less engine is still a target). Found through host discovery, never by process names.
 */
async function panicTargets(env: NodeJS.ProcessEnv): Promise<{ readonly targets: readonly GlobalRow[]; readonly problem?: string }> {
    const observation = await observeHost(env);
    return { targets: observation.rows.filter((row) => (row.status === 'live' || row.status === 'unreachable') && row.engine), problem: observation.problem };
}

/**
 * The OS user whose engines are visible.
 */
function currentUser(): string {
    try {
        return userInfo().username;
    } catch {
        return 'this user';
    }
}

/**
 * One line naming a target.
 */
function targetLine(row: GlobalRow): string {
    const state = row.status === 'live' ? `${row.state ?? 'running'}${row.intent ? ` → ${row.intent}` : ''}` : 'not answering';
    return `${row.projectName} (${state}, ${row.engine!.mode} PID ${row.engine!.pid}) · ${row.projectRoot}`;
}

/**
 * `ptbk panic`: the confirmed emergency force stop of every accessible active Promptbook engine on this computer,
 * independent of the current directory, installation and version. Each engine and all its owned execution end through
 * the shared whole-engine force stop without graceful waiting; every target is attempted independently and records a
 * deliberate stop, so no supervisor, pending restart or reboot brings it back. Projects stay registered as stopped.
 * There are no soft or pause variants; without a terminal `--yes` is required and nothing is ever prompted.
 *
 * @private command
 */
export default async function panic(context: CommandContext): Promise<number> {
    for (const name of ['soft', 'pause']) {
        if (context.explicit.has(name)) throw usageError(`ptbk panic has no --${name} variant: it always force-stops immediately.`, 'panic', 'For a graceful stop or a pause of every project, open `ptbk dashboard --global` and press A, then X (stop all) or P (pause all).');
    }
    for (const name of ['path', 'tasks']) {
        if (context.explicit.has(name)) throw usageError(`ptbk panic stops every accessible engine on this computer; --${name} would restrict it to one project.`, 'panic', 'Use `ptbk stop --force --path <dir>` to force-stop one project.');
    }
    const { terminal } = context;
    const { style } = terminal;
    const marks = symbols(terminal.unicode);
    const yes = flag(context, 'yes') === true;
    const coverage = `Engines of other OS users are not visible to ${currentUser()} and are not affected.`;
    if (!yes && !terminal.interactive) {
        throw usageError('ptbk panic needs confirmation, and there is no terminal to ask.', 'panic', 'Run `ptbk panic --yes` to force-stop every active engine now. Nothing was changed.');
    }
    let found = await panicTargets(context.env);
    if (found.problem) terminal.write(`${style.warning('Discovery problem:')} ${found.problem} The list may be incomplete.\n`);
    if (!found.targets.length) {
        terminal.write(`No active Promptbook engines of ${currentUser()} on this computer; nothing was stopped. ${coverage}\n`);
        return EXIT.success;
    }
    if (!yes) {
        terminal.write(`${style.bold(style.error(`${marks.warn} Emergency stop`))}: these ${found.targets.length} engine${found.targets.length === 1 ? '' : 's'} and every harness, helper and browser process they own will be terminated immediately, without letting current work finish (interrupted work keeps its recovery record):\n`);
        for (const row of found.targets) terminal.write(`  ${marks.bullet} ${targetLine(row)}\n`);
        terminal.write(`${style.muted(`They stay stopped (also after reboot) until you start them explicitly. ${coverage}`)}\n\n`);
        const answer = await confirm(terminal, { frame: { title: 'ptbk panic', step: 'Confirm the emergency stop' }, question: `Force-stop all ${found.targets.length} engine${found.targets.length === 1 ? '' : 's'} now?`, defaultYes: false, yesLabel: 'Yes, force-stop everything now', noLabel: 'No, change nothing' });
        if (answer !== true) {
            terminal.write(`${answer === CANCELLED ? 'Cancelled' : 'Declined'}; nothing was changed.\n`);
            return EXIT.success;
        }
        // One confirmation covers the operation: engines started meanwhile are included.
        found = await panicTargets(context.env);
    }
    terminal.write(`${clockTime()} Force-stopping ${found.targets.length} engine${found.targets.length === 1 ? '' : 's'}…\n`);
    // Every target is attempted independently and at once; none waits for another's response.
    const results = await Promise.all(
        found.targets.map(async (row): Promise<{ row: GlobalRow; result: ForceStopResult }> => {
            try {
                return { row, result: await forceStopEngine(projectAt(row.projectRoot), { expected: row.engine }) };
            } catch (error) {
                return { row, result: { status: 'failed', killed: false, warnings: [], message: (error as Error).message } };
            }
        }),
    );
    const counts = { terminated: 0, 'not-running': 0, unconfirmed: 0, failed: 0 };
    for (const { row, result } of results) {
        counts[result.status]++;
        const mark = result.status === 'terminated' ? style.success(marks.ok) : result.status === 'not-running' ? style.muted(marks.ok) : style.error(marks.fail);
        terminal.write(`${mark} ${row.projectName} (PID ${row.engine!.pid}): ${result.status === 'not-running' ? 'had already ended. ' : ''}${result.message}${result.warnings.length ? ` ${style.warning(result.warnings.join(' '))}` : ''}\n`);
    }
    const unsuccessful = counts.unconfirmed + counts.failed;
    const summary = [`${counts.terminated} terminated`, ...(counts['not-running'] ? [`${counts['not-running']} already ended`] : []), ...(counts.unconfirmed ? [`${counts.unconfirmed} unconfirmed`] : []), ...(counts.failed ? [`${counts.failed} failed`] : [])].join(', ');
    terminal.write(`${(unsuccessful ? style.error : style.success)(`Panic: ${summary}.`)} Stopped projects stay listed in \`ptbk dashboard --global\` and do not restart automatically; start them explicitly (\`ptbk start\`, or S there). ${coverage}\n`);
    return unsuccessful ? EXIT.failure : EXIT.success;
}
