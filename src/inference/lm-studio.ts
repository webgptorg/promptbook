import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathExists } from '../common/fs.js';
import { runProcess, which } from '../common/process.js';
import { isLoopbackUrl, runtimeJson, serviceKey } from './http.js';
import type { RuntimeAdapter, RuntimeContext, RuntimeModel, RuntimeObservation } from './types.js';

/**
 * LM Studio's own local server address.
 */
const DEFAULT_ENDPOINT = 'http://127.0.0.1:1234';

/**
 * Bound of one `lms` management command that is not a download.
 */
const COMMAND_TIMEOUT_MS = 10 * 60_000;

/**
 * One entry of LM Studio's REST model listing (`/api/v0/models`).
 */
type LmStudioModel = {
    readonly id?: string;
    readonly type?: string;
    readonly publisher?: string;
    readonly arch?: string;
    readonly quantization?: string;
    readonly state?: string;
    readonly max_context_length?: number;
    readonly capabilities?: readonly string[];
};

/**
 * The service root of a context.
 */
function rootOf(context: RuntimeContext): { readonly root: string; readonly source: 'configured' | 'discovered' } {
    return context.tool?.endpoint ? { root: context.tool.endpoint.replace(/\/+$/, ''), source: 'configured' } : { root: DEFAULT_ENDPOINT, source: 'discovered' };
}

/**
 * The `lms` command-line tool: on PATH, or where LM Studio installs it for the user.
 */
async function lmsExecutable(env: NodeJS.ProcessEnv): Promise<string | undefined> {
    const found = await which('lms', env);
    if (found) return found;
    for (const candidate of [join(homedir(), '.lmstudio', 'bin', process.platform === 'win32' ? 'lms.exe' : 'lms'), join(homedir(), '.cache', 'lm-studio', 'bin', process.platform === 'win32' ? 'lms.exe' : 'lms')]) {
        if (await pathExists(candidate)) return candidate;
    }
    return undefined;
}

/**
 * Runs one `lms` command, throwing its own diagnostic on failure.
 */
async function lms(context: RuntimeContext, args: readonly string[], timeoutMs = COMMAND_TIMEOUT_MS, onLine?: (line: string) => void): Promise<string> {
    const executable = await lmsExecutable(context.env);
    if (!executable) throw new Error('The LM Studio command-line tool `lms` was not found on the engine host.');
    const result = await runProcess(executable, args, { cwd: homedir(), env: context.env, timeoutMs, signal: context.signal, onStdoutLine: onLine, onStderrLine: onLine });
    if (result.exitCode !== 0) throw new Error(`lms ${args.join(' ')} failed: ${(result.stderr || result.stdout).trim().split('\n').slice(-3).join(' ') || result.spawnError || `exit ${result.exitCode}`}`);
    return result.stdout;
}

/** Reads LM Studio's downloaded LLM inventory even when its HTTP server is stopped. */
async function installedModels(context: RuntimeContext): Promise<RuntimeModel[]> {
    const entries: { type?: string; modelKey?: string }[] = JSON.parse(await lms(context, ['ls', '--json'], 5_000));
    return entries.flatMap(({ type, modelKey }) => type === 'llm' && typeof modelKey === 'string' && modelKey
        ? [{ id: modelKey, installed: true, locality: 'local', tools: 'unknown', vision: 'unknown' }] : []);
}

/**
 * Read-only observation: the server and its downloaded models (LM Studio serves local weights only).
 */
async function inspect(context: RuntimeContext): Promise<RuntimeObservation> {
    const { root, source } = rootOf(context);
    const onEngineHost = isLoopbackUrl(root);
    const executablePath = await lmsExecutable(context.env);
    const base = { variant: 'LM_STUDIO' as const, displayName: 'LM Studio', endpoint: root, endpointSource: source, onEngineHost, resourceKey: serviceKey('LM_STUDIO', root), ...(executablePath ? { executablePath } : {}), checkedAt: Date.now() };
    let entries: LmStudioModel[];
    try {
        entries = (await runtimeJson<{ data?: LmStudioModel[] }>(`${root}/api/v0/models`, { signal: context.signal })).data ?? [];
    } catch (error) {
        try {
            entries = ((await runtimeJson<{ data?: Array<{ id?: string }> }>(`${root}/v1/models`, { signal: context.signal })).data ?? []).map((entry) => ({ id: entry.id }));
        } catch {
            if (!executablePath && onEngineHost && source === 'discovered') return { ...base, running: false, summary: 'LM Studio is not installed on the engine host.', problem: 'missing', nextAction: 'Install LM Studio from https://lmstudio.ai and enable its server (`lms server start`); automatic installation is not offered.' };
            return { ...base, running: false, summary: `The LM Studio server at ${root} is ${(error as Error).message}.`, problem: onEngineHost ? 'stopped' : 'unreachable', nextAction: onEngineHost ? `Start it: ${context.tool ? `ptbk tool runtime ${context.tool.name} start` : 'lms server start'}` : `Check that ${root} is reachable from the engine host.` };
        }
    }
    const models: RuntimeModel[] = entries
        .filter((entry) => entry.id && entry.type !== 'embeddings')
        .map((entry) => ({
            id: entry.id!,
            installed: true,
            locality: onEngineHost ? ('local' as const) : ('unknown' as const),
            ...(entry.state ? { loaded: entry.state === 'loaded' } : {}),
            ...(entry.arch ? { family: entry.arch } : {}),
            ...(entry.quantization ? { quantization: entry.quantization } : {}),
            ...(entry.max_context_length ? { contextLength: entry.max_context_length } : {}),
            ...(entry.publisher ? { manufacturer: entry.publisher } : {}),
            tools: entry.capabilities ? entry.capabilities.includes('tool_use') : ('unknown' as const),
            vision: entry.type === 'vlm' ? true : entry.type === 'llm' ? false : ('unknown' as const),
        }));
    let version: string | undefined;
    if (executablePath) version = /\d+\.\d+(?:\.\d+)?/.exec(await lms(context, ['version'], 5_000).catch(() => ''))?.[0];
    if (!models.length) return { ...base, ...(version ? { version } : {}), running: true, models, summary: `LM Studio is serving at ${root} but has no downloaded model.`, problem: 'no-models', nextAction: context.tool ? `Download one: ptbk tool runtime ${context.tool.name} download <model>` : 'Download a model in LM Studio (`lms get <model>`).' };
    const loaded = models.filter((model) => model.loaded).length;
    return { ...base, ...(version ? { version } : {}), running: true, models, summary: `LM Studio at ${root}: ${models.length} model${models.length === 1 ? '' : 's'}${loaded ? `, ${loaded} loaded` : ''}.` };
}

/**
 * LM Studio adapter for an existing installation (automatic installation is deliberately not offered).
 *
 * @private inference runtime adapter
 */
export const lmStudioAdapter: RuntimeAdapter = {
    variant: 'LM_STUDIO',
    displayName: 'LM Studio',
    executable: 'lms',
    defaultEndpoint: DEFAULT_ENDPOINT,
    homepage: 'https://lmstudio.ai',
    actions: ['status', 'models', 'download', 'load', 'unload', 'start', 'stop', 'restart'],
    inspect,
    installedModels,
    download: async (context, model, onProgress) => {
        onProgress({ stage: 'downloading', message: `lms get ${model}` });
        await lms(context, ['get', model, '--yes'], 24 * 60 * 60_000, (line) => line.trim() && onProgress({ stage: 'downloading', message: line.trim().slice(0, 160) }));
    },
    load: async (context, model) => void (await lms(context, ['load', model, '--yes'])),
    unload: async (context, model) => void (await lms(context, ['unload', model])),
    start: async (context) => {
        await lms(context, ['server', 'start', ...(context.tool?.endpoint ? ['--port', new URL(context.tool.endpoint).port || '1234'] : [])], 60_000);
        return undefined;
    },
    protocolEndpoint: (root, protocol) => (protocol === 'openai' ? `${root.replace(/\/+$/, '')}/v1` : undefined),
    compatibilityToken: 'lm-studio',
};

/**
 * Stops the LM Studio server through its own CLI (used by host maintenance, never by project reference changes).
 *
 * @private inference runtime adapter
 */
export async function stopLmStudioServer(context: RuntimeContext): Promise<void> {
    await lms(context, ['server', 'stop'], 60_000);
}
