import { glob, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { which } from '../common/process.js';
import { isLoopbackUrl, runtimeJson, runtimeStream, serviceKey } from './http.js';
import type { CapabilityObservation, RuntimeAdapter, RuntimeContext, RuntimeInstallation, RuntimeModel, RuntimeObservation } from './types.js';

/**
 * Ollama's own local service address.
 */
const DEFAULT_ENDPOINT = 'http://127.0.0.1:11434';

/**
 * Most catalog entries whose details (`/api/show`) are read per inspection.
 */
const MAX_DETAILED_MODELS = 40;

/**
 * Model details by digest: capabilities and context length do not change for the same weights.
 */
const detailCache = new Map<string, { tools: CapabilityObservation; vision: CapabilityObservation; contextLength?: number }>();

/**
 * One entry of `/api/tags`.
 */
type TagEntry = {
    readonly name?: string;
    readonly model?: string;
    readonly size?: number;
    readonly digest?: string;
    readonly remote_model?: string;
    readonly remote_host?: string;
    readonly details?: { readonly family?: string; readonly parameter_size?: string; readonly quantization_level?: string; readonly format?: string };
};

/**
 * The service root of a context: the configured endpoint, else Ollama's discovered default.
 */
function rootOf(context: RuntimeContext): { readonly root: string; readonly source: 'configured' | 'discovered' } {
    if (context.tool?.endpoint) return { root: context.tool.endpoint.replace(/\/+$/, ''), source: 'configured' };
    const host = context.env.OLLAMA_HOST?.trim();
    if (host) {
        const withScheme = /^https?:\/\//i.test(host) ? host : `http://${host}`;
        try {
            const url = new URL(withScheme);
            if (!url.port) url.port = '11434';
            // A wildcard bind address is reached through loopback.
            if (url.hostname === '0.0.0.0') url.hostname = '127.0.0.1';
            return { root: url.toString().replace(/\/+$/, ''), source: 'discovered' };
        } catch {
            // an unusable OLLAMA_HOST falls back to the default address
        }
    }
    return { root: DEFAULT_ENDPOINT, source: 'discovered' };
}

/**
 * Whether a catalog entry is served from the cloud through this runtime (Ollama's `-cloud` models carry their
 * remote host); a remote service URL never proves locality either.
 */
function localityOf(entry: TagEntry, onEngineHost: boolean): RuntimeModel['locality'] {
    const name = entry.name ?? entry.model ?? '';
    if (entry.remote_host || entry.remote_model || /(?:-|:)cloud$/i.test(name)) return 'cloud';
    return onEngineHost ? 'local' : 'unknown';
}

/**
 * Reads completed manifests without starting Ollama. Cloud entries and partial downloads have no complete weight
 * layers. Only metadata is read; the potentially large blobs are checked by size.
 */
async function installedModels({ env, signal }: RuntimeContext): Promise<RuntimeModel[]> {
    const homeStore = join(env.HOME || env.USERPROFILE || homedir(), '.ollama', 'models');
    const stores = env.OLLAMA_MODELS ? [env.OLLAMA_MODELS] : [homeStore, ...(process.platform === 'linux' ? ['/usr/share/ollama/.ollama/models'] : [])];
    const models: RuntimeModel[] = [];
    for (const store of stores) {
        const manifests = join(store, 'manifests');
        for await (const path of glob('*/*/*/*', { cwd: manifests })) {
            signal?.throwIfAborted();
            const [registry, namespace, name, tag] = path.split(sep);
            let id = `${name}:${tag}`;
            if (namespace !== 'library' || registry !== 'registry.ollama.ai') id = `${namespace}/${id}`;
            if (registry !== 'registry.ollama.ai') id = `${registry}/${id}`;
            if (localityOf({ name: id }, true) !== 'local') continue;
            try {
                const manifest = JSON.parse(await readFile(join(manifests, path), 'utf8')) as { layers: { mediaType: string; digest: string; size: number }[] };
                const weights = manifest.layers.filter(({ mediaType }) => ['application/vnd.ollama.image.model', 'application/vnd.ollama.image.tensor'].includes(mediaType));
                if (!weights.length) continue;
                const complete = await Promise.all(weights.map(async ({ digest, size }) => {
                    if (!/^sha256:[a-f0-9]{64}$/.test(digest) || !(size > 0)) return false;
                    const blob = await stat(join(store, 'blobs', digest.replace(':', '-')));
                    return blob.isFile() && blob.size === size;
                }));
                if (complete.every(Boolean)) models.push({ id, installed: true, locality: 'local', tools: 'unknown', vision: 'unknown' });
            } catch {
                // A partial, unreadable or removed manifest cannot establish that the model is installed.
            }
        }
    }
    return models;
}

/**
 * Capabilities and context length of one model (`/api/show`), cached by digest.
 */
async function details(root: string, entry: TagEntry, signal?: AbortSignal): Promise<{ tools: CapabilityObservation; vision: CapabilityObservation; contextLength?: number }> {
    const key = entry.digest ?? entry.name ?? '';
    const cached = detailCache.get(key);
    if (cached) return cached;
    try {
        const shown = await runtimeJson<{ capabilities?: unknown; model_info?: Record<string, unknown> }>(`${root}/api/show`, { body: { model: entry.name ?? entry.model }, signal });
        const capabilities = Array.isArray(shown.capabilities) ? shown.capabilities.map(String) : undefined;
        const contextKey = Object.keys(shown.model_info ?? {}).find((name) => name.endsWith('.context_length'));
        const contextLength = contextKey && typeof shown.model_info![contextKey] === 'number' ? (shown.model_info![contextKey] as number) : undefined;
        const result = { tools: capabilities ? capabilities.includes('tools') : ('unknown' as const), vision: capabilities ? capabilities.includes('vision') : ('unknown' as const), ...(contextLength ? { contextLength } : {}) };
        if (key) detailCache.set(key, result);
        return result;
    } catch {
        return { tools: 'unknown', vision: 'unknown' };
    }
}

/**
 * Read-only observation: executable, service version, installed and loaded models with their locality.
 */
async function inspect(context: RuntimeContext): Promise<RuntimeObservation> {
    const { root, source } = rootOf(context);
    const onEngineHost = isLoopbackUrl(root);
    const executablePath = await which('ollama', context.env);
    const base = { variant: 'OLLAMA' as const, displayName: 'Ollama', endpoint: root, endpointSource: source, onEngineHost, resourceKey: serviceKey('OLLAMA', root), ...(executablePath ? { executablePath } : {}), checkedAt: Date.now() };
    let version: string | undefined;
    try {
        version = (await runtimeJson<{ version?: string }>(`${root}/api/version`, { signal: context.signal })).version;
    } catch (error) {
        if (!executablePath && onEngineHost && source === 'discovered') {
            return { ...base, running: false, summary: 'Ollama is not installed on the engine host.', problem: 'missing', nextAction: 'Run `ptbk tool setup-local` to install it, or install it from https://ollama.com/download.' };
        }
        return {
            ...base,
            running: false,
            summary: `The Ollama service at ${root} is ${(error as Error).message}.`,
            problem: onEngineHost ? 'stopped' : 'unreachable',
            nextAction: onEngineHost ? `Start it: ${context.tool ? `ptbk tool runtime ${context.tool.name} start` : 'ollama serve'}` : `Check that ${root} is reachable from the engine host.`,
        };
    }
    try {
        const [tags, running] = await Promise.all([
            runtimeJson<{ models?: TagEntry[] }>(`${root}/api/tags`, { signal: context.signal }),
            runtimeJson<{ models?: TagEntry[] }>(`${root}/api/ps`, { signal: context.signal }).catch(() => ({ models: [] as TagEntry[] })),
        ]);
        const loaded = new Set((running.models ?? []).map((entry) => entry.name ?? entry.model));
        const entries = (tags.models ?? []).filter((entry) => entry.name || entry.model);
        const detailed = await Promise.all(entries.slice(0, MAX_DETAILED_MODELS).map(async (entry) => await details(root, entry, context.signal)));
        const models: RuntimeModel[] = entries.map((entry, index) => {
            const id = (entry.name ?? entry.model)!;
            const locality = localityOf(entry, onEngineHost);
            const info = detailed[index] ?? { tools: 'unknown' as const, vision: 'unknown' as const };
            return {
                id,
                installed: locality !== 'cloud',
                locality,
                loaded: loaded.has(id),
                ...(entry.details?.family ? { family: entry.details.family } : {}),
                ...(entry.details?.parameter_size ? { parameterSize: entry.details.parameter_size } : {}),
                ...(entry.details?.quantization_level ? { quantization: entry.details.quantization_level } : {}),
                ...(entry.digest ? { digest: entry.digest } : {}),
                ...(typeof entry.size === 'number' && locality !== 'cloud' ? { sizeBytes: entry.size } : {}),
                ...(info.contextLength ? { contextLength: info.contextLength } : {}),
                tools: info.tools,
                vision: info.vision,
            };
        });
        const local = models.filter((model) => model.locality === 'local');
        if (!local.length) {
            return { ...base, ...(version ? { version } : {}), running: true, models, summary: `Ollama ${version ?? ''} is running at ${root} but has no ${onEngineHost ? 'local' : 'verified local'} model${models.length ? ` (only ${models.length} cloud/unknown-locality)` : ''}.`.replace(/\s+/g, ' '), problem: 'no-models', nextAction: context.tool ? `Download one: ptbk tool runtime ${context.tool.name} download <model>` : 'Download a model, e.g. `ptbk tool setup-local`.' };
        }
        return { ...base, ...(version ? { version } : {}), running: true, models, summary: `Ollama ${version ?? ''} at ${root}: ${local.length} local model${local.length === 1 ? '' : 's'}${loaded.size ? `, ${loaded.size} loaded` : ''}.`.replace(/\s+/g, ' ') };
    } catch (error) {
        return { ...base, ...(version ? { version } : {}), running: true, summary: `Ollama at ${root} answered, but its catalog could not be read: ${(error as Error).message}.`, problem: 'error' };
    }
}

/**
 * Downloads (pulls) one model with streamed progress. The runtime keeps partial data resumable; an interrupted
 * download is never reported as installed.
 */
async function download(context: RuntimeContext, model: string, onProgress: (progress: { stage: string; completedBytes?: number; totalBytes?: number; message?: string }) => void): Promise<void> {
    const { root } = rootOf(context);
    let succeeded = false;
    await runtimeStream(
        `${root}/api/pull`,
        { model, stream: true },
        (value) => {
            const status = typeof value.status === 'string' ? value.status : '';
            if (status === 'success') succeeded = true;
            onProgress({ stage: status.startsWith('pulling') ? 'downloading' : status === 'success' ? 'downloaded' : 'preparing', ...(typeof value.completed === 'number' ? { completedBytes: value.completed } : {}), ...(typeof value.total === 'number' ? { totalBytes: value.total } : {}), message: status });
        },
        context.signal,
    );
    if (!succeeded) throw new Error(`Ollama ended the download of ${model} without confirming it.`);
}

/**
 * Loads a model and keeps it resident for a while (an explicit action, not a readiness check).
 */
async function load(context: RuntimeContext, model: string): Promise<void> {
    await runtimeJson(`${rootOf(context).root}/api/generate`, { body: { model, prompt: '', keep_alive: '30m', stream: false }, signal: context.signal, timeoutMs: 10 * 60_000 });
}

/**
 * Unloads a model from memory (other consumers can load it again on demand).
 */
async function unload(context: RuntimeContext, model: string): Promise<void> {
    await runtimeJson(`${rootOf(context).root}/api/generate`, { body: { model, prompt: '', keep_alive: 0, stream: false }, signal: context.signal, timeoutMs: 60_000 });
}

/**
 * Deletes a model's weights from the shared store (destructive, host-wide).
 */
async function removeModel(context: RuntimeContext, model: string): Promise<void> {
    await runtimeJson(`${rootOf(context).root}/api/delete`, { method: 'DELETE', body: { model }, signal: context.signal, timeoutMs: 60_000 });
}

/**
 * Starts `ollama serve` as the engine user, detached so it outlives this engine and its viewers.
 */
async function start(context: RuntimeContext): Promise<number | undefined> {
    const executable = await which('ollama', context.env);
    if (!executable) throw new Error('Ollama is not installed on the engine host.');
    const { root } = rootOf(context);
    const url = new URL(root);
    const env = { ...context.env, OLLAMA_HOST: `${url.hostname === 'localhost' ? '127.0.0.1' : url.hostname}:${url.port || '11434'}` };
    const child = spawn(executable, ['serve'], { detached: true, stdio: 'ignore', env, windowsHide: true });
    const pid = child.pid;
    child.unref();
    for (let attempt = 0; attempt < 40; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        try {
            await runtimeJson(`${root}/api/version`, { timeoutMs: 1_000 });
            return pid;
        } catch {
            if (child.exitCode !== null) break;
        }
    }
    throw new Error(`Ollama did not start serving at ${root}.`);
}

/**
 * Supported installation routes of the official distribution (an explicitly accepted prerequisite).
 */
async function installation(platform: NodeJS.Platform, env: NodeJS.ProcessEnv): Promise<RuntimeInstallation | undefined> {
    if (platform === 'darwin' && (await which('brew', env))) return { description: 'Homebrew formula `ollama` (official build of the Ollama CLI and service)', command: 'brew', args: ['install', 'ollama'], mayNeedAdministrator: false };
    if (platform === 'linux' && (await which('curl', env)) && (await which('sh', env))) return { description: 'the official installer from https://ollama.com/install.sh (it asks for administrator approval to install the system service)', command: 'sh', args: ['-c', 'curl -fsSL https://ollama.com/install.sh | sh'], mayNeedAdministrator: true };
    if (platform === 'win32' && (await which('winget', env))) return { description: 'winget package Ollama.Ollama (official installer)', command: 'winget', args: ['install', '--id', 'Ollama.Ollama', '-e', '--accept-source-agreements', '--accept-package-agreements'], mayNeedAdministrator: false };
    return undefined;
}

/**
 * Ollama adapter: OpenAI-compatible `/v1` (Responses and Chat) and Anthropic-compatible Messages endpoints.
 *
 * @private inference runtime adapter
 */
export const ollamaAdapter: RuntimeAdapter = {
    variant: 'OLLAMA',
    displayName: 'Ollama',
    executable: 'ollama',
    defaultEndpoint: DEFAULT_ENDPOINT,
    homepage: 'https://ollama.com',
    actions: ['status', 'models', 'download', 'load', 'unload', 'remove-model', 'start', 'stop', 'restart'],
    inspect,
    installedModels,
    download,
    load,
    unload,
    removeModel,
    start,
    installation,
    protocolEndpoint: (root, protocol) => (protocol === 'openai' ? `${root.replace(/\/+$/, '')}/v1` : root.replace(/\/+$/, '')),
    compatibilityToken: 'ollama',
};
