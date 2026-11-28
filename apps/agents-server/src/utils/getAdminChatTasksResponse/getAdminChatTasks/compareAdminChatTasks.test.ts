import { describe, expect, it } from '@jest/globals';
import type { AdminChatTaskRecord } from '../../chatTasksAdmin';
import { compareAdminChatTasks } from './compareAdminChatTasks';

/**
 * Builds one ISO timestamp a whole number of hours before a fixed reference time.
 *
 * @private test helper of `compareAdminChatTasks`
 */
function hoursBeforeReferenceIso(hours: number): string {
    const REFERENCE_TIMESTAMP = Date.parse('2026-07-07T12:00:00.000Z');
    return new Date(REFERENCE_TIMESTAMP - hours * 60 * 60 * 1000).toISOString();
}

/**
 * Builds one admin task-manager row with sensible defaults for ordering tests.
 *
 * @private test helper of `compareAdminChatTasks`
 */
function createAdminChatTaskRecord(overrides: Partial<AdminChatTaskRecord> & { id: string }): AdminChatTaskRecord {
    return {
        kind: 'CHAT_COMPLETION',
        status: 'COMPLETED',
        createdAt: hoursBeforeReferenceIso(30),
        queuedAt: hoursBeforeReferenceIso(30),
        startedAt: hoursBeforeReferenceIso(30),
        updatedAt: hoursBeforeReferenceIso(30),
        finishedAt: hoursBeforeReferenceIso(30),
        cancelRequestedAt: null,
        pausedAt: null,
        lastHeartbeatAt: null,
        leaseExpiresAt: null,
        recurrenceIntervalMs: null,
        priority: null,
        attemptCount: 1,
        retryCount: 0,
        lastErrorSummary: null,
        lastErrorDetails: null,
        userId: 0,
        username: null,
        agentPermanentId: overrides.id,
        agentName: null,
        chatId: 'chat',
        workerId: null,
        queueName: 'user-chat-jobs',
        ...overrides,
    };
}

/**
 * Sorts task rows through the shared comparator for the given view.
 *
 * @private test helper of `compareAdminChatTasks`
 */
function sortAdminChatTaskIds(tasks: Array<AdminChatTaskRecord>): Array<string> {
    return [...tasks]
        .sort((leftTask, rightTask) =>
            compareAdminChatTasks(leftTask, rightTask, { sortBy: 'default', sortOrder: 'desc', view: 'all' }),
        )
        .map((task) => task.id);
}

describe('compareAdminChatTasks · All view is ordered by finished time', () => {
    it('interleaves self-update tasks with chat completions by finish time instead of grouping them on top', () => {
        // Mirrors the reported screenshot: two self-updates (finished 2h and 17h ago) mixed with two chat
        // completions (finished 7h and 10h ago). The self-update finished 17h ago must sink below the newer
        // chat completions instead of sticking to the top just because it is an injected self-update row.
        const tasks = [
            createAdminChatTaskRecord({
                id: 'vps-self-update:recent',
                kind: 'VPS_SELF_UPDATE',
                createdAt: hoursBeforeReferenceIso(2),
                startedAt: hoursBeforeReferenceIso(2),
                updatedAt: hoursBeforeReferenceIso(2),
                finishedAt: hoursBeforeReferenceIso(2),
            }),
            createAdminChatTaskRecord({
                id: 'vps-self-update:old',
                kind: 'VPS_SELF_UPDATE',
                createdAt: hoursBeforeReferenceIso(17),
                startedAt: hoursBeforeReferenceIso(17),
                updatedAt: hoursBeforeReferenceIso(17),
                finishedAt: hoursBeforeReferenceIso(17),
            }),
            createAdminChatTaskRecord({
                id: 'chat-7h',
                finishedAt: hoursBeforeReferenceIso(7),
                updatedAt: hoursBeforeReferenceIso(7),
                createdAt: hoursBeforeReferenceIso(7),
            }),
            createAdminChatTaskRecord({
                id: 'chat-10h',
                finishedAt: hoursBeforeReferenceIso(10),
                updatedAt: hoursBeforeReferenceIso(10),
                createdAt: hoursBeforeReferenceIso(10),
            }),
        ];

        expect(sortAdminChatTaskIds(tasks)).toEqual(['vps-self-update:recent', 'chat-7h', 'chat-10h', 'vps-self-update:old']);
    });

    it('orders finished tasks by finish time even when an older task was touched more recently', () => {
        // A task that finished long ago but whose row was updated recently (for example post-completion
        // chat-history recording) must not float above a task that actually finished more recently.
        const recentlyFinished = createAdminChatTaskRecord({
            id: 'recently-finished',
            finishedAt: hoursBeforeReferenceIso(1),
            updatedAt: hoursBeforeReferenceIso(1),
            createdAt: hoursBeforeReferenceIso(1),
        });
        const finishedLongAgoButTouched = createAdminChatTaskRecord({
            id: 'finished-long-ago-touched',
            finishedAt: hoursBeforeReferenceIso(20),
            updatedAt: hoursBeforeReferenceIso(0),
            createdAt: hoursBeforeReferenceIso(20),
        });

        expect(sortAdminChatTaskIds([finishedLongAgoButTouched, recentlyFinished])).toEqual([
            'recently-finished',
            'finished-long-ago-touched',
        ]);
    });

    it('keeps still-active tasks placed by their start/queue time instead of dropping them to the bottom', () => {
        const runningNow = createAdminChatTaskRecord({
            id: 'running-now',
            status: 'RUNNING',
            startedAt: hoursBeforeReferenceIso(0),
            updatedAt: hoursBeforeReferenceIso(0),
            finishedAt: null,
        });
        const finishedFiveHoursAgo = createAdminChatTaskRecord({
            id: 'finished-5h',
            finishedAt: hoursBeforeReferenceIso(5),
            updatedAt: hoursBeforeReferenceIso(5),
            createdAt: hoursBeforeReferenceIso(5),
        });

        expect(sortAdminChatTaskIds([finishedFiveHoursAgo, runningNow])).toEqual(['running-now', 'finished-5h']);
    });
});
