'use client';

import {
    collectPlannedMessageAgentOptions,
    type PlannedMessageAgentOption,
} from '@/src/utils/plannedMessageManager/collectPlannedMessageAgentOptions';
import {
    createPlannedMessageManagerCounters,
    type PlannedMessageManagerCounters,
} from '@/src/utils/plannedMessageManager/createPlannedMessageManagerCounters';
import {
    filterPlannedMessages,
    type PlannedMessageManagerFilters,
} from '@/src/utils/plannedMessageManager/filterPlannedMessages';
import {
    $cancelAdminPlannedMessage,
    $updateAdminPlannedMessage,
    type PlannedMessageManagerLastRunFilter,
    type PlannedMessageManagerRecord,
    type PlannedMessageManagerRecurrenceFilter,
    type PlannedMessageManagerSortField,
    type PlannedMessageManagerView,
} from '@/src/utils/plannedMessagesAdmin';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useAdminTableSorting } from '../_components/adminTableSorting';
import { createPlannedMessageUpdatePayload, type PlannedMessageEditForm } from './plannedMessageEditForm';
import { confirmCancelPlannedMessage, showPlannedMessageActionFailure } from './plannedMessageManagerDialogs';
import {
    resolvePlannedMessageManagerDefaultSortOrder,
    resolvePlannedMessageSortValue,
} from './resolvePlannedMessageSortValue';
import { usePlannedMessageManagerData, type PlannedMessageManagerData } from './usePlannedMessageManagerData';

/**
 * Filter value meaning "every agent".
 *
 * @private function of PlannedMessageManagerClient
 */
export const ANY_PLANNED_MESSAGE_FILTER_VALUE = 'all';

/**
 * Row action an administrator can start on one planned message.
 *
 * @private function of PlannedMessageManagerClient
 */
export type PlannedMessageActionKind = 'cancel' | 'pause' | 'edit';

/**
 * State driving the whole planned-message manager.
 *
 * @private function of PlannedMessageManagerClient
 */
export type UsePlannedMessageManagerStateResult = {
    readonly data: PlannedMessageManagerData;
    readonly counters: PlannedMessageManagerCounters;
    readonly agentOptions: Array<PlannedMessageAgentOption>;
    readonly filters: PlannedMessageManagerFilters;
    readonly searchInput: string;
    readonly visiblePlannedMessages: Array<PlannedMessageManagerRecord>;
    readonly matchedCount: number;

    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
    readonly isPreviousPageDisabled: boolean;
    readonly isNextPageDisabled: boolean;
    readonly goToPreviousPage: () => void;
    readonly goToNextPage: () => void;
    readonly updatePageSize: (value: string) => void;

    readonly sortBy: PlannedMessageManagerSortField;
    readonly sortOrder: 'asc' | 'desc';
    readonly handleSortChange: (sortBy: PlannedMessageManagerSortField) => void;

    readonly selectView: (view: PlannedMessageManagerView) => void;
    readonly updateAgentPermanentId: (agentPermanentId: string) => void;
    readonly updateRecurrence: (recurrence: string) => void;
    readonly updateLastRun: (lastRun: string) => void;
    readonly updateSearchInput: (search: string) => void;

    readonly busyTimeoutId: string | null;
    readonly busyAction: PlannedMessageActionKind | null;
    readonly cancelPlannedMessage: (plannedMessage: PlannedMessageManagerRecord) => Promise<void>;
    readonly togglePlannedMessagePaused: (plannedMessage: PlannedMessageManagerRecord) => Promise<void>;

    readonly editedPlannedMessage: PlannedMessageManagerRecord | null;
    readonly openPlannedMessageEditor: (plannedMessage: PlannedMessageManagerRecord) => void;
    readonly closePlannedMessageEditor: () => void;
    readonly submitPlannedMessageEdit: (form: PlannedMessageEditForm) => Promise<boolean>;
};

/**
 * Manages the filters, the ordering, the paging, and the actions of the planned-message manager.
 *
 * @returns Everything the planned-message manager renders and does.
 *
 * @private function of PlannedMessageManagerClient
 */
export function usePlannedMessageManagerState(): UsePlannedMessageManagerStateResult {
    const data = usePlannedMessageManagerData();
    const [view, setView] = useState<PlannedMessageManagerView>('active');
    const [agentPermanentId, setAgentPermanentId] = useState<string>(ANY_PLANNED_MESSAGE_FILTER_VALUE);
    const [recurrence, setRecurrence] = useState<PlannedMessageManagerRecurrenceFilter>(
        ANY_PLANNED_MESSAGE_FILTER_VALUE,
    );
    const [lastRun, setLastRun] = useState<PlannedMessageManagerLastRunFilter>(ANY_PLANNED_MESSAGE_FILTER_VALUE);
    const [searchInput, setSearchInput] = useState('');
    const search = useDeferredValue(searchInput);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [busyTimeoutId, setBusyTimeoutId] = useState<string | null>(null);
    const [busyAction, setBusyAction] = useState<PlannedMessageActionKind | null>(null);
    const [editedPlannedMessage, setEditedPlannedMessage] = useState<PlannedMessageManagerRecord | null>(null);

    const { plannedMessages, generatedAt, refreshNow } = data;

    const filters = useMemo<PlannedMessageManagerFilters>(
        () => ({ view, agentPermanentId, recurrence, lastRun, search: search.trim() }),
        [agentPermanentId, lastRun, recurrence, search, view],
    );

    // Note: The stages were resolved when the listing was read, so the same moment decides the windows
    const filteredAtDate = useMemo(() => (generatedAt ? new Date(generatedAt) : new Date()), [generatedAt]);

    const counters = useMemo(() => createPlannedMessageManagerCounters(plannedMessages), [plannedMessages]);
    const agentOptions = useMemo(() => collectPlannedMessageAgentOptions(plannedMessages), [plannedMessages]);
    const filteredPlannedMessages = useMemo(
        () => filterPlannedMessages(plannedMessages, filters, filteredAtDate),
        [filteredAtDate, filters, plannedMessages],
    );

    const { handleSortChange, sortBy, sortedRows, sortOrder } = useAdminTableSorting<
        PlannedMessageManagerRecord,
        PlannedMessageManagerSortField
    >({
        defaultSortBy: 'nextRun',
        resolveDefaultSortOrder: resolvePlannedMessageManagerDefaultSortOrder,
        resolveSortValue: resolvePlannedMessageSortValue,
        rows: filteredPlannedMessages,
    });

    const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));

    useEffect(() => {
        setPage(1);
    }, [filters, pageSize]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const visiblePlannedMessages = useMemo(
        () => sortedRows.slice((page - 1) * pageSize, page * pageSize),
        [page, pageSize, sortedRows],
    );

    const runPlannedMessageAction = useCallback(
        async (options: {
            plannedMessage: PlannedMessageManagerRecord;
            action: PlannedMessageActionKind;
            failureTitle: string;
            execute: () => Promise<void>;
        }): Promise<boolean> => {
            try {
                setBusyTimeoutId(options.plannedMessage.timeoutId);
                setBusyAction(options.action);
                await options.execute();
                refreshNow();
                return true;
            } catch (actionError) {
                await showPlannedMessageActionFailure(options.failureTitle, actionError);
                return false;
            } finally {
                setBusyTimeoutId(null);
                setBusyAction(null);
            }
        },
        [refreshNow],
    );

    const cancelPlannedMessage = useCallback(
        async (plannedMessage: PlannedMessageManagerRecord): Promise<void> => {
            if (!(await confirmCancelPlannedMessage(plannedMessage))) {
                return;
            }

            await runPlannedMessageAction({
                plannedMessage,
                action: 'cancel',
                failureTitle: 'Cancellation failed',
                execute: () => $cancelAdminPlannedMessage(plannedMessage.timeoutId),
            });
        },
        [runPlannedMessageAction],
    );

    const togglePlannedMessagePaused = useCallback(
        async (plannedMessage: PlannedMessageManagerRecord): Promise<void> => {
            await runPlannedMessageAction({
                plannedMessage,
                action: 'pause',
                failureTitle: plannedMessage.pausedAt ? 'Resuming failed' : 'Pausing failed',
                execute: async () => {
                    await $updateAdminPlannedMessage(plannedMessage.timeoutId, {
                        isPaused: plannedMessage.pausedAt === null,
                    });
                },
            });
        },
        [runPlannedMessageAction],
    );

    const submitPlannedMessageEdit = useCallback(
        async (form: PlannedMessageEditForm): Promise<boolean> => {
            if (editedPlannedMessage === null) {
                return false;
            }

            const isApplied = await runPlannedMessageAction({
                plannedMessage: editedPlannedMessage,
                action: 'edit',
                failureTitle: 'Change failed',
                execute: async () => {
                    await $updateAdminPlannedMessage(
                        editedPlannedMessage.timeoutId,
                        createPlannedMessageUpdatePayload(form),
                    );
                },
            });

            if (isApplied) {
                setEditedPlannedMessage(null);
            }

            return isApplied;
        },
        [editedPlannedMessage, runPlannedMessageAction],
    );

    return {
        data,
        counters,
        agentOptions,
        filters,
        searchInput,
        visiblePlannedMessages,
        matchedCount: sortedRows.length,

        page,
        pageSize,
        totalPages,
        isPreviousPageDisabled: page <= 1,
        isNextPageDisabled: page >= totalPages,
        goToPreviousPage: useCallback(() => setPage((currentPage) => Math.max(1, currentPage - 1)), []),
        goToNextPage: useCallback(
            () => setPage((currentPage) => Math.min(totalPages, currentPage + 1)),
            [totalPages],
        ),
        updatePageSize: useCallback((value: string) => setPageSize(Number.parseInt(value, 10) || 25), []),

        sortBy,
        sortOrder,
        handleSortChange,

        selectView: useCallback((nextView: PlannedMessageManagerView) => setView(nextView), []),
        updateAgentPermanentId: useCallback((value: string) => setAgentPermanentId(value), []),
        updateRecurrence: useCallback(
            (value: string) => setRecurrence(value as PlannedMessageManagerRecurrenceFilter),
            [],
        ),
        updateLastRun: useCallback((value: string) => setLastRun(value as PlannedMessageManagerLastRunFilter), []),
        updateSearchInput: useCallback((value: string) => setSearchInput(value), []),

        busyTimeoutId,
        busyAction,
        cancelPlannedMessage,
        togglePlannedMessagePaused,

        editedPlannedMessage,
        openPlannedMessageEditor: useCallback(
            (plannedMessage: PlannedMessageManagerRecord) => setEditedPlannedMessage(plannedMessage),
            [],
        ),
        closePlannedMessageEditor: useCallback(() => setEditedPlannedMessage(null), []),
        submitPlannedMessageEdit,
    };
}
