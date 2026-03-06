'use client';

import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { HeadlessLink } from '../_utils/headlessParam';
import type { AgentMenuTreeNode } from './agentMenuStructure';

/**
 * @private Props for the directory dropdown column.
 */
type AgentDirectoryDropdownProps = {
    nodes: ReadonlyArray<AgentMenuTreeNode>;
    onNavigate: () => void;
    isTouchInput: boolean;
};

/**
 * @private Renders the folder/agent hierarchy with hover columns for pointer devices.
 */
export function AgentDirectoryDropdown({ nodes, onNavigate, isTouchInput }: AgentDirectoryDropdownProps) {
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setExpandedFolders({});
    }, [nodes, isTouchInput]);

    const toggleFolder = (folderKey: string) => {
        setExpandedFolders((previous) => ({
            ...previous,
            [folderKey]: !previous[folderKey],
        }));
    };

    return (
        <div className="pointer-events-auto">
            <AgentMenuColumn
                nodes={nodes}
                onNavigate={onNavigate}
                depth={0}
                isTouchInput={isTouchInput}
                keyPrefix="root"
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
            />
        </div>
    );
}

/**
 * @private Props for a single column inside the dropdown.
 */
type AgentMenuColumnProps = AgentDirectoryDropdownProps & {
    depth: number;
    keyPrefix: string;
    expandedFolders: Record<string, boolean>;
    toggleFolder: (folderKey: string) => void;
};

/**
 * @private Renders one column of the agent hierarchy tree.
 */
function AgentMenuColumn({
    nodes,
    onNavigate,
    depth,
    isTouchInput,
    keyPrefix,
    expandedFolders,
    toggleFolder,
}: AgentMenuColumnProps) {
    return (
        <div
            className={`relative flex flex-col gap-1 px-1 py-1 ${isTouchInput && depth > 0 ? 'bg-transparent' : 'bg-white'}`}
            style={{ minWidth: isTouchInput ? undefined : depth === 0 ? 260 : 240 }}
        >
            {nodes.map((node) => {
                if (node.type === 'folder') {
                    const folderKey = `${keyPrefix}-folder-${node.id}`;
                    const hasChildren = node.children.length > 0;
                    const isExpanded = Boolean(expandedFolders[folderKey]);

                    return (
                        <div key={`folder-${node.id}`} className={`relative ${isTouchInput ? '' : 'group'}`}>
                            <HeadlessLink
                                href={node.href}
                                onClick={(event) => {
                                    if (isTouchInput && hasChildren && !isExpanded) {
                                        event.preventDefault();
                                        toggleFolder(folderKey);
                                        return;
                                    }
                                    onNavigate();
                                }}
                                className={`flex w-full items-center justify-between gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold transition-colors ${
                                    isTouchInput
                                        ? 'text-gray-800 hover:bg-white active:bg-gray-100'
                                        : 'text-gray-800 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                                title={node.label}
                            >
                                <span className="min-w-0">
                                    {node.renderLabel ?? <span className="truncate">{node.label}</span>}
                                </span>
                                {hasChildren && (
                                    <ChevronRight
                                        className={`h-4 w-4 text-gray-400 transition-transform duration-150 ${
                                            isTouchInput && isExpanded ? 'rotate-90' : ''
                                        }`}
                                    />
                                )}
                            </HeadlessLink>

                            {hasChildren &&
                                (isTouchInput ? (
                                    <div
                                        className={`ml-3 border-l border-gray-200 pl-2 ${
                                            isExpanded ? 'mt-1 block' : 'hidden'
                                        }`}
                                    >
                                        <AgentMenuColumn
                                            nodes={node.children}
                                            onNavigate={onNavigate}
                                            depth={depth + 1}
                                            isTouchInput={isTouchInput}
                                            keyPrefix={folderKey}
                                            expandedFolders={expandedFolders}
                                            toggleFolder={toggleFolder}
                                        />
                                    </div>
                                ) : (
                                    <div className="absolute left-full top-0 z-50 mt-0 hidden w-[260px] rounded-xl border border-gray-100 bg-white shadow-xl shadow-slate-900/10 group-hover:block">
                                        <AgentMenuColumn
                                            nodes={node.children}
                                            onNavigate={onNavigate}
                                            depth={depth + 1}
                                            isTouchInput={isTouchInput}
                                            keyPrefix={folderKey}
                                            expandedFolders={expandedFolders}
                                            toggleFolder={toggleFolder}
                                        />
                                    </div>
                                ))}
                        </div>
                    );
                }

                if (node.type === 'action') {
                    const baseClassName = `flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        node.isBold ? 'font-semibold text-gray-900' : 'text-gray-700'
                    } ${
                        isTouchInput
                            ? 'hover:bg-white active:bg-gray-100'
                            : 'hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                    }`.trim();

                    return (
                        <div key={node.id} className="relative">
                            <button
                                className={baseClassName}
                                onClick={() => {
                                    node.onClick?.();
                                    onNavigate();
                                }}
                                title={node.label}
                            >
                                <span className="min-w-0">
                                    {node.renderLabel ?? <span className="truncate">{node.label}</span>}
                                </span>
                            </button>
                        </div>
                    );
                }

                return (
                    <HeadlessLink
                        key={`agent-${node.agentName}`}
                        href={node.href}
                        onClick={onNavigate}
                        className={`flex w-full items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm transition-colors ${
                            isTouchInput
                                ? 'text-gray-700 hover:bg-white active:bg-gray-100'
                                : 'text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        title={node.label}
                    >
                        <span className="min-w-0">
                            {node.renderLabel ?? <span className="truncate">{node.label}</span>}
                        </span>
                    </HeadlessLink>
                );
            })}
        </div>
    );
}
