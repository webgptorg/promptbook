import { projectAt } from '../../dist/project/workspace.js';
import { ServiceHost } from '../../dist/service/host.js';

// Stalled shutdown methods deliberately create no native handles that could keep this owner alive.
const calls = [];
const stuck = name => () => {
    calls.push(name);
    return new Promise(() => {});
};
const host = Object.assign(Object.create(ServiceHost.prototype), {
    options: { project: projectAt(process.argv[2]) }, instanceId: 'stopping-instance', agenda: { shutdownReason: 'stop' },
    computer: { close: stuck('computer') }, tabs: { closeAll: stuck('tabs') }, browsers: { close: stuck('browsers') },
    controlServer: { close: stuck('control') }, unregister: () => calls.push('unregister'),
    owned: { stop: () => calls.push('owned') }, releaseLock: () => calls.push('lock'),
});
const shutdown = host.shutdown();
const joined = host.shutdown() === shutdown;
await shutdown;
process.stdout.write(JSON.stringify({ joined, calls }));
