import { storedAppView } from '../../app/connection.js';
import { loadEngineIdentity } from '../../app/identity.js';
import { forgetRegistration, readRegistration, registerEngine, storeRegistration, type RegistrationOutcome } from '../../app/registration.js';
import { appSettings } from '../../app/settings.js';
import { EXIT, errorMessage, usageError } from '../../common/errors.js';
import type { AppConnectionView } from '../../engine/snapshot.js';
import type { Project } from '../../project/workspace.js';
import { lookupService } from '../../service/control.js';
import { appDetailLines, appPlainLines, appState } from '../../ui/app-connection.js';
import { renderPanel, type PanelTone } from '../../ui/panels.js';
import { printJson, selectedProject } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';

/**
 * What a running engine did with a changed link.
 */
type EngineReload = { readonly kind: 'reloaded'; readonly view: AppConnectionView } | { readonly kind: 'stopped' } | { readonly kind: 'not-applied'; readonly reason: string };

/**
 * The App connection as the project's running engine reports it, or from the stored link while it is stopped.
 */
async function currentView(project: Project, env: NodeJS.ProcessEnv): Promise<AppConnectionView> {
    const lookup = await lookupService(project);
    if (lookup.state === 'running' && lookup.engine.compatible) {
        try {
            return await lookup.client.request<AppConnectionView>('app-status');
        } catch {
            // An engine without the App connection (older or maintenance): describe the stored link instead.
        }
    }
    return await storedAppView(project.runtime.app, env);
}

/**
 * Asks a running engine to reconnect from the stored link (after `connect` or `disconnect`).
 */
async function reloadEngine(project: Project): Promise<EngineReload> {
    const lookup = await lookupService(project);
    if (lookup.state !== 'running') return { kind: 'stopped' };
    if (!lookup.engine.compatible) return { kind: 'not-applied', reason: `The running engine is ptbk ${lookup.engine.version}; restart it with \`ptbk restart\` to apply the change.` };
    try {
        return { kind: 'reloaded', view: await lookup.client.request<AppConnectionView>('app-reload') };
    } catch (error) {
        return { kind: 'not-applied', reason: `The running engine did not apply the change (${errorMessage(error)}); restart it with \`ptbk restart\`.` };
    }
}

/**
 * Prints the App connection with an optional outcome line, in the invocation's presentation.
 */
function renderView(context: CommandContext, view: AppConnectionView, outcome?: { readonly title: string; readonly message?: string; readonly tone: PanelTone }): void {
    const { terminal } = context;
    if (!terminal.pretty) {
        const lines = [...(outcome ? [`${outcome.title}${outcome.message ? `: ${outcome.message}` : ''}`] : []), `App: ${appState(view).label}`, ...appPlainLines(view).slice(1)];
        terminal.write(`${lines.join('\n')}\n`);
        return;
    }
    const { style } = terminal;
    const width = Math.min(terminal.columns(), 100);
    const lines = appDetailLines(view, style, width - 4).slice(1);
    if (outcome?.message) lines.unshift(outcome.tone === 'error' ? style.error(outcome.message) : outcome.message, '');
    const state = appState(view);
    terminal.write(`${renderPanel({ title: outcome?.title ?? 'App connection', titleRight: state.label, lines, width, tone: outcome?.tone ?? (state.tone === 'warning' ? 'attention' : state.tone), unicode: terminal.unicode, style }).join('\n')}\n`);
}

/**
 * The sentence about the running engine after a link change.
 */
function reloadNote(reload: EngineReload, linked: boolean): string {
    if (reload.kind === 'reloaded') return linked ? 'The running engine is connecting now.' : 'The running engine closed its App connection.';
    if (reload.kind === 'stopped') return linked ? 'The engine connects when it starts (`ptbk start`).' : 'The engine is stopped.';
    return reload.reason;
}

/**
 * `ptbk connect`: links the project to the Promptbook App with a one-time link code (`--link <code>` or
 * `PTBK_LINK_CODE`), or prints its App connection. The link code is sent once and never stored or printed.
 *
 * @private command
 */
export default async function connect(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const json = flag(context, 'json') === true;
    const given = option<string>(context, 'link');
    if (given !== undefined && !given.trim()) throw usageError('--link needs the link code from the Promptbook App.', 'connect', 'Run `ptbk connect --link <code>` with the code shown in the App.');
    const linkCode = (given ?? context.env.PTBK_LINK_CODE)?.trim();
    if (!linkCode) {
        const view = await currentView(project, context.env);
        if (json) printJson(view);
        else renderView(context, view);
        return view.state === 'problem' ? EXIT.failure : EXIT.success;
    }
    const settings = appSettings(context.env);
    const directory = project.runtime.app;
    const identity = await loadEngineIdentity(directory, { create: true });
    if (!identity) throw new Error('The engine identity could not be created.');
    const existing = await readRegistration(directory, identity, settings);
    if (existing) {
        // Already linked: no network call, and the code stays unused for another engine.
        const view = await currentView(project, context.env);
        if (json) printJson({ outcome: 'already-linked', app: view });
        else renderView(context, view, { title: 'Already linked', message: `This project is already linked as ${existing.hostname}. To link it to another account, run \`ptbk disconnect\` first.`, tone: 'muted' });
        return EXIT.success;
    }
    if (!json && context.terminal.pretty) context.terminal.write(`${context.terminal.style.muted(`Linking engine ${identity.engineId} (fingerprint ${identity.fingerprint.formatted}) with ${settings.dashboardUrl}…`)}\n`);
    const outcome: RegistrationOutcome = await registerEngine({
        identity,
        linkCode,
        settings,
        env: context.env,
        onRetry: (refused, delayMs) => {
            if (!json) context.terminal.write(`${refused.message} Retrying in ${Math.round(delayMs / 1000)} s…\n`);
        },
    });
    if (outcome.kind === 'refused') {
        const view = await currentView(project, context.env);
        if (json) printJson({ outcome: 'refused', code: outcome.code, ...(outcome.status ? { status: outcome.status } : {}), message: outcome.message, app: view });
        else renderView(context, view, { title: 'Not linked', message: outcome.message, tone: 'error' });
        return EXIT.failure;
    }
    await storeRegistration(directory, outcome.registration);
    const reload = await reloadEngine(project);
    const view = reload.kind === 'reloaded' ? reload.view : await currentView(project, context.env);
    if (json) printJson({ outcome: 'linked', app: view });
    else renderView(context, view, { title: 'Linked to the Promptbook App', message: `This project is the App engine ${outcome.registration.hostname}. Compare the fingerprint ${identity.fingerprint.formatted} with the one the App shows. ${reloadNote(reload, true)}`, tone: 'success' });
    return EXIT.success;
}

/**
 * `ptbk disconnect`: stops the project's App connection on this computer and forgets the link, keeping the engine
 * identity (a new link code links the same engine again). It does not revoke the engine in the App.
 *
 * @private command
 */
export async function disconnect(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const json = flag(context, 'json') === true;
    const settings = appSettings(context.env);
    const directory = project.runtime.app;
    const identity = await loadEngineIdentity(directory, { create: false });
    const existing = identity ? await readRegistration(directory, identity, settings).catch(() => undefined) : undefined;
    // A damaged registration file is forgotten too: disconnecting is how the owner clears it.
    await forgetRegistration(directory);
    const reload = await reloadEngine(project);
    const view = reload.kind === 'reloaded' ? reload.view : await currentView(project, context.env);
    if (json) {
        printJson({ outcome: existing ? 'disconnected' : 'not-linked', app: view });
        return EXIT.success;
    }
    renderView(
        context,
        view,
        existing
            ? { title: 'Disconnected', message: `This project no longer connects to the Promptbook App as ${existing.hostname}. ${reloadNote(reload, false)} The App still lists the engine until you remove it there; \`ptbk connect --link <code>\` links the same engine again.`, tone: 'muted' }
            : { title: 'Not linked', message: 'This project was not linked to the Promptbook App; nothing changed.', tone: 'muted' },
    );
    return EXIT.success;
}
