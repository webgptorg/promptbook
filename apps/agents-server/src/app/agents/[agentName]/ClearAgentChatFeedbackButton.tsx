'use client';

import { useState } from 'react';
import { showConfirm } from '../../../components/AsyncDialogs/asyncDialogs';
import { $clearAgentChatFeedback } from '../../../utils/chatFeedbackAdmin';

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

    const handleClick = async () => {
        if (!agentName) return;

        const confirmed = await showConfirm({
            title: 'Clear chat feedback',
            message: `Are you sure you want to permanently delete all feedback for agent "${agentName}"?`,
            confirmLabel: 'Delete feedback',
            cancelLabel: 'Cancel',
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
            setError(err instanceof Error ? err.message : 'Failed to clear chat feedback');
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
                {loading ? 'Clearing feedback…' : 'Clear chat feedback'}
            </button>
            {error && <div className="text-xs text-red-600">{error}</div>}
        </div>
    );
}
