'use client';

import { Clock3Icon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useServerLanguage } from '../../../../components/ServerLanguage/ServerLanguageProvider';
import { cancelAgentUserTimeout, fetchAgentUserTimeouts, type UserChatTimeout } from '../../../../utils/userChatClient';
import { formatChatTimeoutRemainingTime } from './formatChatTimeoutRemainingTime';

/**
 * Timeout statuses that still represent a planned wake-up of the agent.
 *
 * @private function of AgentGoalChatPlannedMessages
 */
const PLANNED_MESSAGE_STATUSES = new Set(['QUEUED', 'RUNNING']);

/**
 * Refresh cadence that keeps model-created planned messages visible while a goal turn is running.
 *
 * @private function of AgentGoalChatPlannedMessages
 */
const PLANNED_MESSAGES_REFRESH_INTERVAL_MS = 5_000;

/**
 * Props consumed by the goal-chat planned-message list.
 *
 * @private function of AgentGoalChatPlannedMessages
 */
type AgentGoalChatPlannedMessagesProps = {
    /**
     * Agent whose planned messages are listed.
     */
    readonly agentName: string;
    /**
     * Current timestamp used for live countdowns, shared with the surrounding chat surface.
     */
    readonly currentTimestamp: number;
};

/**
 * Keeps only the planned messages that can still wake the agent up.
 *
 * @private function of AgentGoalChatPlannedMessages
 */
function selectPlannedMessages(timeouts: ReadonlyArray<UserChatTimeout>): Array<UserChatTimeout> {
    return timeouts
        .filter((timeout) => PLANNED_MESSAGE_STATUSES.has(timeout.status) && !timeout.cancelRequestedAt)
        .sort((leftTimeout, rightTimeout) => leftTimeout.dueAt.localeCompare(rightTimeout.dueAt));
}

/**
 * Lists the planned messages of one agent inside its goal chat, with their due time and cancellation.
 *
 * This replaces the former standalone timeout manager page: the agent's own thread is now the single
 * place where its future wake-ups are visible.
 *
 * @private Agents Server presentation logic for the agent goal chat.
 */
export function AgentGoalChatPlannedMessages({ agentName, currentTimestamp }: AgentGoalChatPlannedMessagesProps) {
    const { t: translateText } = useServerLanguage();
    const [plannedMessages, setPlannedMessages] = useState<ReadonlyArray<UserChatTimeout> | null>(null);
    const [hasLoadFailed, setHasLoadFailed] = useState(false);
    const [cancellingTimeoutIds, setCancellingTimeoutIds] = useState<ReadonlyArray<string>>([]);

    const reloadPlannedMessages = useCallback(async () => {
        try {
            const payload = await fetchAgentUserTimeouts(agentName);
            setPlannedMessages(selectPlannedMessages(payload.items));
            setHasLoadFailed(false);
        } catch {
            setHasLoadFailed(true);
        }
    }, [agentName]);

    useEffect(() => {
        void reloadPlannedMessages();

        const refreshInterval = window.setInterval(() => {
            void reloadPlannedMessages();
        }, PLANNED_MESSAGES_REFRESH_INTERVAL_MS);

        return () => {
            window.clearInterval(refreshInterval);
        };
    }, [reloadPlannedMessages]);

    const handleCancelPlannedMessage = useCallback(
        async (timeoutId: string) => {
            setCancellingTimeoutIds((currentIds) => [...currentIds, timeoutId]);

            try {
                await cancelAgentUserTimeout(agentName, timeoutId);
                await reloadPlannedMessages();
            } catch {
                setHasLoadFailed(true);
            } finally {
                setCancellingTimeoutIds((currentIds) => currentIds.filter((currentId) => currentId !== timeoutId));
            }
        },
        [agentName, reloadPlannedMessages],
    );

    if (plannedMessages === null && !hasLoadFailed) {
        return null;
    }

    return (
        <section className="mx-4 mt-4 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-950/80">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {translateText('goalChat.plannedMessagesTitle')}
            </h2>

            {hasLoadFailed && (
                <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                    {translateText('goalChat.plannedMessagesLoadErrorLabel')}
                </p>
            )}

            {!hasLoadFailed && plannedMessages !== null && plannedMessages.length === 0 && (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {translateText('goalChat.plannedMessagesEmptyLabel')}
                </p>
            )}

            {plannedMessages !== null && plannedMessages.length > 0 && (
                <ul className="mt-3 space-y-2">
                    {plannedMessages.map((plannedMessage) => {
                        const isCancelling = cancellingTimeoutIds.includes(plannedMessage.timeoutId);

                        return (
                            <li
                                key={plannedMessage.timeoutId}
                                className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                                        {plannedMessage.message ||
                                            translateText('goalChat.plannedMessageDefaultLabel')}
                                    </div>
                                    <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                        <Clock3Icon className="h-3.5 w-3.5" />
                                        <span>
                                            {formatChatTimeoutRemainingTime(plannedMessage.dueAt, currentTimestamp)}
                                        </span>
                                        <span className="text-slate-400 dark:text-slate-500">
                                            {new Date(plannedMessage.dueAt).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="rounded-full border border-slate-300/80 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-default disabled:opacity-50 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200"
                                    onClick={() => {
                                        void handleCancelPlannedMessage(plannedMessage.timeoutId);
                                    }}
                                    disabled={isCancelling}
                                >
                                    {isCancelling
                                        ? translateText('goalChat.plannedMessageCancellingLabel')
                                        : translateText('goalChat.plannedMessageCancelLabel')}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
