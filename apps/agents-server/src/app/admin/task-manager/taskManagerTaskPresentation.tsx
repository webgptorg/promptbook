'use client';

import type { AdminChatTaskRecord } from '@/src/utils/chatTasksAdmin';
import type { ServerLanguageCode } from '@/src/languages/ServerLanguageRegistry';
import { formatServerLanguageHumanReadableDate } from '@/src/utils/localization/formatServerLanguageHumanReadableDate';
import { formatCodexLoginMethod } from '../../../../../../src/book-3.0/codexLoginMethod';
import { formatUsagePrice } from '../../../../../../src/execution/utils/formatUsagePrice';

/**
 * One labeled info row shown in a task detail block.
 *
 * @private shared presentation of the admin task manager
 */
export type TaskInfoRow = {
    label: string;
    secondary?: string | null;
    value: string;
};

/**
 * Props for the compact task info block.
 *
 * @private shared presentation of the admin task manager
 */
type TaskInfoBlockProps = {
    rows: ReadonlyArray<TaskInfoRow>;
};

/**
 * Props for the compact status badge.
 *
 * @private shared presentation of the admin task manager
 */
type TaskStatusBadgeProps = {
    isStuck: boolean;
    task: AdminChatTaskRecord;
};

/**
 * Badge color classes keyed by display status.
 *
 * @private shared presentation of the admin task manager
 */
const TASK_STATUS_CLASS_MAP: Record<string, string> = {
    RUNNING: 'border-blue-200 bg-blue-50 text-blue-700',
    QUEUED: 'border-slate-200 bg-slate-50 text-slate-700',
    PAUSED: 'border-orange-200 bg-orange-50 text-orange-700',
    RETRYING: 'border-amber-200 bg-amber-50 text-amber-700',
    FAILED: 'border-rose-200 bg-rose-50 text-rose-700',
    COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    CANCELLED: 'border-gray-200 bg-gray-100 text-gray-700',
    STUCK: 'border-orange-300 bg-orange-50 text-orange-800',
};

/**
 * Renders a compact vertical info block describing one task.
 *
 * @private shared presentation of the admin task manager
 */
export function TaskInfoBlock({ rows }: TaskInfoBlockProps) {
    return rows.map((row) => (
        <div key={`${row.label}-${row.value}`} className="mb-2 last:mb-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{row.label}</div>
            <div className="break-all text-[11px] text-gray-800">{row.value}</div>
            {row.secondary ? <div className="break-all text-[11px] text-gray-500">{row.secondary}</div> : null}
        </div>
    ));
}

/**
 * Resolves the effective badge label for a task.
 *
 * @private shared presentation of the admin task manager
 */
function resolveTaskStatusLabel(task: AdminChatTaskRecord): string {
    if (task.status === 'QUEUED' && task.pausedAt) {
        return 'PAUSED';
    }

    if (task.status === 'QUEUED' && task.retryCount > 0) {
        return 'RETRYING';
    }

    return task.status;
}

/**
 * Compact badge rendering the effective task status.
 *
 * @private shared presentation of the admin task manager
 */
export function TaskStatusBadge({ isStuck, task }: TaskStatusBadgeProps) {
    const label = resolveTaskStatusLabel(task);
    const tone = isStuck ? TASK_STATUS_CLASS_MAP.STUCK : TASK_STATUS_CLASS_MAP[label] || TASK_STATUS_CLASS_MAP.QUEUED;

    return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{label}</span>;
}

/**
 * Formats a durable task kind for display.
 *
 * @private shared presentation of the admin task manager
 */
export function formatTaskKind(kind: AdminChatTaskRecord['kind']): string {
    if (kind === 'CHAT_COMPLETION') {
        return 'Chat completion';
    }

    if (kind === 'CHAT_TIMEOUT') {
        return 'Chat timeout';
    }

    if (kind === 'VPS_SELF_UPDATE') {
        return 'Self-update';
    }

    if (kind === 'BROWSER_PREVIEW') {
        return 'Browser preview';
    }

    return kind;
}

/**
 * Formats one timestamp for compact task display.
 *
 * @private shared presentation of the admin task manager
 */
export function formatTaskDateTime(value: string | null, language: ServerLanguageCode): string {
    return formatServerLanguageHumanReadableDate(value, language, { fallbackLabel: '-' });
}

/**
 * Formats a duration in milliseconds.
 *
 * @private shared presentation of the admin task manager
 */
export function formatTaskDuration(durationMs: number | null): string {
    if (durationMs === null || !Number.isFinite(durationMs) || durationMs < 0) {
        return '-';
    }

    const totalSeconds = Math.floor(durationMs / 1000);
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;
    const parts: Array<string> = [];

    if (days > 0) {
        parts.push(`${days}d`);
    }
    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}m`);
    }
    if (seconds > 0 || parts.length === 0) {
        parts.push(`${seconds}s`);
    }

    return parts.slice(0, 2).join(' ');
}

/**
 * Computes the current queue age for one task.
 *
 * @private shared presentation of the admin task manager
 */
export function getTaskQueueAgeMs(task: AdminChatTaskRecord): number | null {
    const queuedAtMs = Date.parse(task.queuedAt);
    return Number.isNaN(queuedAtMs) ? null : Date.now() - queuedAtMs;
}

/**
 * Computes runtime duration for running tasks.
 *
 * @private shared presentation of the admin task manager
 */
export function getTaskRuntimeDurationMs(task: AdminChatTaskRecord): number | null {
    if (task.status !== 'RUNNING' || !task.startedAt) {
        return null;
    }

    const startedAtMs = Date.parse(task.startedAt);
    return Number.isNaN(startedAtMs) ? null : Date.now() - startedAtMs;
}

/**
 * Computes total duration for finished tasks.
 *
 * @private shared presentation of the admin task manager
 */
export function getTaskTotalDurationMs(task: AdminChatTaskRecord): number | null {
    if (!task.startedAt || !task.finishedAt) {
        return null;
    }

    const startedAtMs = Date.parse(task.startedAt);
    const finishedAtMs = Date.parse(task.finishedAt);
    if (Number.isNaN(startedAtMs) || Number.isNaN(finishedAtMs)) {
        return null;
    }

    return Math.max(0, finishedAtMs - startedAtMs);
}

/**
 * Detects tasks running longer than the selected threshold.
 *
 * @private shared presentation of the admin task manager
 */
export function isTaskStuck(task: AdminChatTaskRecord, thresholdMinutes: number): boolean {
    const runtimeMs = getTaskRuntimeDurationMs(task);
    return runtimeMs !== null && runtimeMs >= thresholdMinutes * 60_000;
}

/**
 * Builds the info rows describing how the harness runner answered one task.
 *
 * Shows the runner with its model, whether OpenAI Codex was billed to the server's
 * ChatGPT account or the `OPENAI_API_KEY`, and the reported usage of the run.
 *
 * @private shared presentation of the admin task manager
 */
export function buildTaskRunReportRows(runReport: AdminChatTaskRecord['runReport']): Array<TaskInfoRow> {
    if (!runReport) {
        return [];
    }

    const loginMethodLabel = formatCodexLoginMethod(runReport.loginMethod);

    return [
        {
            label: 'Runner',
            value: runReport.modelName ? `${runReport.runnerName} (${runReport.modelName})` : runReport.runnerName,
            secondary: loginMethodLabel ? `via ${loginMethodLabel}` : null,
        },
        {
            label: 'Usage',
            value: formatUsagePrice(runReport.usage),
            secondary: formatTaskRunReportTokens(runReport.usage),
        },
    ];
}

/**
 * Formats reported input/output token counts for the usage info row.
 *
 * @private shared presentation of the admin task manager
 */
function formatTaskRunReportTokens(usage: NonNullable<AdminChatTaskRecord['runReport']>['usage']): string | null {
    const inputTokensCount = usage.input?.tokensCount?.value ?? 0;
    const outputTokensCount = usage.output?.tokensCount?.value ?? 0;

    if (inputTokensCount === 0 && outputTokensCount === 0) {
        return null;
    }

    return `${inputTokensCount.toLocaleString('en-US')} in / ${outputTokensCount.toLocaleString('en-US')} out tokens`;
}

/**
 * Truncates long error text for compact rendering.
 *
 * @private shared presentation of the admin task manager
 */
export function truncateTaskText(value: string, limit: number): string {
    return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}
