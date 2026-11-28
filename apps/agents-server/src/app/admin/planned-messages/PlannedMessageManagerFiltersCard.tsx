'use client';

import { resolvePlannedMessageAgentOptionLabel } from '@/src/utils/plannedMessageManager/collectPlannedMessageAgentOptions';
import { resolvePlannedMessageManagerViewCount } from '@/src/utils/plannedMessageManager/createPlannedMessageManagerCounters';
import type { PlannedMessageManagerView } from '@/src/utils/plannedMessagesAdmin';
import { Card } from '../../../components/Homepage/Card';
import { AdminFilterField, AdminFilterSelectField, type AdminFilterSelectOption } from '../_components/AdminFilterFields';
import { ANY_PLANNED_MESSAGE_FILTER_VALUE, type UsePlannedMessageManagerStateResult } from './usePlannedMessageManagerState';

/**
 * One view offered by the planned-message manager.
 *
 * @private function of PlannedMessageManagerFiltersCard
 */
type PlannedMessageViewOption = {
    readonly id: PlannedMessageManagerView;
    readonly label: string;
    readonly description: string;
};

/**
 * Views offered by the planned-message manager, in the order a plan moves through them.
 *
 * @private function of PlannedMessageManagerFiltersCard
 */
const PLANNED_MESSAGE_VIEW_OPTIONS: ReadonlyArray<PlannedMessageViewOption> = [
    { id: 'active', label: 'Active', description: 'Everything still planned' },
    { id: 'scheduled', label: 'Scheduled', description: 'Wake-up ahead' },
    { id: 'not-started', label: 'Not started', description: 'Starts later' },
    { id: 'ongoing', label: 'Ongoing', description: 'Waking an agent now' },
    { id: 'paused', label: 'Paused', description: 'Held back' },
    { id: 'finished', label: 'Finished', description: 'Cancelled or over' },
    { id: 'all', label: 'All', description: 'Whole history' },
];

/**
 * Frequency filter options.
 *
 * @private function of PlannedMessageManagerFiltersCard
 */
const PLANNED_MESSAGE_RECURRENCE_OPTIONS: ReadonlyArray<AdminFilterSelectOption> = [
    { value: ANY_PLANNED_MESSAGE_FILTER_VALUE, label: 'Any frequency' },
    { value: 'INTERVAL', label: 'Repeats on an interval' },
    { value: 'CRON', label: 'Repeats on a cron' },
    { value: 'ONCE', label: 'Wakes up once' },
];

/**
 * Last-run filter options.
 *
 * @private function of PlannedMessageManagerFiltersCard
 */
const PLANNED_MESSAGE_LAST_RUN_OPTIONS: ReadonlyArray<AdminFilterSelectOption> = [
    { value: ANY_PLANNED_MESSAGE_FILTER_VALUE, label: 'Any last run' },
    { value: 'never', label: 'Never ran' },
    { value: 'hour', label: 'Last hour' },
    { value: 'day', label: 'Last 24 hours' },
    { value: 'week', label: 'Last 7 days' },
    { value: 'older', label: 'Older than 7 days' },
];

/**
 * Page-size options.
 *
 * @private function of PlannedMessageManagerFiltersCard
 */
const PLANNED_MESSAGE_PAGE_SIZE_OPTIONS: ReadonlyArray<AdminFilterSelectOption> = [
    { value: '25', label: '25' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
];

/**
 * Auto-refresh presets.
 *
 * @private function of PlannedMessageManagerFiltersCard
 */
const PLANNED_MESSAGE_POLL_INTERVAL_OPTIONS: ReadonlyArray<AdminFilterSelectOption> = [
    { value: '5000', label: '5s' },
    { value: '10000', label: '10s' },
    { value: '30000', label: '30s' },
    { value: '0', label: 'Off' },
];

/**
 * Props for the planned-message filter card.
 *
 * @private function of PlannedMessageManagerClient
 */
type PlannedMessageManagerFiltersCardProps = {
    readonly state: UsePlannedMessageManagerStateResult;
    readonly lastRefreshedLabel: string;
};

/**
 * Renders the planned-message views and the parameters the listing is narrowed by.
 *
 * @private function of PlannedMessageManagerClient
 */
export function PlannedMessageManagerFiltersCard({ state, lastRefreshedLabel }: PlannedMessageManagerFiltersCardProps) {
    const agentSelectOptions: ReadonlyArray<AdminFilterSelectOption> = [
        { value: ANY_PLANNED_MESSAGE_FILTER_VALUE, label: 'Every agent' },
        ...state.agentOptions.map((agentOption) => ({
            value: agentOption.agentPermanentId,
            label: `${resolvePlannedMessageAgentOptionLabel(agentOption)} (${agentOption.plannedMessageCount})`,
        })),
    ];

    return (
        <Card className="hover:border-gray-200 hover:shadow-md">
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                    {PLANNED_MESSAGE_VIEW_OPTIONS.map((viewOption) => (
                        <button
                            key={viewOption.id}
                            type="button"
                            onClick={() => state.selectView(viewOption.id)}
                            className={`rounded-xl border px-4 py-2 text-left transition ${
                                viewOption.id === state.filters.view
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            <div className="text-sm font-semibold">
                                {viewOption.label} ({resolvePlannedMessageManagerViewCount(state.counters, viewOption.id)})
                            </div>
                            <div className="text-[11px] text-current/70">{viewOption.description}</div>
                        </button>
                    ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_repeat(5,minmax(0,1fr))]">
                    <AdminFilterField label="Search" htmlFor="planned-message-search">
                        <input
                            id="planned-message-search"
                            type="text"
                            value={state.searchInput}
                            onChange={(event) => state.updateSearchInput(event.target.value)}
                            placeholder="Message / timeout id / agent / chat id / user"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </AdminFilterField>

                    <AdminFilterSelectField
                        id="planned-message-agent"
                        label="Agent"
                        value={state.filters.agentPermanentId}
                        onChange={state.updateAgentPermanentId}
                        options={agentSelectOptions}
                    />

                    <AdminFilterSelectField
                        id="planned-message-recurrence"
                        label="Frequency"
                        value={state.filters.recurrence}
                        onChange={state.updateRecurrence}
                        options={PLANNED_MESSAGE_RECURRENCE_OPTIONS}
                    />

                    <AdminFilterSelectField
                        id="planned-message-last-run"
                        label="Last run"
                        value={state.filters.lastRun}
                        onChange={state.updateLastRun}
                        options={PLANNED_MESSAGE_LAST_RUN_OPTIONS}
                    />

                    <AdminFilterSelectField
                        id="planned-message-page-size"
                        label="Page size"
                        value={String(state.pageSize)}
                        onChange={state.updatePageSize}
                        options={PLANNED_MESSAGE_PAGE_SIZE_OPTIONS}
                    />

                    <AdminFilterSelectField
                        id="planned-message-poll-interval"
                        label="Auto-refresh"
                        value={String(state.data.pollIntervalMs)}
                        onChange={state.data.updatePollIntervalMs}
                        options={PLANNED_MESSAGE_POLL_INTERVAL_OPTIONS}
                    />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                    <span>{lastRefreshedLabel}</span>
                    <span>
                        A planned message is listed until it is cancelled or its plan is over, so a finished plan stays
                        readable here.
                    </span>
                </div>
            </div>
        </Card>
    );
}
