'use client';

import { string_url } from '@promptbook-local/types';
import { EyeIcon, EyeOffIcon, LockIcon, RotateCcwIcon } from 'lucide-react';
import Link from 'next/link';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { resolveAgentAvatarImageUrl } from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import type { AgentVisibility } from '../../utils/agentVisibility';
import { AgentCapabilityChips, HOMEPAGE_CAPABILITY_CHIPS_LIMIT } from '../AgentProfile/AgentCapabilityChips';
import { useAgentBackground } from '../AgentProfile/useAgentBackground';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { FILE_ACTION_BUTTON_CLASSES, FileCard } from './FileCard';

/**
 * Props for AgentCard.
 */
type AgentCardProps = {
    /**
     * The basic information of the agent to display
     */
    readonly agent: AgentBasicInformation;

    /**
     * The URL to navigate to when the card is clicked
     */
    readonly href: string;

    /**
     * Base URL of the agents server
     *
     * Note: [👭] Using `string_url`, not `URL` object because we are passing prop from server to client.
     */
    readonly publicUrl: string_url;

    /**
     * Whether the current user has admin privileges
     */
    readonly isAdmin?: boolean;

    /**
     * Callback function to delete the agent
     */
    readonly onDelete?: (agentIdentifier: string) => void;

    /**
     * Callback function invoked when the visibility button is pressed.
     */
    readonly onRequestVisibilityChange?: (agentIdentifier: string) => void;

    /**
     * Callback function to restore a deleted agent
     */
    readonly onRestore?: (agentIdentifier: string) => void;

    /**
     * The current visibility status of the agent
     */
    readonly visibility?: AgentVisibility;

    /**
     * The URL of the server where the agent is hosted
     */
    readonly serverUrl?: string_url;
};

/**
 * Renders a compact, file-like card for an agent.
 */
export function AgentCard({
    agent,
    href,
    isAdmin,
    publicUrl,
    onDelete,
    onRequestVisibilityChange,
    onRestore,
    visibility,
    serverUrl,
}: AgentCardProps) {
    const { formatText } = useAgentNaming();
    const { meta, agentName } = agent;
    const fallbackName = formatText('Agent');
    const fullname = (meta.fullname as string) || agentName || fallbackName;
    const imageUrl = resolveAgentAvatarImageUrl({ agent, baseUrl: serverUrl || publicUrl });
    const personaDescription = agent.personaDescription || '';
    const resolvedVisibility = visibility || 'PRIVATE';

    const { brandColorLightHex, brandColorDarkHex, backgroundImage } = useAgentBackground(meta.color);

    return (
        <div className="relative h-full group">
            <Link href={href} className="block h-full">
                <FileCard
                    className="flex h-full items-start gap-3 relative overflow-hidden"
                    style={{
                        background: `url("${backgroundImage}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] pointer-events-none" />

                    <div
                        className="relative z-10 mt-0.5 h-12 w-12 rounded-lg overflow-hidden flex-shrink-0 bg-white shadow-sm border"
                        style={{ borderColor: `${brandColorLightHex}80` }}
                    >
                        {imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imageUrl} alt={fullname} className="w-full h-full object-cover" />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center text-lg font-semibold text-white/90"
                                style={{ backgroundColor: brandColorDarkHex }}
                            >
                                {fullname.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="relative z-10 min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-gray-900 truncate" title={fullname}>
                            {fullname}
                        </h3>
                        {personaDescription && (
                            <p className="text-xs text-gray-800 line-clamp-2 leading-snug mt-1 font-medium">
                                {personaDescription}
                            </p>
                        )}
                        <AgentCapabilityChips
                            agent={agent}
                            className="mt-2"
                            maxChips={HOMEPAGE_CAPABILITY_CHIPS_LIMIT}
                            size="compact"
                        />
                    </div>
                </FileCard>
            </Link>
            {isAdmin && onRestore && (
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                        className={`bg-green-500 hover:bg-green-600 ${FILE_ACTION_BUTTON_CLASSES}`}
                        onClick={(e) => {
                            e.preventDefault();
                            onRestore(agent.permanentId || agent.agentName);
                        }}
                        title={formatText('Restore agent')}
                    >
                        <RotateCcwIcon className="w-3 h-3" />
                    </button>
                </div>
            )}
            {isAdmin && !onRestore && (
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                        className={`${
                            resolvedVisibility === 'PUBLIC'
                                ? 'bg-green-500 hover:bg-green-600'
                                : resolvedVisibility === 'UNLISTED'
                                ? 'bg-amber-500 hover:bg-amber-600'
                                : 'bg-gray-500 hover:bg-gray-600'
                        } ${FILE_ACTION_BUTTON_CLASSES}`}
                            onClick={(e) => {
                                e.preventDefault();
                                onRequestVisibilityChange?.(agent.permanentId || agent.agentName);
                            }}
                            title={`Visibility: ${resolvedVisibility.toLowerCase()}. Click to update.`}
                    >
                        {resolvedVisibility === 'PUBLIC' ? (
                            <EyeIcon className="w-3 h-3" />
                        ) : resolvedVisibility === 'UNLISTED' ? (
                            <EyeOffIcon className="w-3 h-3" />
                        ) : (
                            <LockIcon className="w-3 h-3" />
                        )}
                    </button>
                    <button
                        className={`bg-red-500 hover:bg-red-600 ${FILE_ACTION_BUTTON_CLASSES}`}
                        onClick={(e) => {
                            e.preventDefault();
                            onDelete?.(agent.permanentId || agent.agentName);
                        }}
                        title={formatText('Delete agent')}
                    >
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}
