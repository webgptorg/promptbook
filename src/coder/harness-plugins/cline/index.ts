import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import type { HarnessDefinition } from '../../harness.js';
import { confinePath } from '../../workspace.js';
import { createHarnessPlugin, invocationContext } from '../shared.js';
import type { InvocationInput, NativeInspection, NativeInspectionContext } from '../contract.js';
import { privateConfiguration, hasCredential } from '../configuration.js';

/** Native integration metadata and global distribution. @private */
const definition: HarnessDefinition = {
    name: 'cline',
    executable: 'cline',
    install: 'npm install --global cline',
    login: 'cline auth',
    thinkingLevels: ['low', 'medium', 'high', 'xhigh'],
    nativeDefault: true,
    documentation: 'https://github.com/cline/cline/blob/main/docs/cli/cli-reference.mdx',
    id: 'cline',
    displayName: 'Cline',
    featured: false,
    packageName: 'cline',
    configurationEnvironment: 'CLINE_PROVIDER_SETTINGS_PATH',
    loginArgs: ['auth'],
    helpArgs: ['--help'],
};

/** Inspect only native login/configuration and model metadata; never run inference. */
async function inspectNative(base: NativeInspection, { home, env }: NativeInspectionContext): Promise<void> {
    const configuration = await privateConfiguration(env.CLINE_PROVIDER_SETTINGS_PATH || resolve(env.CLINE_DATA_DIR || resolve(home, '.cline/data'), 'settings/providers.json'));
    base.authenticated = hasCredential(configuration);
    if (base.authenticated) base.authentication = 'api';
    const model = configuration?.selectedModel;
    if (typeof model === 'string') base.models = [model];
}

/** Construct this integration's autonomous argv and transient configuration. */
async function prepare(input: InvocationInput) {
    const { request, prompt, bridge, env } = input;
    const { model, thinking, requireFlag } = invocationContext(definition, input);
    const args: string[] = [];
    const cwd = request.projectPath;
    let cleanup: (() => Promise<void>) | undefined;
    const redactionSecrets = new Set<string>();
    requireFlag('--json'); requireFlag('--auto-approve'); requireFlag('--config'); requireFlag('--data-dir');
    if (model) requireFlag('--model');
    if (thinking) requireFlag('--thinking');
    // Cline persists --model even for one-shot runs, so copy only credential/provider state into owned temporary storage.
    const providerPath = env.CLINE_PROVIDER_SETTINGS_PATH || resolve(env.CLINE_DATA_DIR || resolve(env.CLINE_DIR || resolve(homedir(), '.cline'), 'data'), 'settings/providers.json');
    const runtime = await confinePath(request.projectPath, resolve(request.projectPath, '.ptbk'));
    await mkdir(runtime, { recursive: true });
    const isolated = await mkdtemp(resolve(await confinePath(request.projectPath, runtime), 'cline-'));
    cleanup = () => rm(isolated, { recursive: true, force: true });
    const copiedProviderPath = resolve(isolated, 'providers.json');
    try {
        const bytes = await readFile(providerPath);
        if (bytes.length > 1024 * 1024) throw new Error('Cline provider credential settings exceed 1 MiB');
        /** Learn credential values for redaction without applying them as environment overrides. */
        function credentials(value: unknown): void {
            if (!value || typeof value !== 'object') return;
            for (const [key, entry] of Object.entries(value)) {
                if (typeof entry === 'string' && entry.length >= 4 && /TOKEN|SECRET|PASSWORD|API_?KEY|PRIVATE_?KEY|CREDENTIAL/i.test(key)) redactionSecrets.add(entry);
                else if (typeof entry === 'object') credentials(entry);
            }
        }
        let settings: unknown;
        try { settings = JSON.parse(bytes.toString('utf8')); } catch { throw new Error('Cline provider credential settings contain invalid JSON; repair the native configuration before running coder'); }
        credentials(settings);
        await writeFile(copiedProviderPath, bytes, { mode: 0o600 });
    }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') { await cleanup(); throw error; } }
    env.CLINE_PROVIDER_SETTINGS_PATH = copiedProviderPath;
    env.CLINE_GLOBAL_SETTINGS_PATH = resolve(isolated, 'global-settings.json');
    env.CLINE_SESSION_BACKEND_MODE = 'local';
    env.CLINE_DIR = isolated;
    env.CLINE_DATA_DIR = resolve(isolated, 'data');
    args.push('--config', isolated, '--data-dir', env.CLINE_DATA_DIR);
    args.push('--json', '--auto-approve', request.readOnly ? 'false' : 'true');
    if (request.readOnly) { requireFlag('--plan'); requireFlag('--auto-approve'); args.push('--plan'); }
    if (model) args.push('--model', model);
    if (thinking) args.push('--thinking', thinking);
    if (bridge) env.CLINE_MCP_SETTINGS_PATH = bridge.configPath;
    args.push(prompt);
    return { args, cwd, cleanup, redactionSecrets };
}

/** Common contract implemented by the Cline integration. @private */
export const plugin = createHarnessPlugin(definition, { inspectNative, prepare });
