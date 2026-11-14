import { EXIT, PtbkError, usageError } from '../../common/errors.js';
import { activeConsumers } from '../../inference/host.js';
import { formatBytes } from '../../inference/hardware.js';
import { runRuntimeAction, type RuntimeActionOutcome } from '../../inference/management.js';
import { describeLocalPlan, discoverLocalSetup, planLocalSetup, prepareLocalSetup, type LocalSetupProgress } from '../../inference/setup.js';
import { RUNTIME_ACTIONS, type RuntimeAction, type RuntimeModel, type RuntimeProgress } from '../../inference/types.js';
import { loadSettings } from '../../project/config.js';
import type { Project } from '../../project/workspace.js';
import { lookupService } from '../../service/control.js';
import { dependentHarnesses, HARNESS_VARIANTS, INFERENCE_RUNTIME_VARIANTS, type HarnessVariant, type InferenceRuntimeToolRecord, type InferenceRuntimeVariant } from '../../tools/model.js';
import { CANCELLED, confirm, selectOne } from '../../ui/prompts.js';
import { symbols } from '../../ui/terminal.js';
import { printJson, selectedProject } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';
import { execute } from './tool.js';

/**
 * Prints download/installation progress: one updating line in an interactive terminal, sparse lines otherwise.
 */
function progressPrinter(context: CommandContext): { readonly update: (progress: { readonly message: string; readonly completedBytes?: number; readonly totalBytes?: number }) => void; readonly done: () => void } {
    const { terminal } = context;
    const live = terminal.interactive && !flag(context, 'json');
    let lastLine = '';
    let lastPercent = -10;
    let pending = false;
    return {
        update: (progress) => {
            if (flag(context, 'json')) return;
            const percent = progress.totalBytes ? Math.floor(((progress.completedBytes ?? 0) / progress.totalBytes) * 100) : undefined;
            const line = `${progress.message}${percent !== undefined ? ` — ${percent}% (${formatBytes(progress.completedBytes ?? 0)} of ${formatBytes(progress.totalBytes)})` : ''}`;
            if (line === lastLine) return;
            if (live) {
                terminal.write(`\r\x1b[2K${line.slice(0, Math.max(20, terminal.columns() - 1))}`);
                pending = true;
            } else if (percent === undefined ? line !== lastLine : percent >= lastPercent + 10) {
                terminal.write(`${line}\n`);
                if (percent !== undefined) lastPercent = percent;
            }
            lastLine = line;
        },
        done: () => {
            if (pending) terminal.write('\n');
            pending = false;
        },
    };
}

/**
 * Asks a running engine to reinspect its tools after a host change (an older engine finds it at its next inspection).
 */
async function recheckEngine(project: Project): Promise<void> {
    const lookup = await lookupService(project);
    if (lookup.state === 'running' && lookup.engine.compatible) await lookup.client.request('tool-recheck').catch(() => undefined);
}

/**
 * One model line of a runtime catalog.
 */
function modelLine(model: RuntimeModel): string {
    const details = [model.locality === 'local' ? 'local' : model.locality === 'cloud' ? 'cloud (never local execution)' : 'locality unknown', model.parameterSize, model.quantization, model.sizeBytes ? formatBytes(model.sizeBytes) : undefined, model.contextLength ? `${Math.round(model.contextLength / 1024)}k context` : undefined, model.loaded ? 'loaded' : undefined, model.tools === true ? 'tools' : model.tools === false ? 'no tool calls' : undefined].filter(Boolean);
    return `${model.id} — ${details.join(', ')}`;
}

/**
 * `ptbk tool runtime <name> [action] [model]`: inspection and host-level maintenance of a project's runtime reference
 * (never a project commit).
 *
 * @private command
 */
export async function runtime(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const [name, rawAction = 'status', model] = context.positionals;
    if (!name) throw usageError('ptbk tool runtime needs the runtime name (see `ptbk tool list`).', 'tool runtime');
    const action = rawAction.toLowerCase() as RuntimeAction;
    if (!RUNTIME_ACTIONS.includes(action)) throw usageError(`Unknown runtime action "${rawAction}" (${RUNTIME_ACTIONS.join(', ')}).`, 'tool runtime');
    const settings = await loadSettings(project, { env: context.env });
    const tool = settings.tools.find((candidate): candidate is InferenceRuntimeToolRecord => candidate.type === 'INFERENCE_RUNTIME' && candidate.name === name);
    if (!tool) {
        const runtimes = settings.tools.filter((candidate) => candidate.type === 'INFERENCE_RUNTIME').map((candidate) => candidate.name);
        throw new PtbkError(`No local model runtime is named "${name}".`, { kind: 'not-found', next: [runtimes.length ? `Local model runtimes: ${runtimes.join(', ')}.` : 'Add local models first: ptbk tool setup-local'] });
    }
    const printer = progressPrinter(context);
    const controller = new AbortController();
    const interrupt = (): void => controller.abort();
    process.once('SIGINT', interrupt);
    let outcome: RuntimeActionOutcome;
    try {
        outcome = await runRuntimeAction(
            { tool, env: context.env, project: project.root, signal: controller.signal, onProgress: (progress: RuntimeProgress) => printer.update({ message: progress.message ?? progress.stage, ...(progress.completedBytes !== undefined ? { completedBytes: progress.completedBytes } : {}), ...(progress.totalBytes !== undefined ? { totalBytes: progress.totalBytes } : {}) }), onWait: (holder) => printer.update({ message: `Waiting for ${holder.label} (started by another Promptbook engine)…` }) },
            { runtime: name, action, ...(model ? { model } : {}), ...(flag(context, 'yes') ? { acknowledged: true } : {}) },
        );
    } finally {
        process.off('SIGINT', interrupt);
        printer.done();
    }
    if (action !== 'status' && action !== 'models' && outcome.status === 'completed') await recheckEngine(project);
    const consumers = outcome.observation ? await activeConsumers(context.env, outcome.observation.resourceKey) : [];
    if (flag(context, 'json')) {
        printJson({ ...outcome, dependents: dependentHarnesses(settings.tools, name).map((dependent) => dependent.name), consumers });
        return outcome.status === 'completed' ? EXIT.success : outcome.status === 'failed' ? EXIT.failure : EXIT.incomplete;
    }
    const { terminal } = context;
    const marks = symbols(terminal.unicode);
    const mark = outcome.status === 'completed' ? terminal.style.success(marks.ok) : outcome.status === 'failed' ? terminal.style.error(marks.fail) : terminal.style.warning(marks.warn);
    const lines = [`${mark} ${outcome.summary}`];
    const observation = outcome.observation;
    if (observation && (action === 'status' || action === 'models')) {
        if (action === 'status') {
            lines.push(`Endpoint     ${observation.endpoint} (${observation.endpointSource}${observation.onEngineHost ? ', on this computer' : ', not on the engine host'})`);
            if (observation.version) lines.push(`Version      ${observation.version}`);
            if (observation.executablePath) lines.push(`Executable   ${observation.executablePath}`);
            const dependents = dependentHarnesses(settings.tools, name);
            lines.push(`Connections  ${dependents.length ? dependents.map((dependent) => `${dependent.name}${dependent.isEnabled ? '' : ' (disabled)'}`).join(', ') : 'none (add one with `ptbk tool setup-local`)'}`);
            lines.push(`In use       ${consumers.length ? consumers.map((consumer) => `${consumer.tool} in ${consumer.project} (${consumer.purpose})`).join('; ') : 'not by Promptbook work now (other applications are not known)'}`);
        }
        if (observation.models) {
            lines.push(observation.models.length ? 'Models:' : 'Models: none downloaded');
            for (const entry of observation.models) lines.push(`  ${modelLine(entry)}`);
        }
    }
    for (const note of outcome.notes) lines.push(terminal.style.muted(`  ${note}`));
    for (const next of outcome.next) lines.push(terminal.style.muted(`  → ${next}`));
    terminal.write(`${lines.join('\n')}\n`);
    return outcome.status === 'completed' ? EXIT.success : outcome.status === 'failed' ? EXIT.failure : EXIT.incomplete;
}

/**
 * Normalizes an enum option (`lm-studio` → `LM_STUDIO`).
 */
function enumOption<T extends string>(context: CommandContext, name: string, values: readonly T[]): T | undefined {
    const raw = option<string>(context, name);
    if (raw === undefined) return undefined;
    const value = raw.trim().toUpperCase().replace(/[\s-]+/g, '_') as T;
    if (!values.includes(value)) throw usageError(`--${name} expects one of ${values.join(', ')} (got "${raw}").`, context.path.join(' '));
    return value;
}

/**
 * `ptbk tool setup-local`: the shared guided local setup (discover, recommend, prepare, verify, save), adding or
 * reusing the runtime and its credential-free harness connection in one scoped commit.
 *
 * @private command
 */
export async function setupLocal(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const { terminal } = context;
    const marks = symbols(terminal.unicode);
    const json = flag(context, 'json') === true;
    const say = (text: string): void => {
        if (!json) terminal.write(`${text}\n`);
    };
    const runtimeChoice = enumOption<InferenceRuntimeVariant>(context, 'runtime', INFERENCE_RUNTIME_VARIANTS);
    const harnessChoice = enumOption<HarnessVariant>(context, 'harness', HARNESS_VARIANTS);
    const endpoint = option<string>(context, 'endpoint');
    let modelChoice = option<string>(context, 'model');
    const settings = await loadSettings(project, { env: context.env });
    say('Discovering local model support on this computer…');
    const discovery = await discoverLocalSetup(context.env, settings.tools, { ...(endpoint ? { endpoint } : {}), ...(runtimeChoice ? { runtime: runtimeChoice } : {}) });
    const choices = () => ({ ...(runtimeChoice ? { runtime: runtimeChoice } : {}), ...(harnessChoice ? { harness: harnessChoice } : {}), ...(endpoint ? { endpoint } : {}), ...(modelChoice ? { model: modelChoice } : {}) });
    let plan = planLocalSetup(discovery, settings.tools, choices());
    say(`  ${discovery.hardware.summary}`);
    for (const entry of discovery.runtimes) say(`  ${entry.displayName}: ${entry.observation.summary}`);
    // Interactive: the recommended model is an editable selection (other fitting or already downloaded models).
    if (terminal.interactive && !json && !modelChoice && plan.model && !plan.problems.length) {
        const downloaded = (discovery.runtimes.find((entry) => entry.variant === plan.runtime)?.observation.models ?? []).filter((entry) => entry.installed && entry.locality === 'local');
        const options = [plan.model, ...plan.recommendation.alternatives.map((entry) => entry.model), ...downloaded.map((entry) => entry.id)].filter((value, index, all) => all.indexOf(value) === index);
        if (options.length > 1) {
            const picked = await selectOne(terminal, {
                frame: { title: 'ptbk tool setup-local', step: 'Model' },
                question: 'Which local model?',
                choices: options.map((value, index) => ({ value, label: `${value}${index === 0 ? ' (recommended)' : ''}${downloaded.some((entry) => entry.id === value) ? ' — already downloaded' : ''}` })),
                defaultValue: plan.model,
            });
            if (picked === CANCELLED) return EXIT.incomplete;
            if (picked !== plan.model) {
                modelChoice = picked;
                plan = planLocalSetup(discovery, settings.tools, choices());
            }
        }
    }
    say('');
    for (const line of describeLocalPlan(plan)) say(`  ${line}`);
    for (const note of plan.notes) say(terminal.style.muted(`  ${note}`));
    if (plan.problems.length) {
        if (json) printJson({ status: 'failed', plan, summary: plan.problems.join(' ') });
        else for (const problem of plan.problems) terminal.write(`${terminal.style.error(marks.fail)} ${problem}\n`);
        return EXIT.failure;
    }
    const needsConsent = Boolean(plan.steps.install || plan.steps.download || plan.steps.start);
    let accepted = flag(context, 'yes') === true || !needsConsent;
    if (!accepted && terminal.interactive && !json) {
        const answer = await confirm(terminal, { frame: { title: 'ptbk tool setup-local', step: 'Confirm' }, question: 'Prepare local models as described?', defaultYes: true });
        if (answer !== true) {
            say('Nothing was changed.');
            return EXIT.incomplete;
        }
        accepted = true;
    }
    if (!accepted) {
        if (json) printJson({ status: 'needs-consent', plan, pending: describeLocalPlan(plan) });
        else terminal.write(`${terminal.style.warning(marks.warn)} Nothing was changed: the setup needs your consent for the steps above. Run it again with --yes.\n`);
        return EXIT.incomplete;
    }
    const printer = progressPrinter(context);
    const controller = new AbortController();
    const interrupt = (): void => controller.abort();
    process.once('SIGINT', interrupt);
    let lastStage = '';
    let result;
    try {
        result = await prepareLocalSetup(context.env, plan, {
            accepted: true,
            project: project.root,
            interactive: terminal.interactive && !json,
            signal: controller.signal,
            extendedChecks: !flag(context, 'quick'),
            onProgress: (progress: LocalSetupProgress) => {
                if (progress.stage !== lastStage && progress.stage !== 'downloading') {
                    printer.done();
                    say(`${marks.arrow} ${progress.message}`);
                } else printer.update(progress);
                lastStage = progress.stage;
            },
        });
    } finally {
        process.off('SIGINT', interrupt);
        printer.done();
    }
    let saved;
    if (result.status === 'ready' && result.operation) {
        saved = await execute(context, project, { operation: result.operation, acknowledgements: { force: false, confirmLastOfType: false }, via: 'cli' });
    } else if (result.status === 'ready') await recheckEngine(project);
    if (json) {
        printJson({ ...result, ...(saved ? { saved } : {}) });
        return result.status === 'ready' ? EXIT.success : result.status === 'failed' ? EXIT.failure : EXIT.incomplete;
    }
    for (const step of result.completed) say(terminal.style.muted(`  ${marks.ok} ${step}`));
    for (const capability of result.capabilities) say(`  ${capability.outcome === 'supported' ? terminal.style.success(marks.ok) : capability.outcome === 'failed' ? terminal.style.warning(marks.warn) : terminal.style.muted('?')} ${capability.name}: ${capability.summary}`);
    if (result.status !== 'ready') {
        terminal.write(`${result.status === 'cancelled' ? terminal.style.warning(marks.warn) : terminal.style.error(marks.fail)} ${result.summary}\n`);
        for (const pending of result.pending) say(terminal.style.muted(`  → ${pending}`));
        return result.status === 'failed' ? EXIT.failure : EXIT.incomplete;
    }
    terminal.write(`${terminal.style.success(marks.ok)} ${result.summary}\n`);
    if (saved) say(saved.status === 'applied' ? `${terminal.style.success(marks.ok)} ${saved.summary}${saved.commit ? ` — committed ${saved.commit.slice(0, 8)}` : ''}` : saved.status === 'no-op' ? `${marks.ok} ${saved.summary}` : `${terminal.style.warning(marks.warn)} ${saved.summary}`);
    else say(`${marks.ok} The runtime ${plan.names.runtime} and connection ${plan.names.connection} were already configured.`);
    for (const pending of result.pending) say(terminal.style.muted(`  → ${pending}`));
    return saved && saved.status === 'needs-acknowledgement' ? EXIT.incomplete : EXIT.success;
}
