'use client';

import { useState } from 'react';
import { showConfirm } from '../../../components/AsyncDialogs/asyncDialogs';
import { useAgentNaming } from '../../../components/AgentNaming/AgentNamingContext';
import { useServerLanguage } from '../../../components/ServerLanguage/ServerLanguageProvider';
import { $clearAgentChatFeedback } from '../../../utils/chatFeedbackAdmin';

/**
 * Props for clear agent chat feedback button.
 */
type ClearAgentChatFeedbackButtonProps = {
    /**
     * Agent name for which the chat feedback should be cleared.
     */
    agentName: string;

    /**
     * Optional callback invoked after successful clearing.
     */
    onCleared?: () => void;
};

/**
 * Admin-only button to clear chat feedback for a specific agent.
 *
 * This is intentionally small and self-contained so it can be reused
 * from different admin-oriented surfaces without duplicating logic.
 */
export function ClearAgentChatFeedbackButton({ agentName, onCleared }: ClearAgentChatFeedbackButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { formatText } = useAgentNaming();
    const { t } = useServerLanguage();

    const handleClick = async () => {
        if (!agentName) return;

        const confirmed = await showConfirm({
            title: t('clearChatFeedback.confirmTitle'),
            message: t('clearChatFeedback.confirmMessage', { agentName: formatText(agentName) }),
            confirmLabel: t('clearChatFeedback.confirmAction'),
            cancelLabel: t('clearChatFeedback.confirmCancel'),
        }).catch(() => false);
        if (!confirmed) return;

        try {
            setLoading(true);
            setError(null);
            await $clearAgentChatFeedback(agentName);
            if (onCleared) {
                onCleared();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t('clearChatFeedback.errorMessage'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <button
                type="button"
                onClick={handleClick}
                disabled={loading}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading ? t('clearChatFeedback.clearingLabel') : t('clearChatFeedback.buttonLabel')}
            </button>
            {error && <div className="text-xs text-red-600">{error}</div>}
        </div>
    );
}
