import { canonicalEnumValue, matchEnum } from '../common/naming.js';
import { compareVersions } from '../common/semver.js';
import { ENGINE_VERSION } from '../common/version.js';
import { environmentReference } from '../tools/environment.js';
import { HARNESS_VARIANTS, THINKING_LEVELS, harnessPluginId, harnessVariantOf, type BrowserToolRecord, type HarnessToolRecord, type ToolRecord } from '../tools/model.js';
import { parseTools, serializeTool, type ConfigProblem } from '../tools/normalize.js';

/**
 * The fixed version assumed for a configuration without `promptbookVersion`: the version inspected before versioned
 * configuration existed. It never moves with future releases and is never guessed from the document's shape.
 *
 * @private configuration migrations
 */
export const PRE_VERSIONING_BASELINE = '0.119.0-21';

/**
 * One version-targeted transformation of the configuration. A step only transforms its assigned behavior: it never
 * sets `promptbookVersion`, commits or performs task work (the coordinator owns those).
 *
 * @private configuration migrations
 */
export type ConfigurationMigration = {
    /** The engine release that introduced this configuration behavior. */
    readonly target: string;
    /** One-line description for the migration commit body. */
    readonly title: string;
    /** Transforms a clone of the configuration in place; returns explanations and problems needing repair. */
    readonly migrate: (raw: Record<string, unknown>) => { readonly notes: readonly string[]; readonly problems: readonly ConfigProblem[] };
};

/**
 * Version state of a configuration relative to the running engine.
 *
 * @private configuration migrations
 */
export type MigrationPlan =
    /** Saved and running versions are equal: nothing to migrate. */
    | { readonly kind: 'current'; readonly version: string }
    /** The engine is newer: these sparse steps (possibly none) apply, then the version advances to `to`. */
    | { readonly kind: 'migrate'; readonly from: string; readonly to: string; readonly fromBaseline: boolean; readonly steps: readonly ConfigurationMigration[] }
    /** The configuration was written by a newer engine: offer an update, never downgrade. */
    | { readonly kind: 'older-engine'; readonly saved: string; readonly engine: string }
    /** `promptbookVersion` is malformed: a configuration problem, not permission to assume a version. */
    | { readonly kind: 'invalid'; readonly reason: string };

/**
 * Old-to-canonical boolean setting paths of the first migration (values, including false, are preserved).
 *
 * @private configuration migrations
 */
export const LEGACY_BOOLEAN_PATHS: ReadonlyArray<readonly [string, string]> = [
    ['execution.commit', 'execution.isCommitEnabled'],
    ['execution.isolate', 'execution.isIsolated'],
    ['execution.normalizeLineEndings', 'execution.isLineEndingNormalizationEnabled'],
    ['execution.allowCredits', 'execution.isCreditFallbackAllowed'],
    ['execution.questions', 'execution.isQuestionsEnabled'],
    ['execution.preserveLogs', 'execution.isLogPreservationEnabled'],
    ['execution.autoMigrate', 'execution.isAutoMigrateEnabled'],
    ['traces.commit', 'traces.isCommitted'],
    ['traces.ignoreVideos', 'traces.isVideoIgnored'],
    ['traces.recordVideo', 'traces.isVideoRecordingEnabled'],
    ['server.enabled', 'server.isEnabled'],
    ['server.tunnel.enabled', 'server.tunnel.isEnabled'],
    ['service.persist', 'service.isPersistent'],
    ['service.qr', 'service.isQrShown'],
    ['discovery.enabled', 'discovery.isEnabled'],
    ['learning.enabled', 'learning.isEnabled'],
];

/**
 * Name of the browser tool produced from the former singleton browser setting.
 *
 * @private configuration migrations
 */
export const MIGRATED_BROWSER_NAME = 'project-browser';

/**
 * Reads a nested object member (undefined for anything else).
 */
function child(object: Record<string, unknown>, path: string): { parent?: Record<string, unknown>; key: string; value: unknown } {
    const parts = path.split('.');
    let current: unknown = object;
    for (const part of parts.slice(0, -1)) {
        if (current === null || typeof current !== 'object' || Array.isArray(current)) return { key: parts[parts.length - 1]!, value: undefined };
        current = (current as Record<string, unknown>)[part];
    }
    if (current === null || typeof current !== 'object' || Array.isArray(current)) return { key: parts[parts.length - 1]!, value: undefined };
    const parent = current as Record<string, unknown>;
    const key = parts[parts.length - 1]!;
    return { parent, key, value: parent[key] };
}

/**
 * Deletes an object that became empty after a move.
 */
function pruneEmpty(raw: Record<string, unknown>, path: string): void {
    const { parent, key, value } = child(raw, path);
    if (parent && value !== null && typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).length) delete parent[key];
}

/**
 * Browser variant implied by a legacy executable (a selected Chrome-compatible implementation stays selected).
 */
function browserVariantOf(executable: unknown): BrowserToolRecord['variant'] {
    if (typeof executable !== 'string') return 'CHROME';
    if (/edge/i.test(executable)) return 'EDGE';
    if (/chromium/i.test(executable)) return 'CHROMIUM';
    return 'CHROME';
}

/**
 * Whether two records describe the same instance (recovery of an interrupted pass must not duplicate tools).
 */
function sameInstance(a: ToolRecord, b: ToolRecord): boolean {
    return a.type === b.type && a.variant === b.variant && a.name === b.name;
}

/**
 * The first migration: the former singleton `browser` and per-harness `harnesses` map become named `tools`; known
 * boolean settings get their `is`-prefixed canonical names; autosync is introduced switched off and the superseded
 * auto-pull/auto-push settings are retired. Profiles, sessions, native logins and secrets are never touched.
 */
const UNIFIED_TOOLS_MIGRATION: ConfigurationMigration = {
    target: '0.119.0-22',
    title: 'Unified named tools, canonical configuration spelling and opt-in Git autosync (off)',
    migrate: (raw) => {
        const notes: string[] = [];
        const problems: ConfigProblem[] = [];
        // Canonical boolean names (false is a value, not an omission).
        for (const [legacy, canonical] of LEGACY_BOOLEAN_PATHS) {
            const old = child(raw, legacy);
            if (!old.parent || old.value === undefined) continue;
            const target = child(raw, canonical);
            if (target.value !== undefined && target.value !== old.value) {
                problems.push({ location: `ptbk.json › ${legacy}`, message: `both ${legacy} and ${canonical} are set with different values; ptbk keeps both until one is removed`, severity: 'error' });
                continue;
            }
            delete old.parent[old.key];
            const parts = canonical.split('.');
            let object = raw;
            for (const part of parts.slice(0, -1)) {
                if (object[part] === null || typeof object[part] !== 'object' || Array.isArray(object[part])) object[part] = {};
                object = object[part] as Record<string, unknown>;
            }
            object[parts[parts.length - 1]!] = old.value;
            notes.push(`${legacy} → ${canonical} (${JSON.stringify(old.value)})`);
        }

        // Existing legitimate tool records are kept (never duplicated or overwritten on recovery).
        const existing = parseTools(raw.tools);
        const tools: unknown[] = Array.isArray(raw.tools) ? [...(raw.tools as unknown[])] : [];
        const taken = new Map(existing.tools.map((tool) => [tool.name, tool] as const));
        // `legacy` carries this release's per-tool model preferences as raw fields; a later step converts them.
        const add = (record: ToolRecord, legacy: Readonly<Record<string, unknown>> = {}): boolean => {
            const present = taken.get(record.name);
            if (present) {
                if (sameInstance(present, record)) return true;
                problems.push({ location: `ptbk.json › tools`, message: `a migrated ${record.type} "${record.name}" collides with an existing tool of the same name; the legacy setting is kept for repair`, severity: 'error' });
                return false;
            }
            taken.set(record.name, record);
            tools.push({ ...serializeTool(record), ...legacy });
            return true;
        };

        // The former singleton browser (including its effective default) becomes one named BROWSER tool.
        if (!existing.tools.some((tool) => tool.type === 'BROWSER')) {
            const legacy = raw.browser !== null && typeof raw.browser === 'object' && !Array.isArray(raw.browser) ? (raw.browser as Record<string, unknown>) : {};
            const profileValue = legacy.profile;
            const profile: BrowserToolRecord['profile'] =
                profileValue === undefined || profileValue === 'global'
                    ? { source: 'MANAGED_GLOBAL' }
                    : profileValue === 'isolated'
                      ? { source: 'PROJECT' }
                      : profileValue === 'user'
                        ? { source: 'USER_EXISTING' }
                        : typeof profileValue === 'string' && profileValue.trim()
                          ? { source: 'CUSTOM', path: profileValue }
                          : { source: 'MANAGED_GLOBAL' };
            if (profileValue !== undefined && typeof profileValue !== 'string') problems.push({ location: 'ptbk.json › browser.profile', message: 'expected global, isolated, user or a path; the default managed profile was used', severity: 'warning' });
            const record: BrowserToolRecord = {
                type: 'BROWSER',
                variant: browserVariantOf(legacy.executable),
                name: MIGRATED_BROWSER_NAME,
                isEnabled: true,
                profile,
                isHeadless: legacy.mode !== 'headful',
                ...(typeof legacy.executable === 'string' && legacy.executable.trim() ? { executable: legacy.executable } : {}),
            };
            if (add(record)) {
                const unknown = Object.keys(legacy).filter((key) => !['profile', 'mode', 'executable'].includes(key));
                if (unknown.length) problems.push({ location: 'ptbk.json › browser', message: `unknown browser fields ${unknown.join(', ')} are kept for review`, severity: 'warning' });
                else delete raw.browser;
                notes.push(`browser → tools "${MIGRATED_BROWSER_NAME}" (${record.variant}, profile ${profile.source}${profile.path ? ` ${profile.path}` : ''}, ${record.isHeadless ? 'headless' : 'headful'})`);
            }
        } else if (raw.browser !== undefined) {
            problems.push({ location: 'ptbk.json › browser', message: 'the former browser setting coexists with browser tools; it is ignored and kept for review', severity: 'warning' });
        }

        // Each configured harness becomes a named HARNESS tool, preserving order, enabled state and preferences.
        if (raw.harnesses !== undefined) {
            if (raw.harnesses === null || typeof raw.harnesses !== 'object' || Array.isArray(raw.harnesses)) {
                problems.push({ location: 'ptbk.json › harnesses', message: 'expected an object keyed by harness identifier; kept for repair', severity: 'error' });
            } else {
                const remaining: Record<string, unknown> = {};
                for (const [id, value] of Object.entries(raw.harnesses as Record<string, unknown>)) {
                    const variant = harnessVariantOf(id) ?? matchEnum(id, HARNESS_VARIANTS);
                    if (!variant || value === null || typeof value !== 'object' || Array.isArray(value)) {
                        problems.push({ location: `ptbk.json › harnesses.${id}`, message: 'unknown harness or invalid entry; kept for repair', severity: 'error' });
                        remaining[id] = value;
                        continue;
                    }
                    const entry = value as Record<string, unknown>;
                    const thinking = entry.thinkingLevel === undefined ? undefined : matchEnum(entry.thinkingLevel, THINKING_LEVELS);
                    const models = Array.isArray(entry.models) ? entry.models.filter((model): model is string => typeof model === 'string') : undefined;
                    const reference = typeof entry.apiKeyEnv === 'string' && entry.apiKeyEnv.trim() ? entry.apiKeyEnv.trim() : undefined;
                    let apiKey: string | undefined;
                    if (reference) {
                        try {
                            apiKey = environmentReference(reference);
                        } catch {
                            problems.push({ location: `ptbk.json › harnesses.${id}.apiKeyEnv`, message: 'not a valid environment-variable name; kept for repair', severity: 'error' });
                            remaining[id] = value;
                            continue;
                        }
                    }
                    const record: HarnessToolRecord = {
                        type: 'HARNESS',
                        variant,
                        name: harnessPluginId(variant),
                        isEnabled: entry.enabled !== false,
                        // No durable API-mode authorization existed: native stays native; a reference is inactive metadata.
                        authentication: 'NATIVE',
                        ...(apiKey ? { apiKey } : {}),
                    };
                    const legacyPreferences = {
                        ...(typeof entry.model === 'string' && entry.model ? { model: entry.model } : {}),
                        ...(thinking ? { thinkingLevel: canonicalEnumValue(thinking) } : {}),
                        ...(models ? { models } : {}),
                    };
                    const unknown = Object.keys(entry).filter((key) => !['enabled', 'model', 'thinkingLevel', 'models', 'apiKeyEnv'].includes(key));
                    if (unknown.length || (entry.thinkingLevel !== undefined && !thinking)) {
                        problems.push({ location: `ptbk.json › harnesses.${id}`, message: `fields ${[...unknown, ...(entry.thinkingLevel !== undefined && !thinking ? ['thinkingLevel'] : [])].join(', ')} cannot be represented safely; the entry is kept for repair`, severity: 'error' });
                        remaining[id] = value;
                        continue;
                    }
                    if (!add(record, legacyPreferences)) {
                        remaining[id] = value;
                        continue;
                    }
                    notes.push(`harnesses.${id} → tools "${record.name}" (${record.variant}, ${record.isEnabled ? 'enabled' : 'disabled'}, ${record.authentication}${apiKey ? `, apiKey ${apiKey} kept as inactive metadata` : ''})`);
                }
                if (Object.keys(remaining).length) raw.harnesses = remaining;
                else delete raw.harnesses;
            }
        }
        if (tools.length || raw.tools !== undefined) raw.tools = tools;

        // Synchronization is a single explicit opt-in, off for migrated projects.
        const execution = raw.execution !== null && typeof raw.execution === 'object' && !Array.isArray(raw.execution) ? (raw.execution as Record<string, unknown>) : undefined;
        for (const key of ['autoPull', 'autoPush']) {
            if (execution && execution[key] !== undefined) {
                notes.push(`retired execution.${key} (${JSON.stringify(execution[key])}); Git synchronization is now the single opt-in isAutoSync`);
                delete execution[key];
            }
        }
        if (raw.isAutoSync === undefined) {
            raw.isAutoSync = false;
            notes.push('isAutoSync: false (automatic synchronization stays off until explicitly enabled)');
        }
        for (const path of ['execution', 'traces', 'server.tunnel', 'server', 'service', 'discovery', 'learning']) pruneEmpty(raw, path);
        // The former schema counter is superseded by promptbookVersion (never two competing version sources).
        if (raw.version !== undefined) {
            notes.push(`retired the former schema counter version (${JSON.stringify(raw.version)}); promptbookVersion records the engine version`);
            delete raw.version;
        }
        return { notes, problems };
    },
};

/**
 * The configuration side of the Router/Tasker/MODEL contract: former routing defaults and per-tool model settings
 * leave `ptbk.json` (harness plugins own model/thinking defaults; MODEL in Books states requirements). The Book side
 * of the same step moves their meaning into Router's MODEL and instructions, restoring them when it cannot.
 */
const ROUTER_MODEL_MIGRATION: ConfigurationMigration = {
    target: '0.119.0-32',
    title: 'Router and Tasker core roles, shared MODEL requirements and plugin-owned model defaults',
    migrate: (raw) => {
        const notes: string[] = [];
        const problems: ConfigProblem[] = [];
        const routing = raw.routing !== null && typeof raw.routing === 'object' && !Array.isArray(raw.routing) ? (raw.routing as Record<string, unknown>) : undefined;
        for (const key of ['harness', 'model', 'thinkingLevel', 'preferences']) {
            if (routing?.[key] === undefined) continue;
            notes.push(`routing.${key} (${JSON.stringify(routing[key])}) → Router's MODEL/instructions`);
            delete routing[key];
        }
        if (routing && !Object.keys(routing).length) delete raw.routing;
        if (Array.isArray(raw.tools)) {
            for (const entry of raw.tools) {
                if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) continue;
                const tool = entry as Record<string, unknown>;
                for (const key of ['model', 'thinkingLevel', 'models']) {
                    if (tool[key] === undefined) continue;
                    notes.push(`tools "${String(tool.name)}".${key} (${JSON.stringify(tool[key])}) → Router's instructions (plugins own the defaults)`);
                    delete tool[key];
                }
            }
        }
        return { notes, problems };
    },
};

/**
 * Every registered configuration migration (sparse: most releases have none).
 *
 * @private configuration migrations
 */
export const CONFIGURATION_MIGRATIONS: readonly ConfigurationMigration[] = [UNIFIED_TOOLS_MIGRATION, ROUTER_MODEL_MIGRATION];

/**
 * Compares the saved configuration version with the running engine and selects the applicable ordered steps
 * (`saved < target <= engine`). A missing version means the fixed pre-versioning baseline.
 *
 * @private configuration migrations
 */
export function planConfigurationMigration(raw: Readonly<Record<string, unknown>>, engineVersion: string = ENGINE_VERSION, migrations: readonly ConfigurationMigration[] = CONFIGURATION_MIGRATIONS): MigrationPlan {
    const saved = raw.promptbookVersion;
    if (saved !== undefined && typeof saved !== 'string') return { kind: 'invalid', reason: `promptbookVersion must be a version string such as "${engineVersion}" (got ${JSON.stringify(saved)})` };
    const from = saved ?? PRE_VERSIONING_BASELINE;
    const comparison = compareVersions(engineVersion, from);
    if (comparison === undefined) return { kind: 'invalid', reason: `promptbookVersion "${from}" is not a semantic version; fix it (ptbk never assumes a version or downgrades)` };
    if (comparison === 0) return { kind: 'current', version: from };
    if (comparison < 0) return { kind: 'older-engine', saved: from, engine: engineVersion };
    const steps = migrations
        .filter((migration) => (compareVersions(migration.target, from) ?? 0) > 0 && (compareVersions(migration.target, engineVersion) ?? 1) <= 0)
        .sort((a, b) => compareVersions(a.target, b.target) ?? 0);
    return { kind: 'migrate', from, to: engineVersion, fromBaseline: saved === undefined, steps };
}

/**
 * Applies a planned pass to a clone (pure): every step in order, then the version advance. Never touches the input.
 *
 * @private configuration migrations
 */
export function applyConfigurationMigration(raw: Readonly<Record<string, unknown>>, plan: Extract<MigrationPlan, { kind: 'migrate' }>): { raw: Record<string, unknown>; notes: Array<{ target: string; title: string; notes: readonly string[] }>; problems: ConfigProblem[] } {
    const result = structuredClone(raw) as Record<string, unknown>;
    const notes: Array<{ target: string; title: string; notes: readonly string[] }> = [];
    const problems: ConfigProblem[] = [];
    for (const step of plan.steps) {
        const outcome = step.migrate(result);
        notes.push({ target: step.target, title: step.title, notes: outcome.notes });
        problems.push(...outcome.problems);
    }
    // The coordinator alone stamps the version; it stays first among the root keys for readability.
    const { promptbookVersion: _previous, ...rest } = result;
    void _previous;
    return { raw: { promptbookVersion: plan.to, ...rest }, notes, problems };
}
