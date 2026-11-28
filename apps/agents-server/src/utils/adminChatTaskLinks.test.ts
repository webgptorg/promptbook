import {
    buildAdminChatTaskDetailHref,
    buildVpsServerSetupAdminChatTaskId,
    buildVpsSelfUpdateAdminChatTaskId,
    resolveAdminChatTaskTargetLink,
} from './adminChatTaskLinks';
import type { AdminChatTaskRecord } from './chatTasksAdmin';

describe('adminChatTaskLinks', () => {
    describe('resolveAdminChatTaskTargetLink', () => {
        it('links chat completion tasks to their chat thread', () => {
            const targetLink = resolveAdminChatTaskTargetLink(
                createAdminChatTaskRecord({
                    kind: 'CHAT_COMPLETION',
                    agentPermanentId: 'eS4FFwrWEpsymw',
                    chatId: 'Ygdn4dhdmCTBG8',
                }),
            );

            expect(targetLink).toEqual({
                href: '/agents/eS4FFwrWEpsymw/chat?chat=Ygdn4dhdmCTBG8',
                label: 'Open chat',
                title: 'Open the chat thread this task belongs to',
                isExternal: false,
            });
        });

        it('links chat timeout tasks to their chat thread', () => {
            const targetLink = resolveAdminChatTaskTargetLink(
                createAdminChatTaskRecord({ kind: 'CHAT_TIMEOUT', agentPermanentId: 'agent-1', chatId: 'chat-1' }),
            );

            expect(targetLink?.href).toBe('/agents/agent-1/chat?chat=chat-1');
        });

        it('opens a foreign VPS task on the server that owns its chat', () => {
            const targetLink = resolveAdminChatTaskTargetLink(
                createAdminChatTaskRecord({
                    kind: 'CHAT_COMPLETION',
                    agentPermanentId: 'agent-1',
                    chatId: 'chat-1',
                    serverDomain: 'foreign.example.com',
                }),
            );

            expect(targetLink).toEqual({
                href: 'https://foreign.example.com/agents/agent-1/chat?chat=chat-1',
                label: 'Open chat',
                title: 'Open the chat thread this task belongs to',
                isExternal: true,
            });
        });

        it('links self-update tasks to the update page', () => {
            const targetLink = resolveAdminChatTaskTargetLink(createAdminChatTaskRecord({ kind: 'VPS_SELF_UPDATE' }));

            expect(targetLink).toEqual({
                href: '/superadmin/update',
                label: 'Open update',
                title: 'Open the standalone VPS self-update page',
                isExternal: false,
            });
        });

        it('links server setup tasks to the super admin servers page', () => {
            const targetLink = resolveAdminChatTaskTargetLink(createAdminChatTaskRecord({ kind: 'VPS_SERVER_SETUP' }));

            expect(targetLink).toEqual({
                href: '/superadmin/servers',
                label: 'Open servers',
                title: 'Open the super admin servers page',
                isExternal: false,
            });
        });

        it('links browser preview tasks to the previewed page in a new tab', () => {
            const targetLink = resolveAdminChatTaskTargetLink(
                createAdminChatTaskRecord({ kind: 'BROWSER_PREVIEW', chatId: 'https://example.com/page' }),
            );

            expect(targetLink).toEqual({
                href: 'https://example.com/page',
                label: 'Open page',
                title: 'Open the previewed page in a new tab',
                isExternal: true,
            });
        });

        it('returns null when a chat task has no chat thread to open', () => {
            const targetLink = resolveAdminChatTaskTargetLink(
                createAdminChatTaskRecord({ kind: 'CHAT_COMPLETION', agentPermanentId: 'agent-1', chatId: '' }),
            );

            expect(targetLink).toBeNull();
        });

        it('returns null when a browser preview target is not an absolute http url', () => {
            const targetLink = resolveAdminChatTaskTargetLink(
                createAdminChatTaskRecord({ kind: 'BROWSER_PREVIEW', chatId: 'not-a-url' }),
            );

            expect(targetLink).toBeNull();
        });
    });

    describe('buildAdminChatTaskDetailHref', () => {
        it('builds the task detail page href and encodes the task id', () => {
            expect(buildAdminChatTaskDetailHref('vps-self-update:manual-update-1')).toBe(
                '/admin/task-manager/vps-self-update%3Amanual-update-1',
            );
        });

        it('includes the owning server when linking from the VPS-wide manager', () => {
            expect(buildAdminChatTaskDetailHref('task-1', 'foreign.example.com')).toBe(
                '/admin/task-manager/task-1?serverDomain=foreign.example.com',
            );
        });
    });

    describe('buildVpsSelfUpdateAdminChatTaskId', () => {
        it('builds the synthetic self-update task id from a job identity', () => {
            expect(buildVpsSelfUpdateAdminChatTaskId('manual-update-1')).toBe('vps-self-update:manual-update-1');
        });
    });

    describe('buildVpsServerSetupAdminChatTaskId', () => {
        it('builds the synthetic server-setup task id from a task identity', () => {
            expect(buildVpsServerSetupAdminChatTaskId('server-setup-1')).toBe('vps-server-setup:server-setup-1');
        });
    });
});

/**
 * Builds one admin task-manager record for link resolution tests.
 *
 * @param overrides - Field overrides applied on top of a neutral chat-completion task.
 * @returns Admin task-manager record.
 */
function createAdminChatTaskRecord(overrides: Partial<AdminChatTaskRecord> = {}): AdminChatTaskRecord {
    return {
        id: 'task-1',
        kind: 'CHAT_COMPLETION',
        status: 'QUEUED',
        createdAt: '2026-07-09T10:00:00.000Z',
        queuedAt: '2026-07-09T10:00:00.000Z',
        startedAt: null,
        updatedAt: '2026-07-09T10:00:00.000Z',
        finishedAt: null,
        cancelRequestedAt: null,
        pausedAt: null,
        lastHeartbeatAt: null,
        leaseExpiresAt: null,
        recurrenceIntervalMs: null,
        priority: null,
        attemptCount: 0,
        retryCount: 0,
        lastErrorSummary: null,
        lastErrorDetails: null,
        userId: 1,
        username: 'tester',
        agentPermanentId: 'agent-1',
        agentName: 'Agent One',
        chatId: 'chat-1',
        workerId: null,
        queueName: 'user-chat-jobs',
        ...overrides,
    };
}
