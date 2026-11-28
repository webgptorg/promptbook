'use client';

import { Card } from '../../../components/Homepage/Card';
import { useServerLanguage } from '../../../components/ServerLanguage/ServerLanguageProvider';
import { AdminTaskManagerTabs, PLANNED_MESSAGE_MANAGER_PATH } from '../_components/AdminTaskManagerTabs';
import { PlannedMessageManagerEditDialog } from './PlannedMessageManagerEditDialog';
import { PlannedMessageManagerFiltersCard } from './PlannedMessageManagerFiltersCard';
import { formatPlannedMessageDateTime } from './plannedMessageManagerPresentation';
import { PlannedMessageManagerSummaryMetrics } from './PlannedMessageManagerSummaryMetrics';
import { PlannedMessageManagerTableCard } from './PlannedMessageManagerTableCard';
import { usePlannedMessageManagerState } from './usePlannedMessageManagerState';

/**
 * Props for the admin planned-message manager client.
 *
 * @private route component of AdminPlannedMessagesPage
 */
type PlannedMessageManagerClientProps = {
    /**
     * Whether the current user may also reach the VPS-wide task manager.
     */
    readonly isSuperAdmin: boolean;
};

/**
 * Admin manager of every planned message (durable chat timeout) on this server.
 *
 * @private route component of AdminPlannedMessagesPage
 */
export function PlannedMessageManagerClient({ isSuperAdmin }: PlannedMessageManagerClientProps) {
    const { language } = useServerLanguage();
    const state = usePlannedMessageManagerState();
    const lastRefreshedLabel = state.data.generatedAt
        ? `Last refreshed ${formatPlannedMessageDateTime(state.data.generatedAt, language)}`
        : 'Waiting for first refresh…';

    return (
        <div className="container mx-auto space-y-6 px-4 py-8">
            <div className="mt-20">
                <AdminTaskManagerTabs activeTabId="planned-messages" isSuperAdmin={isSuperAdmin} />
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-light text-gray-900">Planned messages</h1>
                    <p className="mt-1 max-w-3xl text-sm text-gray-500">
                        Admin-only view of every timeout an agent planned for itself or for one of its chats — the
                        wake-ups still ahead, the ones starting later, the ones firing right now, and the ones that were
                        cancelled or whose plan is over. Each of them can be re-planned, held back, or cancelled here.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5">
                        Route: <span className="font-mono text-gray-700">{PLANNED_MESSAGE_MANAGER_PATH}</span>
                    </span>
                    <button
                        type="button"
                        onClick={state.data.refreshNow}
                        disabled={state.data.isRefreshing}
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {state.data.isRefreshing ? 'Refreshing…' : 'Refresh now'}
                    </button>
                </div>
            </div>

            <PlannedMessageManagerSummaryMetrics
                counters={state.counters}
                isLoading={state.data.isLoading}
                language={language}
            />

            <PlannedMessageManagerFiltersCard state={state} lastRefreshedLabel={lastRefreshedLabel} />

            {state.data.error !== null && (
                <Card className="border-red-200 bg-red-50 hover:border-red-200 hover:shadow-md">
                    <p className="text-sm text-red-700">{state.data.error}</p>
                </Card>
            )}

            {state.data.hasMore && (
                <Card className="border-amber-200 bg-amber-50 hover:border-amber-200 hover:shadow-md">
                    <p className="text-sm text-amber-800">
                        This server has more planned messages than one listing shows. The most recently changed ones are
                        listed — narrow the filters to find an older one.
                    </p>
                </Card>
            )}

            <PlannedMessageManagerTableCard language={language} state={state} />

            {state.editedPlannedMessage !== null && (
                <PlannedMessageManagerEditDialog
                    key={state.editedPlannedMessage.timeoutId}
                    plannedMessage={state.editedPlannedMessage}
                    isSaving={state.busyAction === 'edit'}
                    onClose={state.closePlannedMessageEditor}
                    onSubmit={state.submitPlannedMessageEdit}
                />
            )}
        </div>
    );
}
