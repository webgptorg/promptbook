'use client';

import { useEffect, useState } from 'react';
import type { AgentMenuTreeNode } from './AgentMenuStructure';
import { AgentMenuColumn } from './AgentMenuColumn';

/**
 * Props for the agent directory dropdown renderer.
 *
 * @private type of Header
 */
type AgentDirectoryDropdownProps = {
    readonly nodes: ReadonlyArray<AgentMenuTreeNode>;
    readonly onNavigate: () => void;
    readonly isTouchInput: boolean;
};

/**
 * Renders the nested agents menu with hover columns on pointer devices and
 * tap-expand behavior on touch-first devices.
 *
 * @private function of Header
 */
export function AgentDirectoryDropdown({ nodes, onNavigate, isTouchInput }: AgentDirectoryDropdownProps) {
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setExpandedFolders({});
    }, [nodes, isTouchInput]);

    /**
     * Toggles one folder subtree visibility in touch-first mode.
     */
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
