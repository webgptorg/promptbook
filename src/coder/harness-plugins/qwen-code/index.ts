import { resolve } from 'node:path';
import type { HarnessDefinition } from '../../harness.js';
import { createHarnessPlugin, invocationContext } from '../shared.js';
import type { InvocationInput, NativeInspection, NativeInspectionContext } from '../contract.js';
import { privateConfiguration } from '../configuration.js';
import { runAcpWithTools } from '../acp.js';

/** Native integration metadata and global distribution. @private */
const definition: HarnessDefinition = {
    name: 'qwen-code',
    executable: 'qwen',
    install: 'npm install --global @qwen-code/qwen-code',
    login: 'qwen (interactive /auth)',
    thinkingLevels: [],
    nativeDefault: true,
    toolDiscovery: 'acp',
    documentation: 'https://qwenlm.github.io/qwen-code-docs/en/users/features/headless/',
    id: 'qwen-code',
    displayName: 'Qwen Code',
    featured: false,
    packageName: '@qwen-code/qwen-code',
    apiKeyEnvironment: 'OPENAI_API_KEY',
    loginArgs: [],
    helpArgs: ['--help'],
};

/** Inspect only native login/configuration and model metadata; never run inference. */
async function inspectNative(base: NativeInspection, { home, env }: NativeInspectionContext): Promise<void> {
    const settings = await privateConfiguration(resolve(home, '.qwen/settings.json'));
    const providers = settings?.modelProviders as Record<string, Array<{ id?: string; apiKey?: string; apiKeyEnvKey?: string }>> | undefined;
    for (const entries of Object.values(providers || {})) for (const model of entries) {
        if (typeof model.id === 'string') base.models.push(model.id);
        if (model.apiKey || model.apiKeyEnvKey && env[model.apiKeyEnvKey]) { base.authenticated = true; base.authentication = 'api'; }
    }
    if (env.OPENAI_API_KEY || env.DASHSCOPE_API_KEY) { base.authenticated = true; base.authentication = 'api'; }
}

/** Construct this integration's autonomous argv and transient configuration. */
async function prepare(input: InvocationInput) {
    const { request, prompt, bridge } = input;
    const { model, requireFlag } = invocationContext(definition, input);
    const args: string[] = [];
    const cwd = request.projectPath;
    requireFlag('--output-format');
    requireFlag('--approval-mode');
    args.push('--prompt', prompt, '--output-format', 'stream-json', '--approval-mode', request.readOnly ? 'plan' : 'yolo');
    if (model) args.push('--model', model);
    if (bridge) {
        requireFlag('--acp');
        requireFlag('--mcp-config'); args.push('--mcp-config', bridge.configPath);
        if (request.readOnly) { requireFlag('--safe-mode'); args.push('--safe-mode'); }
    }
    return { args, cwd };
}

/** Common contract implemented by the Qwen Code integration. @private */
export const plugin = createHarnessPlugin(definition, { inspectNative, prepare, executeWithTools: ({ request, command, bridge, env, prompt }) => runAcpWithTools(definition, request, command, bridge, env, prompt) });
