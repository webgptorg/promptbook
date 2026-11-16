import { pathExists } from '../common/fs.js';
import { shortHash } from '../common/ids.js';
import { browserProfileDirectory, findBrowserExecutable, profileOwner } from '../browser/browser.js';
import { setting, type EffectiveSettings } from '../project/config.js';
import type { Project } from '../project/workspace.js';
import type { HarnessPool } from '../engine/harnesses.js';
import type { ToolsView, ToolView } from '../engine/snapshot.js';
import { harnessPlugin } from '../harness/registry.js';
import { describeCredentialSource } from './environment.js';
import { inferenceCapacity } from '../inference/admission.js';
import { runtimeAdapter } from '../inference/registry.js';
import { dependentHarnesses, describeProfileSource, harnessPluginId, runtimeVariantLabel, toolRuntime, type BrowserToolRecord, type HarnessToolRecord, type ToolRecord } from './model.js';

/**
 * Native desktop readiness without requiring a windowed Console. Undefined usability means permission checks have
 * not run yet; unsupported hosts are unavailable and never block unrelated browser/terminal work.
 *
 * @private tool readiness
 */
export type ComputerReadiness = { readonly usable?: boolean; readonly summary: string; readonly nextAction?: string };

/**
 * Read-only platform check, deliberately not spawning a helper or displaying an OS permission prompt.
 *
 * @private tool readiness
 */
export function inspectComputerPlatform(platform: NodeJS.Platform = process.platform, architecture: string = process.arch): ComputerReadiness {
    if (platform === 'darwin' && architecture === 'arm64') return { summary: 'macOS Apple Silicon supported; screen capture and Accessibility permissions have not been checked.', nextAction: 'In Console, open Tools › this desktop tool and press 1 to request permissions; grant Screen Recording and Accessibility to the native helper. The App desktop viewer offers the same setup.' };
    if (platform === 'win32') return { summary: 'Windows desktop supported; the logged-in graphical session has not been checked.', nextAction: 'In Console, open Tools › this desktop tool and press 5 to check the logged-in Windows desktop session.' };
    return { usable: false, summary: 'Native computer control requires Windows 10/11 or macOS on Apple Silicon with a logged-in graphical session.', nextAction: 'Run this engine in a supported desktop session; browser and terminal work can continue here.' };
}

/**
 * Observed readiness of one browser tool (never launches it).
 *
 * @private tool readiness
 */
export type BrowserReadiness = { readonly usable: boolean; readonly summary: string; readonly nextAction?: string; readonly executable?: string; readonly profilePath: string };

/**
 * Checks a browser tool without launching it: executable, and an explicitly selected existing profile.
 *
 * @private tool readiness
 */
export async function inspectBrowserTool(project: Project, tool: BrowserToolRecord, env: NodeJS.ProcessEnv): Promise<BrowserReadiness> {
    const profilePath = browserProfileDirectory(project, tool, env);
    const executable = await findBrowserExecutable(tool, env);
    if (!executable) {
        return { usable: false, profilePath, summary: `No ${tool.variant === 'CHROME' ? 'Chrome-compatible' : tool.variant} browser executable was found.`, nextAction: `Install Google Chrome (or Chromium/Edge), or set it: ptbk tool modify ${tool.name} --executable <path>` };
    }
    if ((tool.profile.source === 'USER_EXISTING' || tool.profile.source === 'CUSTOM') && !(await pathExists(profilePath))) {
        return { usable: false, executable, profilePath, summary: `The selected profile ${profilePath} does not exist.`, nextAction: `Choose another profile: ptbk tool modify ${tool.name} --profile-source MANAGED_GLOBAL` };
    }
    const owner = await profileOwner(profilePath);
    return { usable: true, executable, profilePath, summary: `Ready (${describeProfileSource(tool.profile.source, tool.profile.path)}${owner ? `; profile currently open in browser PID ${owner}` : ''}, ${tool.isHeadless ? 'headless' : 'visible window'}).` };
}

/**
 * Non-secret display fields of a tool (an API key only as its reference and effective source).
 *
 * @private tool readiness
 */
export function toolFields(project: Project, tool: ToolRecord, env: NodeJS.ProcessEnv, pool?: HarnessPool, settings?: EffectiveSettings): Record<string, string> {
    if (tool.type === 'BROWSER') {
        return {
            profile: `${tool.profile.source}${tool.profile.path ? ` ${tool.profile.path}` : ''}`,
            profilePath: browserProfileDirectory(project, tool, env),
            isHeadless: String(tool.isHeadless),
            ...(tool.executable ? { executable: tool.executable } : {}),
        };
    }
    if (tool.type === 'COMPUTER_CONTROL') return { session: 'engine host, primary monitor', recording: settings && setting<boolean>(settings, 'computer.isRecordingEnabled') ? 'on (private local desktop screenshots; never Git)' : 'off (live screenshots only)', permissions: 'system Accessibility and screen capture permissions may be required' };
    if (tool.type === 'INFERENCE_RUNTIME') {
        const observation = pool?.runtimes.observation(tool.name);
        const dependents = dependentHarnesses(settings?.tools ?? [], tool.name).map((dependent) => dependent.name);
        return {
            endpoint: observation ? `${observation.endpoint} (${observation.endpointSource}${observation.onEngineHost ? ', engine host' : ', NOT on the engine host: never local-only'})` : (tool.endpoint ?? `${runtimeAdapter(tool.variant).defaultEndpoint} (discovered)`),
            ...(observation?.version ? { version: observation.version } : {}),
            connections: dependents.length ? dependents.join(', ') : 'none (add one with `ptbk tool setup-local`)',
            scope: 'shared host service and model store; removing this record never uninstalls software or deletes models',
        };
    }
    const credential = pool?.credential(tool);
    return {
        authentication: tool.authentication,
        ...(tool.apiKey ? { apiKey: `${tool.apiKey}${tool.authentication === 'API_KEY' ? (credential ? ` (${describeCredentialSource(credential)})` : '') : ` (inactive metadata: ${tool.authentication} authentication)`}` } : {}),
        ...(tool.accountProfile ? { accountProfile: tool.accountProfile } : {}),
        endpoint: describeEndpoint(tool),
        // The saved choice itself (absent: the default), so management forms preserve an explicit one.
        ...(tool.baseUrl ? { baseUrl: tool.baseUrl } : {}),
        ...(tool.inferenceRuntime ? { inferenceRuntime: tool.inferenceRuntime } : {}),
    };
}

/**
 * Human description of a harness tool's endpoint (the plugin's fixed official endpoint, local inference on the
 * engine's host or an explicit base URL; never secrets).
 *
 * @private tool readiness
 */
export function describeEndpoint(tool: HarnessToolRecord): string {
    const plugin = harnessPlugin(harnessPluginId(tool.variant));
    const runtime = toolRuntime(tool);
    if (runtime === 'official') return `official${plugin ? ` (${plugin.endpoints.official})` : ''}`;
    if (runtime === 'local' && tool.inferenceRuntime) return `local on the engine's host through the runtime ${tool.inferenceRuntime}${plugin?.endpoints.localConnection ? '' : ' (unsupported by this harness)'}`;
    if (runtime === 'local') return `local on the engine's host${plugin?.endpoints.local ? ` (${plugin.endpoints.local}; no runtime binding)` : ' (unsupported by this harness)'}`;
    return `custom ${runtime}`;
}

/**
 * Display name of a tool's adapter.
 *
 * @private tool readiness
 */
export function variantLabel(tool: Pick<ToolRecord, 'type' | 'variant'>): string {
    if (tool.type === 'COMPUTER_CONTROL') return 'Native desktop';
    if (tool.type === 'INFERENCE_RUNTIME') return runtimeVariantLabel(tool.variant as 'OLLAMA' | 'LM_STUDIO');
    if (tool.type === 'HARNESS') return harnessPlugin(harnessPluginId(tool.variant as HarnessToolRecord['variant']))?.displayName ?? tool.variant;
    return tool.variant === 'CHROME' ? 'Chrome' : tool.variant === 'CHROMIUM' ? 'Chromium' : 'Microsoft Edge';
}

/**
 * Inputs of the shared tool inventory view.
 *
 * @private tool readiness
 */
export type ToolInventoryInput = {
    readonly project: Project;
    readonly settings: EffectiveSettings;
    readonly env: NodeJS.ProcessEnv;
    /** Live harness inspections (already refreshed). */
    readonly pool: HarnessPool;
    /** Browser readiness by name (already inspected). */
    readonly browsers: ReadonlyMap<string, BrowserReadiness>;
    /** Live native helper status by name; absent means permissions have not been inspected, never assumed. */
    readonly computers?: ReadonlyMap<string, ComputerReadiness>;
    /** Names held by active work. */
    readonly inUse?: ReadonlySet<string>;
    /** Acquired old configuration revisions active work still uses (changed, disabled or removed meanwhile). */
    readonly retained?: readonly RetainedToolUse[];
};

/**
 * One acquired configuration revision that active work still uses after its tool was changed, disabled or removed.
 * It is captured when the work acquires the tool, so removal from `ptbk.json` cannot erase its identity.
 *
 * @private tool readiness
 */
export type RetainedToolUse = {
    readonly name: string;
    /** The acquired record (non-secret: an API key is only its `${{ env.NAME }}` reference). */
    readonly record: ToolRecord;
    /** The work holding it (task title or chat). */
    readonly owner?: string;
};

/**
 * Short identifier of a tool's configuration revision (the same record always yields the same revision).
 *
 * @private tool readiness
 */
export function toolRevision(tool: ToolRecord): string {
    return shortHash(JSON.stringify(tool), 8);
}

/**
 * Whether a saved configuration still governs an acquired revision: the same name, enabled and unchanged.
 *
 * @private tool readiness
 */
export function isCurrentRevision(acquired: ToolRecord, saved: readonly ToolRecord[]): boolean {
    const record = saved.find((tool) => tool.name === acquired.name);
    return Boolean(record?.isEnabled) && JSON.stringify(record) === JSON.stringify(acquired);
}

/**
 * The repair of a native harness instance that is not signed in: the shared attended sign-in in that instance's own
 * account context (`ptbk tool enable` of an enabled tool commits nothing and offers it). The harness's own login hint
 * is added only for the default context, which that command signs in; an account profile would otherwise be missed.
 *
 * @private tool readiness
 */
export function nativeSignInAction(tool: Pick<HarnessToolRecord, 'name' | 'accountProfile'>, hint: string | undefined): string {
    return `Sign in from an interactive terminal: ptbk tool enable ${tool.name}${!tool.accountProfile && hint ? `, or: ${hint}` : ''}`;
}

/**
 * Builds the shared ordered tool inventory with the baseline readiness of new work: at least one enabled usable
 * browser and harness. Missing resources are a running engine's wait, never a stop.
 *
 * @private tool readiness
 */
export function toolInventory(input: ToolInventoryInput): ToolsView {
    const { project, settings, env, pool } = input;
    const items: ToolView[] = settings.tools.map((tool, index) => {
        let state: ToolView['state'];
        let summary: string;
        let nextAction: string | undefined;
        let recheckAt: number | undefined;
        if (!tool.isEnabled) {
            state = 'disabled';
            summary = 'Disabled (configuration and credentials are kept).';
            nextAction = `ptbk tool enable ${tool.name}`;
        } else if (tool.type === 'HARNESS') {
            const inspection = pool.inspectionOf(tool.name);
            state = !inspection ? 'unknown' : inspection.usable ? 'usable' : 'unavailable';
            summary = inspection?.summary ?? 'Not inspected yet.';
            recheckAt = inspection?.usable ? undefined : inspection?.recheckAt;
            nextAction = inspection?.usable
                ? undefined
                : tool.authentication === 'NATIVE' && inspection?.installed && inspection.authenticated === false
                  ? nativeSignInAction(tool, inspection.nextAction)
                  : inspection?.nextAction;
        } else if (tool.type === 'INFERENCE_RUNTIME') {
            const observation = pool.runtimes.observation(tool.name);
            state = !observation ? 'unknown' : observation.running && observation.problem !== 'no-models' && observation.problem !== 'error' ? 'usable' : 'unavailable';
            summary = observation?.summary ?? 'Not inspected yet.';
            nextAction = observation?.nextAction;
        } else if (tool.type === 'COMPUTER_CONTROL') {
            const readiness = input.computers?.get(tool.name) ?? inspectComputerPlatform();
            state = readiness.usable === undefined ? 'unknown' : readiness.usable ? 'usable' : 'unavailable';
            summary = readiness.summary;
            nextAction = readiness.nextAction;
        } else {
            const readiness = input.browsers.get(tool.name);
            state = !readiness ? 'unknown' : readiness.usable ? 'usable' : 'unavailable';
            summary = readiness?.summary ?? 'Not inspected yet.';
            nextAction = readiness?.usable ? undefined : readiness?.nextAction;
        }
        return {
            name: tool.name,
            type: tool.type,
            variant: tool.variant,
            variantLabel: variantLabel(tool),
            ...(tool.description ? { description: tool.description } : {}),
            order: index + 1,
            isEnabled: tool.isEnabled,
            state,
            summary,
            ...(nextAction ? { nextAction } : {}),
            ...(recheckAt ? { recheckAt: new Date(recheckAt).toISOString() } : {}),
            inUse: Boolean(input.inUse?.has(tool.name)),
            ...(settings.overriddenTools.has(tool.name) ? { overridden: true } : {}),
            fields: toolFields(project, tool, env, pool, settings),
            ...(tool.type === 'INFERENCE_RUNTIME' ? { runtime: runtimeDetail(tool.name, tool.variant, settings, pool, env) } : {}),
        };
    });
    // Retained revisions are separate entries with their acquired identity, after every saved tool.
    const seen = new Set<string>();
    for (const use of input.retained ?? []) {
        const revision = toolRevision(use.record);
        if (seen.has(`${use.name}\0${revision}`)) continue;
        seen.add(`${use.name}\0${revision}`);
        const saved = settings.tools.find((tool) => tool.name === use.name);
        const status = !saved ? 'Removed from ptbk.json' : saved.type !== use.record.type ? `Replaced in ptbk.json by a ${saved.type} tool of the same name` : !saved.isEnabled ? 'Disabled in ptbk.json' : 'Changed in ptbk.json';
        items.push({
            name: use.name,
            type: use.record.type,
            variant: use.record.variant,
            variantLabel: variantLabel(use.record),
            ...(use.record.description ? { description: use.record.description } : {}),
            order: items.length + 1,
            isEnabled: false,
            state: 'disabled',
            summary: `${status}; current work only: ${use.owner ? `"${use.owner}"` : 'the active work'} finishes with this acquired configuration, no new work selects it.`,
            inUse: true,
            retained: true,
            ...(use.owner ? { owner: use.owner } : {}),
            revision,
            fields: toolFields(project, use.record, env, undefined, settings),
        });
    }
    const problems = settings.diagnostics.filter((diagnostic) => diagnostic.location.includes('tools')).map((diagnostic) => `${diagnostic.location}: ${diagnostic.message}`);
    return { items, waiting: baselineWait(items), problems };
}

/**
 * Observed detail of one runtime record for the Local models views (empty catalog while not observed).
 */
function runtimeDetail(name: string, variant: 'OLLAMA' | 'LM_STUDIO', settings: EffectiveSettings, pool: HarnessPool, env: NodeJS.ProcessEnv): NonNullable<ToolView['runtime']> {
    const observation = pool.runtimes.observation(name);
    const adapter = runtimeAdapter(variant);
    return {
        endpoint: observation?.endpoint ?? adapter.defaultEndpoint,
        endpointSource: observation?.endpointSource ?? 'discovered',
        onEngineHost: observation?.onEngineHost ?? false,
        running: observation?.running ?? false,
        ...(observation?.version ? { version: observation.version } : {}),
        models: (observation?.models ?? []).map((model) => ({
            id: model.id,
            installed: model.installed,
            locality: model.locality,
            ...(model.loaded !== undefined ? { loaded: model.loaded } : {}),
            ...(model.sizeBytes !== undefined ? { sizeBytes: model.sizeBytes } : {}),
            ...(model.quantization ? { quantization: model.quantization } : {}),
            ...(model.parameterSize ? { parameterSize: model.parameterSize } : {}),
            tools: model.tools,
            vision: model.vision,
        })),
        dependents: dependentHarnesses(settings.tools, name).map((tool) => tool.name),
        capacity: inferenceCapacity(variant, env),
        actions: adapter.actions,
        checkedAt: new Date(observation?.checkedAt ?? Date.now()).toISOString(),
    };
}

/**
 * What new work waits for, when no enabled usable browser or harness exists.
 *
 * @private tool readiness
 */
export function baselineWait(items: readonly ToolView[]): ToolsView['waiting'] {
    const missing: string[] = [];
    const actions: string[] = [];
    // Only a wait for known rechecks (every enabled tool of a missing type is rate limited) resolves without a person.
    let automatic = true;
    for (const type of ['HARNESS', 'BROWSER'] as const) {
        const ofType = items.filter((item) => item.type === type && !item.retained);
        if (ofType.some((item) => item.state === 'usable')) continue;
        if (ofType.some((item) => item.state === 'unknown')) continue;
        const label = type === 'HARNESS' ? 'harness' : 'browser';
        const enabled = ofType.filter((item) => item.isEnabled);
        if (!enabled.length || enabled.some((item) => !item.recheckAt)) automatic = false;
        if (!ofType.length) {
            missing.push(`no ${label} tool is configured`);
            actions.push(type === 'HARNESS' ? 'ptbk tool add HARNESS --variant OPENAI_CODEX --name openai-codex' : 'ptbk tool add BROWSER --variant CHROME --name project-browser');
        } else if (!enabled.length) {
            missing.push(`every ${label} tool is disabled (${ofType.map((item) => item.name).join(', ')})`);
            actions.push(`ptbk tool enable ${ofType[0]!.name}`);
        } else {
            missing.push(`no enabled ${label} is usable (${enabled.map((item) => `${item.name}: ${item.summary}`).join('; ')})`);
            const action = enabled.find((item) => item.nextAction)?.nextAction;
            if (action) actions.push(action);
        }
    }
    if (!missing.length) return undefined;
    return { reason: `${missing.join('; ')}.`.replace(/^./, (letter) => letter.toUpperCase()), action: actions.join(' · ') || 'ptbk tool list', ...(automatic ? { automatic: true } : {}) };
}

/**
 * Inspects every configured tool once (read-only; no browser launch, no model call).
 *
 * @private tool readiness
 */
export async function inspectInventory(project: Project, settings: EffectiveSettings, env: NodeJS.ProcessEnv, pool: HarnessPool): Promise<ToolsView> {
    await pool.refresh(pool.allInstances().filter((tool) => tool.isEnabled).map((tool) => tool.name), true);
    await pool.runtimes.refresh(undefined, true);
    const browsers = new Map<string, BrowserReadiness>();
    for (const tool of settings.tools) if (tool.type === 'BROWSER' && tool.isEnabled) browsers.set(tool.name, await inspectBrowserTool(project, tool, env));
    return toolInventory({ project, settings, env, pool, browsers });
}
