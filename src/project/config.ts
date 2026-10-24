import { formatDuration, parseDuration } from '../common/duration.js';
import { PtbkError } from '../common/errors.js';
import { readTextIfExists, writeFileAtomic } from '../common/fs.js';
import { canonicalEnumValue, matchEnum, matchProperty } from '../common/naming.js';
import { systemTimeZone } from '../common/time.js';
import { ENGINE_VERSION } from '../common/version.js';
import { HARNESS_VARIANTS, THINKING_LEVELS, enabledToolsOf, harnessPluginId, harnessVariantOf, type BrowserToolRecord, type HarnessToolRecord, type ProfileSource, type ThinkingLevel, type ToolRecord } from '../tools/model.js';
import { parseTools, type ConfigCorrection, type ConfigProblem } from '../tools/normalize.js';
import { applyConfigurationMigration, planConfigurationMigration, type MigrationPlan } from './migrations.js';
import type { Project } from './workspace.js';

export { THINKING_LEVELS, type ThinkingLevel };

/**
 * Where an effective value came from, lowest to highest priority.
 *
 * @private project configuration
 */
export type SettingSource = 'default' | 'ptbk.json' | 'cli' | 'runtime';

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
 * Enum `values` are the internal spellings (`yes-and-fail`); `ptbk.json` stores their canonical SCREAMING_SNAKE_CASE
 * form (`YES_AND_FAIL`) and loading accepts any unambiguous case/separator variant.
 *
 * @private project configuration
 */
export type SettingSpec = {
    /** Dot path in `ptbk.json` and in effective settings (lower camelCase segments; booleans start with `is`). */
    readonly key: string;
    /** Value type. */
    readonly type: SettingType;
    /** Allowed internal values for enums. */
    readonly values?: readonly string[];
    /** Engine default (durations in milliseconds). */
    readonly default: unknown;
    /** Human description for help/inspection. */
    readonly description: string;
    /** When a runtime change applies. */
    readonly application: SettingApplication;
};

/**
 * Every scalar setting (named tools live in `tools`, see the shared tool contract).
 *
 * @private project configuration
 */
export const SETTING_SPECS: readonly SettingSpec[] = [
    { key: 'isAutoSync', type: 'boolean', default: false, description: 'Automatic Git synchronization with the existing origin and current branch (pull every 60 s and at operation boundaries, push completed work).', application: 'live' },
    { key: 'paths.agents', type: 'string', default: 'agents', description: 'Directory of agent Books.', application: 'restart' },
    { key: 'paths.tasks', type: 'string', default: 'tasks', description: 'Task source directory.', application: 'restart' },
    { key: 'paths.context', type: 'nullable-string', default: 'AGENTS.md', description: 'Additional project context file (null disables).', application: 'next-task' },
    { key: 'routing.defaultAgent', type: 'string', default: 'Developer', description: 'Agent of fix/plan/ask and Markdown tasks when none is selected.', application: 'next-task' },
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
    { key: 'execution.isCommitEnabled', type: 'boolean', default: true, description: 'Commit versioned changes automatically.', application: 'restart' },
    { key: 'execution.isIsolated', type: 'boolean', default: false, description: 'Execute tasks in a separate Git worktree.', application: 'next-task' },
    { key: 'execution.isLineEndingNormalizationEnabled', type: 'boolean', default: true, description: 'Normalize CRLF in changed files of LF projects.', application: 'next-task' },
    { key: 'execution.isCreditFallbackAllowed', type: 'boolean', default: false, description: 'Authorize explicit paid-credit fallback where supported.', application: 'next-task' },
    { key: 'execution.isQuestionsEnabled', type: 'boolean', default: true, description: 'Allow agents to ask the user.', application: 'next-task' },
    { key: 'execution.isLogPreservationEnabled', type: 'boolean', default: false, description: 'Keep all system logs in .ptbk/ without rotation (task traces are never rotated).', application: 'live' },
    { key: 'execution.isAutoMigrateEnabled', type: 'boolean', default: false, description: 'Run the configured migration hook after agent work.', application: 'next-task' },
    { key: 'execution.migrateCommand', type: 'string', default: undefined, description: 'Project migration hook command.', application: 'next-task' },
    {
        key: 'execution.stallTimeout',
        type: 'duration',
        default: 45 * 60_000,
        description: 'A harness producing no output for this long is treated as stalled and retried (0 disables).',
        application: 'next-task',
    },
    { key: 'traces.isCommitted', type: 'boolean', default: false, description: 'Include task traces (traces/<task-file-basename>/) in result commits; false ignores the whole traces/ tree.', application: 'next-task' },
    { key: 'traces.isVideoIgnored', type: 'boolean', default: true, description: 'Keep trace videos out of Git even when traces are committed.', application: 'next-task' },
    { key: 'traces.isVideoRecordingEnabled', type: 'boolean', default: true, description: 'Record attributable activity of browser tools used by tasks.', application: 'next-task' },
    { key: 'server.isEnabled', type: 'boolean', default: true, description: 'Serve the local HTTP API and browser dashboard.', application: 'restart' },
    { key: 'server.port', type: 'port', default: undefined, description: 'Local HTTP port (automatic from 3000 when omitted).', application: 'restart' },
    { key: 'server.tunnel.isEnabled', type: 'boolean', default: true, description: 'Protected remote tunnel when HTTP runs.', application: 'restart' },
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
    { key: 'service.isPersistent', type: 'boolean', default: true, description: 'Restart automatically after crashes and reboots.', application: 'restart' },
    { key: 'service.harnessUpdates', type: 'enum', values: ['auto', 'off'], default: 'auto', description: 'Automatic harness updates.', application: 'live' },
    { key: 'service.isQrShown', type: 'boolean', default: true, description: 'Show QR codes.', application: 'live' },
    { key: 'discovery.isEnabled', type: 'boolean', default: true, description: 'Goal discovery when the backlog is empty.', application: 'live' },
    { key: 'discovery.cooldown', type: 'duration', default: 6 * 3_600_000, description: 'Wait after a no-work enquiry.', application: 'live' },
    { key: 'learning.isEnabled', type: 'boolean', default: true, description: 'Teacher follow-ups for open agents.', application: 'next-task' },
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
 * The explicit informational check saved when a project has no real validation. It always succeeds and means that
 * real automated validation is **not** configured; it never counts as evidence of passing tests.
 *
 * @private project configuration
 */
export const CHECK_PLACEHOLDER = 'echo "Configure project checks in ptbk.json execution.check"';

/**
 * Whether a check command is the informational placeholder rather than real validation.
 *
 * @private project configuration
 */
export function isCheckPlaceholder(check: string | null | undefined): boolean {
    return typeof check === 'string' && check.trim() === CHECK_PLACEHOLDER;
}

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
 * Temporary invocation overrides of one browser tool (`--browser-mode`, `--browser-profile`, `--browser-tool`).
 *
 * @private project configuration
 */
export type BrowserOverrides = {
    /** Target browser tool (required when several browsers are enabled). */
    readonly tool?: string;
    /** `headless` or `headful`. */
    readonly mode?: 'headless' | 'headful';
    /** Legacy profile spelling (`global`, `isolated`, `user`, canonical source or a path). */
    readonly profile?: string;
};

/**
 * Effective settings with their sources.
 *
 * @private project configuration
 */
export type EffectiveSettings = {
    /** Value per scalar key (durations in milliseconds; enums in their internal spelling). */
    readonly values: Readonly<Record<string, unknown>>;
    /** Source per scalar key. */
    readonly sources: Readonly<Record<string, SettingSource>>;
    /** Effective named tools in array order (saved records with this invocation's temporary overrides applied). */
    readonly tools: readonly ToolRecord[];
    /** Tools changed only for this invocation (`cli` overrides, never saved), by name. */
    readonly overriddenTools: ReadonlySet<string>;
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
 * Parses a raw value according to a setting spec (tolerant: `"true"`, canonical or kebab enum spellings).
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
        case 'enum': {
            const value = matchEnum(raw, spec.values!);
            if (value) return { ok: true, value };
            return { ok: false, message: `expected one of ${spec.values!.map(canonicalEnumValue).join(', ')}` };
        }
    }
}

/**
 * Serializes an effective value back to its canonical `ptbk.json` representation.
 *
 * @private project configuration
 */
export function serializeSettingValue(spec: SettingSpec, value: unknown): unknown {
    if (spec.type === 'duration' && typeof value === 'number') return value === 0 ? '0' : formatDuration(value).replace(/\s+/g, '');
    if (spec.type === 'enum' && typeof value === 'string') return canonicalEnumValue(value);
    return value;
}

/**
 * Raw content of `ptbk.json` with its parse diagnostics.
 *
 * @private project configuration
 */
export type ConfigFile = { raw: Record<string, unknown>; exists: boolean; text?: string; diagnostics: ConfigDiagnostic[] };

/**
 * Parses `ptbk.json` text.
 *
 * @private project configuration
 */
export function parseConfigText(text: string | undefined): ConfigFile {
    if (text === undefined) return { raw: {}, exists: false, diagnostics: [] };
    try {
        const raw = JSON.parse(text) as unknown;
        if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
            return { raw: {}, exists: true, text, diagnostics: [{ location: 'ptbk.json', message: 'The file must contain a JSON object.', severity: 'error' }] };
        }
        return { raw: raw as Record<string, unknown>, exists: true, text, diagnostics: [] };
    } catch (error) {
        return { raw: {}, exists: true, text, diagnostics: [{ location: 'ptbk.json', message: `Invalid JSON: ${(error as Error).message}`, severity: 'error' }] };
    }
}

/**
 * Reads `ptbk.json` as raw JSON; returns an empty object when missing.
 *
 * @private project configuration
 */
export async function readProjectConfigFile(project: Project): Promise<ConfigFile> {
    return parseConfigText(await readTextIfExists(project.configPath));
}

/**
 * Former routing settings, superseded by plugin-owned defaults, Router's concrete MODEL and its Book (the project
 * migration converts them; until then they are diagnosed and ignored, never a competing live source).
 *
 * @private project configuration
 */
export const SUPERSEDED_ROUTING_KEYS = ['harness', 'model', 'thinkingLevel', 'preferences'] as const;

/**
 * Known top-level keys of `ptbk.json` (canonical spellings).
 */
const KNOWN_TOP_LEVEL_KEYS = ['$schema', 'promptbookVersion', 'isAutoSync', 'tools', 'paths', 'routing', 'execution', 'traces', 'server', 'service', 'discovery', 'learning', 'team', 'timezone', 'initialized'];

/**
 * Known property names per configuration object path (for tolerant key canonicalization).
 */
function knownKeysByPath(): Map<string, string[]> {
    const map = new Map<string, string[]>([['', [...KNOWN_TOP_LEVEL_KEYS]]]);
    for (const spec of SETTING_SPECS) {
        const parts = spec.key.split('.');
        for (let index = 0; index < parts.length; index++) {
            const parent = parts.slice(0, index).join('.');
            const list = map.get(parent) ?? [];
            if (!list.includes(parts[index]!)) list.push(parts[index]!);
            map.set(parent, list);
        }
    }
    return map;
}

/**
 * Result of canonicalizing a raw configuration.
 *
 * @private project configuration
 */
export type CanonicalConfig = {
    /** The configuration with every deterministic correction applied (unknown fields preserved). */
    readonly raw: Record<string, unknown>;
    /** Deterministic corrections (keys, booleans, enum values, tool names); never secret values. */
    readonly corrections: readonly ConfigCorrection[];
    /** Problems needing repair (collisions, unknown variants, conflicting aliases). */
    readonly problems: readonly ConfigProblem[];
};

/**
 * Canonicalizes known Promptbook-owned configuration: lower camelCase keys, `is`-prefixed booleans, kebab-case tool
 * names and SCREAMING_SNAKE_CASE enum values. Tolerant input (case/separator differences) is corrected; ambiguous or
 * colliding input is reported as a problem and preserved unchanged. Canonical input is returned unchanged.
 *
 * @private project configuration
 */
export function canonicalizeConfig(input: Readonly<Record<string, unknown>>): CanonicalConfig {
    const raw = structuredClone(input) as Record<string, unknown>;
    const corrections: ConfigCorrection[] = [];
    const problems: ConfigProblem[] = [];
    const known = knownKeysByPath();
    const walk = (object: Record<string, unknown>, path: string): void => {
        const names = known.get(path);
        if (!names) return;
        const groups = new Map<string, string[]>();
        for (const key of Object.keys(object)) {
            const canonical = matchProperty(key, names) ?? key;
            groups.set(canonical, [...(groups.get(canonical) ?? []), key]);
        }
        const rebuilt: Record<string, unknown> = {};
        for (const [canonical, spellings] of groups) {
            if (spellings.length > 1) {
                problems.push({ location: `ptbk.json › ${path ? `${path}.` : ''}${canonical}`, message: `conflicting spellings ${spellings.map((spelling) => `"${spelling}"`).join(', ')} of the same setting (repair needed)`, severity: 'error' });
                for (const spelling of spellings) rebuilt[spelling] = object[spelling];
                continue;
            }
            const spelling = spellings[0]!;
            if (spelling !== canonical) corrections.push({ location: `${path ? `${path}.` : ''}${spelling}`, from: spelling, to: canonical });
            rebuilt[canonical] = object[spelling];
        }
        for (const key of Object.keys(object)) delete object[key];
        Object.assign(object, rebuilt);
        for (const [key, value] of Object.entries(object)) {
            const childPath = path ? `${path}.${key}` : key;
            if (value !== null && typeof value === 'object' && !Array.isArray(value) && known.has(childPath)) walk(value as Record<string, unknown>, childPath);
        }
    };
    walk(raw, '');
    for (const spec of SETTING_SPECS) {
        const value = getPath(raw, spec.key);
        if (value === undefined) continue;
        if (spec.type === 'enum') {
            const parsed = matchEnum(value, spec.values!);
            if (parsed && value !== canonicalEnumValue(parsed)) {
                corrections.push({ location: spec.key, from: String(value), to: canonicalEnumValue(parsed) });
                setPath(raw, spec.key, canonicalEnumValue(parsed));
            }
        } else if (spec.type === 'boolean' && (value === 'true' || value === 'false')) {
            corrections.push({ location: spec.key, from: value, to: value });
            setPath(raw, spec.key, value === 'true');
        }
    }
    if (raw.tools !== undefined) {
        const parsed = parseTools(raw.tools);
        corrections.push(...parsed.corrections.map((correction) => ({ ...correction, location: correction.location.replace(/^ptbk\.json › /, '') })));
        problems.push(...parsed.problems);
        if (parsed.corrections.length) raw.tools = parsed.canonical;
    }
    return { raw, corrections, problems };
}

/**
 * Inputs of settings resolution.
 *
 * @private project configuration
 */
export type SettingsLayers = {
    /** Raw `ptbk.json` content (already migrated and canonicalized for this engine). */
    readonly file: Record<string, unknown>;
    /** Process environment (credentials are resolved elsewhere; no setting falls back to it). */
    readonly env?: NodeJS.ProcessEnv;
    /** Explicit CLI overrides by key (already parsed values). */
    readonly cli?: Readonly<Record<string, unknown>>;
    /** Temporary live runtime changes by key. */
    readonly runtime?: Readonly<Record<string, unknown>>;
    /** CLI restriction to harness variants or named instances (`--harness`, repeatable; this invocation only). */
    readonly cliHarnesses?: readonly string[];
    /** Temporary browser overrides of this invocation. */
    readonly cliBrowser?: BrowserOverrides;
};

/**
 * Maps a legacy/temporary profile spelling to a typed profile.
 *
 * @private project configuration
 */
export function profileFromSpelling(value: string): BrowserToolRecord['profile'] {
    const legacy: Readonly<Record<string, ProfileSource>> = { global: 'MANAGED_GLOBAL', isolated: 'PROJECT', user: 'USER_EXISTING' };
    if (legacy[value]) return { source: legacy[value]! };
    const canonical = matchEnum(value, ['MANAGED_GLOBAL', 'PROJECT', 'USER_EXISTING'] as const);
    if (canonical) return { source: canonical };
    return { source: 'CUSTOM', path: value };
}

/**
 * Applies `--harness` restrictions: variants keep their ordered same-variant instances; a named instance stays an
 * explicit restriction; a selected variant without a configured instance gets a temporary native instance.
 */
function restrictHarnesses(tools: ToolRecord[], selectors: readonly string[], diagnostics: ConfigDiagnostic[], overridden: Set<string>): ToolRecord[] {
    const variants = new Set<string>();
    const names = new Set<string>();
    for (const selector of selectors) {
        const variant = matchEnum(selector, HARNESS_VARIANTS) ?? harnessVariantOf(selector);
        if (variant) variants.add(variant);
        else if (tools.some((tool) => tool.type === 'HARNESS' && tool.name === selector)) names.add(selector);
        else diagnostics.push({ location: `--harness ${selector}`, message: 'not a harness variant or configured harness tool name', severity: 'error' });
    }
    const result = tools.map((tool) => {
        if (tool.type !== 'HARNESS') return tool;
        const selected = names.has(tool.name) || variants.has(tool.variant);
        if (selected === tool.isEnabled) return tool;
        overridden.add(tool.name);
        return { ...tool, isEnabled: selected };
    });
    for (const variant of variants) {
        if (result.some((tool) => tool.type === 'HARNESS' && tool.variant === variant)) continue;
        const name = harnessPluginId(variant as HarnessToolRecord['variant']);
        if (result.some((tool) => tool.name === name)) continue;
        overridden.add(name);
        result.push({ type: 'HARNESS', variant: variant as HarnessToolRecord['variant'], name, isEnabled: true, authentication: 'NATIVE' });
    }
    return result;
}

/**
 * Applies temporary browser overrides to exactly one unambiguous browser tool.
 */
function overrideBrowser(tools: ToolRecord[], overrides: BrowserOverrides, diagnostics: ConfigDiagnostic[], overridden: Set<string>): ToolRecord[] {
    if (!overrides.mode && !overrides.profile) return tools;
    const browsers = tools.filter((tool): tool is BrowserToolRecord => tool.type === 'BROWSER');
    let target: BrowserToolRecord | undefined;
    if (overrides.tool) {
        target = browsers.find((tool) => tool.name === overrides.tool);
        if (!target) {
            diagnostics.push({ location: `--browser-tool ${overrides.tool}`, message: 'no browser tool has this name', severity: 'error' });
            return tools;
        }
    } else {
        const enabled = browsers.filter((tool) => tool.isEnabled);
        if (enabled.length > 1) {
            diagnostics.push({ location: '--browser-mode/--browser-profile', message: `several browsers are enabled (${enabled.map((tool) => tool.name).join(', ')}); select one with --browser-tool <name>`, severity: 'error' });
            return tools;
        }
        target = enabled[0] ?? browsers[0];
    }
    if (!target) {
        diagnostics.push({ location: '--browser-mode/--browser-profile', message: 'no browser tool is configured (add one with `ptbk tool add BROWSER …`)', severity: 'error' });
        return tools;
    }
    overridden.add(target.name);
    const changed: BrowserToolRecord = {
        ...target,
        ...(overrides.mode ? { isHeadless: overrides.mode !== 'headful' } : {}),
        ...(overrides.profile ? { profile: profileFromSpelling(overrides.profile) } : {}),
    };
    return tools.map((tool) => (tool === target ? changed : tool));
}

/**
 * Resolves effective settings: engine defaults < `ptbk.json` < CLI flags < live runtime changes.
 *
 * Omitted values inherit; explicit `false`, empty or `null` values are kept.
 *
 * @private project configuration
 */
export function resolveSettings(layers: SettingsLayers): EffectiveSettings {
    const diagnostics: ConfigDiagnostic[] = [];
    const values: Record<string, unknown> = {};
    const sources: Record<string, SettingSource> = {};
    for (const key of Object.keys(layers.file)) {
        if (!KNOWN_TOP_LEVEL_KEYS.includes(key)) diagnostics.push({ location: `ptbk.json › ${key}`, message: 'unknown setting (preserved, ignored)', severity: 'warning' });
    }
    const routing = layers.file.routing;
    if (routing !== null && typeof routing === 'object' && !Array.isArray(routing)) {
        for (const key of SUPERSEDED_ROUTING_KEYS) {
            if ((routing as Record<string, unknown>)[key] !== undefined) {
                diagnostics.push({ location: `ptbk.json › routing.${key}`, message: 'superseded routing setting (preserved, ignored): plugins own model/thinking defaults and Router\'s MODEL/Book state routing; the project migration converts it', severity: 'warning' });
            }
        }
    }
    for (const spec of SETTING_SPECS) {
        let value = spec.default;
        let source: SettingSource = 'default';
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
    const parsedTools = parseTools(layers.file.tools);
    diagnostics.push(...parsedTools.problems);
    const overridden = new Set<string>();
    let tools = [...parsedTools.tools];
    if (layers.cliHarnesses?.length) tools = restrictHarnesses(tools, layers.cliHarnesses, diagnostics, overridden);
    if (layers.cliBrowser) tools = overrideBrowser(tools, layers.cliBrowser, diagnostics, overridden);
    if (values['server.isEnabled'] === false && sources['server.tunnel.isEnabled'] !== 'cli') values['server.tunnel.isEnabled'] = false;
    return { values, sources, tools, overriddenTools: overridden, diagnostics };
}

/**
 * Loaded settings with the configuration's version state and correction proposals.
 *
 * @private project configuration
 */
export type LoadedSettings = EffectiveSettings & {
    readonly fileExists: boolean;
    /** The file content exactly as stored. */
    readonly raw: Record<string, unknown>;
    /** The content this engine interprets (migrated in memory and canonicalized; never written by loading). */
    readonly interpreted: Record<string, unknown>;
    /** Version compatibility and any pending migration. */
    readonly migration: MigrationPlan;
    /** Deterministic corrections a mutating load would save (read-only loads only report them). */
    readonly corrections: readonly ConfigCorrection[];
};

/**
 * Loads and resolves the project's settings without writing anything: a pending configuration migration and
 * deterministic spelling corrections are applied in memory and reported; persisting them is the job of the mutating
 * entry points (see the configuration coordinator).
 *
 * @private project configuration
 */
export async function loadSettings(project: Project, layers: Omit<SettingsLayers, 'file'> = {}): Promise<LoadedSettings> {
    const file = await readProjectConfigFile(project);
    return interpretConfig(file, layers);
}

/**
 * Interprets a read configuration file for this engine (pure; see {@link loadSettings}).
 *
 * @private project configuration
 */
export function interpretConfig(file: ConfigFile, layers: Omit<SettingsLayers, 'file'> = {}, engineVersion: string = ENGINE_VERSION): LoadedSettings {
    const diagnostics: ConfigDiagnostic[] = [...file.diagnostics];
    const migration: MigrationPlan = file.exists && !file.diagnostics.length ? planConfigurationMigration(file.raw, engineVersion) : { kind: 'current', version: engineVersion };
    let interpreted = file.raw;
    if (migration.kind === 'migrate') {
        const migrated = applyConfigurationMigration(file.raw, migration);
        interpreted = migrated.raw;
        diagnostics.push(...migrated.problems);
        diagnostics.push({ location: 'ptbk.json › promptbookVersion', message: `configuration migration ${migration.from} → ${migration.to} is pending (it is applied and committed before new work)`, severity: 'warning' });
    } else if (migration.kind === 'older-engine') {
        diagnostics.push({
            location: 'ptbk.json › promptbookVersion',
            message: `this project was configured by ptbk ${migration.saved}, which is newer than the running ptbk ${migration.engine}; update ptbk (npm install -g ptbk@latest, or the project's local dependency) and rerun — the project is never downgraded`,
            severity: 'error',
        });
    } else if (migration.kind === 'invalid') {
        diagnostics.push({ location: 'ptbk.json › promptbookVersion', message: migration.reason, severity: 'error' });
    }
    const canonical = canonicalizeConfig(interpreted);
    const resolved = resolveSettings({ ...layers, file: canonical.raw });
    const seen = new Set<string>();
    const merged = [...diagnostics, ...canonical.problems.filter((problem) => !problem.location.includes('tools')), ...resolved.diagnostics].filter((diagnostic) => {
        const key = `${diagnostic.location}\u0000${diagnostic.message}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    return { ...resolved, diagnostics: merged, fileExists: file.exists, raw: file.raw, interpreted: canonical.raw, migration, corrections: migration.kind === 'migrate' ? [] : canonical.corrections };
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
 * Enabled harness instances in configuration order.
 *
 * @private project configuration
 */
export function enabledHarnessTools(settings: EffectiveSettings): HarnessToolRecord[] {
    return enabledToolsOf(settings.tools, 'HARNESS');
}

/**
 * Enabled browser instances in configuration order.
 *
 * @private project configuration
 */
export function enabledBrowserTools(settings: EffectiveSettings): BrowserToolRecord[] {
    return enabledToolsOf(settings.tools, 'BROWSER');
}

/**
 * Harness plugin identifiers that have at least one enabled instance, in first-instance order.
 *
 * @private project configuration
 */
export function enabledHarnesses(settings: EffectiveSettings): string[] {
    return [...new Set(enabledHarnessTools(settings).map((tool) => harnessPluginId(tool.variant)))];
}

/**
 * Serializes `ptbk.json` text (stable 4-space JSON).
 *
 * @private project configuration
 */
export function configText(raw: Readonly<Record<string, unknown>>): string {
    return `${JSON.stringify(raw, null, 4)}\n`;
}

/**
 * Applies scalar setting changes to `ptbk.json`, preserving unknown keys, and returns whether the file content changed.
 *
 * Values are effective values (durations in ms, internal enum spellings); `undefined` removes a key. A new file is
 * stamped with the running engine's `promptbookVersion`. An existing file must already be current for this engine
 * (the configuration coordinator migrates it first).
 *
 * @private project configuration
 */
export async function updateProjectConfig(project: Project, changes: { readonly settings?: Readonly<Record<string, unknown>> }): Promise<boolean> {
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
    if (!file.exists) raw.promptbookVersion = ENGINE_VERSION;
    else {
        const plan = planConfigurationMigration(raw);
        if (plan.kind !== 'current') {
            throw new PtbkError('ptbk.json must be migrated before it can be changed.', {
                kind: 'configuration',
                project: project.root,
                reason: plan.kind === 'migrate' ? `The configuration is at ${plan.from}; this engine is ${plan.to}.` : plan.kind === 'older-engine' ? `The configuration was written by the newer ptbk ${plan.saved}.` : plan.reason,
                next: ['Run `ptbk start` (or `ptbk init`) to apply the committed configuration migration first.'],
            });
        }
    }
    for (const [key, value] of Object.entries(changes.settings ?? {})) {
        const spec = SETTING_SPEC_BY_KEY.get(key);
        if (!spec) throw new Error(`Unknown setting ${key}`);
        setPath(raw, key, value === undefined ? undefined : serializeSettingValue(spec, value));
    }
    const text = configText(raw);
    if (file.text === text) return false;
    await writeFileAtomic(project.configPath, text);
    return true;
}
