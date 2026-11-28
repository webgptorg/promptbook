import type { AgentMenuTreeNode } from './AgentMenuStructure';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Converts agent tree nodes into nested submenu items used by mobile rendering.
 *
 * @private function of Header
 */
export function createAgentHierarchyMobileItems(nodes: ReadonlyArray<AgentMenuTreeNode>): SubMenuItem[] {
    return nodes.map((node) => {
        if (node.type === 'folder') {
            const childItems = createAgentHierarchyMobileItems(node.children);

            return {
                label: node.renderLabel ?? node.label,
                href: node.href,
                isBold: true,
                items: childItems.length > 0 ? childItems : undefined,
            };
        }

        if (node.type === 'action') {
            return {
                label: node.renderLabel ?? node.label,
                href: node.href,
                onClick: node.onClick,
                isBold: node.isBold,
                isBordered: node.isBordered,
            };
        }

        return {
            label: node.renderLabel ?? node.label,
            href: node.href,
        };
    });
}
