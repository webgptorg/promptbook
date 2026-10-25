import { EXIT, PtbkError } from '../common/errors.js';
import { pathExists } from '../common/fs.js';
import { ENGINE_VERSION } from '../common/version.js';
import { projectAt, type Project } from '../project/workspace.js';
import { lookupService, type ServiceLookup } from '../service/control.js';
import type { EngineSummary } from '../service/discovery.js';
import { CANCELLED, selectOne, type Choice } from '../ui/prompts.js';
import { createTerminalProfile } from '../ui/terminal.js';
import { createCommandContext } from './context.js';
import { renderTopLevelHelp } from './help.js';
import { parseInvocation } from './parser.js';
import type { CommandSpec } from './spec.js';

/**
 * Actions offered by bare interactive `ptbk`: one focused lifecycle action and Help.
 *
 * @private bare-command picker
 */
export type PickedAction = 'init' | 'start' | 'dashboard' | 'help';

/**
 * The selected directory's initialization and verified engine ownership, which decide the focused choice.
 *
 * @private bare-command picker
 */
export type BareContext =
    | { readonly kind: 'uninitialized'; readonly project: Project }
    | { readonly kind: 'stopped'; readonly project: Project }
    /** A verified owner exists (`running`, `pausing`, `pause` or `stopping`). */
    | { readonly kind: 'live'; readonly project: Project; readonly version: string; readonly state?: string }
    /** An owner is recorded and alive but cannot be verified: neither assumed stopped nor attached. */
    | { readonly kind: 'unknown'; readonly project: Project; readonly lookup: Extract<ServiceLookup, { state: 'unreachable' }> };

/**
 * Inspects the selected directory without starting, initializing, migrating or changing anything: `ptbk.json` marks an
 * initialized project (missing or disabled tools do not make it uninitialized) and the engine owner is verified through
 * the canonical project's process record, whatever installation or path spelling launched it.
 *
 * @private bare-command picker
 */
export async function bareContext(project: Project): Promise<BareContext> {
    if (!(await pathExists(project.configPath))) return { kind: 'uninitialized', project };
    const lookup = await lookupService(project).catch(() => undefined);
    if (!lookup || lookup.state === 'stopped') return { kind: 'stopped', project };
    if (lookup.state === 'unreachable') return { kind: 'unknown', project, lookup };
    // The lifecycle state is read-only context; an engine of another contract may not answer `summary`.
    const summary = await lookup.client.request<EngineSummary>('summary', {}, 3000).catch(() => undefined);
    return { kind: 'live', project, version: lookup.engine.version, state: summary?.state };
}

/**
 * Exactly two choices: the focused action of the directory's state (Initialize project, Start project or Open
 * dashboard), then Open help. Restart is never offered here and the three lifecycle actions never appear together.
 *
 * @private bare-command picker
 */
export function bareChoices(context: Exclude<BareContext, { kind: 'unknown' }>): readonly [Choice<PickedAction>, Choice<PickedAction>] {
    const help: Choice<PickedAction> = { value: 'help', label: 'Open help', description: '`ptbk help`: every command and option' };
    if (context.kind === 'uninitialized') return [{ value: 'init', label: 'Initialize project', description: '`ptbk init`: describe your project and set it up here' }, help];
    if (context.kind === 'stopped') return [{ value: 'start', label: 'Start project', description: '`ptbk start`: run the agenda in the background, then open its dashboard' }, help];
    return [{ value: 'dashboard', label: 'Open dashboard', description: `\`ptbk dashboard\`: watch and control the ${context.state ?? 'running'} engine` }, help];
}

/**
 * One line of version/project context for the picker.
 */
function contextLine(context: Exclude<BareContext, { kind: 'unknown' }>): string {
    if (context.kind === 'uninitialized') return `${context.project.root}: not a Promptbook project yet`;
    if (context.kind === 'stopped') return `${context.project.name}: initialized, no engine running`;
    return `${context.project.name}: engine ptbk ${context.version} ${context.state ?? 'running'}`;
}

/**
 * Value of an option in raw arguments (`--name value` or `--name=value`).
 */
function rawOption(argv: readonly string[], name: string): string | undefined {
    for (let index = 0; index < argv.length; index++) {
        const token = argv[index]!;
        if (token === `--${name}`) return argv[index + 1];
        if (token.startsWith(`--${name}=`)) return token.slice(name.length + 3);
    }
    return undefined;
}

/**
 * Bare interactive `ptbk`: exactly two choices for the selected directory (`--path`, else the current directory) —
 * the focused action of its verified state and Open help. Showing or cancelling it changes nothing. Before acting the
 * state is revalidated, so a concurrent init/start cannot lead to a duplicate engine or a silent initialization; the
 * selection then runs the existing command workflow unchanged (start keeps its dashboard handoff and opt-outs).
 *
 * @private CLI entry point
 */
export async function runActionPicker(commands: readonly CommandSpec[], options: { readonly argv: readonly string[] }): Promise<number> {
    const terminal = createTerminalProfile({ raw: false, interactive: true });
    const path = rawOption(options.argv, 'path');
    const tasks = rawOption(options.argv, 'tasks');
    const project = projectAt(path ?? '.');
    const forwarded = [...(path ? ['--path', project.root] : []), ...(tasks ? ['--tasks', tasks] : []), ...options.argv.filter((token) => token === '--interactive' || token === '--no-terminal-title')];
    let note: string | undefined;
    for (;;) {
        const context = await bareContext(project);
        if (context.kind === 'unknown') {
            throw new PtbkError('A ptbk engine is recorded for this project, but it does not answer.', {
                kind: 'conflict',
                project: project.root,
                reason: `PID ${context.lookup.record.pid}: ${context.lookup.reason}`,
                effect: 'Nothing was started or initialized; the recorded process was not touched.',
                next: ['Run `ptbk status` to inspect it (it may still be starting).', 'If it stays unreachable, `ptbk stop --force` terminates that verified engine.'],
            });
        }
        const choices = bareChoices(context);
        const picked = await selectOne(terminal, {
            frame: { title: `Promptbook · ptbk ${ENGINE_VERSION}`, step: contextLine(context), guide: { name: 'Expert', activity: 'idle', note: note ?? 'What would you like to do?' } },
            question: 'What do you want to do?',
            choices,
            defaultValue: choices[0].value,
            escapeLabel: 'Esc cancel (nothing happens)',
        });
        if (picked === CANCELLED) return EXIT.success;
        if (picked === 'help') {
            process.stdout.write(renderTopLevelHelp(commands, createTerminalProfile({ raw: false, nonInteractive: true })));
            return EXIT.success;
        }
        // The state may have changed while the menu was open (another terminal initialized or started the project).
        const current = await bareContext(project);
        if (current.kind !== context.kind) {
            note = `The project changed while this menu was open (${current.kind === 'unknown' ? 'an unverified engine appeared' : contextLine(current)}); nothing was done. Choose again.`;
            continue;
        }
        const argv = [picked, ...forwarded];
        const invocation = parseInvocation(argv, commands);
        if (invocation.kind !== 'command' || !invocation.spec.run) return EXIT.failure;
        return await invocation.spec.run(createCommandContext({ path: invocation.path, spec: invocation.spec, options: invocation.options, explicit: invocation.explicit, positionals: invocation.positionals, argv }));
    }
}
