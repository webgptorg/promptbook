import { BarChart3Icon, DownloadIcon, FileTextIcon, FolderOpenIcon, MessageCircleQuestionIcon, MessageSquareIcon, MessageSquareShareIcon, SquareSplitHorizontalIcon } from 'lucide-react';
import type { ComponentType } from 'react';
import type { AgentFolderContext } from './agentOrganization/agentFolderContext';
import { getAgentLinks, type AgentLinkFormatter } from '../app/agents/[agentName]/agentLinks';

/**
 * Describes an individual navigation entry related to the current agent.
 */
export type AgentNavigationEntry = {
    /**
     * Human-readable label shown to end users.
     */
    readonly label: string;
    /**
     * Target URL for the entry.
     */
    readonly href: string;
    /**
     * Icon used inside context menus.
     */
    readonly icon: ComponentType<{ className?: string }>;
    /**
     * Optional target attribute for links that should open in a new tab.
     */
    readonly target?: '_blank' | '_self';
};

/**
 * Segmented navigation entries for the agent menu.
 */
export type AgentNavigationEntries = {
    /**
     * Entries to display for all authenticated viewers.
     */
    readonly general: AgentNavigationEntry[];
    /**
     * Admin-only entries that cover system-level insights and exports.
     */
    readonly admin: AgentNavigationEntry[];
};

/**
 * Options used to derive all agent navigation entries.
 */
export type BuildAgentNavigationEntriesOptions = {
    /**
     * URL-friendly identifier used in navigation routes (`permanentId` or `agentName`).
     */
    readonly agentNavigationId: string | null | undefined;
    /**
     * Derived agent name (typically the source-defined name).
     */
    readonly derivedAgentName?: string | null;
    /**
     * Optional folder context for the agent.
     */
    readonly folderContext?: AgentFolderContext | null;
    /**
     * Text formatter from the naming context.
     */
    readonly formatText: AgentLinkFormatter;
    /**
     * Whether the current viewer is an administrator.
     */
    readonly isAdmin?: boolean;
};

/**
 * Builds reusable navigation entries that can be rendered inside both the
 * agent context menu and the header's “More” dropdown.
 *
 * @param options - Input values describing the current agent and viewer.
 * @returns Categorized navigation entries.
 */
export function buildAgentNavigationEntries({
    agentNavigationId,
    derivedAgentName,
    folderContext,
    formatText,
    isAdmin = false,
}: BuildAgentNavigationEntriesOptions): AgentNavigationEntries {
    if (!agentNavigationId) {
        return { general: [], admin: [] };
    }

    const encodedAgentId = encodeURIComponent(agentNavigationId);
    const links = getAgentLinks(agentNavigationId, formatText);
    const editBookLink = links.find((link) => link.id === 'book');
    const integrationLink = links.find((link) => link.id === 'integration');

    const general: AgentNavigationEntry[] = [];

    if (folderContext) {
        general.push({
            label: `${formatText('Open Folder')}: ${folderContext.label}`,
            href: folderContext.href,
            icon: FolderOpenIcon,
        });
    }

    general.push(
        {
            label: 'Standalone Chat',
            href: `/agents/${encodedAgentId}/chat`,
            icon: MessageSquareShareIcon,
        },
        {
            label: 'Edit Book & Chat',
            href: `/agents/${encodedAgentId}/book+chat`,
            icon: SquareSplitHorizontalIcon,
        },
    );

    if (editBookLink) {
        general.push({
            label: editBookLink.title,
            href: editBookLink.href,
            icon: editBookLink.icon,
            target: editBookLink.target,
        });
    }

    const admin: AgentNavigationEntry[] = [];
    if (!isAdmin) {
        return { general, admin };
    }

    const usageSearchParams = new URLSearchParams();
    usageSearchParams.set('timeframe', '30d');
    if (derivedAgentName) {
        usageSearchParams.set('agentName', derivedAgentName);
    }
    const usageAnalyticsHref = usageSearchParams.toString()
        ? `/admin/usage?${usageSearchParams.toString()}`
        : '/admin/usage';

    admin.push(
        {
            label: 'Chat History',
            href: `/admin/chat-history?agentName=${encodeURIComponent(agentNavigationId)}`,
            icon: MessageSquareIcon,
        },
        {
            label: 'Usage Analytics',
            href: usageAnalyticsHref,
            icon: BarChart3Icon,
        },
        {
            label: 'Chat Feedback',
            href: `/admin/chat-feedback?agentName=${encodeURIComponent(agentNavigationId)}`,
            icon: MessageCircleQuestionIcon,
        },
    );

    if (integrationLink) {
        admin.push({
            label: integrationLink.title,
            href: integrationLink.href,
            icon: integrationLink.icon,
            target: integrationLink.target,
        });
    }

    admin.push(
        {
            label: 'Show System Message',
            href: `/agents/${encodedAgentId}/system-message`,
            icon: FileTextIcon,
        },
        {
            label: formatText('Export Agent'),
            href: `/agents/${encodedAgentId}/export-as-transpiled-code`,
            icon: DownloadIcon,
        },
    );

    return { general, admin };
}
