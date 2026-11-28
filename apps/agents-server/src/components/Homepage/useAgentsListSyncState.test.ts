import { describe, expect, it } from '@jest/globals';
import { shouldSkipSynchronizedOrganizationSnapshot } from './useAgentsListSyncState';

describe('shouldSkipSynchronizedOrganizationSnapshot', () => {
    it('skips synchronized snapshots while optimistic organization mutations are still pending', () => {
        expect(
            shouldSkipSynchronizedOrganizationSnapshot({
                pendingOrganizationMutationCount: 2,
                latestQueuedOrganizationMutationId: 4,
                queuedOrganizationMutationIdAtSyncStart: 4,
            }),
        ).toBe(true);
    });

    it('skips synchronized snapshots that started before a newer organization mutation was queued', () => {
        expect(
            shouldSkipSynchronizedOrganizationSnapshot({
                pendingOrganizationMutationCount: 0,
                latestQueuedOrganizationMutationId: 5,
                queuedOrganizationMutationIdAtSyncStart: 4,
            }),
        ).toBe(true);
    });

    it('applies synchronized snapshots when no newer optimistic organization mutation exists', () => {
        expect(
            shouldSkipSynchronizedOrganizationSnapshot({
                pendingOrganizationMutationCount: 0,
                latestQueuedOrganizationMutationId: 7,
                queuedOrganizationMutationIdAtSyncStart: 7,
            }),
        ).toBe(false);
    });
});
