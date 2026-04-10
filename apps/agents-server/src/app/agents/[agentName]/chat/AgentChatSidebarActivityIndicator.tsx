import { Clock3Icon, Loader2Icon } from 'lucide-react';
import type { AgentChatSidebarActivityState } from './useAgentChatSidebarState';

/**
 * Props consumed by `AgentChatSidebarActivityIndicator`.
 *
 * @private function of AgentChatSidebar
 */
type AgentChatSidebarActivityIndicatorProps = {
    readonly indicator: AgentChatSidebarActivityState;
};

/**
 * Renders one running/scheduled activity icon while reserving layout space when absent.
 *
 * @private function of AgentChatSidebar
 */
export function AgentChatSidebarActivityIndicator({ indicator }: AgentChatSidebarActivityIndicatorProps) {
    const baseClasses =
        'inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/90 shadow-sm ring-1 ring-slate-200/90';

    if (indicator.kind === 'running') {
        return (
            <span
                role="img"
                aria-label={indicator.statusLabel || undefined}
                title={indicator.statusLabel || undefined}
                className={`${baseClasses} text-blue-600 ring-blue-200/90`}
            >
                <Loader2Icon className="h-2.5 w-2.5 animate-spin" />
            </span>
        );
    }

    if (indicator.kind === 'scheduled') {
        return (
            <span
                role="img"
                aria-label={indicator.statusLabel || undefined}
                title={indicator.statusLabel || undefined}
                className={`${baseClasses} text-amber-700 ring-amber-200/90`}
            >
                <Clock3Icon className="h-2.5 w-2.5" />
            </span>
        );
    }

    return (
        <span aria-hidden="true" className={`${baseClasses} invisible`}>
            <Clock3Icon className="h-2.5 w-2.5" />
        </span>
    );
}
