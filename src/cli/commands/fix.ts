import { writeFile } from 'node:fs/promises';
import { clockTime } from '../../common/time.js';
import { EXIT, PtbkError, usageError } from '../../common/errors.js';
import { harnessPlugin } from '../../harness/registry.js';
import { ensureDirectory } from '../../common/fs.js';
import { runCheck, validateCheckCommand } from '../../project/checks.js';
import { enabledHarnesses, isCheckPlaceholder, loadSettings, setting } from '../../project/config.js';
import { newTaskPath, renderTaskBook } from '../../tasks/authoring.js';
import { lookupService } from '../../service/control.js';
import { ServiceHost } from '../../service/host.js';
import { generatedTaskName, selectedProject, settingOverrides, tasksOverride, writableTasksDirectory } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';
import { toReference } from '../../book/references.js';

/**
 * `ptbk fix`: run the project check; repair only failing validation (never the ordinary queue).
 *
 * @private command
 */
export default async function fix(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const overrides = { ...settingOverrides(context), 'server.isEnabled': false };
    const settings = await loadSettings(project, { env: context.env, cli: overrides });
    const check = setting<string | null | undefined>(settings, 'execution.check');
    const { terminal } = context;
    const validation = await validateCheckCommand(project.root, check, context.env);
    if (!validation.ok) throw new PtbkError('No usable project check is configured.', { kind: 'setup', project: project.root, reason: validation.reason, next: ['Configure it with `ptbk init --check "<command>"` or pass `--check`.'] });
    if (flag(context, 'dry-run')) {
        terminal.write(`Dry run: would run \`${check}\` and, only if it fails, create and execute a repair task.\n`);
        return EXIT.success;
    }
    if (isCheckPlaceholder(check)) {
        terminal.write('Real automated validation is not configured: execution.check holds the informational placeholder, so there is nothing to repair (and no model call or commit). Configure a real check in ptbk.json execution.check.\n');
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
    // Explicit --harness/--model/--thinking-level are this operation's MODEL requirement (a tool name restricts the instance).
    const harnessOption = option<string>(context, 'harness');
    const tool = harnessOption && !harnessPlugin(harnessOption) ? settings.tools.find((candidate) => candidate.type === 'HARNESS' && candidate.name === harnessOption) : undefined;
    if (harnessOption && !harnessPlugin(harnessOption) && !tool) throw usageError(`--harness ${harnessOption} is neither a harness variant nor a configured harness tool.`, 'fix');
    const variant = tool?.variant ?? (harnessOption ? harnessPlugin(harnessOption)!.variant : undefined);
    const requirement = [variant ? `harness=${variant}` : '', option<string>(context, 'model') ? `model=${option<string>(context, 'model')}` : '', option<string>(context, 'thinking-level') ? `thinking=${option<string>(context, 'thinking-level')}` : ''].filter(Boolean).join(' ');
    const commitments = [`TASK AGENT ${toReference(agent)}`, ...(requirement ? [`MODEL ${requirement}`] : []), 'TASK ORIGIN maintenance: failing project check'];
    await writeFile(
        taskPath,
        renderTaskBook({
            title: await generatedTaskName(project, settings, 'Repair the failing project check'),
            description: `The project check \`${check}\` fails (exit ${String(result.exitCode)}). Fix the underlying defects without weakening validation: do not delete assertions, disable rules, lower thresholds or skip checks.\n\nCheck output (tail):\n\n\`\`\`\n${result.output.slice(-6000)}\n\`\`\``,
            commitments,
        }),
        { flag: 'wx' },
    );
    if (!enabledHarnesses(settings).length && !harnessOption) throw new PtbkError('No harness is available to repair the check.', { kind: 'setup', next: ['Pass `--harness <variant|tool>` or enable a harness tool (`ptbk tool list`).'] });
    const host = new ServiceHost({
        project,
        mode: 'maintenance',
        env: context.env,
        cli: overrides,
        cliHarnesses: harnessOption ? [harnessOption] : undefined,
        tasksDirectory: tasksOverride(context),
        persistent: null,
        onEvent: (text, level) => terminal.write(`${clockTime()} ${level === 'info' ? '' : `${level.toUpperCase()}: `}${text}\n`),
    });
    await host.start();
    try {
        const outcome = await host.agenda.executeMaintenance(taskPath, check!, { tool: tool?.name });
        if (outcome.kind === 'completed') {
            terminal.write(`Repaired; the check passes${outcome.commit ? ` (committed ${outcome.commit.slice(0, 8)})` : ''}.\n`);
            return EXIT.success;
        }
        terminal.write(`The repair did not complete: ${outcome.kind}${'reason' in outcome ? ` — ${outcome.reason}` : ''}. Inspect with \`ptbk recover\`.\n`);
        return outcome.kind === 'awaiting-user' || outcome.kind === 'awaiting-wallet' ? EXIT.incomplete : EXIT.failure;
    } finally {
        await host.shutdown();
    }
}
