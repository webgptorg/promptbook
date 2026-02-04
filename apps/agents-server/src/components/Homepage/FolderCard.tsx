'use client';

import { string_url } from '@promptbook-local/types';
import { Edit3Icon, FolderIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react';
import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { resolveAgentAvatarImageUrl } from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { FILE_ACTION_BUTTON_CLASSES, FileCard } from './FileCard';

/**
 * Props for the folder card component.
 */
export type FolderCardProps = {
    /**
     * Display name of the folder.
     */
    readonly folderName: string;
    /**
     * Agents to preview inside the folder.
     */
    readonly previewAgents: AgentBasicInformation[];
    /**
     * Base URL of the agents server for placeholders.
     */
    readonly publicUrl: string_url;
    /**
     * Click handler for opening the folder.
     */
    readonly onOpen?: () => void;
    /**
     * Rename handler for the folder.
     */
    readonly onRename?: () => void;
    /**
     * Delete handler for the folder.
     */
    readonly onDelete?: () => void;
    /**
     * Restore handler for the folder.
     */
    readonly onRestore?: () => void;
};

/**
 * Renders a folder card with preview icons.
 */
export function FolderCard({
    folderName,
    previewAgents,
    publicUrl,
    onOpen,
    onRename,
    onDelete,
    onRestore,
}: FolderCardProps) {
    const previewSlots = Array.from({ length: 3 }, (_, index) => previewAgents[index] ?? null);

    return (
        <div className="relative h-full group">
            <button type="button" onClick={onOpen} className="block h-full w-full text-left">
                <FileCard className="flex h-full items-center gap-3 border-yellow-200 bg-yellow-50/60 hover:border-yellow-300">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-yellow-100 border border-yellow-200 text-yellow-700">
                        <FolderIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate" title={folderName}>
                            {folderName}
                        </h3>
                        <div className="mt-1 flex items-center gap-1.5">
                            {previewSlots.map((agent, index) => {
                                if (!agent) {
                                    return (
                                        <div
                                            key={`placeholder-${index}`}
                                            className="h-5 w-5 rounded border border-yellow-200 bg-yellow-100"
                                        />
                                    );
                                }

                                const imageUrl = resolveAgentAvatarImageUrl({ agent, baseUrl: publicUrl });

                                return (
                                    <div
                                        key={agent.permanentId || agent.agentName}
                                        className="h-5 w-5 rounded overflow-hidden border border-yellow-200 bg-white/70"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={imageUrl! /* <- TODO: Do the real check */}
                                            alt={agent.agentName}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </FileCard>
            </button>
            {(onRename || onDelete || onRestore) && (
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {onRestore && (
                        <button
                            className={`bg-green-500 hover:bg-green-600 ${FILE_ACTION_BUTTON_CLASSES}`}
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                onRestore();
                            }}
                            title="Restore folder"
                        >
                            <RotateCcwIcon className="w-3 h-3" />
                        </button>
                    )}
                    {onRename && (
                        <button
                            className={`bg-blue-500 hover:bg-blue-600 ${FILE_ACTION_BUTTON_CLASSES}`}
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                onRename();
                            }}
                            title="Rename folder"
                        >
                            <Edit3Icon className="w-3 h-3" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            className={`bg-red-500 hover:bg-red-600 ${FILE_ACTION_BUTTON_CLASSES}`}
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                onDelete();
                            }}
                            title="Delete folder"
                        >
                            <Trash2Icon className="w-3 h-3" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
