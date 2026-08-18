'use client';

import { $fetchAdminPlannedMessages, type PlannedMessageManagerRecord } from '@/src/utils/plannedMessagesAdmin';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Default auto-refresh cadence of the planned-message manager.
 *
 * @private function of PlannedMessageManagerClient
 */
const DEFAULT_PLANNED_MESSAGE_POLL_INTERVAL_MS = 10_000;

/**
 * Live planned-message listing shared by every part of the manager.
 *
 * @private function of PlannedMessageManagerClient
 */
export type PlannedMessageManagerData = {
    readonly plannedMessages: Array<PlannedMessageManagerRecord>;
    readonly generatedAt: string | null;
    readonly hasMore: boolean;
    readonly isLoading: boolean;
    readonly isRefreshing: boolean;
    readonly error: string | null;
    readonly pollIntervalMs: number;
    readonly refreshNow: () => void;
    readonly updatePollIntervalMs: (value: string) => void;
};

/**
 * Loads every planned message of the server and keeps the listing fresh.
 *
 * @returns Live planned-message listing with its refresh controls.
 *
 * @private function of PlannedMessageManagerClient
 */
export function usePlannedMessageManagerData(): PlannedMessageManagerData {
    const [plannedMessages, setPlannedMessages] = useState<Array<PlannedMessageManagerRecord>>([]);
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pollIntervalMs, setPollIntervalMs] = useState(DEFAULT_PLANNED_MESSAGE_POLL_INTERVAL_MS);
    const [refreshNonce, setRefreshNonce] = useState(0);
    const hasLoadedOnceRef = useRef(false);

    const refreshNow = useCallback((): void => {
        setRefreshNonce((currentNonce) => currentNonce + 1);
    }, []);

    const updatePollIntervalMs = useCallback((value: string): void => {
        const parsedPollIntervalMs = Number.parseInt(value, 10);
        setPollIntervalMs(Number.isFinite(parsedPollIntervalMs) ? parsedPollIntervalMs : 0);
    }, []);

    useEffect(() => {
        let isCancelled = false;

        async function loadPlannedMessages(): Promise<void> {
            if (hasLoadedOnceRef.current) {
                setIsRefreshing(true);
            }

            try {
                const response = await $fetchAdminPlannedMessages();

                if (isCancelled) {
                    return;
                }

                setPlannedMessages(response.items);
                setGeneratedAt(response.generatedAt);
                setHasMore(response.hasMore);
                setError(null);
            } catch (loadError) {
                if (!isCancelled) {
                    setError(loadError instanceof Error ? loadError.message : 'Failed to load planned messages.');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                    setIsRefreshing(false);
                    hasLoadedOnceRef.current = true;
                }
            }
        }

        void loadPlannedMessages();

        return () => {
            isCancelled = true;
        };
    }, [refreshNonce]);

    useEffect(() => {
        if (pollIntervalMs <= 0) {
            return;
        }

        const refreshTimer = window.setInterval(() => refreshNow(), pollIntervalMs);
        return () => window.clearInterval(refreshTimer);
    }, [pollIntervalMs, refreshNow]);

    return {
        plannedMessages,
        generatedAt,
        hasMore,
        isLoading,
        isRefreshing,
        error,
        pollIntervalMs,
        refreshNow,
        updatePollIntervalMs,
    };
}
