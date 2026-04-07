import type { ReactNode } from 'react';
import type { AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Folder data required for the folder-organized header menu.
 *
 * @private type of Header
 */
export type HeaderAgentMenuFolder = Pick<
    AgentOrganizationFolder,
    'id' | 'name' | 'parentId' | 'sortOrder' | 'icon' | 'color'
>;

/**
 * Node representing a folder inside the header menu hierarchy.
 *
 * @private type of Header
 */
export type AgentMenuFolderNode = {
    type: 'folder';
    id: number;
    label: string;
    renderLabel?: ReactNode;
    href: string;
    children: AgentMenuTreeNode[];
};

/**
 * Node representing an agent inside the header menu hierarchy.
 *
 * @private type of Header
 */
export type AgentMenuAgentNode = {
    type: 'agent';
    agentName: string;
    label: string;
    renderLabel?: ReactNode;
    href: string;
};

/**
 * Node representing a folder-level action entry inside the header menu hierarchy.
 *
 * @private type of Header
 */
export type AgentMenuActionNode = {
    type: 'action';
    id: string;
    label: string;
    renderLabel?: ReactNode;
    href?: string;
    onClick?: () => void | Promise<void>;
    isBold?: boolean;
    isBordered?: boolean;
};

/**
 * Unified node type for the agent menu tree.
 *
 * @private type of Header
 */
export type AgentMenuTreeNode = AgentMenuFolderNode | AgentMenuAgentNode | AgentMenuActionNode;

/**
 * Structure describing the agent menu tree and flat submenu items.
 *
 * @private type of Header
 */
export type AgentMenuStructure = {
    tree: AgentMenuTreeNode[];
    items: Array<SubMenuItem>;
};
