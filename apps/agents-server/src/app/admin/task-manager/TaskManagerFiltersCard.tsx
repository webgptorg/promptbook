import type { AdminChatTaskView } from '@/src/utils/chatTasksAdmin';
import type { ReactNode } from 'react';
import { Card } from '../../../components/Homepage/Card';
import type { useTaskManagerState } from './useTaskManagerState';

/**
 * Metadata for one dashboard tab.
 *
 * @private function of TaskManagerClient
 */
type TaskViewOption = {
    description: string;
    id: AdminChatTaskView;
    label: string;
};

/**
 * Props for the task-manager filter card.
 *
 * @private function of TaskManagerClient
 */
type TaskManagerFiltersCardProps = {
    state: ReturnType<typeof useTaskManagerState>;
};

/**
 * Props for the shared field wrapper.
 *
 * @private function of TaskManagerFiltersCard
 */
type FieldProps = {
    children: ReactNode;
    htmlFor: string;
    label: string;
};

/**
 * Props for the shared select field.
 *
 * @private function of TaskManagerFiltersCard
 */
type SelectFieldProps = {
    disabled?: boolean;
    id: string;
    label: string;
    onChange: (value: string) => void;
    options: Array<{ label: string; value: string }>;
    value: string;
};

/**
 * Available dashboard tabs.
 *
 * @private function of TaskManagerClient
 */
const TASK_VIEW_OPTIONS: ReadonlyArray<TaskViewOption> = [
    { id: 'active', label: 'Active', description: 'Queued + running' },
    { id: 'running', label: 'Running', description: 'Live workers' },
    { id: 'queued', label: 'Queued', description: 'Backlog only' },
    { id: 'failed', label: 'Failed', description: 'Last 24h' },
    { id: 'all', label: 'All', description: 'Time window' },
];

/**
 * Select options for task page size.
 *
 * @private function of TaskManagerFiltersCard
 */
const TASK_PAGE_SIZE_OPTIONS = [
    { value: '25', label: '25' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
];

/**
 * Auto-refresh presets.
 *
 * @private function of TaskManagerFiltersCard
 */
const TASK_POLL_INTERVAL_OPTIONS = [
    { value: '3000', label: '3s' },
    { value: '5000', label: '5s' },
    { value: '10000', label: '10s' },
    { value: '30000', label: '30s' },
    { value: '0', label: 'Off' },
];

/**
 * Stuck-task threshold presets.
 *
 * @private function of TaskManagerFiltersCard
 */
const TASK_STUCK_THRESHOLD_OPTIONS = [
    { value: '5', label: '5 min' },
    { value: '10', label: '10 min' },
    { value: '15', label: '15 min' },
];

/**
 * Time-window presets for the `All` view.
 *
 * @private function of TaskManagerFiltersCard
 */
const TASK_TIME_WINDOW_OPTIONS = [
    { value: '1', label: '1 hour' },
    { value: '6', label: '6 hours' },
    { value: '24', label: '24 hours' },
    { value: '168', label: '7 days' },
];

/**
 * Shared field wrapper for compact filter controls.
 *
 * @private function of TaskManagerFiltersCard
 */
function Field({ children, htmlFor, label }: FieldProps) {
    return (
        <div className="flex flex-col gap-1">
            <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
                {label}
            </label>
            {children}
        </div>
    );
}

/**
 * Shared select field used in the filter panel.
 *
 * @private function of TaskManagerFiltersCard
 */
function SelectField({ disabled, id, label, onChange, options, value }: SelectFieldProps) {
    return (
        <Field label={label} htmlFor={id}>
            <select
                id={id}
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </Field>
    );
}

/**
 * Resolves the current explanatory text for the selected task view.
 *
 * @private function of TaskManagerFiltersCard
 */
function resolveViewDescription(view: AdminChatTaskView, timeWindowHours: number): string {
    if (view === 'failed') {
        return 'Failed view always shows the last 24 hours.';
    }

    if (view === 'all') {
        return `All view shows activity updated in the last ${timeWindowHours} hours.`;
    }

    return 'Default active view shows only non-finished tasks.';
}

/**
 * Renders the task-manager filters, tabs, and refresh metadata.
 *
 * @private function of TaskManagerClient
 */
export function TaskManagerFiltersCard({ state }: TaskManagerFiltersCardProps) {
    const isAllView = state.view === 'all';

    return (
        <Card className="hover:border-gray-200 hover:shadow-md">
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                    {TASK_VIEW_OPTIONS.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => state.selectView(option.id)}
                            className={`rounded-xl border px-4 py-2 text-left transition ${
                                option.id === state.view
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            <div className="text-sm font-semibold">{option.label}</div>
                            <div className="text-[11px] text-current/70">{option.description}</div>
                        </button>
                    ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
                    <Field label="Search" htmlFor="task-search">
                        <input
                            id="task-search"
                            type="text"
                            value={state.searchInput}
                            onChange={(event) => state.updateSearchInput(event.target.value)}
                            placeholder="Task id / chat id / user id / agent id"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </Field>

                    <SelectField
                        id="task-page-size"
                        label="Page size"
                        value={String(state.pageSize)}
                        onChange={state.updatePageSize}
                        options={TASK_PAGE_SIZE_OPTIONS}
                    />

                    <SelectField
                        id="task-poll-interval"
                        label="Auto-refresh"
                        value={String(state.pollIntervalMs)}
                        onChange={state.updatePollIntervalMs}
                        options={TASK_POLL_INTERVAL_OPTIONS}
                    />

                    <SelectField
                        id="task-stuck-threshold"
                        label="Stuck after"
                        value={String(state.stuckThresholdMinutes)}
                        onChange={state.updateStuckThresholdMinutes}
                        options={TASK_STUCK_THRESHOLD_OPTIONS}
                    />

                    <SelectField
                        id="task-time-window"
                        label="All window"
                        value={String(state.timeWindowHours)}
                        disabled={!isAllView}
                        onChange={state.updateTimeWindowHours}
                        options={TASK_TIME_WINDOW_OPTIONS}
                    />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                    <span>{state.lastRefreshedLabel}</span>
                    <span>{resolveViewDescription(state.view, state.timeWindowHours)}</span>
                </div>
            </div>
        </Card>
    );
}
