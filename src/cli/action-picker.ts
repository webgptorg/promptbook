import { EXIT } from '../common/errors.js';
import { pathExists } from '../common/fs.js';
import { ENGINE_VERSION } from '../common/version.js';
import { projectAt } from '../project/workspace.js';
import { lookupService } from '../service/control.js';
import { CANCELLED, selectOne, type Choice } from '../ui/prompts.js';
import { createTerminalProfile } from '../ui/terminal.js';
import { createCommandContext } from './context.js';
import { parseInvocation } from './parser.js';
import type { CommandSpec } from './spec.js';

/**
 * Actions offered by bare interactive `ptbk`.
 */
type PickedAction = 'init' | 'start' | 'dashboard';

/**
 * Bare interactive `ptbk`: a small picker of Initialize project, Start engine and Open dashboard with the actual
 * engine version and the current directory's project context. Showing or cancelling it initializes, starts or
 * changes nothing; a selection invokes the existing command workflow unchanged (no duplicated logic).
 *
 * @private CLI entry point
 */
export async function runActionPicker(commands: readonly CommandSpec[], options: { readonly argv: readonly string[] }): Promise<number> {
    const terminal = createTerminalProfile({ raw: false, interactive: true });
    const project = projectAt('.');
    const initialized = await pathExists(project.configPath);
    // Read-only context: the project record of a running engine is inspected, never started or contacted to change it.
    const service = initialized ? await lookupService(project).catch(() => undefined) : undefined;
    const running = service?.state === 'running';
    const context = initialized ? `${project.name}: ${service?.state === 'running' ? `engine ptbk ${service.engine.version} running` : 'initialized project, engine not running'}` : `${project.root}: not a Promptbook project yet`;
    const choices: Array<Choice<PickedAction>> = [
        { value: 'init', label: 'Initialize project', description: initialized ? 'review or complete the setup of this project' : 'describe your project and set it up here' },
        { value: 'start', label: 'Start engine', description: running ? 'already running (reports it once)' : initialized ? 'start the ongoing agenda in the background' : 'offers setup first' },
        { value: 'dashboard', label: 'Open dashboard', description: running ? 'watch and control the running engine' : 'needs a running engine' },
    ];
    const picked = await selectOne(terminal, {
        frame: { title: `Promptbook · ptbk ${ENGINE_VERSION}`, step: context, guide: { name: 'Expert', activity: 'idle', note: 'What would you like to do? `ptbk help` lists every command.' } },
        question: 'What do you want to do?',
        choices,
        defaultValue: !initialized ? 'init' : running ? 'dashboard' : 'start',
        escapeLabel: 'Esc cancel (nothing happens)',
    });
    if (picked === CANCELLED) return EXIT.success;
    const invocation = parseInvocation([picked, ...options.argv], commands);
    if (invocation.kind !== 'command' || !invocation.spec.run) return EXIT.failure;
    return await invocation.spec.run(createCommandContext({ path: invocation.path, spec: invocation.spec, options: invocation.options, explicit: invocation.explicit, positionals: invocation.positionals, argv: [picked, ...options.argv] }));
}
