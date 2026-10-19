import { ENGINE_VERSION, detectInstallation } from '../common/version.js';
import { loadSettings } from '../project/config.js';
import type { Project } from '../project/workspace.js';
import { ChatStore } from '../chats/store.js';
import { setting } from '../project/config.js';
import type { ServiceSnapshot } from '../engine/snapshot.js';
import { StateStore } from '../engine/state.js';
import type { ControlClient, ServiceLookup } from '../service/control.js';
import { publicSnapshot } from '../service/http.js';
import type { PanelTone } from '../ui/panels.js';
import { renderQr, renderStatus, type PreparedQr } from '../ui/status-view.js';
import { flag, type CommandContext } from './context.js';
import { printJson } from './common.js';

/**
 * Builds the snapshot of a project whose service is not running (chats and history are still readable).
 *
 * @private service views
 */
export async function stoppedSnapshot(project: Project): Promise<ServiceSnapshot> {
    const settings = await loadSettings(project).catch(() => undefined);
    const chats = await new ChatStore(project, { timeZone: settings ? setting<string>(settings, 'timezone') : 'UTC' }).summaries().catch(() => []);
    const results = await new StateStore(project.runtime.state).recentResults(10).catch(() => []);
    const installation = detectInstallation();
    return {
        revision: 0,
        observedAt: new Date().toISOString(),
        project: { name: project.name, path: project.root },
        engine: { version: ENGINE_VERSION, installation: installation.root, scope: installation.scope },
        service: {
            mode: 'daemon',
            state: 'stopped',
            pid: 0,
            instanceId: '',
            startedAt: '',
            persistent: null,
            commitMode: settings && settings.values['execution.commit'] === false ? 'no-commit' : 'commit',
            stopRequested: false,
        },
        phase: 'stopped',
        queue: [],
        queueTotal: 0,
        results: { completed: results.filter((result) => result.outcome.startsWith('completed')).length, failed: results.filter((result) => result.outcome === 'failed').length, recent: results.slice(0, 5).map((result) => ({ ref: result.taskRef, trace: result.trace, occurrence: result.occurrence, title: result.title, outcome: result.outcome, agent: result.agent, harness: result.harness, model: result.model, commit: result.commit, summary: result.summary, endedAt: result.endedAt, attempts: result.attempts })) },
        chats: {
            waiting: chats.filter((chat) => chat.status === 'waiting-for-user' && chat.humanFacing),
            unread: chats.reduce((sum, chat) => sum + chat.unread, 0),
            total: chats.length,
            recent: chats.slice(0, 30),
        },
        blockers: [],
        errors: [],
        activity: [],
        agents: [],
        harnesses: [],
        settings: [],
        connection: { local: { state: 'disabled' }, remote: { state: 'disabled' } },
    };
}

/**
 * Live lifecycle states an engine may report through `identify`.
 */
const LIVE_STATES: readonly string[] = ['running', 'pausing', 'pause', 'stopping'];

/**
 * Snapshot of a running service for one-shot results (status, lifecycle outcomes, start, restart, init).
 *
 * An engine of an incompatible ptbk version cannot be rendered from its own snapshot, so the project's local view is
 * shown with that engine's actual version and process identity plus a blocker naming the difference; its live details
 * are not guessed.
 *
 * @private service views
 */
export async function liveSnapshot(project: Project, lookup: Extract<ServiceLookup, { state: 'running' }>): Promise<ServiceSnapshot> {
    if (lookup.engine.compatible) return await lookup.client.request<ServiceSnapshot>('snapshot');
    const local = await stoppedSnapshot(project);
    const reported = await lookup.client.request<{ state?: string }>('identify').catch(() => ({ state: undefined }));
    const state = (LIVE_STATES.includes(reported.state ?? '') ? reported.state : 'running') as ServiceSnapshot['service']['state'];
    const { record } = lookup;
    return {
        ...local,
        engine: { version: lookup.engine.version, installation: record.installation, scope: local.engine.scope },
        service: { ...local.service, mode: record.mode, state, pid: record.pid, instanceId: record.instanceId, startedAt: record.startedAt, persistent: record.persistent },
        phase: 'unknown',
        blockers: [
            {
                kind: 'setup',
                title: `Service runs ptbk ${lookup.engine.version}`,
                reason: `This ptbk ${ENGINE_VERSION} cannot read its live details (different control contract).`,
                action: 'Use `ptbk dashboard` (it opens the service\'s own installation), or `ptbk stop` and `ptbk start` to switch versions.',
            },
        ],
    };
}

/**
 * Prepares the QR for a trusted local terminal: the existing pairing link (never minted here), otherwise the
 * verified public URL. A loopback address is never presented as mobile access.
 *
 * @private service views
 */
export async function prepareConnectionQr(snapshot: ServiceSnapshot, client: ControlClient | undefined, noQr: boolean): Promise<{ qr?: PreparedQr; pairingUrl?: string }> {
    if (noQr || !client) return {};
    const remote = snapshot.connection.remote;
    let pairing: { available: boolean; url?: string; remote?: boolean } = { available: false };
    if (snapshot.connection.pairing?.available) pairing = await client.request<typeof pairing>('pairing', { renew: false }).catch(() => ({ available: false }));
    if (pairing.available && pairing.url && pairing.remote) {
        return { qr: { url: pairing.url, lines: await renderQr(pairing.url), label: 'Scan to pair a phone (protected remote access):', sensitive: true } };
    }
    if (remote.state === 'ready' && remote.url) return { qr: { url: remote.url, lines: await renderQr(remote.url), label: 'Remote dashboard (pairing required):', sensitive: false }, pairingUrl: pairing.url };
    return { pairingUrl: pairing.available ? pairing.url : undefined };
}

/**
 * Renders a one-shot service result (status, start, restart, stop) in the invocation's presentation.
 *
 * @private service views
 */
export async function renderServiceResult(
    context: CommandContext,
    snapshot: ServiceSnapshot,
    options: { client?: ControlClient; outcome?: { title: string; message?: string; tone: PanelTone }; next?: string[] } = {},
): Promise<void> {
    if (flag(context, 'json')) {
        printJson(publicSnapshot(snapshot));
        return;
    }
    const noQr = flag(context, 'qr') === false || snapshot.service.state === 'stopped';
    const prepared = context.terminal.pretty ? await prepareConnectionQr(snapshot, options.client, noQr) : {};
    context.terminal.write(
        renderStatus(snapshot, context.terminal, {
            outcome: options.outcome,
            qr: prepared.qr,
            noQr: flag(context, 'qr') === false,
            pairingUrl: prepared.qr?.sensitive ? undefined : prepared.pairingUrl,
            next: options.next,
        }),
    );
}
