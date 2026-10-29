import { pathExists } from '../common/fs.js';
import { browserProfileDirectory, findBrowserExecutable, profileOwner } from '../browser/browser.js';
import type { EffectiveSettings } from '../project/config.js';
import type { Project } from '../project/workspace.js';
import type { HarnessPool } from '../engine/harnesses.js';
import type { ToolsView, ToolView } from '../engine/snapshot.js';
import { harnessPlugin } from '../harness/registry.js';
import { describeCredentialSource } from './environment.js';
import { describeProfileSource, harnessPluginId, toolRuntime, type BrowserToolRecord, type HarnessToolRecord, type ToolRecord } from './model.js';

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
export function toolFields(project: Project, tool: ToolRecord, env: NodeJS.ProcessEnv, pool?: HarnessPool): Record<string, string> {
    if (tool.type === 'BROWSER') {
        return {
            profile: `${tool.profile.source}${tool.profile.path ? ` ${tool.profile.path}` : ''}`,
            profilePath: browserProfileDirectory(project, tool, env),
            isHeadless: String(tool.isHeadless),
            ...(tool.executable ? { executable: tool.executable } : {}),
        };
    }
    const credential = pool?.credential(tool);
    return {
        authentication: tool.authentication,
        ...(tool.apiKey ? { apiKey: `${tool.apiKey}${tool.authentication === 'API_KEY' ? (credential ? ` (${describeCredentialSource(credential)})` : '') : ' (inactive metadata: NATIVE authentication)'}` } : {}),
        ...(tool.accountProfile ? { accountProfile: tool.accountProfile } : {}),
        endpoint: describeEndpoint(tool),
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
    if (runtime === 'local') return `local on the engine's host${plugin?.endpoints.local ? ` (${plugin.endpoints.local})` : ' (unsupported by this harness)'}`;
    return `custom ${runtime}`;
}

/**
 * Display name of a tool's adapter.
 *
 * @private tool readiness
 */
export function variantLabel(tool: Pick<ToolRecord, 'type' | 'variant'>): string {
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
    /** Names held by active work. */
    readonly inUse?: ReadonlySet<string>;
    /** Names whose acquired old configuration is still used (changed, disabled or removed). */
    readonly retained?: ReadonlySet<string>;
};

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
        if (!tool.isEnabled) {
            state = 'disabled';
            summary = 'Disabled (configuration and credentials are kept).';
            nextAction = `ptbk tool enable ${tool.name}`;
        } else if (tool.type === 'HARNESS') {
            const inspection = pool.inspectionOf(tool.name);
            state = !inspection ? 'unknown' : inspection.usable ? 'usable' : 'unavailable';
            summary = inspection?.summary ?? 'Not inspected yet.';
            nextAction = inspection?.usable
                ? undefined
                : tool.authentication === 'NATIVE' && inspection?.installed && inspection.authenticated === false
                  ? nativeSignInAction(tool, inspection.nextAction)
                  : inspection?.nextAction;
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
            inUse: Boolean(input.inUse?.has(tool.name)),
            ...(input.retained?.has(tool.name) ? { retained: true } : {}),
            ...(settings.overriddenTools.has(tool.name) ? { overridden: true } : {}),
            fields: toolFields(project, tool, env, pool),
        };
    });
    for (const name of input.retained ?? []) {
        if (items.some((item) => item.name === name)) continue;
        items.push({ name, type: 'BROWSER', variant: 'CHROME', variantLabel: 'browser', order: items.length + 1, isEnabled: false, state: 'disabled', summary: 'Removed from ptbk.json; the current task finishes with it.', inUse: true, retained: true, fields: {} });
    }
    const problems = settings.diagnostics.filter((diagnostic) => diagnostic.location.includes('tools')).map((diagnostic) => `${diagnostic.location}: ${diagnostic.message}`);
    return { items, waiting: baselineWait(items), problems };
}

/**
 * What new work waits for, when no enabled usable browser or harness exists.
 *
 * @private tool readiness
 */
export function baselineWait(items: readonly ToolView[]): ToolsView['waiting'] {
    const missing: string[] = [];
    const actions: string[] = [];
    for (const type of ['HARNESS', 'BROWSER'] as const) {
        const ofType = items.filter((item) => item.type === type && !item.retained);
        if (ofType.some((item) => item.state === 'usable')) continue;
        if (ofType.some((item) => item.state === 'unknown')) continue;
        const label = type === 'HARNESS' ? 'harness' : 'browser';
        const enabled = ofType.filter((item) => item.isEnabled);
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
    return { reason: `${missing.join('; ')}.`.replace(/^./, (letter) => letter.toUpperCase()), action: actions.join(' · ') || 'ptbk tool list' };
}

/**
 * Inspects every configured tool once (read-only; no browser launch, no model call).
 *
 * @private tool readiness
 */
export async function inspectInventory(project: Project, settings: EffectiveSettings, env: NodeJS.ProcessEnv, pool: HarnessPool): Promise<ToolsView> {
    await pool.refresh(pool.allInstances().filter((tool) => tool.isEnabled).map((tool) => tool.name), true);
    const browsers = new Map<string, BrowserReadiness>();
    for (const tool of settings.tools) if (tool.type === 'BROWSER' && tool.isEnabled) browsers.set(tool.name, await inspectBrowserTool(project, tool, env));
    return toolInventory({ project, settings, env, pool, browsers });
}
