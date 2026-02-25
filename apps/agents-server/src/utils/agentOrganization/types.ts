import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import type { UserInfo } from '../getCurrentUser';
import type { AgentVisibility } from '../agentVisibility';

/**
 * Agent payload enriched with folder organization metadata.
 */
export type AgentOrganizationAgent = AgentBasicInformation & {
    /**
     * Visibility of the agent for the homepage list.
     */
    visibility?: AgentVisibility;
    /**
     * Folder identifier the agent belongs to, or null for root.
     */
    folderId: number | null;
    /**
     * Sort order of the agent within its parent folder.
     */
    sortOrder: number;
};

/**
 * Folder entity used in the agents organization UI.
 */
export type AgentOrganizationFolder = {
    /**
     * Unique identifier of the folder row.
     */
    id: number;
    /**
     * Display name for the folder.
     */
    name: string;
    /**
     * Parent folder identifier, or null for root.
     */
    parentId: number | null;
    /**
     * Sort order of the folder within its parent.
     */
    sortOrder: number;
    /**
     * Optional icon identifier used to render the folder.
     */
    icon: string | null;
    /**
     * Optional HEX color used to render the folder.
     */
    color: string | null;
};

/**
 * Request payload to reorder or move agents.
 */
export type AgentOrganizationAgentUpdate = {
    /**
     * Agent identifier, using permanentId or agentName.
     */
    identifier: string;
    /**
     * Folder identifier to move the agent into, or null for root.
     */
    folderId: number | null;
    /**
     * Updated sort order for the agent.
     */
    sortOrder: number;
};

/**
 * Request payload to reorder or move folders.
 */
export type AgentOrganizationFolderUpdate = {
    /**
     * Folder identifier to update.
     */
    id: number;
    /**
     * Parent folder identifier, or null for root.
     */
    parentId: number | null;
    /**
     * Updated sort order for the folder.
     */
    sortOrder: number;
};

/**
 * Batch update payload for agent and folder organization.
 */
export type AgentOrganizationUpdatePayload = {
    /**
     * Agent updates to apply in one request.
     */
    agents?: AgentOrganizationAgentUpdate[];
    /**
     * Folder updates to apply in one request.
     */
    folders?: AgentOrganizationFolderUpdate[];
};

/**
 * Options for loading agent organization data.
 */
export type AgentOrganizationLoadOptions = {
    /**
     * Which dataset to load from the database.
     */
    status: 'ACTIVE' | 'RECYCLE_BIN';
    /**
     * Whether private agents should be returned even when no user session is present.
     */
    includePrivate?: boolean;
};

/**
 * Result payload for agent organization loading.
 */
export type AgentOrganizationLoadResult = {
    /**
     * Agents available for the view.
     */
    agents: AgentOrganizationAgent[];
    /**
     * Folders available for the view.
     */
    folders: AgentOrganizationFolder[];
    /**
     * Current user information, if logged in.
     */
    currentUser: UserInfo | null;
};
