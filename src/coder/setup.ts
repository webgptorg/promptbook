import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { HARNESS_REGISTRY, runProcess, redactSecrets, resolveProcessCommand, type HarnessDefinition } from './harness.js';

/** Read-only installed adapter inventory; unknown catalogs and authentication remain explicit. @private */
export interface HarnessInventory {
    name: string; executable: string; installed: boolean; authenticated: boolean; usable: boolean;
    authentication: 'account' | 'api' | 'unknown' | 'none'; version?: string; models: string[];
    thinkingLevels: string[]; capabilities: { team: boolean; readOnly: boolean };
    diagnostic: string; install: string; login: string;
}

/** Setup actions are authorized only through init/start, never by read-only inventory calls. @private */
export interface HarnessSetupOptions {
    names?: string[]; install?: boolean; login?: boolean; interactive?: boolean; signal?: AbortSignal;
    onOutput?: (text: string) => void; homePath?: string;
}

/** Npm distributions of the seven supported CLI adapters. */
const PACKAGES: Readonly<Record<string, string>> = {
    'openai-codex': '@openai/codex', 'claude-code': '@anthropic-ai/claude-code',
    'github-copilot': '@github/copilot', cline: 'cline', opencode: 'opencode-ai',
    gemini: '@google/gemini-cli', 'qwen-code': '@qwen-code/qwen-code',
};

/** Read credential configuration privately; only a boolean or model identifier leaves this helper. */
async function privateConfiguration(path: string): Promise<Record<string, unknown> | undefined> {
    try {
        const bytes = await readFile(path);
        if (bytes.length > 1024 * 1024) return undefined;
        return JSON.parse(bytes.toString('utf8')) as Record<string, unknown>;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) return undefined;
        throw error;
    }
}

/** Detect configured secret material without returning its value or putting it in a trace. */
function hasCredential(value: unknown): boolean {
    if (!value || typeof value !== 'object') return false;
    return Object.entries(value).some(([name, entry]) => typeof entry === 'string' && entry.length > 0 && /api.?key|access.?token|refresh.?token|authorization/i.test(name) || typeof entry === 'object' && hasCredential(entry));
}

/** Fetch an installed Codex model catalog over metadata RPC, without starting any thread or turn. */
async function codexCatalog(projectPath: string, signal?: AbortSignal): Promise<string[]> {
    const models: string[] = [];
    let cursor: string | undefined;
    const result = await runProcess('codex', ['app-server', '--listen', 'stdio://'], {
        cwd: projectPath, signal, timeoutMs: 15_000,
        protocol: {
            start(send) { send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { clientInfo: { name: 'ptbk-inventory', version: '1' }, capabilities: { experimentalApi: true } } }); },
            message(message, send, finish, ready) {
                if (message.id === 1) {
                    if (message.error) { finish(); return; }
                    ready(); send({ jsonrpc: '2.0', method: 'initialized' });
                    send({ jsonrpc: '2.0', id: 2, method: 'model/list', params: { limit: 100, includeHidden: false } });
                } else if (message.id === 2) {
                    const result = message.result as { data?: Array<{ model?: string; id?: string }>; nextCursor?: string } | undefined;
                    for (const model of result?.data || []) if (model.model || model.id) models.push((model.model || model.id)!);
                    if (result?.nextCursor && result.nextCursor !== cursor && models.length < 1000) {
                        cursor = result.nextCursor;
                        send({ jsonrpc: '2.0', id: 2, method: 'model/list', params: { limit: 100, cursor, includeHidden: false } });
                    } else finish();
                }
                return undefined;
            },
        },
    });
    return result.exitCode === 0 && !result.spawnError ? [...new Set(models)] : [];
}

/** Query Copilot's native account/model metadata without creating or sending a model session. */
async function copilotMetadata(projectPath: string, signal?: AbortSignal): Promise<{ authenticated: boolean; authentication: HarnessInventory['authentication']; models: string[]; thinkingLevels: string[] }> {
    const metadata: { authenticated: boolean; authentication: HarnessInventory['authentication']; models: string[]; thinkingLevels: string[] } = { authenticated: false, authentication: 'unknown', models: [], thinkingLevels: [] };
    const result = await runProcess('copilot', ['--headless', '--stdio', '--no-auto-update', '--disable-builtin-mcps', '--no-custom-instructions', '--no-bash-env'], {
        cwd: projectPath, signal, timeoutMs: 15_000,
        protocol: {
            framing: 'content-length',
            start(send) { send({ jsonrpc: '2.0', id: 1, method: 'connect', params: { clientInfo: { extensionName: 'ptbk-inventory', extensionVersion: '1' } } }); },
            message(message, send, finish, ready) {
                if (message.error) { finish(); return; }
                if (message.id === 1) { ready(); send({ jsonrpc: '2.0', id: 2, method: 'auth.getStatus', params: {} }); }
                else if (message.id === 2) {
                    const auth = message.result as { isAuthenticated?: boolean; authType?: string } | undefined;
                    metadata.authenticated = auth?.isAuthenticated === true;
                    metadata.authentication = metadata.authenticated ? auth?.authType === 'api-key' ? 'api' : 'account' : 'none';
                    if (metadata.authenticated) send({ jsonrpc: '2.0', id: 3, method: 'models.list', params: {} }); else finish();
                } else if (message.id === 3) {
                    const result = message.result as { models?: Array<{ id?: string; policy?: { state?: string }; supportedReasoningEfforts?: string[] }> } | undefined;
                    for (const model of result?.models || []) if (typeof model.id === 'string' && model.policy?.state !== 'disabled') { metadata.models.push(model.id); metadata.thinkingLevels.push(...model.supportedReasoningEfforts || []); }
                    metadata.thinkingLevels = [...new Set(metadata.thinkingLevels)];
                    finish();
                }
                return undefined;
            },
        },
    });
    return result.exitCode === 0 && !result.spawnError ? metadata : { authenticated: false, authentication: 'unknown', models: [], thinkingLevels: [] };
}

/** Inspect a provider through status/configuration rather than a paid prompt or login attempt. */
async function inspectHarness(harness: HarnessDefinition, projectPath: string, options: { signal?: AbortSignal; homePath?: string }): Promise<HarnessInventory> {
    const base: HarnessInventory = { name: harness.name, executable: harness.executable, installed: false, authenticated: false, usable: false, authentication: 'none', models: [], thinkingLevels: [...harness.thinkingLevels], capabilities: { team: !!harness.toolDiscovery && !!harness.readOnlyTools, readOnly: !!harness.readOnlyTools }, diagnostic: '', install: harness.install, login: harness.login };
    const version = await runProcess(harness.executable, ['--version'], { cwd: projectPath, signal: options.signal, timeoutMs: 10_000, maxOutputBytes: 32_000 });
    const reportedVersion = /\b\d+\.\d+\.\d+(?:[-+][\w.-]+)?\b/.exec(version.output)?.[0];
    if (version.exitCode !== 0 || version.spawnError || !reportedVersion) return { ...base, diagnostic: version.spawnError || `${harness.executable} did not report a CLI version. Install: ${harness.install}` };
    base.installed = true; base.version = reportedVersion; base.authentication = 'unknown';
    const home = options.homePath || homedir();
    const probe = (args: string[]) => runProcess(harness.executable, args, { cwd: projectPath, signal: options.signal, timeoutMs: 15_000, maxOutputBytes: 128_000 });
    if (harness.name === 'openai-codex') {
        const env = { ...process.env }; delete env.OPENAI_API_KEY; delete env.CODEX_API_KEY;
        const status = await runProcess(harness.executable, ['login', 'status'], { cwd: projectPath, env, signal: options.signal, timeoutMs: 10_000 });
        if (status.exitCode === 0 && /logged in using ChatGPT|chatgpt_auth_tokens|"authMode"\s*:\s*"chatgpt"/i.test(status.output)) { base.authenticated = true; base.authentication = 'account'; }
        else if (process.env.PTBK_OPENAI_CODEX_USE_API_KEY === '1' && (process.env.OPENAI_API_KEY || process.env.CODEX_API_KEY)) { base.authenticated = true; base.authentication = 'api'; }
        base.models = await codexCatalog(projectPath, options.signal);
    } else if (harness.name === 'claude-code') {
        const status = await probe(['auth', 'status', '--json']);
        try {
            const value = JSON.parse(status.output) as { loggedIn?: boolean; authMethod?: string; apiKeySource?: string };
            base.authenticated = status.exitCode === 0 && value.loggedIn === true;
            if (base.authenticated) base.authentication = /api/i.test(value.authMethod || value.apiKeySource || '') ? 'api' : 'account';
        } catch { base.authenticated = false; }
    } else if (harness.name === 'opencode') {
        const status = await probe(['auth', 'list']);
        base.authenticated = status.exitCode === 0 && /(?:[1-9]\d* credentials?|oauth|api key)/i.test(status.output) && !/0 credentials/i.test(status.output);
        if (base.authenticated) base.authentication = /oauth/i.test(status.output) ? 'account' : 'api';
        const catalog = await probe(['models']);
        if (catalog.exitCode === 0) base.models = catalog.output.split(/\r?\n/).map((line) => line.trim()).filter((line) => /^[\w.-]+\/[\w./:-]+$/.test(line)).slice(0, 1000);
    } else if (harness.name === 'github-copilot') {
        const status = await copilotMetadata(projectPath, options.signal);
        base.authenticated = status.authenticated; base.authentication = status.authentication; base.models = status.models;
        if (status.thinkingLevels.length) base.thinkingLevels = status.thinkingLevels;
    } else if (harness.name === 'gemini') {
        const cached = await privateConfiguration(resolve(home, '.gemini/oauth_creds.json'));
        if (cached && hasCredential(cached)) { base.authenticated = true; base.authentication = 'account'; }
        else if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) { base.authenticated = true; base.authentication = 'api'; }
        const settings = await privateConfiguration(resolve(home, '.gemini/settings.json'));
        const model = (settings?.model as { name?: unknown } | undefined)?.name;
        if (typeof model === 'string') base.models = [model];
    } else if (harness.name === 'qwen-code') {
        const settings = await privateConfiguration(resolve(home, '.qwen/settings.json'));
        const providers = settings?.modelProviders as Record<string, Array<{ id?: string; apiKey?: string; apiKeyEnvKey?: string }>> | undefined;
        for (const entries of Object.values(providers || {})) for (const model of entries) {
            if (typeof model.id === 'string') base.models.push(model.id);
            if (model.apiKey || model.apiKeyEnvKey && process.env[model.apiKeyEnvKey]) { base.authenticated = true; base.authentication = 'api'; }
        }
        if (process.env.OPENAI_API_KEY || process.env.DASHSCOPE_API_KEY) { base.authenticated = true; base.authentication = 'api'; }
    } else if (harness.name === 'cline') {
        const configuration = await privateConfiguration(process.env.CLINE_PROVIDER_SETTINGS_PATH || resolve(process.env.CLINE_DATA_DIR || resolve(home, '.cline/data'), 'settings/providers.json'));
        base.authenticated = hasCredential(configuration);
        if (base.authenticated) base.authentication = 'api';
        const model = configuration?.selectedModel;
        if (typeof model === 'string') base.models = [model];
    }
    base.usable = base.installed && base.authenticated;
    if (!base.authenticated) base.authentication = 'none';
    base.diagnostic = base.usable ? `Authenticated ${base.authentication} configuration detected; provider verifies authorization at execution. Model catalog ${base.models.length ? 'reported by installed adapter' : 'unknown; native default retained'}.` : `Installed but signed out or authentication could not be verified. Login: ${harness.login}`;
    return base;
}

/** Discover all supported tools without installation, login, project writes or inference. @private */
export async function inspectHarnesses(projectPath: string, options: { signal?: AbortSignal; homePath?: string } = {}): Promise<HarnessInventory[]> {
    return Promise.all(HARNESS_REGISTRY.map((harness) => inspectHarness(harness, projectPath, options)));
}

/** Run only a selected provider's native interactive authentication on the user's terminal. */
async function interactiveLogin(harness: HarnessDefinition, projectPath: string, signal?: AbortSignal): Promise<void> {
    const args = harness.name === 'openai-codex' || harness.name === 'github-copilot' ? ['login'] : harness.name === 'claude-code' || harness.name === 'opencode' ? ['auth', 'login'] : harness.name === 'cline' ? ['auth'] : [];
    const executable = await resolveProcessCommand(harness.executable, args, projectPath);
    await new Promise<void>((accept, reject) => {
        const child = spawn(executable.command, executable.args, { cwd: projectPath, shell: false, stdio: 'inherit' });
        const cancel = () => child.kill('SIGTERM');
        signal?.addEventListener('abort', cancel, { once: true });
        child.once('error', reject);
        child.once('exit', (code) => { signal?.removeEventListener('abort', cancel); if (code === 0) accept(); else reject(new Error(`${harness.name} login exited with ${code ?? 'a signal'}`)); });
    });
}

/** Install missing supported harnesses and guide login with accurate final readiness. @private */
export async function setupHarnesses(projectPath: string, options: HarnessSetupOptions = {}): Promise<HarnessInventory[]> {
    const selected = new Set(options.names || HARNESS_REGISTRY.map((harness) => harness.name));
    for (const name of selected) if (!PACKAGES[name]) throw new Error(`Unsupported harness setup: ${name}`);
    let inventory = await inspectHarnesses(projectPath, options);
    const output = options.onOutput || ((text: string) => process.stdout.write(text));
    for (const entry of inventory.filter((item) => selected.has(item.name))) {
        if (options.signal?.aborted) break;
        if (!entry.installed && options.install !== false) {
            output(`Installing ${entry.name}: npm install --global ${PACKAGES[entry.name]}\n`);
            const result = await runProcess(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '--global', PACKAGES[entry.name]!], { cwd: projectPath, signal: options.signal, timeoutMs: 300_000, onOutput: output });
            if (result.exitCode !== 0 || result.spawnError) output(`${entry.name} installation failed: ${result.spawnError || result.output}\n`);
        }
    }
    inventory = await inspectHarnesses(projectPath, options);
    for (const entry of inventory.filter((item) => selected.has(item.name) && item.installed && !item.authenticated)) {
        output(`${entry.name}: authentication required. Run ${entry.login}.\n`);
        if (options.login && options.interactive && process.stdin.isTTY && process.stdout.isTTY) {
            try { await interactiveLogin(HARNESS_REGISTRY.find((harness) => harness.name === entry.name)!, projectPath, options.signal); }
            catch (error) { output(`${redactSecrets((error as Error).message, projectPath)}\n`); }
        }
    }
    return inspectHarnesses(projectPath, options);
}
