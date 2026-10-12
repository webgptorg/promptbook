import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runProcess } from '../../harness-process.js';
import type { HarnessRequest, HarnessDefinition } from '../../harness.js';
import type { ToolBridge } from '../../team.js';
import { createHarnessPlugin, invocationContext } from '../shared.js';
import type { InvocationInput, NativeInspection, NativeInspectionContext } from '../contract.js';

/** Native integration metadata and global distribution. @private */
const definition: HarnessDefinition = {
    name: 'opencode',
    executable: 'opencode',
    install: 'npm install --global opencode-ai',
    login: 'opencode auth login',
    thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
    nativeDefault: true,
    toolDiscovery: 'opencode-preflight',
    readOnlyTools: true,
    teamModelRequirement: 'explicit-provider-qualified',
    documentation: 'https://opencode.ai/docs/cli/',
    id: 'opencode',
    displayName: 'OpenCode',
    featured: false,
    packageName: 'opencode-ai',
    configurationEnvironment: 'OPENCODE_CONFIG',
    loginArgs: ['auth', 'login'],
    helpArgs: ['run', '--help'],
};

/** Inspect only native login/configuration and model metadata; never run inference. */
async function inspectNative(base: NativeInspection, { probe }: NativeInspectionContext): Promise<void> {
    const status = await probe(['auth', 'list']);
    base.authenticated = status.exitCode === 0 && /(?:[1-9]\d* credentials?|oauth|api key)/i.test(status.output) && !/0 credentials/i.test(status.output);
    if (base.authenticated) base.authentication = /oauth/i.test(status.output) ? 'account' : 'api';
    const catalog = await probe(['models']);
    if (catalog.exitCode === 0) base.models = catalog.output.split(/\r?\n/).map((line) => line.trim()).filter((line) => /^[\w.-]+\/[\w./:-]+$/.test(line)).slice(0, 1000);
}

/** Construct this integration's autonomous argv and transient configuration. */
async function prepare(input: InvocationInput) {
    const { request, prompt, bridge, env } = input;
    const { model, thinking, requireFlag } = invocationContext(definition, input);
    const args: string[] = [];
    const cwd = request.projectPath;
    args.push('run', '--format', 'json', prompt);
    if (model) { if (!model.includes('/')) throw new Error('OpenCode model must be provider-qualified: provider/model'); args.push('--model', model); }
    if (thinking) { requireFlag('--variant'); args.push('--variant', thinking); }
    const prior = env.OPENCODE_CONFIG_CONTENT ? JSON.parse(env.OPENCODE_CONFIG_CONTENT) as Record<string, unknown> : {};
    if (request.readOnly) {
        if (request.harnessConfiguration?.configurationPath) throw new Error('OpenCode configurationPath cannot be retained under verified read-only isolation. Configure native global authentication and select an explicit provider/model for advisors. No model call was made.');
        requireFlag('--pure');
        if (!model) throw new Error('OpenCode read-only advisors require an explicit provider/model so configuration isolation cannot silently change the selected provider. No model call was made.');
        const isolated = resolve(bridge!.directory, 'opencode-config');
        await mkdir(isolated, { mode: 0o700 });
        env.OPENCODE_PURE = '1';
        env.OPENCODE_DISABLE_PROJECT_CONFIG = '1';
        env.OPENCODE_TEST_HOME = isolated;
        env.OPENCODE_CONFIG_DIR = isolated;
        env.XDG_CONFIG_HOME = isolated;
        delete env.OPENCODE_CONFIG; delete env.OPENCODE_PERMISSION;
    }
    env.OPENCODE_CONFIG_CONTENT = JSON.stringify({ ...(request.readOnly ? {} : prior), ...(bridge ? { mcp: { ...(request.readOnly ? {} : prior.mcp as object || {}), ptbk: { type: 'local', command: [bridge.stdio.command, ...bridge.stdio.args], enabled: true, timeout: 300_000 } } } : {}), permission: request.readOnly ? { '*': 'deny', 'ptbk_*': 'allow' } : { '*': 'allow' } });
    return { args, cwd };
}

/** Probe native provider configuration and actual bridge discovery without any prompt. @private */
async function preflightTools(harness: HarnessDefinition, request: HarnessRequest, command: { args: string[]; input?: string; cwd: string }, bridge: ToolBridge, env: NodeJS.ProcessEnv): Promise<void> {
    const args = ['mcp', 'list'];
    const probe = await runProcess(harness.executable, args, { cwd: command.cwd, redactionPath: request.redactionPath || request.projectPath, env, signal: request.signal, timeoutMs: 15_000 });
    if (probe.exitCode !== 0 || probe.spawnError || !bridge.discovered()) throw new Error(`${harness.name} native tool discovery failed before inference: ${probe.spawnError || probe.output}. No model call was made.`);
    bridge.resetDiscovery();
}

/** Common contract implemented by the OpenCode integration. @private */
export const plugin = createHarnessPlugin(definition, { inspectNative, prepare, executeWithTools: async ({ request, command, bridge, env }) => { await preflightTools(definition, request, command, bridge, env); return runProcess(definition.executable, command.args, { cwd: command.cwd, redactionPath: request.redactionPath || request.projectPath, env, input: command.input, signal: request.signal, onOutput: request.onOutput, timeoutMs: request.timeoutMs, maxOutputBytes: request.maxOutputBytes }); } });
