'use client';

import type { ServerLanguageCode } from '@/src/languages/ServerLanguageRegistry';
import type { PlannedMessageManagerSortField } from '@/src/utils/plannedMessagesAdmin';
import { Card } from '../../../components/Homepage/Card';
import { AdminSortableTableHeaderCell } from '../_components/AdminSortableTableHeaderCell';
import { PlannedMessageManagerRow } from './PlannedMessageManagerRow';
import type { UsePlannedMessageManagerStateResult } from './usePlannedMessageManagerState';

/**
 * Sortable columns of the planned-message table, with the label used in their sort tooltip.
 *
 * @private function of PlannedMessageManagerTableCard
 */
const PLANNED_MESSAGE_SORT_COLUMNS: ReadonlyArray<{
    readonly sortBy: PlannedMessageManagerSortField;
    readonly heading: string;
    readonly label: string;
}> = [
    { sortBy: 'plannedMessage', heading: 'Planned message', label: 'planned message' },
    { sortBy: 'agent', heading: 'Agent', label: 'agent' },
    { sortBy: 'frequency', heading: 'Frequency', label: 'frequency' },
    { sortBy: 'nextRun', heading: 'Next run', label: 'next run' },
    { sortBy: 'lastRun', heading: 'Last run', label: 'last run' },
    { sortBy: 'runs', heading: 'Runs', label: 'runs' },
    { sortBy: 'state', heading: 'State', label: 'state' },
];

/**
 * Props for the planned-message table card.
 *
 * @private function of PlannedMessageManagerClient
 */
type PlannedMessageManagerTableCardProps = {
    readonly language: ServerLanguageCode;
    readonly state: UsePlannedMessageManagerStateResult;
};

/**
 * Renders the planned-message table with its loading, empty, and paging states.
 *
 * @private function of PlannedMessageManagerClient
 */
export function PlannedMessageManagerTableCard({ language, state }: PlannedMessageManagerTableCardProps) {
    const firstVisibleIndex = Math.min((state.page - 1) * state.pageSize + 1, state.matchedCount);
    const lastVisibleIndex = Math.min(state.page * state.pageSize, state.matchedCount);

    return (
        <Card className="hover:border-gray-200 hover:shadow-md">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">
                        Planned messages ({state.matchedCount.toLocaleString()})
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Every wake-up an agent planned for itself or for one of its chats.
                    </p>
                </div>
                {state.data.isRefreshing ? (
                    <span className="text-xs font-medium text-blue-600">Refreshing…</span>
                ) : null}
            </div>

            {state.data.isLoading ? (
                <div className="py-10 text-center text-sm text-gray-500">Loading planned messages…</div>
            ) : state.visiblePlannedMessages.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500">
                    No planned message matches the selected filters.
                </div>
            ) : (
                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                {PLANNED_MESSAGE_SORT_COLUMNS.map((column) => (
                                    <AdminSortableTableHeaderCell
                                        key={column.sortBy}
                                        className="px-4 py-3 text-left font-semibold"
                                        label={column.label}
                                        sortBy={column.sortBy}
                                        activeSortBy={state.sortBy}
                                        sortOrder={state.sortOrder}
                                        onSortChange={state.handleSortChange}
                                    >
                                        {column.heading}
                                    </AdminSortableTableHeaderCell>
                                ))}
                                <th className="px-4 py-3 text-right font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {state.visiblePlannedMessages.map((plannedMessage) => (
                                <PlannedMessageManagerRow
                                    key={plannedMessage.timeoutId}
                                    plannedMessage={plannedMessage}
                                    language={language}
                                    busyTimeoutId={state.busyTimeoutId}
                                    busyAction={state.busyAction}
                                    onEdit={state.openPlannedMessageEditor}
                                    onTogglePaused={state.togglePlannedMessagePaused}
                                    onCancel={state.cancelPlannedMessage}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 text-xs text-gray-600 md:flex-row">
                <div>
                    {state.matchedCount > 0 ? (
                        <>
                            Showing <span className="font-semibold">{firstVisibleIndex}</span> –{' '}
                            <span className="font-semibold">{lastVisibleIndex}</span> of{' '}
                            <span className="font-semibold">{state.matchedCount}</span> planned messages
                        </>
                    ) : (
                        'No planned messages'
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={state.goToPreviousPage}
                        disabled={state.isPreviousPageDisabled}
                        className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span>
                        Page <span className="font-semibold">{state.page}</span> of{' '}
                        <span className="font-semibold">{state.totalPages}</span>
                    </span>
                    <button
                        type="button"
                        onClick={state.goToNextPage}
                        disabled={state.isNextPageDisabled}
                        className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        </Card>
    );
}
