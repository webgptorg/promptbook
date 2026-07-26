'use client';

import { resolveAdminChatTaskTargetLink } from '@/src/utils/adminChatTaskLinks';
import type { AdminChatTaskRecord } from '@/src/utils/chatTasksAdmin';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

/**
 * Props for the shared task target link.
 *
 * @private function of the admin task manager
 */
type TaskManagerTaskTargetLinkProps = {
    task: AdminChatTaskRecord;
};

/**
 * Shared button that opens the Agents Server page one task operates on (task → page).
 *
 * Renders the "Open chat" / "Open update" / "Open page" button described by
 * `resolveAdminChatTaskTargetLink`, and renders nothing when the task kind has no linkable
 * target, so callers can drop it in unconditionally. Reused by the task row and the task
 * detail page so the forward link stays identical everywhere (DRY).
 *
 * @private function of the admin task manager
 */
export function TaskManagerTaskTargetLink({ task }: TaskManagerTaskTargetLinkProps) {
    const targetLink = resolveAdminChatTaskTargetLink(task);
    if (!targetLink) {
        return null;
    }

    const className =
        'inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-100';

    if (targetLink.isExternal) {
        return (
            <a
                href={targetLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
                title={targetLink.title}
            >
                <ExternalLink className="h-3.5 w-3.5" />
                {targetLink.label}
            </a>
        );
    }

    return (
        <Link href={targetLink.href} className={className} title={targetLink.title}>
            <ArrowUpRight className="h-3.5 w-3.5" />
            {targetLink.label}
        </Link>
    );
}
