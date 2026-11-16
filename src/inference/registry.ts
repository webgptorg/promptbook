import type { InferenceRuntimeToolRecord, InferenceRuntimeVariant, ToolRecord } from '../tools/model.js';
import { partialDownloads, type PartialDownload } from './downloads.js';
import { lmStudioAdapter } from './lm-studio.js';
import { ollamaAdapter } from './ollama.js';
import type { RuntimeAdapter, RuntimeModel, RuntimeObservation } from './types.js';

/**
 * Every runtime adapter (extensible: a new runtime adds one entry, not another management framework).
 *
 * @private inference runtime registry
 */
export const RUNTIME_ADAPTERS: readonly RuntimeAdapter[] = [ollamaAdapter, lmStudioAdapter];

/**
 * The adapter of a runtime variant.
 *
 * @private inference runtime registry
 */
export function runtimeAdapter(variant: InferenceRuntimeVariant): RuntimeAdapter {
    return RUNTIME_ADAPTERS.find((adapter) => adapter.variant === variant)!;
}

/**
 * How long a runtime observation stays fresh before an automatic recheck (local services change quickly: downloads,
 * loads, restarts).
 */
const OBSERVATION_TTL_MS = 60_000;

/**
 * Read-only observations of the project's runtime references (never installs, downloads or runs inference). Shared by
 * harness readiness, routing, the tool inventory and runtime management.
 *
 * @private inference runtime registry
 */
export class RuntimePool {
    private readonly observations = new Map<string, RuntimeObservation>();
    private readonly observedConfig = new Map<string, string>();
    /** Downloads that did not complete, per runtime record (host state, re-read on every refresh). */
    private readonly partials = new Map<string, readonly PartialDownload[]>();
    private tools: readonly ToolRecord[] = [];

    public constructor(private readonly env: NodeJS.ProcessEnv) {}

    /** Replaces the project's tool records (live configuration changes). */
    public update(tools: readonly ToolRecord[]): void {
        this.tools = tools;
    }

    /** Runtime records (enabled or not) in array order. */
    public records(): InferenceRuntimeToolRecord[] {
        return this.tools.filter((tool): tool is InferenceRuntimeToolRecord => tool.type === 'INFERENCE_RUNTIME');
    }

    /** A runtime record by name. */
    public record(name: string): InferenceRuntimeToolRecord | undefined {
        return this.records().find((tool) => tool.name === name);
    }

    /** Observes enabled runtime records (default: all), refreshing stale or reconfigured observations. */
    public async refresh(names: readonly string[] = this.records().filter((tool) => tool.isEnabled).map((tool) => tool.name), force = false): Promise<void> {
        await Promise.all(
            names.map(async (name) => {
                const tool = this.record(name);
                if (!tool) return;
                const fingerprint = JSON.stringify([tool.variant, tool.endpoint]);
                const existing = this.observations.get(name);
                if (force || !existing || this.observedConfig.get(name) !== fingerprint || Date.now() - existing.checkedAt >= OBSERVATION_TTL_MS) {
                    const adapter = runtimeAdapter(tool.variant);
                    try {
                        this.observations.set(name, await adapter.inspect({ tool, env: this.env }));
                    } catch (error) {
                        this.observations.set(name, { variant: tool.variant, displayName: adapter.displayName, endpoint: tool.endpoint ?? adapter.defaultEndpoint, endpointSource: tool.endpoint ? 'configured' : 'discovered', onEngineHost: false, resourceKey: `${tool.variant}@unknown`, running: false, summary: `Inspection failed: ${(error as Error).message}`, problem: 'error', checkedAt: Date.now() });
                    }
                    this.observedConfig.set(name, fingerprint);
                }
                const observation = this.observations.get(name)!;
                const installed = (observation.models ?? []).filter((model) => model.installed).map((model) => model.id);
                this.partials.set(name, await partialDownloads(this.env, observation.resourceKey, observation.models ? installed : []).catch(() => []));
            }),
        );
    }

    /** Latest observation of a runtime record (undefined when not observed yet or reconfigured since). */
    public observation(name: string): RuntimeObservation | undefined {
        const tool = this.record(name);
        if (!tool || this.observedConfig.get(name) !== JSON.stringify([tool.variant, tool.endpoint])) return undefined;
        return this.observations.get(name);
    }

    /** Drops an observation so the next refresh reinspects it (after a download, load or service change). */
    public invalidate(name?: string): void {
        if (name === undefined) {
            this.observations.clear();
            this.observedConfig.clear();
            return;
        }
        this.observations.delete(name);
        this.observedConfig.delete(name);
    }

    /** Downloads through a runtime record's service that did not complete (interrupted, cancelled, failed or running elsewhere). */
    public partialDownloads(name: string): readonly PartialDownload[] {
        return this.partials.get(name) ?? [];
    }

    /** One model of a runtime's observed catalog. */
    public model(name: string, model: string): RuntimeModel | undefined {
        return this.observation(name)?.models?.find((entry) => entry.id === model);
    }
}
