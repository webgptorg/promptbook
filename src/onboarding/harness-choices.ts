import { which } from '../common/process.js';
import { HARNESS_PLUGINS, harnessPlugin } from '../harness/registry.js';
import { formatBytes } from '../inference/hardware.js';
import { discoverLocalSetup, planLocalSetup, type LocalSetupChoices, type LocalSetupPlan } from '../inference/setup.js';
import type { ToolRecord } from '../tools/model.js';
import type { OnboardingPrompt } from './contract.js';

/** Local runtime, model and credential-free harness connection, offered as one setup choice. @private onboarding */
export const LOCAL_MODELS = 'local-models';

/** Human-readable choice in the picker, review and setup activity. @private onboarding */
export function selectionLabel(id: string): string {
    return id === LOCAL_MODELS ? 'Local models' : (harnessPlugin(id)?.displayName ?? id);
}

/** Read-only observations used to present an initial selection. @private onboarding */
export type HarnessDiscovery = { readonly installed: readonly string[]; readonly localPlan?: LocalSetupPlan };

/** Detects tools and model weights on the engine host without installing, downloading or signing in. @private onboarding */
export async function discoverHarnessChoices(env: NodeJS.ProcessEnv, tools: readonly ToolRecord[] = [], choices: LocalSetupChoices = {}): Promise<HarnessDiscovery> {
    const [plugins, local] = await Promise.all([
        Promise.all(HARNESS_PLUGINS.map(async (plugin) => await which(plugin.executable, env) ? plugin.id : undefined)),
        discoverLocalSetup(env, tools, { ...choices, signal: AbortSignal.timeout(15_000) }).catch(() => undefined),
    ]);
    const installed = plugins.filter((id): id is string => id !== undefined);
    if (local?.runtimes.some(({ observation }) => observation.onEngineHost && observation.models?.some((model) => model.installed && model.locality === 'local'))) installed.push(LOCAL_MODELS);
    return { installed, ...(local ? { localPlan: planLocalSetup(local, tools, choices) } : {}) };
}

/** Describes additional model storage anticipated by the same plan that will prepare the host. */
function localDescription(plan?: LocalSetupPlan): string {
    if (!plan) return 'Runs on the engine host. Additional model disk space could not be determined.';
    if (!plan.model) return 'Runs on the engine host. ' + (plan.recommendation.incompatibility ?? 'No suitable model was found.');
    if (!plan.steps.download) return `0 GB of additional model storage. ${plan.model} is already on the engine host.`;
    if (plan.steps.downloadBytes) return `About ${formatBytes(plan.steps.downloadBytes)} of additional disk space. ${plan.model} runs on the engine host.`;
    return `Runs on the engine host. The additional disk space for ${plan.model} is unknown.`;
}

/** The engine owns the order, disclosure, descriptions and initial IDs for every setup client. @private onboarding */
export function harnessChoices(discovery: HarnessDiscovery, previous?: readonly string[]): Pick<Extract<OnboardingPrompt, { kind: 'choice' }>, 'choices' | 'initial'> {
    const initial = previous ?? (discovery.installed.length ? discovery.installed : ['openai-codex']);
    return {
        initial,
        choices: [
            ...HARNESS_PLUGINS.map((plugin) => ({
                id: plugin.id, label: plugin.displayName, disabled: false,
                description: plugin.featured ? null : plugin.npmPackage ?? null,
                featured: plugin.featured || discovery.installed.includes(plugin.id) || initial.includes(plugin.id),
            })),
            { id: LOCAL_MODELS, label: selectionLabel(LOCAL_MODELS), disabled: false, description: localDescription(discovery.localPlan), featured: true },
        ],
    };
}
