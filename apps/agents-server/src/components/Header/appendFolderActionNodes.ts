import type { ReactNode } from 'react';
import type { AgentMenuActionNode, AgentMenuTreeNode } from './AgentMenuStructure';

/**
 * Configuration for injecting reusable folder action nodes into each folder branch.
 *
 * @private type of Header
 */
export type FolderActionNodeConfig = {
    /**
     * Label displayed for the "view all agents in this folder" action.
     */
    readonly viewAllLabel: string;

    /**
     * Text fallback displayed for the "create new agent" action.
     */
    readonly createLabel: string;

    /**
     * Optional richer node displayed for the create action.
     */
    readonly renderCreateLabel?: ReactNode;

    /**
     * Optional callback that opens the create flow scoped to a folder.
     */
    readonly onCreateInFolder?: (folderId: number) => void;
};

/**
 * Appends "View all agents" and optional "Create new agent" actions to each folder branch.
 *
 * @param nodes - Existing folder/agent hierarchy.
 * @param config - Labels and callbacks used for action injection.
 * @returns New hierarchy with per-folder action nodes.
 * @private function of Header
 */
export function appendFolderActionNodes(
    nodes: ReadonlyArray<AgentMenuTreeNode>,
    config: FolderActionNodeConfig,
): AgentMenuTreeNode[] {
    return nodes.map((node) => {
        if (node.type !== 'folder') {
            return node;
        }

        const nestedChildren = appendFolderActionNodes(node.children, config);
        const actionNodes: AgentMenuActionNode[] = [
            {
                type: 'action',
                id: `folder-${node.id}-view-all`,
                label: config.viewAllLabel,
                href: node.href,
                isBold: true,
                isBordered: nestedChildren.length > 0,
            },
        ];

        if (config.onCreateInFolder) {
            actionNodes.push({
                type: 'action',
                id: `folder-${node.id}-create`,
                label: config.createLabel,
                renderLabel: config.renderCreateLabel,
                onClick: () => config.onCreateInFolder?.(node.id),
                isBold: true,
            });
        }

        return {
            ...node,
            children: [...nestedChildren, ...actionNodes],
        };
    });
}
