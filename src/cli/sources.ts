import type { ServiceSnapshot } from '../engine/snapshot.js';
import type { ControlClient } from '../service/control.js';
import type { ServiceHost } from '../service/host.js';
import { controlChatSource } from '../ui/chat-client.js';
import type { DashboardSource } from '../ui/dashboard.js';

/**
 * Dashboard source attached to a running service through its control channel (does not own it).
 *
 * @private dashboard sources
 */
export function controlSource(client: ControlClient): DashboardSource {
    return {
        snapshot: () => client.request<ServiceSnapshot>('snapshot'),
        watch: (since) => client.request<ServiceSnapshot>('watch', { since, timeoutMs: 20_000 }, 35_000),
        action: (name) => client.request<{ outcome: string }>(name),
        chats: controlChatSource((method, params) => client.request(method, params ?? {}), 'terminal'),
        pairing: (renew) => client.request('pairing', { renew }),
        owning: false,
    };
}

/**
 * Dashboard source of an in-process service owned by this invocation (foreground start, run).
 *
 * @private dashboard sources
 */
export function hostSource(host: ServiceHost): DashboardSource {
    return {
        snapshot: async () => host.agenda.snapshot(),
        watch: (since) => host.control<ServiceSnapshot>('watch', { since, timeoutMs: 20_000 }),
        action: (name) => host.control<{ outcome: string }>(name),
        chats: controlChatSource((method, params) => host.control(method, params ?? {}), 'terminal'),
        pairing: (renew) => host.control('pairing', { renew }),
        owning: true,
    };
}
