import type { AgentsServerDatabase } from '../../database/schema';
import type { ServerSearchProvider } from '../ServerSearchProvider';
import type { ServerSearchResultItem } from '../ServerSearchResultItem';
import { createServerSearchMatcher } from '../createServerSearchMatcher';
import { loadLocalOrganizationSearchDataset } from './loadLocalOrganizationSearchDataset';
import { prefixSnippet } from './prefixSnippet';
import { sortAndLimitProviderResults } from './sortAndLimitProviderResults';
import { stringifyJsonForSearch } from './stringifyJsonForSearch';
import { toAgentProfile } from './toAgentProfile';
import { toFolderPathLabel } from './toFolderPathLabel';

/**
 * Agent row shape used by local agent search provider.
 *
 * @private function of createDefaultServerSearchProviders
 */
type AgentSearchRow = Pick<
    AgentsServerDatabase['public']['Tables']['Agent']['Row'],
    'id' | 'agentName' | 'permanentId' | 'agentProfile' | 'agentSource' | 'folderId' | 'visibility'
>;

/**
 * Creates provider for local agents (profile and book).
 *
 * @returns Configured local-agent search provider.
 * @private function of createDefaultServerSearchProviders
 */
export function createAgentsSearchProvider(): ServerSearchProvider {
    return {
        id: 'agents',
        label: 'Agents',
        async search(context) {
            const dataset = await loadLocalOrganizationSearchDataset({ includePrivate: Boolean(context.currentUser) });
            const results: ServerSearchResultItem[] = [];

            for (const agent of dataset.agents as ReadonlyArray<AgentSearchRow>) {
                const profile = toAgentProfile(agent.agentProfile);
                const routeAgentId = encodeURIComponent(agent.permanentId || agent.agentName);
                const agentLabel = profile.meta?.fullname || agent.agentName;
                const folderPath = toFolderPathLabel(agent.folderId, dataset.folderById);
                const profileSearchText = [
                    agent.agentName,
                    profile.meta?.fullname || '',
                    profile.meta?.description || '',
                    profile.personaDescription || '',
                    stringifyJsonForSearch(profile.meta || {}),
                ].join('\n');

                const profileMatch = createServerSearchMatcher(context.query, [
                    {
                        text: profileSearchText,
                        snippetText: profile.meta?.description || profile.personaDescription || profileSearchText,
                        weight: 3,
                    },
                ]);

                if (profileMatch) {
                    results.push({
                        id: `agent-profile-${agent.id}`,
                        providerId: 'agents',
                        group: 'Agents',
                        type: 'agent-profile',
                        icon: 'agent',
                        title: agentLabel,
                        snippet: prefixSnippet(folderPath, profileMatch.snippet),
                        href: `/agents/${routeAgentId}`,
                        score: profileMatch.score + 42,
                    });
                }

                const bookMatch = createServerSearchMatcher(context.query, [
                    { text: agent.agentSource || '', snippetText: agent.agentSource || '', weight: 2.1 },
                    { text: `${agent.agentName}\n${profile.meta?.fullname || ''}`, weight: 0.4 },
                ]);

                if (bookMatch) {
                    results.push({
                        id: `agent-book-${agent.id}`,
                        providerId: 'agents',
                        group: 'Agents',
                        type: 'agent-book',
                        icon: 'book',
                        title: `${agentLabel} (Book)`,
                        snippet: prefixSnippet(folderPath, bookMatch.snippet),
                        href: `/agents/${routeAgentId}/book`,
                        score: bookMatch.score + 28,
                    });
                }
            }

            return sortAndLimitProviderResults(results, context.limitPerProvider);
        },
    };
}
