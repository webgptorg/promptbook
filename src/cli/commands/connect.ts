import { CONFORMANCE_BUILD } from '../../app/build.js';
import { storedAppView, type AppPairingOutcome, type SetupLinkOutcome } from '../../app/connection.js';
import { loadEngineIdentity } from '../../app/identity.js';
import { forgetRegistration, parseAppLink, readRegistration, registerEngine, storeRegistration, type RegistrationOutcome } from '../../app/registration.js';
import { appDirectory, appSettings } from '../../app/settings.js';
import { EXIT, PtbkError, errorMessage, usageError } from '../../common/errors.js';
import { IpcError } from '../../common/ipc.js';
import type { AppConnectionView } from '../../engine/snapshot.js';
import { onboardingTarget, readOnboarding } from '../../onboarding/draft.js';
import { onboardingClient, pendingOnboarding } from '../../onboarding/local.js';
import type { Project } from '../../project/workspace.js';
import { lookupService } from '../../service/control.js';
import { appDetailLines, appPlainLines, appState } from '../../ui/app-connection.js';
import { renderPanel, type PanelTone } from '../../ui/panels.js';
import { CANCELLED, inputLine } from '../../ui/prompts.js';
import { printJson, selectedProject } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';
import { showOwnerSetup } from '../owner-setup.js';

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
            const view = await lookup.client.request<AppConnectionView | undefined>('app-status');
            if (view) return view;
        } catch {
            // An engine without the App connection (older or maintenance): describe the stored link instead.
        }
    }
    return await storedAppView(appDirectory(project.runtime.app, env), env);
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
 * Older engines can share the control contract while lacking the new pairing operations.
 */
function missingPairingMethod(error: unknown, method: string): boolean {
    return error instanceof IpcError && error.stage === 'remote' && error.message === `Unknown control method ${method}.`;
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
    const onboarding = option<string>(context, 'onboarding');
    if (onboarding && context.explicit.has('path')) throw usageError('Use either --path or --onboarding.', 'connect');
    const selected = onboarding ? await pendingOnboarding(onboarding, context.env) : await selectedProject(context);
    const draft = onboarding ? await readOnboarding(selected) : undefined;
    const project = draft?.step === 'done' && draft.folder ? onboardingTarget(selected, draft.folder) : selected;
    const json = flag(context, 'json') === true;
    const pending = draft && draft.step !== 'done' ? await onboardingClient(project, context.env) : undefined;
    if (flag(context, 'setup-link') === true || flag(context, 'reset-owner') === true) return await ownerAccess(context, project, json);
    const given = option<string>(context, 'link');
    if (given !== undefined && !given.trim()) throw usageError('--link needs the link code from the Promptbook App.', 'connect', 'Run `ptbk connect --link <code>` with the code shown in the App.');
    const link = (given ?? context.env.PTBK_LINK_CODE)?.trim();
    if (!link) {
        const view = await currentView(project, context.env);
        if (json) printJson(view);
        else renderView(context, view);
        return view.state === 'problem' ? EXIT.failure : EXIT.success;
    }
    const { linkCode, settings } = parseAppLink(link, context.env);
    // The origin is not a secret: show where a pasted link goes before anything is sent there.
    const announce = (): void => {
        const line = `Linking with the Promptbook App at ${settings.dashboardUrl}…`;
        if (json) process.stderr.write(`${line}\n`);
        else context.terminal.write(`${context.terminal.pretty ? context.terminal.style.muted(line) : line}\n`);
    };
    if (pending) {
        announce();
        const result = await pending.request<AppPairingOutcome>('app-link', { link }, 90_000);
        if (json) printJson(result);
        else if (result.outcome === 'refused') context.terminal.write(result.message + '\n');
        else renderView(context, result.app, { title: 'Paired with Promptbook App', tone: 'success' });
        if (result.outcome !== 'refused') await automaticOwnerSetup(context, project);
        return result.outcome === 'refused' ? EXIT.incomplete : EXIT.success;
    }
    const service = await lookupService(project);
    if (service.state === 'running' && service.engine.compatible) {
        announce();
        const result = await service.client.request<AppPairingOutcome>('app-pair', { link }, 35 * 60_000).catch((error: unknown) => {
            if (!missingPairingMethod(error, 'app-pair')) throw error;
        });
        if (result) {
            if (result.outcome === 'refused') {
                const app = await currentView(project, context.env);
                if (json) printJson({ ...result, app });
                else renderView(context, app, { title: 'Not linked', message: result.message, tone: 'error' });
                return EXIT.failure;
            }
            if (json) printJson(result);
            else if (result.outcome === 'already-linked') renderView(context, result.app, { title: 'Already linked', message: 'Run `ptbk disconnect` before using a different pairing URL.', tone: 'muted' });
            else renderView(context, result.app, { title: 'Linked to the Promptbook App', message: `Compare fingerprint ${result.app.fingerprint} with the App. The running engine is connecting now.`, tone: 'success' });
            await automaticOwnerSetup(context, project);
            return EXIT.success;
        }
    }
    const directory = appDirectory(project.runtime.app, context.env);
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
    announce();
    if (!json && context.terminal.pretty) context.terminal.write(`${context.terminal.style.muted(`Engine ${identity.engineId}, fingerprint ${identity.fingerprint.formatted}.`)}\n`);
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
    await automaticOwnerSetup(context, project);
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
    const directory = appDirectory(project.runtime.app, context.env);
    const identity = await loadEngineIdentity(directory, { create: false });
    const existing = identity ? await readRegistration(directory, identity, settings).catch(() => undefined) : undefined;
    const service = await lookupService(project);
    if (service.state === 'running' && service.engine.compatible) {
        const result = await service.client.request<{ app: AppConnectionView }>('app-unpair').catch((error: unknown) => {
            if (!missingPairingMethod(error, 'app-unpair')) throw error;
        });
        if (result) {
            if (json) printJson({ outcome: existing ? 'disconnected' : 'not-linked', app: result.app });
            else renderView(context, result.app, { title: 'Disconnected', message: 'Pairing removed and relay access closed. The App account may still list the engine.', tone: 'muted' });
            return EXIT.success;
        }
    }
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

/**
 * Longest wait of `--setup-link` for the engine's address to work.
 */
const SETUP_LINK_WAIT_MS = 10 * 60_000;

/**
 * Asks the running engine for the owner setup link (or the owner reset), waiting until its address works.
 */
async function requestOwnerAccess(project: Project, method: 'app-setup-link' | 'app-reset-owner', wait: boolean, onWaiting: (missing: string) => void): Promise<SetupLinkOutcome> {
    const lookup = await lookupService(project);
    if (lookup.state !== 'running') throw new PtbkError('The engine of this project is not running; the setup link comes from the running engine.', { kind: 'incomplete', next: ['ptbk start'] });
    if (!lookup.engine.compatible) throw new PtbkError(`The running engine is ptbk ${lookup.engine.version}; restart it with \`ptbk restart\` first.`, { kind: 'incomplete' });
    let outcome = await lookup.client.request<SetupLinkOutcome>(method);
    const deadline = Date.now() + SETUP_LINK_WAIT_MS;
    let said = '';
    while (wait && outcome.kind === 'not-ready' && Date.now() < deadline) {
        if (outcome.missing !== said) onWaiting((said = outcome.missing));
        await new Promise((resolve) => setTimeout(resolve, 2000));
        outcome = await lookup.client.request<SetupLinkOutcome>('app-setup-link');
    }
    return outcome;
}

/**
 * `ptbk connect --setup-link` and `ptbk connect --reset-owner`: the owner setup link of the engine's own address,
 * printed with a QR only to an interactive terminal (or as `--json` when asked) and opened on a local desktop;
 * never sent to a log. The reset first ends every
 * passkey and session after the operator types the start of the engine ID (or `--yes`).
 */
export async function ownerAccess(context: CommandContext, project: Project, json: boolean, automatic = false): Promise<number> {
    const { terminal } = context;
    const reset = flag(context, 'reset-owner') === true;
    const wait = flag(context, 'wait') !== false;
    if (!json && !terminal.interactive) throw usageError('The setup link is shown only in an interactive terminal, because whoever reads it first becomes the owner.', 'connect', 'Run it in a terminal, or add --json to print it as data.');
    if (reset && flag(context, 'yes') !== true) {
        if (!terminal.interactive) throw usageError('The owner reset needs confirmation: run it in a terminal, or add --yes.', 'connect');
        const view = await currentView(project, context.env);
        const prefix = (view.engineId ?? '').slice(0, 8);
        const typed = await inputLine(terminal, {
            frame: { title: 'ptbk connect', step: 'Reset the owner' },
            question: `Every passkey and session of this engine ends (agents and data stay). Type ${prefix || 'the engine ID'} to confirm:`,
            validate: (value) => (value.trim() === prefix ? undefined : `Type ${prefix} exactly.`),
        });
        if (typed === CANCELLED) return EXIT.incomplete;
    }
    const outcome = await requestOwnerAccess(project, reset ? 'app-reset-owner' : 'app-setup-link', wait, (missing) => {
        if (!json) terminal.write(`${terminal.style.muted(`Waiting: ${missing}`)}\n`);
    });
    if (json) {
        printJson(outcome.kind === 'issued' ? { outcome: 'issued', url: outcome.url, expiresAt: outcome.expiresAt, engineId: outcome.engineId } : outcome.kind === 'owner-exists' ? { outcome: 'owner-exists', hostname: outcome.hostname } : { outcome: 'not-ready', reason: outcome.missing });
        return outcome.kind === 'issued' ? EXIT.success : EXIT.incomplete;
    }
    const { style } = terminal;
    const width = Math.min(terminal.columns(), 100);
    if (outcome.kind === 'owner-exists') {
        if (automatic) return EXIT.success;
        terminal.write(`${renderPanel({ title: 'This engine already has an owner', lines: [`Sign in at https://${outcome.hostname}/ with the owner's passkey.`, 'Lost every passkey? `ptbk connect --reset-owner` ends all access and prints a new setup link.'], width, tone: 'muted', unicode: terminal.unicode, style }).join('\n')}\n`);
        return EXIT.success;
    }
    if (outcome.kind === 'not-ready') {
        terminal.write(`${renderPanel({ title: reset ? 'Owner reset; no setup link yet' : 'No setup link yet', lines: [outcome.missing, 'Run `ptbk connect --setup-link` again once the engine is reachable.'], width, tone: 'attention', unicode: terminal.unicode, style }).join('\n')}\n`);
        return EXIT.incomplete;
    }
    await showOwnerSetup(context, outcome, reset);
    return EXIT.success;
}

/** Shows setup without a second command, only for an attended, linked engine without an owner. @private owner setup */
export async function automaticOwnerSetup(context: CommandContext, project: Project): Promise<void> {
    if (!context.terminal.interactive || flag(context, 'json') === true) return;
    const lookup = await lookupService(project);
    if (lookup.state !== 'running' || !lookup.engine.compatible) return;
    const app = await lookup.client.request<AppConnectionView | undefined>('app-status');
    if (!app || app.state === 'unlinked' || app.owner === 'set') return;
    await ownerAccess(context, project, false, true);
}

/**
 * `ptbk conformance-session --subject owner|member [--permissions a,b]`: a session of the running engine for the App's
 * conformance harness, as `{"cookie":"__Host-ptbk_session=..."}` (or `null`). Only the conformance build has it; a
 * release build refuses to run it.
 *
 * @private command
 */
export async function conformanceSession(context: CommandContext): Promise<number> {
    if (!CONFORMANCE_BUILD) throw new PtbkError('conformance-session exists only in the conformance build of ptbk.', { kind: 'unsupported' });
    const subject = option<string>(context, 'subject');
    if (subject !== 'owner' && subject !== 'member') throw usageError('--subject must be owner or member.', 'conformance-session');
    const listed = option<string>(context, 'permissions');
    if (subject === 'owner' && listed !== undefined) throw usageError('--permissions applies to --subject member only.', 'conformance-session');
    const project = await selectedProject(context);
    const lookup = await lookupService(project);
    if (lookup.state !== 'running') {
        process.stdout.write('null\n');
        return EXIT.success;
    }
    const permissions = listed ? listed.split(',').map((name) => name.trim()).filter(Boolean) : [];
    const session = await lookup.client.request<{ cookie: string } | null>('app-conformance-session', { subject, permissions });
    process.stdout.write(`${JSON.stringify(session)}\n`);
    return EXIT.success;
}
