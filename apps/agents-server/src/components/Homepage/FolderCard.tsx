'use client';

import { generatePlaceholderAgentProfileImageUrl } from '@promptbook-local/core';
import { string_url } from '@promptbook-local/types';
import { Edit3Icon, FolderIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react';
import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { Card } from './Card';

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

const ACTION_BUTTON_CLASSES =
    'text-white px-2 py-1 rounded shadow text-xs font-medium transition-colors uppercase tracking-wider opacity-80 hover:opacity-100';

/**
 * Renders a folder card with preview icons.
 */
export function FolderCard({ folderName, previewAgents, publicUrl, onOpen, onRename, onDelete, onRestore }: FolderCardProps) {
    const previewSlots = Array.from({ length: 4 }, (_, index) => previewAgents[index] ?? null);

    return (
        <div className="relative h-full group">
            <button
                type="button"
                onClick={onOpen}
                className="block h-full w-full text-left transition-transform hover:scale-[1.02] duration-300"
            >
                <Card className="flex flex-col h-full border-yellow-100 bg-yellow-50/70 hover:border-yellow-200">
                    <div className="flex items-center gap-2 mb-4 text-yellow-700">
                        <FolderIcon className="w-5 h-5" />
                        <span className="text-sm font-semibold uppercase tracking-wide">Folder</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {previewSlots.map((agent, index) => {
                            if (!agent) {
                                return (
                                    <div
                                        key={`placeholder-${index}`}
                                        className="h-12 w-full rounded-lg bg-yellow-100 border border-yellow-200"
                                    />
                                );
                            }

                            const imageUrl =
                                agent.meta.image ||
                                generatePlaceholderAgentProfileImageUrl(agent.agentName, publicUrl);

                            return (
                                <div
                                    key={agent.permanentId || agent.agentName}
                                    className="h-12 w-full rounded-lg overflow-hidden border border-yellow-200 bg-white/70"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={imageUrl} alt={agent.agentName} className="w-full h-full object-cover" />
                                </div>
                            );
                        })}
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-900">{folderName}</h3>
                </Card>
            </button>
            {(onRename || onDelete || onRestore) && (
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {onRestore && (
                        <button
                            className={`bg-green-500 hover:bg-green-600 ${ACTION_BUTTON_CLASSES}`}
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
                            className={`bg-blue-500 hover:bg-blue-600 ${ACTION_BUTTON_CLASSES}`}
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
                            className={`bg-red-500 hover:bg-red-600 ${ACTION_BUTTON_CLASSES}`}
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
