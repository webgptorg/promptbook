'use client';

import { useEffect, useState } from 'react';
import { $fetchChatHistory, type ChatHistoryRow } from '../../utils/chatHistoryAdmin';

/**
 * Number of recent messages shown in the user activity preview.
 */
const USER_ACTIVITY_PAGE_SIZE = 10;

/**
 * State returned by the user activity hook.
 *
 * @private internal user administration state
 */
export type UserActivityState = {
    readonly error: string | null;
    readonly isLoading: boolean;
    readonly items: ChatHistoryRow[];
    readonly total: number;
};

/**
 * Loads recent recorded chat activity for one user.
 *
 * @param userId - Database id of the user to inspect.
 * @returns Recent chat activity and loading state.
 *
 * @private hook of <UserDetailClient/>
 */
export function useUserActivity(userId: number): UserActivityState {
    const [items, setItems] = useState<ChatHistoryRow[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isCancelled = false;

        async function loadUserActivity(): Promise<void> {
            setIsLoading(true);
            setError(null);

            try {
                const response = await $fetchChatHistory({
                    userId,
                    page: 1,
                    pageSize: USER_ACTIVITY_PAGE_SIZE,
                    sortBy: 'createdAt',
                    sortOrder: 'desc',
                });

                if (isCancelled) {
                    return;
                }

                setItems(response.items);
                setTotal(response.total);
            } catch (loadError) {
                if (!isCancelled) {
                    setError(loadError instanceof Error ? loadError.message : 'Failed to load user activity.');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        }

        void loadUserActivity();

        return () => {
            isCancelled = true;
        };
    }, [userId]);

    return { error, isLoading, items, total };
}
