import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Workspace } from './domain.js';
import { confinePath, InputError } from './workspace.js';
import { getHarness } from './harness.js';

/** Effective defaults retain disabled values and their origin without runtime or credential state. @private */
export interface ProjectConfiguration {
    path: string;
    exists: boolean;
    values: Record<string, string | boolean | string[]>;
    sources: Record<string, string>;
    enabledHarnesses?: string[];
    autoUpdateHarnesses?: boolean;
    harnessSettings?: Record<string, { model?: string; thinkingLevel?: string; apiKeyEnv?: string; configurationPath?: string }>;
    document: Record<string, unknown>;
    /** Exact validated bytes used by optimistic versioned configuration saves. */
    sourceText?: string;
}

/** Supported saved settings map directly to temporary command options. */
const SETTINGS: Record<string, { option: string; type: 'string' | 'boolean' | 'integer' | 'duration'; invert?: boolean }> = {
    tasks: { option: 'tasks', type: 'string' }, timezone: { option: 'timezone', type: 'string' },
    harness: { option: 'harness', type: 'string' }, model: { option: 'model', type: 'string' },
    thinkingLevel: { option: 'thinking-level', type: 'string' }, agent: { option: 'agent', type: 'string' },
    context: { option: 'context', type: 'string' }, check: { option: 'check', type: 'string' },
    checkBefore: { option: 'check-before', type: 'string' }, gitChanges: { option: 'git-changes', type: 'string' },
    minPriority: { option: 'min-priority', type: 'integer' }, maxPriority: { option: 'max-priority', type: 'integer' },
    limit: { option: 'limit', type: 'integer' }, autoPull: { option: 'auto-pull', type: 'boolean' },
    autoPush: { option: 'auto-push', type: 'boolean' }, isolate: { option: 'isolate', type: 'boolean' },
    noCommit: { option: 'no-commit', type: 'boolean' }, noQuestions: { option: 'no-questions', type: 'boolean' },
    allowCredits: { option: 'allow-credits', type: 'boolean' }, preserveLogs: { option: 'preserve-logs', type: 'boolean' },
    normalizeLineEndings: { option: 'no-normalize-line-endings', type: 'boolean', invert: true },
    waitBetweenPrompts: { option: 'wait-between-prompts', type: 'duration' },
    waitAfterPrompt: { option: 'wait-after-prompt', type: 'duration' }, waitAfterError: { option: 'wait-after-error', type: 'duration' },
    persist: { option: 'no-persist', type: 'boolean', invert: true },
    server: { option: 'no-server', type: 'boolean', invert: true }, qr: { option: 'no-qr', type: 'boolean', invert: true },
    port: { option: 'port', type: 'integer' },
    mode: { option: 'process-mode', type: 'string' },
};

/** Validate object boundaries without accepting arrays or null as configuration sections. */
function object(value: unknown, location: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InputError(`${location}: expected an object.`);
    return value as Record<string, unknown>;
}

/** Reject stored secret material while permitting explicit references to environment variables. */
function rejectSecrets(value: Record<string, unknown>, location: string): void {
    for (const [name, entry] of Object.entries(value)) {
        const path = `${location}.${name}`;
        if (/^(?:api[-_]?key|access[-_]?token|refresh[-_]?token|password|authorization|cookies?|sessions?|credentials?)$/i.test(name)) {
            throw new InputError(`${path}: store a credential reference such as apiKeyEnv, never a secret or browser session.`);
        }
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) rejectSecrets(entry as Record<string, unknown>, path);
    }
}

/** Read only this project's versioned defaults; absence never inherits an ancestor's file. @private */
export async function readProjectConfiguration(projectPath: string): Promise<ProjectConfiguration> {
    const path = await confinePath(projectPath, join(projectPath, 'ptbk.json'));
    const result: ProjectConfiguration = { path, exists: false, values: {}, sources: {}, document: {} };
    for (const [option, variable] of [['harness', 'PTBK_HARNESS'], ['model', 'PTBK_MODEL'], ['thinking-level', 'PTBK_THINKING_LEVEL']]) {
        if (process.env[variable!] !== undefined) { result.values[option!] = process.env[variable!]!; result.sources[option!] = variable!; }
    }
    let text: string;
    try { text = await readFile(path, 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return result; throw error; }
    let document: Record<string, unknown>;
    try { document = object(JSON.parse(text), path); }
    catch (error) {
        const position = /(?:position \d+|line \d+ column \d+)/.exec((error as Error).message)?.[0];
        throw new InputError(`${path}: ${error instanceof SyntaxError ? `invalid JSON${position ? ` at ${position}` : ''}` : (error as Error).message}. Correct the saved configuration before continuing.`);
    }
    rejectSecrets(document, path);
    result.exists = true; result.document = document; result.sourceText = text;
    const sections: Array<[string, Record<string, unknown>]> = [['', document]];
    for (const section of ['routing', 'execution', 'process']) if (document[section] !== undefined) sections.push([section, object(document[section], `${path}.${section}`)]);
    for (const [section, entries] of sections) {
        for (const [name, entry] of Object.entries(entries)) {
            const setting = SETTINGS[name];
            if (!setting) {
                if (!section && ['routing', 'execution', 'process', 'browser', 'harnesses', 'updates', 'tunnel', '$schema'].includes(name)) continue;
                throw new InputError(`${path}${section ? `.${section}` : ''}.${name}: unsupported setting.`);
            }
            const location = `${path}${section ? `.${section}` : ''}.${name}`;
            if (setting.type === 'string' && typeof entry !== 'string' || setting.type === 'boolean' && typeof entry !== 'boolean' || setting.type === 'integer' && (typeof entry !== 'number' || !Number.isSafeInteger(entry) || entry < 0) || setting.type === 'duration' && (typeof entry !== 'string' && (typeof entry !== 'number' || !Number.isSafeInteger(entry) || entry < 0))) throw new InputError(`${location}: expected ${setting.type === 'integer' ? 'a nonnegative integer' : setting.type}.`);
            if (name === 'mode' && !['daemon', 'foreground', 'raw', 'interactive'].includes(String(entry))) throw new InputError(`${location}: expected daemon or foreground (legacy raw/interactive are also accepted).`);
            let effective = setting.type === 'integer' ? String(entry) : setting.type === 'duration' && typeof entry === 'number' ? `${entry}ms` : entry as string | boolean;
            if (setting.invert) effective = !entry;
            if (['tasks', 'context', 'agent'].includes(name) && typeof effective === 'string' && effective && (name !== 'agent' || /[\\/]|\.book$/.test(effective))) effective = resolve(projectPath, effective);
            result.values[setting.option] = effective;
            result.sources[setting.option] = location;
        }
    }
    if (document.harnesses !== undefined) {
        let names: string[];
        if (Array.isArray(document.harnesses)) {
            if (!document.harnesses.every(name => typeof name === 'string' && name.trim())) throw new InputError(`${path}.harnesses: expected nonempty harness identifiers.`);
            names = document.harnesses as string[];
        } else {
            names = []; result.harnessSettings = {};
            for (const [name, entry] of Object.entries(object(document.harnesses, `${path}.harnesses`))) {
                if (typeof entry === 'boolean') { if (entry) names.push(name); continue; }
                const settings = object(entry, `${path}.harnesses.${name}`);
                if (settings.enabled !== undefined && typeof settings.enabled !== 'boolean') throw new InputError(`${path}.harnesses.${name}.enabled: expected boolean.`);
                for (const [key, value] of Object.entries(settings)) {
                    if (!['enabled', 'model', 'thinkingLevel', 'apiKeyEnv', 'configurationPath'].includes(key)) throw new InputError(`${path}.harnesses.${name}.${key}: unsupported harness setting.`);
                    if (key !== 'enabled' && typeof value !== 'string') throw new InputError(`${path}.harnesses.${name}.${key}: expected string.`);
                }
                if (settings.enabled !== false) names.push(name);
                result.harnessSettings[name] = Object.fromEntries(Object.entries(settings).filter(([key]) => key !== 'enabled'));
                if (result.harnessSettings[name]!.configurationPath) result.harnessSettings[name]!.configurationPath = resolve(projectPath, result.harnessSettings[name]!.configurationPath!);
            }
        }
        result.enabledHarnesses = [...new Set(names)];
        for (const name of result.enabledHarnesses) {
            try { getHarness(name); } catch (error) { throw new InputError(`${path}.harnesses.${name}: ${(error as Error).message}`); }
        }
    }
    if (document.browser !== undefined) {
        const browser = object(document.browser, `${path}.browser`);
        for (const [key, value] of Object.entries(browser)) {
            if (!['mode', 'profile'].includes(key)) throw new InputError(`${path}.browser.${key}: unsupported browser setting.`);
            if (typeof value !== 'string' || key === 'mode' && !['headless', 'headful'].includes(value)) throw new InputError(`${path}.browser.${key}: expected ${key === 'mode' ? 'headless or headful' : 'a profile path'}.`);
            result.values[`browser-${key}`] = key === 'profile' && value ? resolve(projectPath, value) : value;
            result.sources[`browser-${key}`] = `${path}.browser.${key}`;
        }
    }
    if (document.updates !== undefined) {
        const updates = object(document.updates, `${path}.updates`);
        if (Object.keys(updates).some(key => key !== 'harnesses') || updates.harnesses !== undefined && typeof updates.harnesses !== 'boolean') throw new InputError(`${path}.updates: only the boolean harnesses setting is supported.`);
        result.autoUpdateHarnesses = updates.harnesses as boolean | undefined;
    }
    if (document.tunnel !== undefined) {
        const tunnel = object(document.tunnel, `${path}.tunnel`);
        for (const [key, value] of Object.entries(tunnel)) {
            if (!['enabled', 'provider', 'client', 'hostname', 'id', 'credentialsFile'].includes(key)) throw new InputError(`${path}.tunnel.${key}: unsupported tunnel setting; store only non-secret options and credential references.`);
            if (key === 'enabled' ? typeof value !== 'boolean' : typeof value !== 'string' || !value.trim()) throw new InputError(`${path}.tunnel.${key}: expected ${key === 'enabled' ? 'boolean' : 'nonempty string'}.`);
            if (key === 'provider' && !['cloudflare-quick', 'cloudflare-named'].includes(String(value))) throw new InputError(`${path}.tunnel.provider: unknown provider.`);
            const option = key === 'enabled' ? 'no-tunnel' : key === 'credentialsFile' ? 'tunnel-credentials-file' : `tunnel-${key}`;
            result.values[option] = key === 'enabled' ? !value : ['client', 'credentialsFile'].includes(key) ? resolve(projectPath, String(value)) : String(value);
            result.sources[option] = `${path}.tunnel.${key}`;
        }
    }
    const selectedHarness = result.values.harness;
    if (typeof selectedHarness === 'string' && result.harnessSettings?.[selectedHarness]) {
        const settings = result.harnessSettings[selectedHarness]!;
        for (const [key, option] of [['model', 'model'], ['thinkingLevel', 'thinking-level']] as const) {
            if (settings[key] !== undefined && (!result.sources[option] || result.sources[option]!.startsWith('PTBK_'))) {
                result.values[option] = settings[key]!; result.sources[option] = `${path}.harnesses.${selectedHarness}.${key}`;
            }
        }
    }
    return result;
}

/** Materialize missing versioned defaults, preserving every existing byte and project choice. @private */
export async function ensureProjectConfiguration(workspace: Workspace, defaults?: Record<string, unknown>): Promise<string[]> {
    const configuration = await readProjectConfiguration(workspace.projectPath);
    if (configuration.exists) return [];
    try { await writeFile(configuration.path, `${JSON.stringify(defaults ?? { harnesses: [], browser: { mode: 'headless' }, updates: { harnesses: true } }, null, 4)}\n`, { flag: 'wx' }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') { await readProjectConfiguration(workspace.projectPath); return []; } throw error; }
    return [configuration.path];
}
