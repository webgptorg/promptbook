import { formatDuration, parseDuration } from '../common/duration.js';
import { PtbkError } from '../common/errors.js';
import { readTextIfExists, writeFileAtomic } from '../common/fs.js';
import { systemTimeZone } from '../common/time.js';
import type { Project } from './workspace.js';

/**
 * Supported reasoning/effort settings (each harness supports a subset).
 *
 * @private project configuration
 */
export const THINKING_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;

/**
 * One reasoning/effort setting.
 *
 * @private project configuration
 */
export type ThinkingLevel = (typeof THINKING_LEVELS)[number];

/**
 * Where an effective value came from, lowest to highest priority.
 *
 * @private project configuration
 */
export type SettingSource = 'default' | 'environment' | 'ptbk.json' | 'cli' | 'runtime';

/**
 * When a changed setting takes effect in a running service.
 *
 * @private project configuration
 */
export type SettingApplication = 'live' | 'next-task' | 'restart';

/**
 * Value type of a setting.
 */
type SettingType = 'boolean' | 'string' | 'nullable-string' | 'integer' | 'duration' | 'enum' | 'port';

/**
 * Specification of one scalar setting.
 *
 * @private project configuration
 */
export type SettingSpec = {
    /** Dot path in `ptbk.json` and in effective settings. */
    readonly key: string;
    /** Value type. */
    readonly type: SettingType;
    /** Allowed values for enums. */
    readonly values?: readonly string[];
    /** Engine default (durations in milliseconds). */
    readonly default: unknown;
    /** Legacy environment variable filling an unspecified default. */
    readonly env?: string;
    /** Human description for help/inspection. */
    readonly description: string;
    /** When a runtime change applies. */
    readonly application: SettingApplication;
};

/**
 * Every scalar setting (the per-harness map is handled separately).
 *
 * @private project configuration
 */
export const SETTING_SPECS: readonly SettingSpec[] = [
    { key: 'paths.agents', type: 'string', default: 'agents', description: 'Directory of agent Books.', application: 'restart' },
    { key: 'paths.tasks', type: 'string', default: 'tasks', description: 'Task source directory.', application: 'restart' },
    { key: 'paths.context', type: 'nullable-string', default: 'AGENTS.md', description: 'Additional project context file (null disables).', application: 'next-task' },
    { key: 'routing.defaultAgent', type: 'string', default: 'Developer', description: 'Agent used by run/fix/plan when none is selected.', application: 'next-task' },
    { key: 'routing.harness', type: 'string', default: undefined, env: 'PTBK_HARNESS', description: 'Default/bootstrap harness (used directly by Manager).', application: 'next-task' },
    { key: 'routing.model', type: 'string', default: undefined, env: 'PTBK_MODEL', description: 'Default model of the default harness.', application: 'next-task' },
    {
        key: 'routing.thinkingLevel',
        type: 'enum',
        values: THINKING_LEVELS,
        default: undefined,
        env: 'PTBK_THINKING_LEVEL',
        description: 'Default thinking level.',
        application: 'next-task',
    },
    { key: 'routing.preferences', type: 'string', default: undefined, description: 'Natural-language routing preferences for Manager.', application: 'next-task' },
    { key: 'execution.check', type: 'nullable-string', default: undefined, description: 'Project validation command.', application: 'next-task' },
    {
        key: 'execution.checkBefore',
        type: 'enum',
        values: ['no', 'yes-and-fail', 'yes-and-fix'],
        default: 'no',
        description: 'Run the check before work.',
        application: 'next-task',
    },
    { key: 'execution.repairAttempts', type: 'integer', default: 3, description: 'Implementation/repair attempts per task.', application: 'next-task' },
    { key: 'execution.technicalRetries', type: 'integer', default: 3, description: 'Technical retries after the initial attempt.', application: 'next-task' },
    { key: 'execution.waitBetweenPrompts', type: 'duration', default: 0, description: 'Pause between tasks.', application: 'live' },
    { key: 'execution.waitAfterPrompt', type: 'duration', default: 0, description: 'Pause after each harness call.', application: 'live' },
    { key: 'execution.waitAfterError', type: 'duration', default: 600_000, description: 'Pause after a technical error.', application: 'live' },
    {
        key: 'execution.gitChanges',
        type: 'enum',
        values: ['fail', 'ignore', 'continue'],
        default: 'fail',
        description: 'Policy for unrelated uncommitted changes.',
        application: 'next-task',
    },
    { key: 'execution.commit', type: 'boolean', default: true, description: 'Commit versioned changes automatically.', application: 'restart' },
    { key: 'execution.autoPull', type: 'boolean', default: false, description: 'Pull with rebase at task boundaries.', application: 'next-task' },
    { key: 'execution.autoPush', type: 'boolean', default: false, description: 'Push completed work.', application: 'next-task' },
    { key: 'execution.isolate', type: 'boolean', default: false, description: 'Execute tasks in a separate Git worktree.', application: 'next-task' },
    { key: 'execution.normalizeLineEndings', type: 'boolean', default: true, description: 'Normalize CRLF in changed files of LF projects.', application: 'next-task' },
    { key: 'execution.allowCredits', type: 'boolean', default: false, description: 'Authorize explicit paid-credit fallback where supported.', application: 'next-task' },
    { key: 'execution.questions', type: 'boolean', default: true, description: 'Allow agents to ask the user.', application: 'next-task' },
    { key: 'execution.preserveLogs', type: 'boolean', default: false, description: 'Keep all system logs in .ptbk/ without rotation (task traces are never rotated).', application: 'live' },
    { key: 'execution.autoMigrate', type: 'boolean', default: false, description: 'Run the configured migration hook after agent work.', application: 'next-task' },
    { key: 'execution.migrateCommand', type: 'string', default: undefined, description: 'Project migration hook command.', application: 'next-task' },
    {
        key: 'execution.stallTimeout',
        type: 'duration',
        default: 45 * 60_000,
        description: 'A harness producing no output for this long is treated as stalled and retried (0 disables).',
        application: 'next-task',
    },
    { key: 'traces.commit', type: 'boolean', default: false, description: 'Include task traces (traces/<task-id>/) in result commits; false ignores the whole traces/ tree.', application: 'next-task' },
    { key: 'traces.ignoreVideos', type: 'boolean', default: true, description: 'Keep trace videos out of Git even when traces are committed.', application: 'next-task' },
    { key: 'traces.recordVideo', type: 'boolean', default: true, description: 'Record browser activity of tasks using the project browser.', application: 'next-task' },
    { key: 'browser.profile', type: 'string', default: 'isolated', description: '`isolated` or a browser profile path.', application: 'next-task' },
    { key: 'browser.mode', type: 'enum', values: ['headless', 'headful'], default: 'headless', description: 'Browser visibility.', application: 'next-task' },
    { key: 'browser.executable', type: 'string', default: undefined, description: 'Chrome-compatible browser executable.', application: 'next-task' },
    { key: 'server.enabled', type: 'boolean', default: true, description: 'Serve the local HTTP API and browser dashboard.', application: 'restart' },
    { key: 'server.port', type: 'port', default: undefined, description: 'Local HTTP port (automatic from 3000 when omitted).', application: 'restart' },
    { key: 'server.tunnel.enabled', type: 'boolean', default: true, description: 'Protected remote tunnel when HTTP runs.', application: 'restart' },
    {
        key: 'server.tunnel.provider',
        type: 'enum',
        values: ['cloudflare-quick', 'cloudflare-named'],
        default: 'cloudflare-quick',
        description: 'Tunnel provider.',
        application: 'restart',
    },
    { key: 'server.tunnel.hostname', type: 'string', default: undefined, description: 'Hostname of a named tunnel.', application: 'restart' },
    { key: 'server.tunnel.name', type: 'string', default: undefined, description: 'Named tunnel name or UUID.', application: 'restart' },
    { key: 'server.tunnel.credentialsFile', type: 'string', default: undefined, description: 'Path to named-tunnel credentials (reference, not content).', application: 'restart' },
    { key: 'server.tunnel.tokenEnv', type: 'string', default: undefined, description: 'Environment variable holding a named-tunnel token.', application: 'restart' },
    { key: 'service.persist', type: 'boolean', default: true, description: 'Restart automatically after crashes and reboots.', application: 'restart' },
    { key: 'service.harnessUpdates', type: 'enum', values: ['auto', 'off'], default: 'auto', description: 'Automatic harness updates.', application: 'live' },
    { key: 'service.qr', type: 'boolean', default: true, description: 'Show QR codes.', application: 'live' },
    { key: 'discovery.enabled', type: 'boolean', default: true, description: 'Goal discovery when the backlog is empty.', application: 'live' },
    { key: 'discovery.cooldown', type: 'duration', default: 6 * 3_600_000, description: 'Wait after a no-work enquiry.', application: 'live' },
    { key: 'learning.enabled', type: 'boolean', default: true, description: 'Teacher follow-ups for open agents.', application: 'next-task' },
    { key: 'team.timeout', type: 'duration', default: 300_000, description: 'Consultation timeout.', application: 'next-task' },
    { key: 'team.maxDepth', type: 'integer', default: 4, description: 'Maximal consultation depth.', application: 'next-task' },
    { key: 'team.maxCalls', type: 'integer', default: 24, description: 'Consultations per task.', application: 'next-task' },
    { key: 'team.maxResponseChars', type: 'integer', default: 128_000, description: 'Maximal consultation response length.', application: 'next-task' },
    { key: 'timezone', type: 'string', default: undefined, description: 'Project time zone (system zone when omitted).', application: 'live' },
];

/**
 * Lookup of setting specifications by key.
 *
 * @private project configuration
 */
export const SETTING_SPEC_BY_KEY: ReadonlyMap<string, SettingSpec> = new Map(SETTING_SPECS.map((spec) => [spec.key, spec]));

/**
 * Non-secret configuration of one harness.
 *
 * @private project configuration
 */
export type HarnessSettings = {
    /** Enabled for this project. */
    readonly enabled: boolean;
    /** Preferred model. */
    readonly model?: string;
    /** Preferred thinking level. */
    readonly thinkingLevel?: ThinkingLevel;
    /** Explicitly known models (supplements the integration's catalog). */
    readonly models?: readonly string[];
    /** Name of an environment variable holding an API key (reference only). */
    readonly apiKeyEnv?: string;
};

/**
 * A configuration problem with its location.
 *
 * @private project configuration
 */
export type ConfigDiagnostic = {
    /** Location such as `ptbk.json › execution.check`. */
    readonly location: string;
    /** Explanation. */
    readonly message: string;
    /** Errors prevent affected work. */
    readonly severity: 'error' | 'warning';
};

/**
 * Effective settings with their sources.
 *
 * @private project configuration
 */
export type EffectiveSettings = {
    /** Value per scalar key (durations in milliseconds). */
    readonly values: Readonly<Record<string, unknown>>;
    /** Source per scalar key. */
    readonly sources: Readonly<Record<string, SettingSource>>;
    /** Per-harness configuration. */
    readonly harnesses: Readonly<Record<string, HarnessSettings>>;
    /** Problems found while resolving. */
    readonly diagnostics: readonly ConfigDiagnostic[];
};

/**
 * Reads a dot path from a nested object.
 *
 * @private project configuration
 */
export function getPath(object: unknown, path: string): unknown {
    let current: unknown = object;
    for (const part of path.split('.')) {
        if (current === null || typeof current !== 'object' || Array.isArray(current)) return undefined;
        current = (current as Record<string, unknown>)[part];
    }
    return current;
}

/**
 * Writes a dot path into a nested object, creating intermediate objects (`undefined` removes the key).
 *
 * @private project configuration
 */
export function setPath(object: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = object;
    for (const part of parts.slice(0, -1)) {
        const next = current[part];
        if (next === null || typeof next !== 'object' || Array.isArray(next)) current[part] = {};
        current = current[part] as Record<string, unknown>;
    }
    const last = parts[parts.length - 1]!;
    if (value === undefined) delete current[last];
    else current[last] = value;
}

/**
 * Parses a raw value according to a setting spec.
 *
 * @private project configuration
 */
export function parseSettingValue(spec: SettingSpec, raw: unknown): { ok: true; value: unknown } | { ok: false; message: string } {
    switch (spec.type) {
        case 'boolean':
            if (typeof raw === 'boolean') return { ok: true, value: raw };
            if (raw === 'true' || raw === 'false') return { ok: true, value: raw === 'true' };
            return { ok: false, message: 'expected true or false' };
        case 'string':
            if (typeof raw === 'string' && raw.trim() !== '') return { ok: true, value: raw };
            return { ok: false, message: 'expected a nonempty string' };
        case 'nullable-string':
            if (raw === null || raw === '') return { ok: true, value: null };
            if (typeof raw === 'string') return { ok: true, value: raw };
            return { ok: false, message: 'expected a string or null' };
        case 'integer': {
            const number = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
            if (typeof number === 'number' && Number.isInteger(number) && number >= 0) return { ok: true, value: number };
            return { ok: false, message: 'expected a nonnegative integer' };
        }
        case 'port': {
            const number = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
            if (typeof number === 'number' && Number.isInteger(number) && number >= 1 && number <= 65535) return { ok: true, value: number };
            return { ok: false, message: 'expected a TCP port between 1 and 65535' };
        }
        case 'duration': {
            if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return { ok: true, value: Math.round(raw * 1000) };
            if (typeof raw !== 'string') return { ok: false, message: 'expected a duration such as 30m or 1h30m' };
            const parsed = parseDuration(raw);
            if (!parsed.ok) return { ok: false, message: parsed.reason };
            return { ok: true, value: parsed.ms };
        }
        case 'enum':
            if (typeof raw === 'string' && spec.values!.includes(raw)) return { ok: true, value: raw };
            return { ok: false, message: `expected one of ${spec.values!.join(', ')}` };
    }
}

/**
 * Serializes an effective value back to its `ptbk.json` representation.
 *
 * @private project configuration
 */
export function serializeSettingValue(spec: SettingSpec, value: unknown): unknown {
    if (spec.type === 'duration' && typeof value === 'number') return value === 0 ? '0' : formatDuration(value).replace(/\s+/g, '');
    return value;
}

/**
 * Reads `ptbk.json` as raw JSON; returns an empty object when missing.
 *
 * @private project configuration
 */
export async function readProjectConfigFile(project: Project): Promise<{ raw: Record<string, unknown>; exists: boolean; diagnostics: ConfigDiagnostic[] }> {
    const text = await readTextIfExists(project.configPath);
    if (text === undefined) return { raw: {}, exists: false, diagnostics: [] };
    try {
        const raw = JSON.parse(text) as unknown;
        if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
            return { raw: {}, exists: true, diagnostics: [{ location: 'ptbk.json', message: 'The file must contain a JSON object.', severity: 'error' }] };
        }
        return { raw: raw as Record<string, unknown>, exists: true, diagnostics: [] };
    } catch (error) {
        return { raw: {}, exists: true, diagnostics: [{ location: 'ptbk.json', message: `Invalid JSON: ${(error as Error).message}`, severity: 'error' }] };
    }
}

/**
 * Known top-level keys of `ptbk.json`.
 */
const KNOWN_TOP_LEVEL_KEYS = new Set(['$schema', 'version', 'paths', 'routing', 'execution', 'traces', 'browser', 'server', 'service', 'discovery', 'learning', 'team', 'timezone', 'harnesses', 'initialized']);

/**
 * Parses the per-harness map of `ptbk.json`.
 */
function parseHarnessMap(raw: unknown, diagnostics: ConfigDiagnostic[]): Record<string, HarnessSettings> {
    const result: Record<string, HarnessSettings> = {};
    if (raw === undefined) return result;
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        diagnostics.push({ location: 'ptbk.json › harnesses', message: 'expected an object keyed by harness identifier', severity: 'error' });
        return result;
    }
    for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
        const location = `ptbk.json › harnesses.${id}`;
        if (value === null || typeof value !== 'object' || Array.isArray(value)) {
            diagnostics.push({ location, message: 'expected an object', severity: 'error' });
            continue;
        }
        const entry = value as Record<string, unknown>;
        const enabled = entry.enabled === undefined ? true : entry.enabled;
        if (typeof enabled !== 'boolean') diagnostics.push({ location: `${location}.enabled`, message: 'expected true or false', severity: 'error' });
        const thinkingLevel = entry.thinkingLevel;
        if (thinkingLevel !== undefined && !THINKING_LEVELS.includes(thinkingLevel as ThinkingLevel)) {
            diagnostics.push({ location: `${location}.thinkingLevel`, message: `expected one of ${THINKING_LEVELS.join(', ')}`, severity: 'error' });
        }
        const models = entry.models;
        if (models !== undefined && (!Array.isArray(models) || models.some((model) => typeof model !== 'string'))) {
            diagnostics.push({ location: `${location}.models`, message: 'expected an array of model identifiers', severity: 'error' });
        }
        for (const key of Object.keys(entry)) {
            if (/key|token|secret|password/i.test(key) && key !== 'apiKeyEnv') {
                diagnostics.push({ location: `${location}.${key}`, message: 'store credential references (e.g. apiKeyEnv), never secret values', severity: 'error' });
            }
        }
        result[id] = {
            enabled: enabled === true,
            model: typeof entry.model === 'string' ? entry.model : undefined,
            thinkingLevel: THINKING_LEVELS.includes(thinkingLevel as ThinkingLevel) ? (thinkingLevel as ThinkingLevel) : undefined,
            models: Array.isArray(models) ? (models.filter((model) => typeof model === 'string') as string[]) : undefined,
            apiKeyEnv: typeof entry.apiKeyEnv === 'string' ? entry.apiKeyEnv : undefined,
        };
    }
    return result;
}

/**
 * Inputs of settings resolution.
 *
 * @private project configuration
 */
export type SettingsLayers = {
    /** Raw `ptbk.json` content. */
    readonly file: Record<string, unknown>;
    /** Environment for legacy defaults. */
    readonly env?: NodeJS.ProcessEnv;
    /** Explicit CLI overrides by key (already parsed values). */
    readonly cli?: Readonly<Record<string, unknown>>;
    /** Temporary live runtime changes by key. */
    readonly runtime?: Readonly<Record<string, unknown>>;
    /** CLI override of enabled harnesses (restricts/enables for this invocation). */
    readonly cliHarnesses?: readonly string[];
};

/**
 * Resolves effective settings: engine defaults < legacy environment < `ptbk.json` < CLI flags < live runtime changes.
 *
 * Omitted values inherit; explicit `false`, empty or `null` values are kept.
 *
 * @private project configuration
 */
export function resolveSettings(layers: SettingsLayers): EffectiveSettings {
    const diagnostics: ConfigDiagnostic[] = [];
    const values: Record<string, unknown> = {};
    const sources: Record<string, SettingSource> = {};
    const env = layers.env ?? process.env;
    for (const key of Object.keys(layers.file)) {
        if (!KNOWN_TOP_LEVEL_KEYS.has(key)) diagnostics.push({ location: `ptbk.json › ${key}`, message: 'unknown setting (preserved, ignored)', severity: 'warning' });
    }
    for (const spec of SETTING_SPECS) {
        let value = spec.default;
        let source: SettingSource = 'default';
        if (spec.env && env[spec.env] !== undefined && env[spec.env] !== '') {
            const parsed = parseSettingValue(spec, env[spec.env]);
            if (parsed.ok) {
                value = parsed.value;
                source = 'environment';
            } else diagnostics.push({ location: `environment › ${spec.env}`, message: parsed.message, severity: 'error' });
        }
        const fileValue = getPath(layers.file, spec.key);
        if (fileValue !== undefined) {
            const parsed = parseSettingValue(spec, fileValue);
            if (parsed.ok) {
                value = parsed.value;
                source = 'ptbk.json';
            } else diagnostics.push({ location: `ptbk.json › ${spec.key}`, message: parsed.message, severity: 'error' });
        }
        if (layers.cli && Object.hasOwn(layers.cli, spec.key) && layers.cli[spec.key] !== undefined) {
            value = layers.cli[spec.key];
            source = 'cli';
        }
        if (layers.runtime && Object.hasOwn(layers.runtime, spec.key) && layers.runtime[spec.key] !== undefined) {
            value = layers.runtime[spec.key];
            source = 'runtime';
        }
        values[spec.key] = value;
        sources[spec.key] = source;
    }
    if (values.timezone === undefined) values.timezone = systemTimeZone();
    else {
        try {
            new Intl.DateTimeFormat('en-US', { timeZone: String(values.timezone) });
        } catch {
            diagnostics.push({ location: 'ptbk.json › timezone', message: `unknown time zone "${String(values.timezone)}"`, severity: 'error' });
            values.timezone = systemTimeZone();
        }
    }
    const harnesses = parseHarnessMap(layers.file.harnesses, diagnostics);
    if (layers.cliHarnesses && layers.cliHarnesses.length) {
        const selected = new Set(layers.cliHarnesses);
        for (const id of Object.keys(harnesses)) harnesses[id] = { ...harnesses[id]!, enabled: selected.has(id) };
        for (const id of selected) if (!harnesses[id]) harnesses[id] = { enabled: true };
    }
    if (values['server.enabled'] === false && sources['server.tunnel.enabled'] !== 'cli') values['server.tunnel.enabled'] = false;
    return { values, sources, harnesses, diagnostics };
}

/**
 * Loads and resolves the project's settings.
 *
 * @private project configuration
 */
export async function loadSettings(project: Project, layers: Omit<SettingsLayers, 'file'> = {}): Promise<EffectiveSettings & { fileExists: boolean; raw: Record<string, unknown> }> {
    const file = await readProjectConfigFile(project);
    const resolved = resolveSettings({ ...layers, file: file.raw });
    return { ...resolved, diagnostics: [...file.diagnostics, ...resolved.diagnostics], fileExists: file.exists, raw: file.raw };
}

/**
 * Throws a configuration error when settings contain errors (used before affected work).
 *
 * @private project configuration
 */
export function assertValidSettings(settings: EffectiveSettings, project: Project): void {
    const errors = settings.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (!errors.length) return;
    throw new PtbkError('The project configuration is invalid.', {
        kind: 'configuration',
        project: project.root,
        reason: errors.map((error) => `${error.location}: ${error.message}`).join('\n'),
        effect: 'No work was started.',
        next: ['Correct ptbk.json (or the listed environment variable) and retry.'],
    });
}

/**
 * Typed accessor of an effective setting.
 *
 * @private project configuration
 */
export function setting<T>(settings: EffectiveSettings, key: string): T {
    if (!SETTING_SPEC_BY_KEY.has(key)) throw new Error(`Unknown setting ${key}`);
    return settings.values[key] as T;
}

/**
 * Enabled harness identifiers in configuration order.
 *
 * @private project configuration
 */
export function enabledHarnesses(settings: EffectiveSettings): string[] {
    return Object.entries(settings.harnesses)
        .filter(([, harness]) => harness.enabled)
        .map(([id]) => id);
}

/**
 * Applies changes to `ptbk.json`, preserving unknown keys, and returns whether the file content changed.
 *
 * Values are effective values (durations in ms); `undefined` removes a key.
 *
 * @private project configuration
 */
export async function updateProjectConfig(
    project: Project,
    changes: { readonly settings?: Readonly<Record<string, unknown>>; readonly harnesses?: Readonly<Record<string, Partial<HarnessSettings> | undefined>> },
): Promise<boolean> {
    const file = await readProjectConfigFile(project);
    if (file.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
        throw new PtbkError('ptbk.json cannot be updated because it is invalid.', {
            kind: 'configuration',
            project: project.root,
            reason: file.diagnostics.map((diagnostic) => diagnostic.message).join('\n'),
            next: ['Fix ptbk.json manually, then retry.'],
        });
    }
    const raw = structuredClone(file.raw);
    if (raw.version === undefined) raw.version = 1;
    for (const [key, value] of Object.entries(changes.settings ?? {})) {
        const spec = SETTING_SPEC_BY_KEY.get(key);
        if (!spec) throw new Error(`Unknown setting ${key}`);
        setPath(raw, key, value === undefined ? undefined : serializeSettingValue(spec, value));
    }
    for (const [id, harness] of Object.entries(changes.harnesses ?? {})) {
        const map = (raw.harnesses && typeof raw.harnesses === 'object' ? raw.harnesses : (raw.harnesses = {})) as Record<string, unknown>;
        if (harness === undefined) {
            delete map[id];
            continue;
        }
        const current = (map[id] && typeof map[id] === 'object' ? map[id] : {}) as Record<string, unknown>;
        const next: Record<string, unknown> = { ...current };
        for (const [field, value] of Object.entries(harness)) {
            if (value === undefined) delete next[field];
            else next[field] = value;
        }
        map[id] = next;
    }
    const text = `${JSON.stringify(raw, null, 4)}\n`;
    const before = await readTextIfExists(project.configPath);
    if (before === text) return false;
    await writeFileAtomic(project.configPath, text);
    return true;
}
