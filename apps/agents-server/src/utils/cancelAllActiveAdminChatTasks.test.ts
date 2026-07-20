import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { AdminChatTaskRecord } from '@/src/utils/chatTasksAdmin';
import { cancelAdminChatTaskById, type CancelAdminChatTaskOutcome } from '@/src/utils/cancelAdminChatTaskById';
import type { GetAdminChatTasksData } from '@/src/utils/getAdminChatTasksResponse/getAdminChatTasks';
import { getAdminChatTasks } from '@/src/utils/getAdminChatTasksResponse/getAdminChatTasks';
import type { ParsedAdminChatTaskQuery } from '@/src/utils/getAdminChatTasksResponse/parseAdminChatTaskQuery';
import { cancelAllActiveAdminChatTasks } from './cancelAllActiveAdminChatTasks';

jest.mock('@/src/utils/getAdminChatTasksResponse/getAdminChatTasks', () => ({
    getAdminChatTasks: jest.fn(),
}));

jest.mock('@/src/utils/cancelAdminChatTaskById', () => ({
    cancelAdminChatTaskById: jest.fn(),
}));

/**
 * Builds a minimal admin task record carrying only the id used by the bulk cancel flow.
 *
 * @private test helper
 */
function createActiveTaskRecord(id: string): AdminChatTaskRecord {
    return { id } as AdminChatTaskRecord;
}

/**
 * Builds one page of admin task data with the given ids and reported total.
 *
 * @private test helper
 */
function createAdminChatTasksPage(ids: ReadonlyArray<string>, total: number): GetAdminChatTasksData {
    return {
        items: ids.map(createActiveTaskRecord),
        counters: { runningCount: 0, queuedCount: 0, failedLast24hCount: 0, oldestQueuedAgeMs: null },
        total,
    };
}

describe('cancelAllActiveAdminChatTasks', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    it('cancels every active task across pages and reports matched/cancelled counts', async () => {
        jest.mocked(getAdminChatTasks).mockImplementation(async (query: ParsedAdminChatTaskQuery) => {
            if (query.page === 1) {
                return createAdminChatTasksPage(['task-1', 'task-2'], 3);
            }
            return createAdminChatTasksPage(['task-3'], 3);
        });
        jest.mocked(cancelAdminChatTaskById).mockResolvedValue('CANCELLED');

        const summary = await cancelAllActiveAdminChatTasks({
            actor: 'admin',
            reason: 'server maintenance',
            requestOrigin: 'https://example.test',
        });

        expect(summary).toEqual({ matchedCount: 3, cancelledCount: 3, hasMore: false });
        expect(jest.mocked(cancelAdminChatTaskById)).toHaveBeenCalledTimes(3);
        expect(jest.mocked(cancelAdminChatTaskById)).toHaveBeenCalledWith({
            taskId: 'task-1',
            actor: 'admin',
            reason: 'server maintenance',
            requestOrigin: 'https://example.test',
        });
    });

    it('counts only tasks that were actually cancelled', async () => {
        jest.mocked(getAdminChatTasks).mockResolvedValue(createAdminChatTasksPage(['task-1', 'task-2', 'task-3'], 3));
        const outcomes: Record<string, CancelAdminChatTaskOutcome> = {
            'task-1': 'CANCELLED',
            'task-2': 'ALREADY_FINISHED',
            'task-3': 'NOT_FOUND',
        };
        jest.mocked(cancelAdminChatTaskById).mockImplementation(async ({ taskId }) => outcomes[taskId] ?? 'NOT_FOUND');

        const summary = await cancelAllActiveAdminChatTasks({
            actor: 'admin',
            reason: 'cleanup',
            requestOrigin: 'https://example.test',
        });

        expect(summary).toEqual({ matchedCount: 3, cancelledCount: 1, hasMore: false });
    });

    it('returns zero counts and does not cancel anything when there are no active tasks', async () => {
        jest.mocked(getAdminChatTasks).mockResolvedValue(createAdminChatTasksPage([], 0));

        const summary = await cancelAllActiveAdminChatTasks({
            actor: 'admin',
            reason: 'idle',
            requestOrigin: 'https://example.test',
        });

        expect(summary).toEqual({ matchedCount: 0, cancelledCount: 0, hasMore: false });
        expect(jest.mocked(cancelAdminChatTaskById)).not.toHaveBeenCalled();
    });
});
