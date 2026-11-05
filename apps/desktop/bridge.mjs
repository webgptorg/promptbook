import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Loads shared controllers from the actual installed engine; this process never creates an Agenda or supervisor. */
const installation = process.argv[2];
const load = async (name) => await import(pathToFileURL(join(installation, 'dist', name)).href);
const [{ observeHost }, { applyGlobalAction }, { lookupService }, { projectAt }] = await Promise.all([
    load('ui/global-dashboard.js'), load('service/global-controls.js'), load('service/control.js'), load('project/workspace.js'),
]);

/** A fresh verified row is required for every mutation, never a renderer-supplied process identity. */
async function target(root) {
    const host = await observeHost();
    const row = host.rows.find((item) => item.projectRoot === root);
    if (!row) throw new Error('This project is no longer registered. Refresh the project list.');
    return row;
}

/** Live features presented in this desktop process (tab viewers and voice calls), by id. */
const features = new Map();
let featureCount = 0;

/** Text parameters only; anything else is dropped. */
function strings(params, keys) {
    return Object.fromEntries(keys.filter((key) => typeof params[key] === 'string' && params[key]).map((key) => [key, params[key]]));
}

/** Feature presenters of the installed engine (an older installation has none). */
async function featureModules() {
    try {
        const [{ TabSurfaceRelay }, { VoiceSurfaceRelay }, { PortSurface }] = await Promise.all([load('ui/tab-surface.js'), load('ui/voice-surface.js'), load('ui/port-surface.js')]);
        return { TabSurfaceRelay, VoiceSurfaceRelay, PortSurface };
    } catch {
        throw new Error('The installed CLI cannot present live features in the desktop app. Update Promptbook, or use the CLI dashboard.');
    }
}

/** The control channel of a registered project's running engine. */
async function engine(root) {
    const row = await target(root);
    const lookup = await lookupService(projectAt(row.projectRoot));
    if (lookup.state !== 'running') throw new Error(lookup.state === 'unreachable' ? lookup.reason : 'The project is stopped. Start it first.');
    if (!lookup.engine.compatible) throw new Error('The running engine has another control contract. Use its CLI dashboard.');
    return lookup.client;
}

/** Feature output for the main process, in order (it reaches only the feature's own view and window). */
function post(feature, value) {
    process.send?.({ feature, ...value });
}

/**
 * Presents a feature in an embedded view of the owning window: its surface speaks through the app's private IPC, so no
 * temporary server, link or external browser is involved.
 */
async function present(kind, root, start) {
    const modules = await featureModules();
    const id = `f${++featureCount}`;
    const entry = { id, kind, root };
    const factory = modules.PortSurface.factory(
        (outgoing) => {
            if (outgoing.kind === 'state' && outgoing.state === 'closed') {
                features.delete(id);
                clearInterval(entry.heartbeat);
            }
            post(id, { out: outgoing.kind === 'binary' ? { kind: 'binary', data: outgoing.data.toString('base64') } : outgoing });
        },
        (surface) => { entry.surface = surface; },
    );
    features.set(id, entry);
    try {
        entry.relay = await start(modules, factory, entry);
    } catch (error) {
        features.delete(id);
        throw error;
    }
    return { feature: id, document: entry.surface.document(), policy: entry.surface.policy, permissions: entry.surface.permissions };
}

/** Closes a presented feature (a voice call ends with it; a tab viewer only detaches, never handing the tab back). */
async function closeFeature(entry, reason) {
    features.delete(entry.id);
    clearInterval(entry.heartbeat);
    if (entry.kind === 'voice') await (await engine(entry.root)).request('voice-control', { name: entry.chat, action: 'end' }).catch(() => undefined);
    await entry.relay?.close(reason);
}

/** Opens the viewer of a claimed tab control. */
async function presentTab(client, root, result) {
    for (const entry of [...features.values()]) if (entry.control === result.control.id) await closeFeature(entry, 'This viewer was replaced.');
    const opened = await present('tab', root, async ({ TabSurfaceRelay }, factory, entry) => {
        entry.control = result.control.id;
        return await TabSurfaceRelay.open({
            control: result.control,
            grant: result.grant,
            channel: (method, params, signal) => client.request(method, { ...params }, 60_000, signal),
            surface: factory,
            hint: 'Return control to the agent and Wallet choices are in the bar above. Closing this view keeps the tab with you.',
            onState: () => undefined,
            onView: (view) => post(entry.id, { view }),
        });
    });
    return { ...opened, control: result.control };
}

/** Narrow controller operations used by the desktop host. */
async function handle(method, params) {
    if (method === 'feature-context') {
        const client = await engine(params.root);
        const snapshot = await client.request('snapshot');
        const chats = await client.request('chat-list').catch(() => []);
        return {
            pending: (snapshot.wallet?.pending ?? []).map(({ id, origin, account, problem }) => ({ id, origin, account, problem })),
            controls: snapshot.tabControls ?? [],
            browsers: (snapshot.browsers ?? []).filter((browser) => browser.isEnabled).map((browser) => browser.name),
            chats: (Array.isArray(chats) ? chats : []).map((chat) => ({ name: chat.name, agent: chat.agent })),
        };
    }
    if (method === 'tab-tabs') return await (await engine(params.root)).request('tab-control-tabs', strings(params, ['browser']));
    if (method === 'tab-open') {
        const client = await engine(params.root);
        return await presentTab(client, params.root, await client.request('tab-control-open', strings(params, ['request', 'browser', 'target', 'url']), 60_000));
    }
    if (method === 'tab-reopen') {
        const client = await engine(params.root);
        return await presentTab(client, params.root, await client.request('tab-control-reopen', strings(params, ['id'])));
    }
    if (method === 'tab-action') {
        const client = await engine(params.root);
        if (params.action === 'handback') return await client.request('tab-control-handback', strings(params, ['id']), 60_000);
        if (params.action === 'end') return await client.request('tab-control-end', strings(params, ['id']), 60_000);
        if (params.action === 'offer') return await client.request('tab-control-offer', strings(params, ['id', 'offer', 'answer']), 60_000);
        throw new Error('Unknown tab control action.');
    }
    if (method === 'voice-open') {
        const client = await engine(params.root);
        const { chat, client: controller } = strings(params, ['chat', 'client']);
        if (!chat || !controller) throw new Error('Choose the chat for voice.');
        const started = await client.request('voice-start', { name: chat, client: controller }, 60_000);
        return await present('voice', params.root, async ({ VoiceSurfaceRelay }, factory, entry) => {
            entry.chat = chat;
            // This window controls the call: its heartbeat keeps the lease (a closed or lost window ends the call).
            entry.heartbeat = setInterval(() => void client.request('voice-heartbeat', { name: chat }).catch(() => undefined), 5_000);
            return await VoiceSurfaceRelay.open({
                agent: started.call.agent,
                chat,
                channel: {
                    media: async (input) => await client.request('voice-media', { name: chat, grant: started.grant, ...input }),
                    events: async (after, signal) => await client.request('voice-media-events', { name: chat, grant: started.grant, after, wait: 15_000 }, 30_000, signal),
                },
                surface: factory,
                hint: 'Controls are in the bar above. Closing this view ends the voice call; the chat and its work continue.',
                onState: () => undefined,
            });
        });
    }
    if (method === 'voice-control') {
        const { chat, action } = strings(params, ['chat', 'action']);
        if (!['end', 'mute-mic', 'unmute-mic', 'mute-output', 'unmute-output'].includes(action)) throw new Error('Unknown voice action.');
        return await (await engine(params.root)).request('voice-control', { name: chat, action });
    }
    if (method === 'feature-close') {
        const entry = features.get(params.feature);
        if (entry) await closeFeature(entry, typeof params.reason === 'string' ? params.reason : undefined);
        return {};
    }
    if (method === 'observe') {
        const host = await observeHost();
        return { ...host, rows: host.rows.map(({ client, known, engine, ...row }) => ({ ...row, engine: engine ? { pid: engine.pid, instanceId: engine.instanceId, engineVersion: engine.engineVersion } : undefined })) };
    }
    if (method === 'action') {
        if (!['start', 'start-paused', 'stop', 'force-stop', 'pause', 'resume', 'remove'].includes(params.action)) throw new Error('Unknown project action.');
        return await applyGlobalAction(params.action, await target(params.root));
    }
    if (method === 'dashboard') {
        const row = await target(params.root);
        const lookup = await lookupService(projectAt(row.projectRoot));
        if (lookup.state !== 'running') throw new Error(lookup.state === 'unreachable' ? lookup.reason : 'The project is stopped. Start it explicitly to open its dashboard.');
        if (!lookup.engine.compatible) throw new Error('The running engine has another control contract. Open its CLI dashboard.');
        const snapshot = await lookup.client.request('snapshot');
        if (!snapshot.connection.local.url) throw new Error('This engine has no HTTP dashboard. Open its CLI dashboard.');
        return { url: snapshot.connection.local.url, instanceId: lookup.record.instanceId };
    }
    throw new Error('Unknown desktop controller operation.');
}

process.on('message', (message) => {
    // Input of an embedded feature view (validated by the main process as coming from that view), in order.
    if (message && typeof message.featureIn === 'string') {
        const entry = features.get(message.featureIn);
        const input = message.in || {};
        if (entry?.surface && ['hello', 'message', 'binary', 'closed'].includes(input.kind)) entry.surface.deliver(input.kind === 'binary' ? { kind: 'binary', data: Buffer.from(String(input.data || ''), 'base64') } : input.kind === 'message' ? { kind: 'message', data: String(input.data || '') } : { kind: input.kind });
        return;
    }
    if (!message || typeof message.id !== 'number') return;
    void handle(message.method, message.params || {}).then((result) => process.send?.({ id: message.id, result })).catch((error) => process.send?.({ id: message.id, error: error.message }));
});
process.once('disconnect', () => {
    // The desktop process ended: its voice calls end and its tab viewers detach (tabs stay with the user).
    void Promise.all([...features.values()].map((entry) => closeFeature(entry, 'Promptbook closed.').catch(() => undefined))).finally(() => process.exit(0));
    setTimeout(() => process.exit(0), 3_000).unref();
});
process.send?.({ ready: true });
