import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { HarnessDefinition } from '../../harness.js';
import { createHarnessPlugin, invocationContext } from '../shared.js';
import type { InvocationInput, NativeInspection, NativeInspectionContext } from '../contract.js';
import { privateConfiguration, hasCredential } from '../configuration.js';
import { runAcpWithTools } from '../acp.js';

/** Native integration metadata and global distribution. @private */
const definition: HarnessDefinition = {
    name: 'gemini',
    executable: 'gemini',
    install: 'npm install --global @google/gemini-cli',
    login: 'gemini (interactive login)',
    thinkingLevels: [],
    nativeDefault: true,
    toolDiscovery: 'acp',
    readOnlyTools: true,
    documentation: 'https://geminicli.com/docs/cli/headless/',
    id: 'gemini',
    displayName: 'Gemini',
    featured: false,
    packageName: '@google/gemini-cli',
    apiKeyEnvironment: 'GEMINI_API_KEY',
    configurationEnvironment: 'GEMINI_CLI_SYSTEM_SETTINGS_PATH',
    loginArgs: [],
    helpArgs: ['--help'],
};

/** Inspect only native login/configuration and model metadata; never run inference. */
async function inspectNative(base: NativeInspection, { home, env }: NativeInspectionContext): Promise<void> {
    const cached = await privateConfiguration(resolve(home, '.gemini/oauth_creds.json'));
    if (cached && hasCredential(cached)) { base.authenticated = true; base.authentication = 'account'; }
    else if (env.GEMINI_API_KEY || env.GOOGLE_API_KEY) { base.authenticated = true; base.authentication = 'api'; }
    const settings = await privateConfiguration(env.GEMINI_CLI_SYSTEM_SETTINGS_PATH || resolve(home, '.gemini/settings.json'));
    const model = (settings?.model as { name?: unknown } | undefined)?.name;
    if (typeof model === 'string') base.models = [model];
}

/** Construct this integration's autonomous argv and transient configuration. */
async function prepare(input: InvocationInput) {
    const { request, prompt, bridge, env } = input;
    const { model, requireFlag } = invocationContext(definition, input);
    const args: string[] = [];
    const cwd = request.projectPath;
    requireFlag('--output-format');
    requireFlag('--approval-mode');
    args.push('--prompt', prompt, '--output-format', 'stream-json', '--approval-mode', request.readOnly ? 'plan' : 'yolo');
    if (model) args.push('--model', model);
    if (bridge) {
        requireFlag('--acp');
        const path = resolve(bridge.directory, 'gemini-settings.json');
        let system: Record<string, unknown> = {};
        if (env.GEMINI_CLI_SYSTEM_SETTINGS_PATH) system = JSON.parse(await readFile(env.GEMINI_CLI_SYSTEM_SETTINGS_PATH, 'utf8')) as Record<string, unknown>;
        await writeFile(path, JSON.stringify({
            ...system,
            ...(request.readOnly ? { tools: { core: [], discoveryCommand: '', callCommand: '' }, mcp: { allowed: ['ptbk'] }, hooksConfig: { enabled: false }, skills: { enabled: false }, experimental: { enableAgents: false, autoMemory: false } } : {}),
            mcpServers: { ...(request.readOnly ? {} : system.mcpServers as object || {}), ptbk: { ...bridge.stdio, trust: true, timeout: 300_000 } },
        }), { mode: 0o600 });
        env.GEMINI_CLI_SYSTEM_SETTINGS_PATH = path;
    }
    return { args, cwd };
}

/** Common contract implemented by the Gemini integration. @private */
export const plugin = createHarnessPlugin(definition, { inspectNative, prepare, executeWithTools: ({ request, command, bridge, env, prompt }) => runAcpWithTools(definition, request, command, bridge, env, prompt) });
