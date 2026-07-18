import type { ReactNode } from 'react';

/**
 * Props of the shared project runtime status badge.
 */
type AgentProjectRuntimeStatusBadgeProps = {
    /**
     * Whether the runtime currently has an active listener.
     */
    readonly isRunning: boolean;

    /**
     * Badge text.
     */
    readonly children: ReactNode;
};

/**
 * Renders a compact badge for project runtime status.
 *
 * @param props - Runtime status badge props.
 * @returns Status badge.
 */
export function AgentProjectRuntimeStatusBadge({
    isRunning,
    children,
}: AgentProjectRuntimeStatusBadgeProps) {
    return (
        <span
            className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                isRunning ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
            }`}
        >
            {children}
        </span>
    );
}
