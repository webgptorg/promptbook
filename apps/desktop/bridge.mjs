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

/** Narrow controller operations used by the desktop host. */
async function handle(method, params) {
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
    if (!message || typeof message.id !== 'number') return;
    void handle(message.method, message.params || {}).then((result) => process.send?.({ id: message.id, result })).catch((error) => process.send?.({ id: message.id, error: error.message }));
});
process.once('disconnect', () => process.exit(0));
process.send?.({ ready: true });
