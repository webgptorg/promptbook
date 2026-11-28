'use client';

import type { ServerLanguageCode } from '@/src/languages/ServerLanguageRegistry';
import { buildAgentProfileHref, buildExistingAgentChatHref } from '@/src/utils/agentRouting/agentRouteHrefs';
import { isPlannedMessageStillPlanned } from '@/src/utils/plannedMessageManager/isPlannedMessageStillPlanned';
import type { PlannedMessageManagerRecord } from '@/src/utils/plannedMessagesAdmin';
import { ArrowUpRight, MessageSquareText } from 'lucide-react';
import Link from 'next/link';
import type { PlannedMessageActionKind } from './usePlannedMessageManagerState';
import {
    describePlannedMessagePlan,
    formatPlannedMessageDateTime,
    formatPlannedMessageEndReason,
    formatPlannedMessageFrequency,
    formatPlannedMessageRunCount,
    PlannedMessageGoalChatBadge,
    PlannedMessageLifecycleBadge,
    resolvePlannedMessageText,
} from './plannedMessageManagerPresentation';

/**
 * Props for one planned-message table row.
 *
 * @private function of PlannedMessageManagerTableCard
 */
type PlannedMessageManagerRowProps = {
    readonly plannedMessage: PlannedMessageManagerRecord;
    readonly language: ServerLanguageCode;
    readonly busyTimeoutId: string | null;
    readonly busyAction: PlannedMessageActionKind | null;
    readonly onEdit: (plannedMessage: PlannedMessageManagerRecord) => void;
    readonly onTogglePaused: (plannedMessage: PlannedMessageManagerRecord) => Promise<void>;
    readonly onCancel: (plannedMessage: PlannedMessageManagerRecord) => Promise<void>;
};

/**
 * Shared classes of the small row action buttons.
 *
 * @private function of PlannedMessageManagerRow
 */
const PLANNED_MESSAGE_ACTION_BUTTON_CLASS_NAME =
    'rounded-md border px-2.5 py-1 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Renders one planned message with its plan, its state, and what can be done to it.
 *
 * @private function of PlannedMessageManagerTableCard
 */
export function PlannedMessageManagerRow({
    plannedMessage,
    language,
    busyTimeoutId,
    busyAction,
    onEdit,
    onTogglePaused,
    onCancel,
}: PlannedMessageManagerRowProps) {
    const isStillPlanned = isPlannedMessageStillPlanned(plannedMessage.lifecycle);
    const isFiringNow = plannedMessage.lifecycle === 'ONGOING';
    const isBusy = busyTimeoutId === plannedMessage.timeoutId;
    const isPaused = plannedMessage.pausedAt !== null;
    const endReasonLabel = formatPlannedMessageEndReason(plannedMessage.endReason);

    /**
     * Says whether one action of this very row is running right now.
     */
    function isRunningAction(action: PlannedMessageActionKind): boolean {
        return isBusy && busyAction === action;
    }

    return (
        <tr className="align-top">
            <td className="px-4 py-3">
                <div className="max-w-md text-[12px] font-medium text-gray-900">
                    {resolvePlannedMessageText(plannedMessage)}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="break-all font-mono text-[11px] text-gray-500">{plannedMessage.timeoutId}</span>
                    <PlannedMessageGoalChatBadge plannedMessage={plannedMessage} />
                </div>
            </td>

            <td className="px-4 py-3">
                <div className="text-[12px] font-medium text-gray-900">
                    {plannedMessage.agentName || plannedMessage.agentPermanentId}
                </div>
                <div className="break-all text-[11px] text-gray-500">{plannedMessage.agentPermanentId}</div>
                <div className="mt-1 text-[11px] text-gray-500">
                    {plannedMessage.username || `#${plannedMessage.userId}`}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                    <Link
                        href={buildAgentProfileHref(plannedMessage.agentPermanentId)}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                        title="Open the agent this planned message belongs to"
                    >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        Open agent
                    </Link>
                    <Link
                        href={buildExistingAgentChatHref(plannedMessage.agentPermanentId, plannedMessage.chatId)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                        title="Open the chat this planned message wakes up"
                    >
                        <MessageSquareText className="h-3.5 w-3.5" />
                        Open chat
                    </Link>
                </div>
            </td>

            <td className="px-4 py-3">
                <div className="text-[12px] text-gray-900">{formatPlannedMessageFrequency(plannedMessage)}</div>
                <div className="mt-1 max-w-xs text-[11px] text-gray-500">
                    {describePlannedMessagePlan(plannedMessage)}
                </div>
            </td>

            <td className="px-4 py-3 text-[11px] text-gray-800">
                {isStillPlanned ? formatPlannedMessageDateTime(plannedMessage.dueAt, language) : '-'}
                {plannedMessage.startsAt !== null && (
                    <div className="text-[11px] text-gray-500">
                        from {formatPlannedMessageDateTime(plannedMessage.startsAt, language)}
                    </div>
                )}
                {plannedMessage.endsAt !== null && (
                    <div className="text-[11px] text-gray-500">
                        until {formatPlannedMessageDateTime(plannedMessage.endsAt, language)}
                    </div>
                )}
            </td>

            <td className="px-4 py-3 text-[11px] text-gray-800">
                {formatPlannedMessageDateTime(plannedMessage.lastFiredAt, language)}
            </td>

            <td className="px-4 py-3 text-[11px] text-gray-800">{formatPlannedMessageRunCount(plannedMessage)}</td>

            <td className="px-4 py-3">
                <PlannedMessageLifecycleBadge lifecycle={plannedMessage.lifecycle} />
                {endReasonLabel !== null && <div className="mt-1 text-[11px] text-gray-500">{endReasonLabel}</div>}
                {plannedMessage.failureReason !== null && (
                    <div className="mt-1 max-w-xs break-words text-[11px] text-rose-700">
                        {plannedMessage.failureReason}
                    </div>
                )}
            </td>

            <td className="px-4 py-3">
                <div className="flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => onEdit(plannedMessage)}
                        disabled={!isStillPlanned || isFiringNow || isBusy}
                        className={`${PLANNED_MESSAGE_ACTION_BUTTON_CLASS_NAME} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}
                        title={
                            isFiringNow
                                ? 'This planned message is waking its agent right now, so its plan cannot be changed'
                                : 'Change the plan or the text of this planned message'
                        }
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => void onTogglePaused(plannedMessage)}
                        disabled={!isStillPlanned || isFiringNow || isBusy}
                        className={`${PLANNED_MESSAGE_ACTION_BUTTON_CLASS_NAME} border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100`}
                        title={
                            isPaused
                                ? 'Let this planned message wake its agent again'
                                : 'Hold this planned message back without cancelling it'
                        }
                    >
                        {isRunningAction('pause') ? 'Working…' : isPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button
                        type="button"
                        onClick={() => void onCancel(plannedMessage)}
                        disabled={!isStillPlanned || isBusy}
                        className={`${PLANNED_MESSAGE_ACTION_BUTTON_CLASS_NAME} border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}
                        title="Cancel this planned message so it never wakes its agent again"
                    >
                        {isRunningAction('cancel') ? 'Cancelling…' : 'Cancel'}
                    </button>
                </div>
            </td>
        </tr>
    );
}
