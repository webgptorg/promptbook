'use server';

import { loadAgentOrganizationState } from '../../../utils/agentOrganization/loadAgentOrganizationState';
import type {
    AgentOrganizationAgent,
    AgentOrganizationFolder,
} from '../../../utils/agentOrganization/types';
import { getCurrentUser } from '../../../utils/getCurrentUser';

/**
 * Payload for recycle bin items.
 */
export type RecycleBinItemsResult = {
    /**
     * Deleted agents available in the recycle bin.
     */
    agents: ReadonlyArray<AgentOrganizationAgent>;
    /**
     * Deleted folders available in the recycle bin.
     */
    folders: ReadonlyArray<AgentOrganizationFolder>;
    /**
     * Current user snapshot, if logged in.
     */
    currentUser: Awaited<ReturnType<typeof getCurrentUser>>;
};

/**
 * Loads deleted agents and folders for the recycle bin view.
 */
export async function getRecycleBinItems(): Promise<RecycleBinItemsResult> {
    const { agents, folders, currentUser } = await loadAgentOrganizationState({ status: 'RECYCLE_BIN' });
    return { agents, folders, currentUser };
}
