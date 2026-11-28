'use client';

import { TargetIcon } from 'lucide-react';
import { useServerLanguage } from '../../../../components/ServerLanguage/ServerLanguageProvider';

/**
 * Explains what makes the agent goal chat different from a normal conversation.
 *
 * @private Agents Server presentation logic for the agent goal chat.
 */
export function AgentGoalChatNotice() {
    const { t: translateText } = useServerLanguage();

    return (
        <div className="mx-4 mt-4 flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/95 px-4 py-3 text-sm text-indigo-900 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100">
            <TargetIcon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
            <div>
                <div className="font-semibold">{translateText('goalChat.noticeTitle')}</div>
                <p className="mt-1">{translateText('goalChat.noticeDescription')}</p>
            </div>
        </div>
    );
}
