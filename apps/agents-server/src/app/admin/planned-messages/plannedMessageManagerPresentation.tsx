'use client';

import type { ServerLanguageCode } from '@/src/languages/ServerLanguageRegistry';
import type { PlannedMessageEndReason } from '@/src/utils/plannedMessageManager/resolvePlannedMessageEndReason';
import type { PlannedMessageLifecycle } from '@/src/utils/plannedMessageManager/resolvePlannedMessageLifecycle';
import type { PlannedMessageManagerRecord } from '@/src/utils/plannedMessagesAdmin';
import { formatServerLanguageHumanReadableDate } from '@/src/utils/localization/formatServerLanguageHumanReadableDate';
import { describeAgentPlannedMessageSchedule } from '../../../../../../src/book-3.0/describeAgentPlannedMessageSchedule';
import { formatTimeoutDurationHuman } from '../../../../../../src/book-components/Chat/utils/timeoutToolCallPresentation';

/**
 * Human label of each planned-message stage.
 *
 * @private shared presentation of the admin planned-message manager
 */
export const PLANNED_MESSAGE_LIFECYCLE_LABELS: Record<PlannedMessageLifecycle, string> = {
    ONGOING: 'Ongoing',
    SCHEDULED: 'Scheduled',
    NOT_STARTED: 'Not started',
    PAUSED: 'Paused',
    CANCELLED: 'Cancelled',
    ENDED: 'Ended',
    FAILED: 'Failed',
};

/**
 * What each planned-message stage means, shown as the badge tooltip.
 *
 * @private shared presentation of the admin planned-message manager
 */
const PLANNED_MESSAGE_LIFECYCLE_TITLES: Record<PlannedMessageLifecycle, string> = {
    ONGOING: 'Waking its agent right now',
    SCHEDULED: 'Waiting for its next wake-up',
    NOT_STARTED: 'Planned, but its starting date is still ahead',
    PAUSED: 'Held back, so it does not wake its agent until it is resumed',
    CANCELLED: 'Cancelled, so it never wakes its agent again',
    ENDED: 'Over, because its plan ran out',
    FAILED: 'Stopped after its wake-up could not be delivered',
};

/**
 * Badge color classes of each planned-message stage.
 *
 * @private shared presentation of the admin planned-message manager
 */
const PLANNED_MESSAGE_LIFECYCLE_CLASS_MAP: Record<PlannedMessageLifecycle, string> = {
    ONGOING: 'border-blue-200 bg-blue-50 text-blue-700',
    SCHEDULED: 'border-slate-200 bg-slate-50 text-slate-700',
    NOT_STARTED: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    PAUSED: 'border-orange-200 bg-orange-50 text-orange-700',
    CANCELLED: 'border-gray-200 bg-gray-100 text-gray-700',
    ENDED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    FAILED: 'border-rose-200 bg-rose-50 text-rose-700',
};

/**
 * Human explanation of why one planned message is over.
 *
 * @private shared presentation of the admin planned-message manager
 */
const PLANNED_MESSAGE_END_REASON_LABELS: Record<NonNullable<PlannedMessageEndReason>, string> = {
    MAX_RUNS_REACHED: 'all planned runs done',
    ENDING_DATE_PASSED: 'ending date passed',
    SINGLE_RUN_DONE: 'single wake-up done',
};

/**
 * Compact badge naming the stage one planned message is in.
 *
 * @private shared presentation of the admin planned-message manager
 */
export function PlannedMessageLifecycleBadge({ lifecycle }: { lifecycle: PlannedMessageLifecycle }) {
    return (
        <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PLANNED_MESSAGE_LIFECYCLE_CLASS_MAP[lifecycle]}`}
            title={PLANNED_MESSAGE_LIFECYCLE_TITLES[lifecycle]}
        >
            {PLANNED_MESSAGE_LIFECYCLE_LABELS[lifecycle]}
        </span>
    );
}

/**
 * Compact badge marking the planned messages an agent wrote for itself in its goal chat.
 *
 * @private shared presentation of the admin planned-message manager
 */
export function PlannedMessageGoalChatBadge({ plannedMessage }: { plannedMessage: PlannedMessageManagerRecord }) {
    if (!plannedMessage.isAgentGoalChat) {
        return null;
    }

    return (
        <span
            className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700"
            title="Planned by the agent itself in its goal chat, not by a user"
        >
            Goal chat
        </span>
    );
}

/**
 * Formats how often one planned message wakes its agent.
 *
 * @param plannedMessage - Planned message being described.
 * @returns Short frequency text such as `Every 5 minutes`.
 *
 * @private shared presentation of the admin planned-message manager
 */
export function formatPlannedMessageFrequency(plannedMessage: PlannedMessageManagerRecord): string {
    if (plannedMessage.recurrenceKind === 'CRON') {
        return `Cron ${plannedMessage.cronExpression}`;
    }

    if (plannedMessage.recurrenceKind === 'INTERVAL') {
        return `Every ${formatTimeoutDurationHuman(plannedMessage.recurrenceIntervalMs || 0)}`;
    }

    return 'Once';
}

/**
 * Describes the whole plan of one planned message in one sentence.
 *
 * The wording comes from the very same helper the agent itself is told its plan with, so the manager
 * and the agent never describe one plan in two different ways.
 *
 * @param plannedMessage - Planned message being described.
 * @returns Sentence fragment describing the plan.
 *
 * @private shared presentation of the admin planned-message manager
 */
export function describePlannedMessagePlan(plannedMessage: PlannedMessageManagerRecord): string {
    return describeAgentPlannedMessageSchedule({
        intervalMs: plannedMessage.recurrenceIntervalMs,
        cronExpression: plannedMessage.cronExpression,
        startsAt: plannedMessage.startsAt,
        endsAt: plannedMessage.endsAt,
        maxRunCount: plannedMessage.maxRunCount,
        runCount: plannedMessage.runCount,
        dueAt: plannedMessage.dueAt,
    });
}

/**
 * Formats why one planned message is over.
 *
 * @param endReason - Reason the plan is over.
 * @returns Short explanation, or `null` when the plan does not explain its own end.
 *
 * @private shared presentation of the admin planned-message manager
 */
export function formatPlannedMessageEndReason(endReason: PlannedMessageEndReason): string | null {
    return endReason === null ? null : PLANNED_MESSAGE_END_REASON_LABELS[endReason];
}

/**
 * Formats how many wake-ups one planned message already did, out of how many it may do.
 *
 * @param plannedMessage - Planned message being described.
 * @returns Run counter such as `2 / 10`.
 *
 * @private shared presentation of the admin planned-message manager
 */
export function formatPlannedMessageRunCount(plannedMessage: PlannedMessageManagerRecord): string {
    return plannedMessage.maxRunCount === null
        ? String(plannedMessage.runCount)
        : `${plannedMessage.runCount} / ${plannedMessage.maxRunCount}`;
}

/**
 * Formats one timestamp for compact planned-message display.
 *
 * @private shared presentation of the admin planned-message manager
 */
export function formatPlannedMessageDateTime(value: string | null, language: ServerLanguageCode): string {
    return formatServerLanguageHumanReadableDate(value, language, { fallbackLabel: '-' });
}

/**
 * Resolves the text shown for one planned message that has no message of its own.
 *
 * @private shared presentation of the admin planned-message manager
 */
export function resolvePlannedMessageText(plannedMessage: PlannedMessageManagerRecord): string {
    return plannedMessage.message || 'Planned wake-up without a message';
}
