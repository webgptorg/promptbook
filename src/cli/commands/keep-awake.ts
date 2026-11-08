import { spawn } from 'node:child_process';
import { userInfo } from 'node:os';
import { EXIT, PtbkError, errorMessage, usageError } from '../../common/errors.js';
import { IpcError } from '../../common/ipc.js';
import { formatShortTime } from '../../common/time.js';
import { LID_DAEMON_PATH, LID_HELPER_PATH, LID_SUDOERS_PATH, lidInstallScript, lidRemoveScript, verifyLidHelper } from '../../power/mac-lid-helper.js';
import { effectiveKeepAwakeMode, parseKeepAwakeMode, readKeepAwakePreference, readLastWork, saveKeepAwakePreference, type KeepAwakeChange } from '../../power/preference.js';
import type { KeepAwakeView } from '../../power/view.js';
import type { Project } from '../../project/workspace.js';
import { lookupService } from '../../service/control.js';
import { keepAwakeLines, keepAwakeModeLabel, lastWorkLabel, powerSourceLabel, protectionLabel, stoppedKeepAwakeView } from '../../ui/keep-awake.js';
import { renderPanel } from '../../ui/panels.js';
import { confirm } from '../../ui/prompts.js';
import { printJson, selectedProject } from '../common.js';
import { flag, type CommandContext } from '../context.js';

/**
 * How long the engine may take to apply a change (it waits for the OS to confirm or release a request).
 */
const ENGINE_TIMEOUT_MS = 30_000;

/**
 * The keep-awake view of the project's running engine, or the saved choice of a stopped one.
 */
type Observed = { readonly view: KeepAwakeView; readonly running: boolean };

/**
 * Older engines can share the control contract while lacking the keep-awake operations.
 */
function missingMethod(error: unknown): boolean {
    return error instanceof IpcError && error.stage === 'remote' && /^Unknown control method keep-awake/.test(error.message);
}

/**
 * Reads (and with `change`, applies) the keep-awake choice through the running engine, the owner of the OS request.
 * A stopped project's choice is read and saved directly in the host-local preference; it applies when the engine runs.
 */
async function observe(project: Project, env: NodeJS.ProcessEnv, change?: KeepAwakeChange): Promise<Observed> {
    const lookup = await lookupService(project);
    if (lookup.state === 'unreachable') throw new PtbkError(`The project's engine (PID ${lookup.record.pid}) does not answer: ${lookup.reason}`, { kind: 'technical', next: ['ptbk status'] });
    if (lookup.state === 'running') {
        try {
            const view = await lookup.client.request<KeepAwakeView>(change ? 'keep-awake-set' : 'keep-awake', change ? { ...change } : {}, ENGINE_TIMEOUT_MS);
            return { view, running: true };
        } catch (error) {
            if (missingMethod(error)) throw new PtbkError(`The running engine is ptbk ${lookup.engine.version}, which has no keep-awake control.`, { kind: 'unsupported', next: ['ptbk restart'] });
            throw error;
        }
    }
    const saved = change ? await saveKeepAwakePreference(project.root, change, env) : await readKeepAwakePreference(project.root, env);
    const mode = effectiveKeepAwakeMode(saved);
    return { view: stoppedKeepAwakeView({ mode, ...(mode === 'limited' ? { expiresAt: saved.expiresAt } : {}), closedLid: saved.closedLid, lastWorkAt: await readLastWork(project.root, env) }, process.platform), running: false };
}

/**
 * Prints the keep-awake status in the invocation's presentation.
 */
function render(context: CommandContext, observed: Observed, title = 'Keep awake', message?: string): void {
    const { terminal } = context;
    const { view, running } = observed;
    const time = (iso: string): string => formatShortTime(Date.parse(iso));
    if (!terminal.pretty) {
        const lines = [
            ...(message ? [message] : []),
            `Keep awake: ${keepAwakeModeLabel(view, time)}${view.closedLid ? ' (closed-lid operation chosen)' : ''}`,
            ...(running ? [`Power: ${powerSourceLabel(view)}`, `Idle sleep: ${protectionLabel(view.idle)} — ${view.idle.reason.text}`, `Lid: ${protectionLabel(view.lid)} — ${view.lid.reason.text}`] : ['The engine is stopped; it holds no request. The saved choice applies when it runs.']),
            `Last work: ${lastWorkLabel(view, time)}`,
        ];
        terminal.write(`${lines.join('\n')}\n`);
        return;
    }
    const { style } = terminal;
    const width = Math.min(terminal.columns(), 100);
    const lines = [...(message ? [message, ''] : []), ...keepAwakeLines(view, style, time, { stopped: !running })];
    terminal.write(`${renderPanel({ title, titleRight: view.holding ? 'keeping this computer awake' : view.mode === 'off' ? 'off' : 'not holding', lines, width, tone: view.holding ? 'success' : 'accent', unicode: terminal.unicode, style }).join('\n')}\n`);
}

/**
 * Runs a root script after the operator approves it with their administrator password in this terminal. Only an
 * interactive local terminal can do this: neither a remote client nor an agent can install or authorize the helper.
 */
async function asAdministrator(context: CommandContext, script: string): Promise<boolean> {
    if (!context.terminal.interactive) throw new PtbkError('Local administrator approval needs an interactive terminal on this Mac.', { kind: 'usage', next: ['Run it in a local terminal (in the desktop app, open a terminal).'] });
    const code = await new Promise<number | null>((resolve) => {
        const child = spawn('/usr/bin/sudo', ['-p', 'Administrator password for %u (Promptbook keep-awake helper): ', '/bin/sh', '-c', script], { stdio: 'inherit' });
        child.once('error', () => resolve(null));
        child.once('exit', (exitCode) => resolve(exitCode));
    });
    return code === 0;
}

/**
 * Asks the running engine to recheck what the host supports (after the helper was installed or removed).
 */
async function recheck(project: Project, env: NodeJS.ProcessEnv): Promise<Observed> {
    const saved = await readKeepAwakePreference(project.root, env);
    return await observe(project, env, { closedLid: saved.closedLid });
}

/**
 * Installs or removes the macOS closed-lid helper with explicit disclosure and local administrator approval.
 */
async function helper(context: CommandContext, project: Project, action: 'install' | 'remove'): Promise<number> {
    if (process.platform !== 'darwin') throw new PtbkError('The closed-lid helper exists only on macOS; on Windows and Linux closing the lid follows the OS lid policy.', { kind: 'unsupported' });
    const { terminal } = context;
    const user = userInfo().username;
    if (action === 'install') {
        // The helper is offered only once closed-lid operation is explicitly chosen; installing it is that choice.
        terminal.write(
            [
                'Closed-lid operation keeps this Mac awake with its lid closed and no external display. macOS sleeps on lid closure, and an ordinary idle assertion cannot prevent that,',
                'so a small helper needs local administrator approval:',
                `  • ${LID_HELPER_PATH}: a root-owned shell script you can read. It can only hold, report and restore the macOS "SleepDisabled" setting (pmset disablesleep).`,
                `  • ${LID_SUDOERS_PATH}: lets ${user} run only that script's "hold" and "status" without a password.`,
                `  • ${LID_DAEMON_PATH}: restores the setting at boot if a hold was left behind.`,
                'The setting changes only while an engine with closed-lid operation runs on external power. It returns to its previous value when the last such engine releases it, also after a crash or reboot,',
                'and a SleepDisabled you set yourself is never turned off. Remove everything with `ptbk keep-awake --remove-helper`.',
                '',
            ].join('\n'),
        );
        const answer = await confirm(terminal, { frame: { title: 'ptbk keep-awake', step: 'Closed-lid helper' }, question: 'Install the closed-lid helper now? sudo asks for your administrator password next.', defaultYes: false, yesLabel: 'Yes, install it', noLabel: 'No, keep idle-sleep protection only' });
        if (answer !== true) {
            terminal.write('Nothing was installed. Idle-sleep protection works without the helper; closing the lid still follows the OS policy.\n');
            return EXIT.incomplete;
        }
        if (!(await asAdministrator(context, lidInstallScript(user)))) {
            terminal.write('The helper was not installed (approval declined or the installation failed). Idle-sleep protection still works.\n');
            return EXIT.failure;
        }
        await saveKeepAwakePreference(project.root, { closedLid: true }, context.env);
        const state = await verifyLidHelper(context.env);
        render(context, await recheck(project, context.env), 'Keep awake', state.state === 'ready' ? 'The closed-lid helper is installed and authorized. Closed-lid operation is chosen for this project.' : `The helper was installed, but it does not verify: ${state.reason}`);
        return state.state === 'ready' ? EXIT.success : EXIT.failure;
    }
    const answer = await confirm(terminal, { frame: { title: 'ptbk keep-awake', step: 'Closed-lid helper' }, question: 'Remove the closed-lid helper? Running holds end and the setting it changed is restored; sudo asks for your password.', defaultYes: false, yesLabel: 'Yes, remove it', noLabel: 'No, keep it' });
    if (answer !== true) return EXIT.incomplete;
    if (!(await asAdministrator(context, lidRemoveScript()))) {
        terminal.write('The helper was not removed.\n');
        return EXIT.failure;
    }
    render(context, await recheck(project, context.env), 'Keep awake', 'The closed-lid helper was removed; engines continue with idle-sleep protection where it is available.');
    return EXIT.success;
}

/**
 * `ptbk keep-awake [off|limited|always] [--closed-lid|--no-closed-lid]`: shows or changes whether the project's engine
 * keeps this computer awake. It uses the same engine operation and status as the System page; a stopped project's
 * saved choice is changed directly and applies when the engine runs.
 *
 * @private command
 */
export default async function keepAwake(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const json = flag(context, 'json') === true;
    const install = flag(context, 'install-helper') === true;
    const remove = flag(context, 'remove-helper') === true;
    const closedLid = flag(context, 'closed-lid');
    const [modeText, ...extra] = context.positionals;
    if (extra.length) throw usageError(`Unexpected argument "${extra[0]}".`, 'keep-awake');
    if ((install || remove) && (modeText || closedLid !== undefined || json || (install && remove))) throw usageError('--install-helper and --remove-helper stand alone.', 'keep-awake');
    if (install || remove) return await helper(context, project, install ? 'install' : 'remove');
    const mode = modeText === undefined ? undefined : parseKeepAwakeMode(modeText);
    if (modeText !== undefined && !mode) throw usageError(`Unknown keep-awake mode "${modeText}".`, 'keep-awake', 'Use off, limited (two hours) or always (always on external power).');
    const change: KeepAwakeChange | undefined = mode || closedLid !== undefined ? { ...(mode ? { mode } : {}), ...(closedLid !== undefined ? { closedLid } : {}) } : undefined;
    let observed: Observed;
    try {
        observed = await observe(project, context.env, change);
    } catch (error) {
        if (json || !(error instanceof PtbkError)) throw error;
        throw new PtbkError(`Keep awake: ${errorMessage(error)}`, error.details);
    }
    if (json) {
        printJson({ ...observed.view, engine: observed.running ? 'running' : 'stopped' });
        return EXIT.success;
    }
    const message = !change ? undefined : `Saved: ${keepAwakeModeLabel(observed.view)}${observed.view.closedLid ? ', with closed-lid operation' : ''}.${observed.running ? '' : ' It applies when the engine runs.'}`;
    render(context, observed, 'Keep awake', message);
    const needsHelper = change?.closedLid === true && (observed.running ? observed.view.lid.capability === 'approval' : process.platform === 'darwin' && (await verifyLidHelper(context.env)).state !== 'ready');
    if (needsHelper) {
        context.terminal.write(`${context.terminal.pretty ? context.terminal.style.muted('Closed-lid operation needs the helper first: ') : 'Closed-lid operation needs the helper first: '}ptbk keep-awake --install-helper\n`);
    }
    return EXIT.success;
}
