'use client';

import type { AgentBasicInformation, string_url } from '@promptbook-local/types';
import { CodeIcon } from 'lucide-react';
import { resolveAgentAvatarImageUrl } from '../../../../../../../src/utils/agents/resolveAgentAvatarImageUrl';

/**
 * Props for the export page header.
 *
 * @private type of `<AgentCodePageHeader/>`
 */
type AgentCodePageHeaderProps = {
    /**
     * Routed agent name.
     */
    readonly agentName: string;

    /**
     * Loaded agent profile, or `null` while loading.
     */
    readonly agentProfile: AgentBasicInformation | null;

    /**
     * Base URL of the Agents Server.
     */
    readonly publicUrl: string_url;
};

/**
 * Renders the agent identity header (avatar + title) for the export-as-transpiled-code page.
 *
 * @private internal component of `<AgentCodePageClient/>`
 */
export function AgentCodePageHeader({ agentName, agentProfile, publicUrl }: AgentCodePageHeaderProps) {
    const agentDisplayName = agentProfile?.meta.fullname || agentName;
    const agentAvatarSource = resolveAgentAvatarSource({ agentName, agentProfile, publicUrl });

    return (
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-6 sm:flex-row sm:items-center dark:border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={agentAvatarSource}
                alt={agentDisplayName}
                className="agent-avatar-pixelated h-16 w-16 rounded-full border-2 border-slate-200 object-cover dark:border-slate-700"
            />

            <div className="min-w-0 flex-1">
                <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-slate-100">{agentDisplayName}</h1>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <CodeIcon className="h-4 w-4" />
                    Export as transpiled code / agent harness
                </p>
            </div>
        </div>
    );
}

/**
 * Resolves the avatar image URL for the current agent header.
 *
 * @param options - Agent identity and loaded profile data.
 * @returns Avatar URL preferred by the profile, falling back to the default generated avatar.
 *
 * @private function of `<AgentCodePageHeader/>`
 */
function resolveAgentAvatarSource(options: {
    readonly agentName: string;
    readonly agentProfile: AgentBasicInformation | null;
    readonly publicUrl: string_url;
}): string {
    const { agentName, agentProfile, publicUrl } = options;
    const fallbackIdentifier = agentProfile?.permanentId || agentName;

    if (!agentProfile) {
        return `/agents/${encodeURIComponent(fallbackIdentifier)}/images/default-avatar.png`;
    }

    return (
        resolveAgentAvatarImageUrl({
            agent: agentProfile,
            baseUrl: publicUrl,
        }) || `/agents/${encodeURIComponent(fallbackIdentifier)}/images/default-avatar.png`
    );
}
