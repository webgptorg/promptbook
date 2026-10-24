import type { BookSaveOutcome } from '../engine/agenda.js';
import type { BookSource } from '../project/book-sources.js';
import type { TaskInventoryItem } from '../tasks/views.js';
import type { ServiceSnapshot } from '../engine/snapshot.js';
import type { ControlClient } from '../service/control.js';
import type { ServiceHost } from '../service/host.js';
import { controlChatSource } from '../ui/chat-client.js';
import type { DashboardSource } from '../ui/dashboard.js';
import type { ToolOperationOutcome } from '../tools/operations.js';

/**
 * Dashboard source attached to a running service through its control channel (does not own it).
 *
 * @private dashboard sources
 */
export function controlSource(client: ControlClient): DashboardSource {
    return {
        snapshot: () => client.request<ServiceSnapshot>('snapshot'),
        watch: (since, signal) => client.request<ServiceSnapshot>('watch', { since, timeoutMs: 20_000 }, 35_000, signal),
        action: (name, params) => client.request<{ outcome: string; applied?: boolean }>(name, { ...(params ?? {}) }),
        chats: controlChatSource((method, params) => client.request(method, params ?? {}), 'terminal'),
        pairing: (renew) => client.request('pairing', { renew }),
        tool: (request) => client.request<ToolOperationOutcome>('tool-operation', request as unknown as Record<string, unknown>, 120_000),
        inventory: () => client.request<TaskInventoryItem[]>('task-inventory'),
        books: {
            read: (input) => client.request<BookSource>('book-source', { ...input }),
            save: (input) => client.request<BookSaveOutcome>('book-save', { ...input }, 120_000),
        },
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
        action: (name, params) => host.control<{ outcome: string; applied?: boolean }>(name, params ?? {}),
        chats: controlChatSource((method, params) => host.control(method, params ?? {}), 'terminal'),
        pairing: (renew) => host.control('pairing', { renew }),
        tool: (request) => host.control<ToolOperationOutcome>('tool-operation', request as unknown as Record<string, unknown>),
        inventory: () => host.control<TaskInventoryItem[]>('task-inventory'),
        books: {
            read: (input) => host.control<BookSource>('book-source', { ...input }),
            save: (input) => host.control<BookSaveOutcome>('book-save', { ...input }),
        },
        owning: true,
    };
}
