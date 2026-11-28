import type { UserChatTimeoutActivity } from '../userChat/UserChatRecord';

/**
 * Minimal timeout input required to derive sidebar/chat timeout activity metadata.
 */
type TimeoutActivityInput = {
    dueAt: string;
};

/**
 * Returns lightweight timeout activity metadata for one chat from active timeout rows.
 */
export function createUserChatTimeoutActivity(
    timeouts: ReadonlyArray<TimeoutActivityInput>,
): UserChatTimeoutActivity {
    let nearestDueAt: string | null = null;
    let nearestDueAtTimestamp = Number.POSITIVE_INFINITY;

    for (const timeout of timeouts) {
        const dueAtTimestamp = new Date(timeout.dueAt).getTime();

        if (Number.isFinite(dueAtTimestamp) && dueAtTimestamp < nearestDueAtTimestamp) {
            nearestDueAt = timeout.dueAt;
            nearestDueAtTimestamp = dueAtTimestamp;
            continue;
        }

        if (nearestDueAt === null) {
            nearestDueAt = timeout.dueAt;
        }
    }

    return {
        count: timeouts.length,
        nearestDueAt,
    };
}
