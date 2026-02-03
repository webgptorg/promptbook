'use server';

import { getMetadata } from '../../database/getMetadata';
import { loadAgentOrganizationState } from '../../utils/agentOrganization/loadAgentOrganizationState';
import { getCurrentUser } from '../../utils/getCurrentUser';
import type {
    AgentOrganizationAgent,
    AgentOrganizationFolder,
} from '../../utils/agentOrganization/types';

/**
 * Agent data enriched with optional visibility information for the home/dashboard pages.
 */
export type HomePageAgent = AgentOrganizationAgent;

/**
 * Folder data for the home/dashboard pages.
 */
export type HomePageFolder = AgentOrganizationFolder;

/**
 * Result payload for home/dashboard agents, including the current user snapshot.
 */
export type HomePageAgentsResult = {
    agents: ReadonlyArray<HomePageAgent>;
    folders: ReadonlyArray<HomePageFolder>;
    currentUser: Awaited<ReturnType<typeof getCurrentUser>>;
    /**
     * Markdown message displayed above the agents list on the homepage.
     */
    homepageMessage: string | null;
};

/**
 * Loads agents for the home/dashboard pages with visibility filtering applied.
 */
export async function getHomePageAgents(): Promise<HomePageAgentsResult> {
    const { agents, folders, currentUser } = await loadAgentOrganizationState({ status: 'ACTIVE' });
    const homepageMessage = await getMetadata('HOMEPAGE_MESSAGE');

    return { agents, folders, currentUser, homepageMessage };
}
