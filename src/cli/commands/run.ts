import { EXIT, PtbkError } from '../../common/errors.js';
import { clockTime, formatShortTime } from '../../common/time.js';
import { assertValidSettings, enabledHarnesses, isCheckPlaceholder, loadSettings, setting, type ThinkingLevel } from '../../project/config.js';
import { harnessPluginId, type HarnessToolRecord } from '../../tools/model.js';
import { runCheck } from '../../project/checks.js';
import { inspectGit } from '../../project/git.js';
import { previewQueue } from '../../engine/preview.js';
import type { RunSelection } from '../../engine/routing.js';
import { ServiceHost } from '../../service/host.js';
import { lookupService } from '../../service/control.js';
import { harnessPlugin } from '../../harness/registry.js';
import { runDashboard } from '../../ui/dashboard.js';
import { confirm } from '../../ui/prompts.js';
import { browserOverrides, printJson, selectedProject, settingOverrides, tasksOverride, validateCombinations } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';
import { hostSource } from '../sources.js';
import { ownerSignals } from '../lifecycle.js';
import { toReference } from '../../book/references.js';

/**
 * Describes the effective check honestly (the informational placeholder is not real validation).
 */
function describeCheck(check: string | null | undefined): string {
    if (!check) return 'not configured';
    return isCheckPlaceholder(check) ? 'real automated validation is not configured (informational placeholder)' : check;
}

/**
 * Resolves the one configuration of a finite run (flags, then project defaults, then legacy environment). The harness
 * is a variant (its ordered same-variant instances may serve it) or one explicitly named instance.
 */
function runSelection(context: CommandContext, settings: Awaited<ReturnType<typeof loadSettings>>): RunSelection {
    const harness = option<string>(context, 'harness') ?? setting<string | undefined>(settings, 'routing.harness') ?? enabledHarnesses(settings)[0];
    if (!harness) {
        throw new PtbkError('No harness is selected for this run.', { kind: 'setup', next: ['Pass `--harness <variant|tool>` or enable a harness tool (`ptbk tool list`).'] });
    }
    const instance = settings.tools.find((tool): tool is HarnessToolRecord => tool.type === 'HARNESS' && tool.name === harness);
    if (!harnessPlugin(harness) && !instance) throw new PtbkError(`Unknown harness "${harness}".`, { kind: 'usage', next: ['Use a variant such as openai-codex or a harness tool name from `ptbk tool list`.'] });
    const variant = instance ? harnessPluginId(instance.variant) : harness;
    const preferred = instance ?? settings.tools.find((tool): tool is HarnessToolRecord => tool.type === 'HARNESS' && tool.isEnabled && harnessPluginId(tool.variant) === variant);
    const isDefault = setting<string | undefined>(settings, 'routing.harness') === variant;
    const agentName = option<string>(context, 'agent') ?? setting<string>(settings, 'routing.defaultAgent');
    return {
        agent: toReference(agentName),
        harness,
        model: option<string>(context, 'model') ?? preferred?.model ?? (isDefault ? setting<string | undefined>(settings, 'routing.model') : undefined),
        thinkingLevel: option<ThinkingLevel>(context, 'thinking-level') ?? preferred?.thinkingLevel ?? (isDefault ? setting<ThinkingLevel | undefined>(settings, 'routing.thinkingLevel') : undefined),
    };
}

/**
 * `ptbk run`: execute the existing eligible queue once with one configuration, then exit.
 *
 * @private command
 */
export default async function run(context: CommandContext): Promise<number> {
    validateCombinations(context);
    const project = await selectedProject(context);
    const overrides = settingOverrides(context);
    if (flag(context, 'server') !== true) overrides['server.isEnabled'] = false;
    const browser = browserOverrides(context);
    const base = await loadSettings(project, { env: context.env, cli: overrides, cliBrowser: browser });
    // The run uses one harness: a variant without a configured instance gets a temporary native one (never saved).
    const chosen = option<string>(context, 'harness') ?? setting<string | undefined>(base, 'routing.harness') ?? enabledHarnesses(base)[0];
    const cliHarnesses = chosen ? [chosen] : undefined;
    const settings = cliHarnesses ? await loadSettings(project, { env: context.env, cli: overrides, cliBrowser: browser, cliHarnesses }) : base;
    assertValidSettings(settings, project);
    const { terminal } = context;
    const dryRun = flag(context, 'dry-run') === true;
    const selection = runSelection(context, settings);
    const preview = await previewQueue(project, { settings, mode: 'run', runSelection: selection, tasksDirectory: tasksOverride(context), env: context.env });
    const minimum = option<number>(context, 'min-priority');
    const maximum = option<number>(context, 'max-priority');
    const inBounds = (priority: number): boolean => (minimum === undefined || priority >= minimum) && (maximum === undefined || priority <= maximum);
    const selected = preview.evaluated.filter((item) => item.readiness.kind === 'ready' && inBounds(item.task.priority.value));
    if (dryRun) {
        const inspection = preview.pool.inspection(selection.harness);
        if (flag(context, 'json')) {
            printJson({
                selection,
                harness: inspection ? { usable: inspection.usable, summary: inspection.summary, version: inspection.version } : undefined,
                check: setting<string | null | undefined>(settings, 'execution.check') ?? null,
                isCheckPlaceholder: isCheckPlaceholder(setting<string | null | undefined>(settings, 'execution.check')),
                tasks: preview.evaluated
                    .filter((item) => !['done', 'retired'].includes(item.readiness.kind))
                    .map((item) => ({ ref: item.task.ref, title: item.task.title, kind: item.readiness.kind, reason: item.readiness.reason, priority: item.task.priority.value, selected: selected.includes(item) })),
            });
            return EXIT.success;
        }
        const lines = [
            `Dry run (nothing is executed): ${selected.length} task(s) would run with ${selection.agent} on ${selection.harness}${selection.model ? ` ${selection.model}` : ''}${selection.thinkingLevel ? ` (${selection.thinkingLevel})` : ''}.`,
            `Harness: ${inspection?.summary ?? 'not inspected'}`,
            `Check: ${describeCheck(setting<string | null | undefined>(settings, 'execution.check'))}`,
        ];
        for (const item of preview.evaluated.filter((candidate) => !['done', 'retired'].includes(candidate.readiness.kind))) {
            lines.push(`${selected.includes(item) ? (terminal.pretty ? terminal.style.success('▶') : '>') : ' '} [${item.readiness.kind}] ${item.task.title} (${item.task.ref}) — ${item.readiness.reason}`);
        }
        terminal.write(`${lines.join('\n')}\n`);
        return EXIT.success;
    }
    const existing = await lookupService(project);
    if (existing.state === 'running') {
        throw new PtbkError('A ptbk service already owns this project.', { kind: 'conflict', project: project.root, reason: `${existing.record.mode} process ${existing.record.pid}`, next: ['Stop it with `ptbk stop`, or let it process the queue.'] });
    }
    const gitInfo = await inspectGit(project.root);
    if (gitInfo.state !== 'repository') throw new PtbkError('The project is not in a Git working tree.', { kind: 'setup', project: project.root, next: ['Run `ptbk init`.'] });
    const checkBefore = setting<string>(settings, 'execution.checkBefore');
    const check = setting<string | null | undefined>(settings, 'execution.check');
    if (checkBefore !== 'no' && isCheckPlaceholder(check)) {
        terminal.write('Pre-run check skipped: real automated validation is not configured (execution.check holds the informational placeholder).\n');
    } else if (checkBefore !== 'no') {
        if (!check) throw new PtbkError('--check-before needs a configured check.', { kind: 'setup', next: ['Pass `--check "<command>"`.'] });
        const result = await runCheck(project.root, check, { env: context.env });
        if (!result.passed) {
            if (checkBefore === 'yes-and-fail') throw new PtbkError('The project check fails before the run.', { kind: 'conflict', reason: result.output.slice(-2000), effect: 'No task was started.', next: ['Fix the check first (`ptbk fix`), or use --check-before yes-and-fix.'] });
            terminal.write('The check fails; repairing it first (ptbk fix)…\n');
            const fix = (await import('./fix.js')).default;
            const code = await fix(context);
            if (code !== EXIT.success) return code;
        }
    }
    const live = terminal.pretty && terminal.interactive && flag(context, 'json') !== true;
    const host = new ServiceHost({
        project,
        mode: 'run',
        env: context.env,
        cli: overrides,
        cliHarnesses,
        cliBrowser: browser,
        tasksDirectory: tasksOverride(context),
        persistent: null,
        allowTunnelInstall: true,
        run: {
            selection,
            minPriority: minimum,
            maxPriority: maximum,
            limit: option<number>(context, 'limit'),
            confirm: flag(context, 'auto') === false ? async (task) => (await confirm(terminal, { frame: { title: 'ptbk run', step: 'Confirm task' }, question: `Run "${task.title}" (${task.ref}) now?`, defaultYes: true })) === true : undefined,
        },
        onEvent: live ? undefined : (text, level) => terminal.write(`${clockTime()} ${level === 'info' ? '' : `${level.toUpperCase()}: `}${text}\n`),
    });
    await host.start();
    // The run owns its engine: termination drains gracefully (a second Ctrl+C forces) and keeps recovery state.
    const removeSignals = ownerSignals(host.agenda, (line) => terminal.write(line));
    let summary;
    try {
        const agenda = host.runAgenda();
        if (live && flag(context, 'auto') !== false) {
            void runDashboard(terminal, hostSource(host), { noQr: flag(context, 'qr') === false }).then(() => host.agenda.requestStop({}));
        }
        summary = await agenda;
    } finally {
        removeSignals();
        await host.shutdown();
    }
    if (live) process.stdout.write('\x1b[?25h\x1b[?1049l');
    const next = summary.nextTime ? ` Next scheduled work: ${formatShortTime(summary.nextTime)}.` : '';
    terminal.write(`${terminal.pretty ? terminal.style.bold('Run finished: ') : 'Run finished: '}${summary.message}.${next}\n`);
    if (summary.outcome === 'failed') return EXIT.failure;
    if (summary.outcome === 'incomplete') return EXIT.incomplete;
    return EXIT.success;
}
