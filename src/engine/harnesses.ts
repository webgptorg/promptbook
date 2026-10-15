import { enabledHarnesses, setting, type EffectiveSettings } from '../project/config.js';
import { harnessPlugin } from '../harness/registry.js';
import type { HarnessContext, HarnessInspection, HarnessPlugin } from '../harness/types.js';

/**
 * How long an inspection stays fresh before an automatic recheck.
 */
const INSPECTION_TTL_MS = 30 * 60_000;

/**
 * Tracks inspections of the project's enabled harnesses (only selected integrations are inspected).
 *
 * @private harness availability
 */
export class HarnessPool {
    private readonly inspections = new Map<string, HarnessInspection>();
    private readonly modelCache = new Map<string, Promise<string[]>>();

    public constructor(
        private readonly projectRoot: string,
        private settings: EffectiveSettings,
        private readonly env: NodeJS.ProcessEnv,
    ) {}

    /** Replaces effective settings (live changes). */
    public updateSettings(settings: EffectiveSettings): void {
        this.settings = settings;
    }

    /** Inspection context of one harness. */
    public context(id: string, signal?: AbortSignal): HarnessContext {
        return { projectRoot: this.projectRoot, env: this.env, settings: this.settings.harnesses[id], signal };
    }

    /** Enabled harness identifiers. */
    public enabled(): string[] {
        return enabledHarnesses(this.settings);
    }

    /** Inspects harnesses (default: enabled ones), refreshing stale results. */
    public async refresh(ids: readonly string[] = this.enabled(), force = false): Promise<void> {
        await Promise.all(
            ids.map(async (id) => {
                const plugin = harnessPlugin(id);
                if (!plugin) return;
                const existing = this.inspections.get(id);
                if (!force && existing && Date.now() - existing.checkedAt < INSPECTION_TTL_MS) return;
                try {
                    this.inspections.set(id, await plugin.inspect(this.context(id)));
                } catch (error) {
                    this.inspections.set(id, {
                        id,
                        displayName: plugin.displayName,
                        installed: false,
                        authenticated: false,
                        authentication: 'none',
                        usable: false,
                        models: [],
                        thinkingLevels: plugin.thinkingLevels,
                        capabilities: plugin.capabilities,
                        summary: `Inspection failed: ${(error as Error).message}`,
                        problem: 'error',
                        checkedAt: Date.now(),
                    });
                }
            }),
        );
    }

    /** Latest inspection of a harness. */
    public inspection(id: string): HarnessInspection | undefined {
        return this.inspections.get(id);
    }

    /** All known inspections. */
    public all(): HarnessInspection[] {
        return [...this.inspections.values()];
    }

    /** Enabled and usable harnesses, default harness first. */
    public usable(): string[] {
        const preferred = setting<string | undefined>(this.settings, 'routing.harness');
        const ids = this.enabled().filter((id) => this.inspections.get(id)?.usable);
        return preferred && ids.includes(preferred) ? [preferred, ...ids.filter((id) => id !== preferred)] : ids;
    }

    /** Plugin of an identifier. */
    public plugin(id: string): HarnessPlugin | undefined {
        return harnessPlugin(id);
    }

    /** Known models: configured ones plus the integration's catalog (cached, bounded). */
    public async models(id: string): Promise<string[]> {
        const configured = [...(this.settings.harnesses[id]?.models ?? [])];
        const plugin = harnessPlugin(id);
        if (!plugin?.listModels) return configured;
        let cached = this.modelCache.get(id);
        if (!cached) {
            cached = plugin.listModels(this.context(id)).catch(() => []);
            this.modelCache.set(id, cached);
        }
        return [...new Set([...configured, ...(await cached)])];
    }

    /** Marks a harness for recheck (e.g. after an authentication failure). */
    public invalidate(id: string): void {
        this.inspections.delete(id);
        this.modelCache.delete(id);
    }
}
