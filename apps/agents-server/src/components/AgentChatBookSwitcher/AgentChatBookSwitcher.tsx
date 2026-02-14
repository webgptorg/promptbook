'use client';

import Link from 'next/link';
import { MessageSquareIcon, NotebookPenIcon } from 'lucide-react';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';

/**
 * Allowed switches between an agent chat view and its knowledge book.
 *
 * @private
 */
type AgentChatBookSwitcherTab = 'chat' | 'book';

/**
 * Properties for the agent chat/book switcher pills.
 *
 * @private
 */
type AgentChatBookSwitcherProps = {
    /**
     * The unique identifier of the agent whose pages are being toggled.
     */
    readonly agentName: string;

    /**
     * Tab identifier representing the currently active view.
     */
    readonly activeTab: AgentChatBookSwitcherTab;
};

/**
 * Renders compact navigation pills that let admins hop between the chat and source views.
 *
 * @private
 */
export function AgentChatBookSwitcher({ agentName, activeTab }: AgentChatBookSwitcherProps) {
    const { formatText } = useAgentNaming();
    const encodedAgentName = encodeURIComponent(agentName);
    const navigationItems: AgentChatBookSwitcherTab[] = ['chat', 'book'];

    return (
        <div className="flex items-center gap-2">
            {navigationItems.map((tabId) => {
                const isActive = tabId === activeTab;
                const href = tabId === 'chat' ? `/agents/${encodedAgentName}` : `/agents/${encodedAgentName}/book`;
                const Icon = tabId === 'chat' ? MessageSquareIcon : NotebookPenIcon;
                const label = tabId === 'chat' ? formatText('Chat') : formatText('Source');
                const baseStyles =
                    'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors';
                const variantStyles = isActive
                    ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
                    : 'border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-900';

                return (
                    <Link
                        key={tabId}
                        href={href}
                        className={`${baseStyles} ${variantStyles}`}
                        aria-current={isActive ? 'page' : undefined}
                        title={label}
                    >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                    </Link>
                );
            })}
        </div>
    );
}
