import type { LocalModelsJobView, ServiceSnapshot, ToolView } from '../engine/snapshot.js';
import { formatBytes } from '../inference/hardware.js';
import { CANCELLED, confirm, inputLine, selectOne } from './prompts.js';
import type { Style } from './ansi.js';
import type { TerminalProfile } from './terminal.js';

/**
 * A runtime tool with its observed detail.
 *
 * @private terminal local models page
 */
export type RuntimeItem = ToolView & { readonly runtime: NonNullable<ToolView['runtime']> };

/**
 * The project's local model runtimes in tools order.
 *
 * @private terminal local models page
 */
export function runtimeItems(snapshot: ServiceSnapshot): RuntimeItem[] {
    return (snapshot.tools?.items ?? []).filter((item): item is RuntimeItem => item.type === 'INFERENCE_RUNTIME' && item.runtime !== undefined);
}

/**
 * One line of a local models operation with its honest progress.
 *
 * @private terminal local models page
 */
export function localJobLine(job: LocalModelsJobView, style: Pick<Style, 'muted' | 'warning' | 'success' | 'error'>): string {
    const percent = job.totalBytes ? ` ${Math.floor(((job.completedBytes ?? 0) / job.totalBytes) * 100)}% (${formatBytes(job.completedBytes ?? 0)} of ${formatBytes(job.totalBytes)})` : '';
    const tone = job.state === 'running' ? style.muted : job.state === 'completed' ? style.success : job.state === 'cancelled' || job.state === 'refused' || job.state === 'unsupported' ? style.warning : style.error;
    return tone(`${job.label}: ${job.state === 'running' ? `${job.stage} — ${job.message}${percent}` : `${job.state} — ${job.message}`}`);
}

/**
 * Detail lines of one runtime: service, models (with locality), connections and supported actions.
 *
 * @private terminal local models page
 */
export function runtimeDetailLines(item: RuntimeItem, style: Pick<Style, 'muted' | 'warning' | 'bold'>): string[] {
    const detail = item.runtime;
    const lines = [
        `${style.bold(item.name)} — ${item.variantLabel}${item.isEnabled ? '' : style.muted(' (disabled for this project; the service is not affected)')}`,
        `  Service      ${detail.running ? `running${detail.version ? ` ${detail.version}` : ''}` : style.warning('not running')} at ${detail.endpoint}${style.muted(` (${detail.endpointSource}${detail.onEngineHost ? ', on the engine host' : ', not on the engine host'})`)}`,
        `  Connections  ${detail.dependents.length ? detail.dependents.join(', ') : style.muted('none')}`,
        `  Capacity     ${detail.capacity.perModel} request${detail.capacity.perModel === 1 ? '' : 's'} per model at a time ${style.muted(`(${detail.capacity.source}; other work waits for it)`)}`,
    ];
    if (!detail.models.length) lines.push(`  Models       ${style.muted(detail.running ? 'none downloaded' : 'unknown while the service is not running')}`);
    for (const [index, model] of detail.models.entries()) {
        const facts = [model.locality === 'local' ? 'local' : model.locality === 'cloud' ? 'cloud — never local execution' : 'locality unknown', model.parameterSize, model.quantization, model.sizeBytes ? formatBytes(model.sizeBytes) : undefined, model.loaded ? 'loaded' : undefined, model.tools === false ? 'no tool calls' : undefined].filter(Boolean);
        lines.push(`  ${index ? '             ' : 'Models       '}${model.id} ${style.muted(facts.join(' · '))}`);
    }
    if (item.state !== 'usable' && item.nextAction) lines.push(style.warning(`  Action       ${item.nextAction}`));
    return lines;
}

/**
 * What the engine's discovery returns for the add form.
 *
 * @private terminal local models page
 */
export type LocalDiscoveryView = {
    readonly hardware: { readonly summary: string };
    readonly runtimes: ReadonlyArray<{ readonly displayName: string; readonly summary: string }>;
    readonly plan: { readonly model?: string; readonly problems: readonly string[]; readonly notes: readonly string[]; readonly recommendation: { readonly alternatives: ReadonlyArray<{ readonly model: string }> } };
    readonly description: readonly string[];
};

/**
 * The guided Add local models form outside the live view: the engine host's discovery, an editable model
 * recommendation and explicit consent. Returns the accepted choices, or undefined when nothing should start.
 *
 * @private terminal local models page
 */
export async function addLocalModelsForm(terminal: TerminalProfile, discover: (choices: Readonly<Record<string, string>>) => Promise<LocalDiscoveryView>): Promise<Readonly<Record<string, string>> | undefined> {
    const frame = (step: string, summary: readonly string[] = []) => ({ title: 'Add local models', step, summary });
    terminal.write('Discovering local model support on the engine host…\n');
    let choices: Record<string, string> = {};
    let view = await discover(choices);
    const context = [view.hardware.summary, ...view.runtimes.map((runtime) => `${runtime.displayName}: ${runtime.summary}`)];
    const alternatives = view.plan.recommendation.alternatives.map((entry) => entry.model);
    if (view.plan.model && alternatives.length && !view.plan.problems.length) {
        const picked = await selectOne(terminal, {
            frame: frame('Model', context),
            question: 'Which local model?',
            choices: [{ value: view.plan.model, label: `${view.plan.model} (recommended for this computer)` }, ...alternatives.map((model) => ({ value: model, label: model })), { value: '', label: 'Another model identifier…' }],
            defaultValue: view.plan.model,
        });
        if (picked === CANCELLED) return undefined;
        const model = picked || (await inputLine(terminal, { frame: frame('Model', context), question: 'Runtime model identifier:', validate: (value) => (value.trim() ? undefined : 'Enter a model identifier.') }));
        if (model === CANCELLED) return undefined;
        if (model !== view.plan.model) {
            choices = { model: model.trim() };
            view = await discover(choices);
        }
    }
    if (view.plan.problems.length) {
        terminal.write(`${view.plan.problems.join('\n')}\nNothing was changed.\n`);
        return undefined;
    }
    const accepted = await confirm(terminal, { frame: frame('Confirm', [...context, '', ...view.description, ...view.plan.notes]), question: 'Prepare local models as described? (shared on the engine host; downloads continue in the background)', defaultYes: true });
    return accepted === true ? choices : undefined;
}

/**
 * Asks which model of a runtime an action applies to (or a new identifier for downloads).
 *
 * @private terminal local models page
 */
export async function chooseRuntimeModel(terminal: TerminalProfile, item: RuntimeItem, action: string, options: { readonly allowNew?: boolean } = {}): Promise<string | undefined> {
    const frame = { title: `Local models › ${item.name}`, step: action };
    const installed = item.runtime.models.filter((model) => model.installed);
    if (options.allowNew || !installed.length) {
        const value = await inputLine(terminal, { frame, question: `Model to ${action} (the runtime's identifier, e.g. gpt-oss:20b):`, validate: (text) => (text.trim() ? undefined : 'Enter a model identifier.') });
        return value === CANCELLED ? undefined : value.trim();
    }
    const value = await selectOne(terminal, { frame, question: `Model to ${action}:`, choices: installed.map((model) => ({ value: model.id, label: model.id, description: [model.locality, model.sizeBytes ? formatBytes(model.sizeBytes) : undefined, model.loaded ? 'loaded' : undefined].filter(Boolean).join(' · ') })) });
    return value === CANCELLED ? undefined : value;
}
