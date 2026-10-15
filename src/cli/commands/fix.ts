import { writeFile } from 'node:fs/promises';
import { clockTime } from '../../common/time.js';
import { EXIT, PtbkError } from '../../common/errors.js';
import { ensureDirectory } from '../../common/fs.js';
import { runCheck, validateCheckCommand } from '../../project/checks.js';
import { loadSettings, setting } from '../../project/config.js';
import { newTaskPath, renderTaskBook } from '../../tasks/authoring.js';
import { lookupService } from '../../service/control.js';
import { ServiceHost } from '../../service/host.js';
import { selectedProject, settingOverrides, tasksOverride, writableTasksDirectory } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';

/**
 * `ptbk fix`: run the project check; repair only failing validation (never the ordinary queue).
 *
 * @private command
 */
export default async function fix(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const overrides = { ...settingOverrides(context), 'server.enabled': false };
    const settings = await loadSettings(project, { env: context.env, cli: overrides });
    const check = setting<string | null | undefined>(settings, 'execution.check');
    const { terminal } = context;
    const validation = await validateCheckCommand(project.root, check, context.env);
    if (!validation.ok) throw new PtbkError('No usable project check is configured.', { kind: 'setup', project: project.root, reason: validation.reason, next: ['Configure it with `ptbk init --check "<command>"` or pass `--check`.'] });
    if (flag(context, 'dry-run')) {
        terminal.write(`Dry run: would run \`${check}\` and, only if it fails, create and execute a repair task.\n`);
        return EXIT.success;
    }
    terminal.write(`Running the project check: ${check}\n`);
    const result = await runCheck(project.root, check!, { env: context.env, onLine: terminal.pretty ? undefined : (line) => terminal.write(`  ${line}\n`) });
    if (result.passed) {
        terminal.write(`${terminal.pretty ? terminal.style.success('✔ ') : ''}The project check passes (${Math.round(result.durationMs / 1000)}s); nothing to repair and nothing was committed.\n`);
        return EXIT.success;
    }
    if ((await lookupService(project)).state === 'running') {
        throw new PtbkError('The check fails, but a running service owns this project.', { kind: 'conflict', project: project.root, next: ['Stop the service (`ptbk stop`) to run `ptbk fix`, or add a repair task with `ptbk add`.'] });
    }
    const tasksDirectory = await writableTasksDirectory(context, project, settings);
    await ensureDirectory(tasksDirectory);
    const taskPath = await newTaskPath(tasksDirectory, 'repair failing project check', Date.now(), setting<string>(settings, 'timezone'));
    const agent = option<string>(context, 'agent') ?? setting<string>(settings, 'routing.defaultAgent');
    const commitments = [`TASK AGENT ${agent.startsWith('@') || agent.startsWith('{') ? agent : `{${agent}}`}`, 'TASK ORIGIN maintenance: failing project check'];
    if (option<string>(context, 'harness')) commitments.push(`TASK HARNESS ${option<string>(context, 'harness')}`);
    if (option<string>(context, 'model')) commitments.push(`TASK MODEL ${option<string>(context, 'model')}`);
    await writeFile(
        taskPath,
        renderTaskBook({
            title: 'Repair the failing project check',
            description: `The project check \`${check}\` fails (exit ${String(result.exitCode)}). Fix the underlying defects without weakening validation: do not delete assertions, disable rules, lower thresholds or skip checks.\n\nCheck output (tail):\n\n\`\`\`\n${result.output.slice(-6000)}\n\`\`\``,
            commitments,
        }),
        { flag: 'wx' },
    );
    const harness = option<string>(context, 'harness') ?? setting<string | undefined>(settings, 'routing.harness') ?? Object.entries(settings.harnesses).find(([, value]) => value.enabled)?.[0];
    if (!harness) throw new PtbkError('No harness is available to repair the check.', { kind: 'setup', next: ['Pass `--harness <id>` or run `ptbk init`.'] });
    const host = new ServiceHost({
        project,
        mode: 'run',
        env: context.env,
        cli: overrides,
        tasksDirectory: tasksOverride(context),
        persistent: null,
        allowTunnelInstall: false,
        run: { selection: { agent: agent.startsWith('@') || agent.startsWith('{') ? agent : `{${agent}}`, harness, model: option<string>(context, 'model') } },
        onEvent: (text, level) => terminal.write(`${clockTime()} ${level === 'info' ? '' : `${level.toUpperCase()}: `}${text}\n`),
    });
    await host.start();
    try {
        const outcome = await host.agenda.executeMaintenance(taskPath, check!);
        if (outcome.kind === 'completed') {
            terminal.write(`Repaired; the check passes${outcome.commit ? ` (committed ${outcome.commit.slice(0, 8)})` : ''}.\n`);
            return EXIT.success;
        }
        terminal.write(`The repair did not complete: ${outcome.kind}${'reason' in outcome ? ` — ${outcome.reason}` : ''}. Inspect with \`ptbk recover\`.\n`);
        return outcome.kind === 'awaiting-user' ? EXIT.incomplete : EXIT.failure;
    } finally {
        await host.shutdown();
    }
}
