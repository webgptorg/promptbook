'use client';

import { string_url } from '@promptbook-local/types';
import { CheckCircle2Icon, EyeIcon, EyeOffIcon, LockIcon, RotateCcwIcon } from 'lucide-react';
import Link from 'next/link';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import type { AgentVisibility } from '../../utils/agentVisibility';
import { AgentCapabilityChips, HOMEPAGE_CAPABILITY_CHIPS_LIMIT } from '../AgentProfile/AgentCapabilityChips';
import { useAgentBackground } from '../AgentProfile/useAgentBackground';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { AgentAvatar } from '../AgentAvatar/AgentAvatar';
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
    readonly href?: string;

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

    /**
     * Optional callback used when the card acts as a selectable teammate picker entry.
     */
    readonly onSelect?: () => void;

    /**
     * Whether the selectable-card variant is currently selected.
     */
    readonly isSelected?: boolean;

    /**
     * Label announced and shown for the selected-card badge.
     */
    readonly selectionStateLabel?: string;
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
    onSelect,
    isSelected = false,
    selectionStateLabel,
}: AgentCardProps) {
    const { formatText } = useAgentNaming();
    const { meta, agentName } = agent;
    const fallbackName = formatText('Agent');
    const fullname = (meta.fullname as string) || agentName || fallbackName;
    const personaDescription = agent.personaDescription || '';
    const resolvedVisibility = visibility || 'PRIVATE';
    const isSelectable = typeof onSelect === 'function';

    const { brandColorLightHex, backgroundImage } = useAgentBackground(meta.color);

    return (
        <div className="relative h-full group">
            {isSelectable ? (
                <button
                    type="button"
                    onClick={onSelect}
                    aria-pressed={isSelected}
                    className="block h-full w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                    <FileCard
                        className={`relative flex h-full items-start gap-3 overflow-hidden ${
                            isSelected
                                ? 'border-blue-500 bg-blue-50/90 shadow-md ring-2 ring-blue-100 dark:border-blue-500/50 dark:bg-blue-500/12 dark:ring-blue-500/20'
                                : ''
                        }`}
                        style={{
                            background: `url("${backgroundImage}")`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    >
                        <div className="pointer-events-none absolute inset-0 bg-white/40 backdrop-blur-[2px] dark:bg-slate-950/72" />

                        <div
                            className="relative z-10 mt-0.5 h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-slate-900 dark:shadow-slate-950/35"
                            style={{ borderColor: `${brandColorLightHex}80` }}
                        >
                            <AgentAvatar
                                agent={agent}
                                baseUrl={serverUrl || publicUrl}
                                size={48}
                                alt={fullname}
                                className="h-full w-full"
                                imageClassName="agent-avatar-pixelated h-full w-full object-cover"
                            />
                        </div>
                        <div className="relative z-10 min-w-0 flex-1">
                            <h3 className="truncate text-sm font-bold text-gray-900 dark:text-slate-100" title={fullname}>
                                {fullname}
                            </h3>
                            {personaDescription && (
                                <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-gray-800 dark:text-slate-300">
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
                        {isSelected && selectionStateLabel && (
                            <span className="absolute right-2 top-2 z-20 inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                                <CheckCircle2Icon className="h-3 w-3" />
                                {selectionStateLabel}
                            </span>
                        )}
                    </FileCard>
                </button>
            ) : (
                <Link href={href || '#'} className="block h-full">
                    <FileCard
                        className="flex h-full items-start gap-3 relative overflow-hidden"
                        style={{
                            background: `url("${backgroundImage}")`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    >
                        <div className="pointer-events-none absolute inset-0 bg-white/40 backdrop-blur-[2px] dark:bg-slate-950/72" />

                        <div
                            className="relative z-10 mt-0.5 h-12 w-12 rounded-lg overflow-hidden flex-shrink-0 bg-white shadow-sm border dark:bg-slate-900 dark:shadow-slate-950/35"
                            style={{ borderColor: `${brandColorLightHex}80` }}
                        >
                            <AgentAvatar
                                agent={agent}
                                baseUrl={serverUrl || publicUrl}
                                size={48}
                                alt={fullname}
                                className="h-full w-full"
                                imageClassName="agent-avatar-pixelated h-full w-full object-cover"
                            />
                        </div>
                        <div className="relative z-10 min-w-0 flex-1">
                            <h3 className="truncate text-sm font-bold text-gray-900 dark:text-slate-100" title={fullname}>
                                {fullname}
                            </h3>
                            {personaDescription && (
                                <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-gray-800 dark:text-slate-300">
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
            )}
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
