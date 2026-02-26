import type { AgentBasicInformation } from '../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { $getTableName } from '../database/$getTableName';
import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import type { AgentsServerDatabase, Json } from '../database/schema';
import { $provideServer } from '../tools/$provideServer';
import { getVisibleCommitmentDefinitions } from '../utils/getVisibleCommitmentDefinitions';
import { getFederatedServers } from '../utils/getFederatedServers';
import { buildFolderPath, getFolderPathSegments } from '../utils/agentOrganization/folderPath';
import type { ServerSearchProvider } from './ServerSearchProvider';
import type { ServerSearchResultItem } from './ServerSearchResultItem';
import { createServerSearchMatcher, normalizeServerSearchText } from './createServerSearchMatcher';

/**
 * Maximum number of federated-agent records requested from one remote server.
 */
const FEDERATED_AGENTS_PER_SERVER_LIMIT = 240;

/**
 * Timeout for one federated search fetch.
 */
const FEDERATED_FETCH_TIMEOUT_MS = 3200;

/**
 * Maximum number of admin-log records processed by one provider in memory.
 */
const ADMIN_LOG_LIMIT = 280;

/**
 * Maximum number of per-user chats processed in memory.
 */
const USER_CHAT_LIMIT = 240;

/**
 * Regex used to remove duplicate trailing slashes from base URLs.
 */
const TRAILING_SLASH_PATTERN = /\/+$/;

/**
 * Agent table row shape used by search providers.
 */
type AgentSearchRow = Pick<
    AgentsServerDatabase['public']['Tables']['Agent']['Row'],
    'id' | 'agentName' | 'permanentId' | 'agentProfile' | 'agentSource' | 'folderId' | 'visibility'
>;

/**
 * Folder table row shape used by search providers.
 */
type AgentFolderSearchRow = Pick<
    AgentsServerDatabase['public']['Tables']['AgentFolder']['Row'],
    'id' | 'name' | 'parentId'
>;

/**
 * User-chat table row shape used by search providers.
 */
type UserChatSearchRow = Pick<
    AgentsServerDatabase['public']['Tables']['UserChat']['Row'],
    'id' | 'updatedAt' | 'lastMessageAt' | 'agentPermanentId' | 'messages'
>;

/**
 * Chat-history table row shape used by search providers.
 */
type ChatHistorySearchRow = Pick<
    AgentsServerDatabase['public']['Tables']['ChatHistory']['Row'],
    'id' | 'createdAt' | 'agentName' | 'message' | 'url' | 'ip'
>;

/**
 * Metadata table row shape used by search providers.
 */
type MetadataSearchRow = Pick<
    AgentsServerDatabase['public']['Tables']['Metadata']['Row'],
    'id' | 'key' | 'value' | 'note'
>;

/**
 * User table row shape used by search providers.
 */
type UserSearchRow = Pick<
    AgentsServerDatabase['public']['Tables']['User']['Row'],
    'id' | 'username' | 'isAdmin' | 'createdAt'
>;

/**
 * Message table row shape used by search providers.
 */
type MessageSearchRow = Pick<
    AgentsServerDatabase['public']['Tables']['Message']['Row'],
    'id' | 'createdAt' | 'channel' | 'direction' | 'content' | 'metadata'
>;

/**
 * File table row shape used by search providers.
 */
type FileSearchRow = Pick<
    AgentsServerDatabase['public']['Tables']['File']['Row'],
    'id' | 'createdAt' | 'fileName' | 'fileType' | 'purpose' | 'status' | 'shortUrl' | 'storageUrl'
>;

/**
 * Image table row shape used by search providers.
 */
type ImageSearchRow = Pick<
    AgentsServerDatabase['public']['Tables']['Image']['Row'],
    'id' | 'createdAt' | 'filename' | 'prompt' | 'purpose'
>;

/**
 * Parsed federated-agent shape returned by remote `/api/agents` endpoints.
 */
type FederatedAgentSearchRow = {
    agentName: string;
    permanentId?: string | null;
    personaDescription?: string;
    meta?: {
        fullname?: string;
        description?: string;
    };
    url?: string;
};

/**
 * Shared local organization dataset used by multiple providers.
 */
type LocalOrganizationSearchDataset = {
    agents: ReadonlyArray<AgentSearchRow>;
    folders: ReadonlyArray<AgentFolderSearchRow>;
    folderById: Map<number, AgentFolderSearchRow>;
};

/**
 * Creates the default list of pluggable server-search providers.
 *
 * @private Internal utility for `apps/agents-server`.
 */
export function createDefaultServerSearchProviders(): ReadonlyArray<ServerSearchProvider> {
    return [
        createAgentsSearchProvider(),
        createFederatedAgentsSearchProvider(),
        createFoldersSearchProvider(),
        createConversationsSearchProvider(),
        createDocumentationSearchProvider(),
        createMetadataSearchProvider(),
        createUsersSearchProvider(),
        createMessagesSearchProvider(),
        createFilesSearchProvider(),
        createImagesSearchProvider(),
        createNavigationSearchProvider(),
    ];
}

/**
 * Provider for local agents (profile and book).
 */
function createAgentsSearchProvider(): ServerSearchProvider {
    return {
        id: 'agents',
        label: 'Agents',
        async search(context) {
            const dataset = await loadLocalOrganizationSearchDataset({ includePrivate: Boolean(context.currentUser) });
            const results: ServerSearchResultItem[] = [];

            for (const agent of dataset.agents) {
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

/**
 * Provider for agents fetched from federated servers.
 */
function createFederatedAgentsSearchProvider(): ServerSearchProvider {
    return {
        id: 'federated-agents',
        label: 'Federated Agents',
        async search(context) {
            const canSearchFederated = await canSearchFederatedAgents(Boolean(context.currentUser));
            if (!canSearchFederated) {
                return [];
            }

            let federatedServers: string[] = [];
            try {
                federatedServers = await getFederatedServers({ excludeHiddenCoreServer: true });
            } catch (error) {
                console.error('[search] Failed to load federated servers:', error);
                return [];
            }

            const { publicUrl } = await $provideServer();
            const localOrigin = publicUrl.origin.replace(TRAILING_SLASH_PATTERN, '');
            const remoteServerUrls = federatedServers
                .map((url) => normalizeServerUrl(url))
                .filter((url) => url.length > 0)
                .filter((url) => url !== localOrigin);

            if (remoteServerUrls.length === 0) {
                return [];
            }

            const remoteResponses = await Promise.all(
                remoteServerUrls.map(async (serverUrl) => {
                    const payload = await fetchFederatedAgentsPayload(serverUrl);
                    return { serverUrl, payload };
                }),
            );

            const results: ServerSearchResultItem[] = [];
            for (const { serverUrl, payload } of remoteResponses) {
                if (!payload) {
                    continue;
                }

                for (const agent of payload) {
                    const agentLabel = agent.meta?.fullname || agent.agentName;
                    const profileText = [
                        agent.agentName,
                        agent.meta?.fullname || '',
                        agent.meta?.description || '',
                        agent.personaDescription || '',
                    ].join('\n');
                    const match = createServerSearchMatcher(context.query, [
                        {
                            text: profileText,
                            snippetText: agent.meta?.description || agent.personaDescription || profileText,
                            weight: 2.2,
                        },
                    ]);
                    if (!match) {
                        continue;
                    }

                    const fallbackRouteAgentId = encodeURIComponent(agent.permanentId || agent.agentName);
                    const href = agent.url || `${serverUrl}/agents/${fallbackRouteAgentId}`;

                    results.push({
                        id: `federated-${normalizeServerSearchText(serverUrl)}-${agent.agentName}`,
                        providerId: 'federated-agents',
                        group: 'Federated Agents',
                        type: 'federated-agent-profile',
                        icon: 'federated-agent',
                        title: `${agentLabel} (${getServerHostname(serverUrl)})`,
                        snippet: match.snippet,
                        href,
                        score: match.score + 16,
                        isExternal: true,
                    });
                }
            }

            return sortAndLimitProviderResults(results, context.limitPerProvider);
        },
    };
}

/**
 * Provider for agent folders.
 */
function createFoldersSearchProvider(): ServerSearchProvider {
    return {
        id: 'folders',
        label: 'Folders',
        async search(context) {
            const dataset = await loadLocalOrganizationSearchDataset({ includePrivate: Boolean(context.currentUser) });
            const results: ServerSearchResultItem[] = [];

            for (const folder of dataset.folders) {
                const pathSegments = getFolderPathSegments(folder.id, dataset.folderById);
                const folderPathNames = pathSegments.map((segment) => segment.name);
                const folderPathLabel = folderPathNames.join(' / ');
                const match = createServerSearchMatcher(context.query, [
                    { text: `${folder.name}\n${folderPathLabel}`, snippetText: folderPathLabel, weight: 2.5 },
                ]);

                if (!match) {
                    continue;
                }

                const folderParam = buildFolderPath(folderPathNames);
                results.push({
                    id: `folder-${folder.id}`,
                    providerId: 'folders',
                    group: 'Folders',
                    type: 'folder',
                    icon: 'folder',
                    title: folderPathLabel || folder.name,
                    snippet: match.snippet,
                    href: `/agents?folder=${folderParam}`,
                    score: match.score + 12,
                });
            }

            return sortAndLimitProviderResults(results, context.limitPerProvider);
        },
    };
}

/**
 * Provider for conversations (user chats and admin chat history).
 */
function createConversationsSearchProvider(): ServerSearchProvider {
    return {
        id: 'conversations',
        label: 'Conversations',
        async search(context) {
            const userChatResults = await searchUserConversations(context);
            const adminChatResults = await searchAdminConversations(context);
            return sortAndLimitProviderResults(
                [...userChatResults, ...adminChatResults],
                context.limitPerProvider,
            );
        },
    };
}

/**
 * Provider for commitment documentation pages.
 */
function createDocumentationSearchProvider(): ServerSearchProvider {
    return {
        id: 'documentation',
        label: 'Documentation',
        async search(context) {
            const groupedCommitments = getVisibleCommitmentDefinitions();
            const results: ServerSearchResultItem[] = [];

            const overviewMatch = createServerSearchMatcher(context.query, [
                {
                    text: 'documentation docs commitments overview reference',
                    snippetText: 'Browse all commitment documentation pages and API reference.',
                    weight: 1.4,
                },
            ]);
            if (overviewMatch) {
                results.push({
                    id: 'docs-overview',
                    providerId: 'documentation',
                    group: 'Documentation',
                    type: 'docs-overview',
                    icon: 'documentation',
                    title: 'Documentation overview',
                    snippet: overviewMatch.snippet || 'Browse all commitment documentation pages and API reference.',
                    href: '/docs',
                    score: overviewMatch.score + 4,
                });
            }

            for (const commitmentGroup of groupedCommitments) {
                const commitmentLabel = commitmentGroup.primary.type;
                const aliases = commitmentGroup.aliases.join(' / ');
                const searchText = [
                    commitmentLabel,
                    aliases,
                    commitmentGroup.primary.description || '',
                ].join('\n');
                const match = createServerSearchMatcher(context.query, [
                    {
                        text: searchText,
                        snippetText: commitmentGroup.primary.description || aliases || commitmentLabel,
                        weight: 2.4,
                    },
                ]);
                if (!match) {
                    continue;
                }

                results.push({
                    id: `docs-${commitmentLabel}`,
                    providerId: 'documentation',
                    group: 'Documentation',
                    type: 'commitment-doc',
                    icon: 'documentation',
                    title: commitmentLabel,
                    snippet: match.snippet,
                    href: `/docs/${encodeURIComponent(commitmentLabel)}`,
                    score: match.score + 14,
                });
            }

            return sortAndLimitProviderResults(results, context.limitPerProvider);
        },
    };
}

/**
 * Provider for metadata entries (admin-only).
 */
function createMetadataSearchProvider(): ServerSearchProvider {
    return {
        id: 'metadata',
        label: 'Metadata',
        async search(context) {
            if (!context.isAdmin) {
                return [];
            }

            const supabase = $provideSupabaseForServer();
            const { data, error } = await supabase
                .from(await $getTableName('Metadata'))
                .select('id, key, value, note')
                .order('key');

            if (error) {
                console.error('[search] Failed to load metadata rows:', error);
                return [];
            }

            const results: ServerSearchResultItem[] = [];
            for (const row of (data || []) as MetadataSearchRow[]) {
                const match = createServerSearchMatcher(context.query, [
                    {
                        text: [row.key, row.value, row.note || ''].join('\n'),
                        snippetText: [row.value, row.note || ''].join('\n'),
                        weight: 2.8,
                    },
                ]);
                if (!match) {
                    continue;
                }

                results.push({
                    id: `metadata-${row.id}`,
                    providerId: 'metadata',
                    group: 'Metadata',
                    type: 'metadata',
                    icon: 'metadata',
                    title: row.key,
                    snippet: match.snippet,
                    href: '/admin/metadata',
                    score: match.score + 18,
                });
            }

            return sortAndLimitProviderResults(results, context.limitPerProvider);
        },
    };
}

/**
 * Provider for users (admin-only).
 */
function createUsersSearchProvider(): ServerSearchProvider {
    return {
        id: 'users',
        label: 'Users',
        async search(context) {
            if (!context.isAdmin) {
                return [];
            }

            const supabase = $provideSupabaseForServer();
            const { data, error } = await supabase
                .from(await $getTableName('User'))
                .select('id, username, isAdmin, createdAt')
                .order('username');

            if (error) {
                console.error('[search] Failed to load users:', error);
                return [];
            }

            const results: ServerSearchResultItem[] = [];
            for (const user of (data || []) as UserSearchRow[]) {
                const match = createServerSearchMatcher(context.query, [
                    {
                        text: `${user.username} ${user.isAdmin ? 'admin' : 'user'} ${user.createdAt}`,
                        snippetText: `${user.isAdmin ? 'Admin' : 'User'} account`,
                        weight: 2.8,
                    },
                ]);
                if (!match) {
                    continue;
                }

                results.push({
                    id: `user-${user.id}`,
                    providerId: 'users',
                    group: 'Users',
                    type: 'user',
                    icon: 'user',
                    title: user.username,
                    snippet: match.snippet,
                    href: `/admin/users/${encodeURIComponent(user.username)}`,
                    score: match.score + 18,
                });
            }

            return sortAndLimitProviderResults(results, context.limitPerProvider);
        },
    };
}

/**
 * Provider for outbound messages/emails (admin-only).
 */
function createMessagesSearchProvider(): ServerSearchProvider {
    return {
        id: 'messages',
        label: 'Messages',
        async search(context) {
            if (!context.isAdmin) {
                return [];
            }

            const supabase = $provideSupabaseForServer();
            const { data, error } = await supabase
                .from(await $getTableName('Message'))
                .select('id, createdAt, channel, direction, content, metadata')
                .order('createdAt', { ascending: false })
                .limit(ADMIN_LOG_LIMIT);

            if (error) {
                console.error('[search] Failed to load messages:', error);
                return [];
            }

            const results: ServerSearchResultItem[] = [];
            for (const message of (data || []) as MessageSearchRow[]) {
                const match = createServerSearchMatcher(context.query, [
                    {
                        text: [
                            message.channel,
                            message.direction,
                            message.content,
                            stringifyJsonForSearch(message.metadata),
                        ].join('\n'),
                        snippetText: message.content,
                        weight: 1.8,
                    },
                ]);
                if (!match) {
                    continue;
                }

                results.push({
                    id: `message-${message.id}`,
                    providerId: 'messages',
                    group: 'Messages',
                    type: 'message',
                    icon: 'message',
                    title: `${message.channel} (${message.direction})`,
                    snippet: match.snippet,
                    href: '/admin/messages',
                    score: match.score + 8,
                });
            }

            return sortAndLimitProviderResults(results, context.limitPerProvider);
        },
    };
}

/**
 * Provider for uploaded files (admin-only).
 */
function createFilesSearchProvider(): ServerSearchProvider {
    return {
        id: 'files',
        label: 'Files',
        async search(context) {
            if (!context.isAdmin) {
                return [];
            }

            const supabase = $provideSupabaseForServer();
            const { data, error } = await supabase
                .from(await $getTableName('File'))
                .select('id, createdAt, fileName, fileType, purpose, status, shortUrl, storageUrl')
                .order('createdAt', { ascending: false })
                .limit(ADMIN_LOG_LIMIT);

            if (error) {
                console.error('[search] Failed to load files:', error);
                return [];
            }

            const results: ServerSearchResultItem[] = [];
            for (const file of (data || []) as FileSearchRow[]) {
                const match = createServerSearchMatcher(context.query, [
                    {
                        text: [
                            file.fileName,
                            file.fileType,
                            file.purpose,
                            file.status,
                            file.shortUrl || '',
                            file.storageUrl || '',
                        ].join('\n'),
                        snippetText: `${file.fileType} ${file.purpose} ${file.status}`,
                        weight: 1.7,
                    },
                ]);
                if (!match) {
                    continue;
                }

                results.push({
                    id: `file-${file.id}`,
                    providerId: 'files',
                    group: 'Files',
                    type: 'file',
                    icon: 'file',
                    title: file.fileName,
                    snippet: match.snippet,
                    href: '/admin/files',
                    score: match.score + 7,
                });
            }

            return sortAndLimitProviderResults(results, context.limitPerProvider);
        },
    };
}

/**
 * Provider for generated images (admin-only).
 */
function createImagesSearchProvider(): ServerSearchProvider {
    return {
        id: 'images',
        label: 'Images',
        async search(context) {
            if (!context.isAdmin) {
                return [];
            }

            const supabase = $provideSupabaseForServer();
            const { data, error } = await supabase
                .from(await $getTableName('Image'))
                .select('id, createdAt, filename, prompt, purpose')
                .order('createdAt', { ascending: false })
                .limit(ADMIN_LOG_LIMIT);

            if (error) {
                console.error('[search] Failed to load images:', error);
                return [];
            }

            const results: ServerSearchResultItem[] = [];
            for (const image of (data || []) as ImageSearchRow[]) {
                const match = createServerSearchMatcher(context.query, [
                    {
                        text: [image.filename, image.prompt, image.purpose || ''].join('\n'),
                        snippetText: image.prompt,
                        weight: 1.7,
                    },
                ]);
                if (!match) {
                    continue;
                }

                results.push({
                    id: `image-${image.id}`,
                    providerId: 'images',
                    group: 'Images',
                    type: 'image',
                    icon: 'image',
                    title: image.filename,
                    snippet: match.snippet,
                    href: '/admin/images',
                    score: match.score + 7,
                });
            }

            return sortAndLimitProviderResults(results, context.limitPerProvider);
        },
    };
}

/**
 * Provider for static navigation destinations.
 */
function createNavigationSearchProvider(): ServerSearchProvider {
    return {
        id: 'navigation',
        label: 'Navigation',
        async search(context) {
            const navigationItems: Array<{
                id: string;
                title: string;
                href: string;
                description: string;
                icon: ServerSearchResultItem['icon'];
                adminOnly?: boolean;
                authOnly?: boolean;
            }> = [
                {
                    id: 'nav-agents',
                    title: 'Agents',
                    href: '/agents',
                    description: 'Browse the complete agent and folder directory.',
                    icon: 'agent',
                },
                {
                    id: 'nav-docs',
                    title: 'Documentation',
                    href: '/docs',
                    description: 'View commitment docs and usage examples.',
                    icon: 'documentation',
                },
                {
                    id: 'nav-system-profile',
                    title: 'System Profile',
                    href: '/system/profile',
                    description: 'Manage your account profile and avatar.',
                    icon: 'system',
                    authOnly: true,
                },
                {
                    id: 'nav-system-memory',
                    title: 'User Memory',
                    href: '/system/user-memory',
                    description: 'Review and manage your saved memories.',
                    icon: 'system',
                    authOnly: true,
                },
                {
                    id: 'nav-admin-chat-history',
                    title: 'Chat history',
                    href: '/admin/chat-history',
                    description: 'Inspect recorded chat logs across the server.',
                    icon: 'conversation',
                    adminOnly: true,
                },
                {
                    id: 'nav-admin-usage',
                    title: 'Usage analytics',
                    href: '/admin/usage',
                    description: 'Analyze agent usage by scope, time, and call source.',
                    icon: 'system',
                    adminOnly: true,
                },
                {
                    id: 'nav-admin-chat-feedback',
                    title: 'Chat feedback',
                    href: '/admin/chat-feedback',
                    description: 'Review user feedback and expected answers.',
                    icon: 'conversation',
                    adminOnly: true,
                },
                {
                    id: 'nav-admin-metadata',
                    title: 'Metadata',
                    href: '/admin/metadata',
                    description: 'Configure server metadata and feature flags.',
                    icon: 'metadata',
                    adminOnly: true,
                },
                {
                    id: 'nav-admin-users',
                    title: 'Users',
                    href: '/admin/users',
                    description: 'Manage local users and admin permissions.',
                    icon: 'user',
                    adminOnly: true,
                },
                {
                    id: 'nav-admin-messages',
                    title: 'Messages & Emails',
                    href: '/admin/messages',
                    description: 'Inspect sent messages and email deliveries.',
                    icon: 'message',
                    adminOnly: true,
                },
                {
                    id: 'nav-admin-files',
                    title: 'Files',
                    href: '/admin/files',
                    description: 'Browse uploaded files available on the server.',
                    icon: 'file',
                    adminOnly: true,
                },
                {
                    id: 'nav-admin-images',
                    title: 'Images gallery',
                    href: '/admin/images',
                    description: 'Browse generated images and prompts.',
                    icon: 'image',
                    adminOnly: true,
                },
            ];

            const results: ServerSearchResultItem[] = [];
            for (const item of navigationItems) {
                if (item.adminOnly && !context.isAdmin) {
                    continue;
                }
                if (item.authOnly && !context.currentUser) {
                    continue;
                }

                const match = createServerSearchMatcher(context.query, [
                    {
                        text: `${item.title}\n${item.description}\n${item.href}`,
                        snippetText: item.description,
                        weight: 1.3,
                    },
                ]);

                if (!match) {
                    continue;
                }

                results.push({
                    id: item.id,
                    providerId: 'navigation',
                    group: 'Navigation',
                    type: 'navigation-link',
                    icon: item.icon,
                    title: item.title,
                    snippet: match.snippet,
                    href: item.href,
                    score: match.score + 3,
                });
            }

            return sortAndLimitProviderResults(results, context.limitPerProvider);
        },
    };
}

/**
 * Loads active agents and folders and prepares lookups for search providers.
 */
async function loadLocalOrganizationSearchDataset(options: {
    includePrivate: boolean;
}): Promise<LocalOrganizationSearchDataset> {
    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');
    const folderTable = await $getTableName('AgentFolder');

    const agentQuery = supabase
        .from(agentTable)
        .select('id, agentName, permanentId, agentProfile, agentSource, folderId, visibility')
        .is('deletedAt', null);

    if (!options.includePrivate) {
        agentQuery.eq('visibility', 'PUBLIC');
    }

    const folderQuery = supabase.from(folderTable).select('id, name, parentId').is('deletedAt', null);

    const [agentResult, folderResult] = await Promise.all([agentQuery, folderQuery]);

    if (agentResult.error) {
        throw new Error(`Failed to load searchable agents: ${agentResult.error.message}`);
    }
    if (folderResult.error) {
        throw new Error(`Failed to load searchable folders: ${folderResult.error.message}`);
    }

    const folders = (folderResult.data || []) as AgentFolderSearchRow[];
    const agents = (agentResult.data || []) as AgentSearchRow[];
    const folderById = new Map<number, AgentFolderSearchRow>(folders.map((folder) => [folder.id, folder]));

    const visibleFolderIds = new Set<number>();
    if (!options.includePrivate) {
        for (const agent of agents) {
            let currentFolderId = agent.folderId;
            while (currentFolderId !== null) {
                const folder = folderById.get(currentFolderId);
                if (!folder) {
                    break;
                }
                visibleFolderIds.add(folder.id);
                currentFolderId = folder.parentId;
            }
        }
    }

    const filteredFolders = options.includePrivate
        ? folders
        : folders.filter((folder) => visibleFolderIds.has(folder.id));

    return {
        agents,
        folders: filteredFolders,
        folderById: new Map<number, AgentFolderSearchRow>(filteredFolders.map((folder) => [folder.id, folder])),
    };
}

/**
 * Searches per-user persisted conversations.
 */
async function searchUserConversations(
    context: Parameters<ServerSearchProvider['search']>[0],
): Promise<ServerSearchResultItem[]> {
    if (!context.currentUser?.id) {
        return [];
    }

    const supabase = $provideSupabaseForServer();
    const userId = context.currentUser.id;
    const [chatResult, agentResult] = await Promise.all([
        supabase
            .from(await $getTableName('UserChat'))
            .select('id, updatedAt, lastMessageAt, agentPermanentId, messages')
            .eq('userId', userId)
            .order('lastMessageAt', { ascending: false, nullsFirst: false })
            .limit(USER_CHAT_LIMIT),
        supabase
            .from(await $getTableName('Agent'))
            .select('agentName, permanentId, agentProfile')
            .is('deletedAt', null),
    ]);

    if (chatResult.error) {
        console.error('[search] Failed to load user chats:', chatResult.error);
        return [];
    }
    if (agentResult.error) {
        console.error('[search] Failed to load agents for chat linking:', agentResult.error);
        return [];
    }

    const agentByPermanentId = new Map<string, Pick<AgentSearchRow, 'agentName' | 'permanentId' | 'agentProfile'>>();
    for (const row of (agentResult.data || []) as Array<
        Pick<AgentSearchRow, 'agentName' | 'permanentId' | 'agentProfile'>
    >) {
        if (!row.permanentId) {
            continue;
        }
        agentByPermanentId.set(row.permanentId, row);
    }

    const results: ServerSearchResultItem[] = [];
    for (const chat of (chatResult.data || []) as UserChatSearchRow[]) {
        const relatedAgent = agentByPermanentId.get(chat.agentPermanentId);
        if (!relatedAgent) {
            continue;
        }

        const profile = toAgentProfile(relatedAgent.agentProfile);
        const agentLabel = profile.meta?.fullname || relatedAgent.agentName;
        const messageText = flattenChatMessagesToText(chat.messages);
        const chatTitle = extractConversationTitle(messageText) || `Conversation with ${agentLabel}`;
        const match = createServerSearchMatcher(context.query, [
            {
                text: [agentLabel, relatedAgent.agentName, chatTitle, messageText].join('\n'),
                snippetText: messageText || chatTitle,
                weight: 2.4,
            },
        ]);

        if (!match) {
            continue;
        }

        const routeAgentId = encodeURIComponent(relatedAgent.permanentId || relatedAgent.agentName);
        results.push({
            id: `conversation-user-${chat.id}`,
            providerId: 'conversations',
            group: 'Conversations',
            type: 'user-conversation',
            icon: 'conversation',
            title: chatTitle,
            snippet: match.snippet,
            href: `/agents/${routeAgentId}/chat?chat=${encodeURIComponent(chat.id)}`,
            score: match.score + 22,
        });
    }

    return results;
}

/**
 * Searches admin-visible chat history logs.
 */
async function searchAdminConversations(
    context: Parameters<ServerSearchProvider['search']>[0],
): Promise<ServerSearchResultItem[]> {
    if (!context.isAdmin) {
        return [];
    }

    const supabase = $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('ChatHistory'))
        .select('id, createdAt, agentName, message, url, ip')
        .order('createdAt', { ascending: false })
        .limit(ADMIN_LOG_LIMIT);

    if (error) {
        console.error('[search] Failed to load chat history logs:', error);
        return [];
    }

    const results: ServerSearchResultItem[] = [];
    for (const row of (data || []) as ChatHistorySearchRow[]) {
        const messageText = flattenChatMessagesToText(row.message);
        const match = createServerSearchMatcher(context.query, [
            {
                text: [row.agentName, row.url || '', row.ip || '', messageText].join('\n'),
                snippetText: messageText || row.url || row.ip || row.agentName,
                weight: 1.7,
            },
        ]);
        if (!match) {
            continue;
        }

        results.push({
            id: `conversation-admin-${row.id}`,
            providerId: 'conversations',
            group: 'Conversations',
            type: 'chat-history-log',
            icon: 'conversation',
            title: `Chat log #${row.id} (${row.agentName})`,
            snippet: match.snippet,
            href: `/admin/chat-history?agentName=${encodeURIComponent(row.agentName)}`,
            score: match.score + 6,
        });
    }

    return results;
}

/**
 * Parses one serialized agent profile.
 */
function toAgentProfile(rawProfile: Json): Partial<AgentBasicInformation> {
    if (rawProfile && typeof rawProfile === 'object' && !Array.isArray(rawProfile)) {
        return rawProfile as Partial<AgentBasicInformation>;
    }
    return {};
}

/**
 * Creates one readable folder-path label from folder id.
 */
function toFolderPathLabel(folderId: number | null, folderById: Map<number, AgentFolderSearchRow>): string {
    if (folderId === null) {
        return '';
    }

    const pathSegments = getFolderPathSegments(folderId, folderById);
    return pathSegments.map((folder) => folder.name).join(' / ');
}

/**
 * Adds path prefix to snippets when available.
 */
function prefixSnippet(prefix: string, snippet: string): string {
    if (!prefix) {
        return snippet;
    }

    if (!snippet) {
        return `Path: ${prefix}`;
    }

    return `Path: ${prefix} | ${snippet}`;
}

/**
 * Converts unknown JSON values into a compact searchable string.
 */
function stringifyJsonForSearch(value: unknown): string {
    try {
        return normalizeServerSearchText(JSON.stringify(value ?? {}));
    } catch {
        return '';
    }
}

/**
 * Flattens chat message arrays/objects into one plain-text body.
 */
function flattenChatMessagesToText(rawMessages: unknown): string {
    const normalizedChunks: string[] = [];

    if (Array.isArray(rawMessages)) {
        for (const message of rawMessages) {
            const text = flattenSingleMessageToText(message);
            if (text) {
                normalizedChunks.push(text);
            }
        }
    } else {
        const text = flattenSingleMessageToText(rawMessages);
        if (text) {
            normalizedChunks.push(text);
        }
    }

    return normalizeServerSearchText(normalizedChunks.join('\n')).slice(0, 2400);
}

/**
 * Flattens one message value into plain text.
 */
function flattenSingleMessageToText(rawMessage: unknown): string {
    if (typeof rawMessage === 'string') {
        return rawMessage;
    }

    if (!rawMessage || typeof rawMessage !== 'object') {
        return '';
    }

    const maybeContent = (rawMessage as { content?: unknown }).content;
    if (typeof maybeContent === 'string') {
        return maybeContent;
    }

    if (Array.isArray(maybeContent)) {
        return maybeContent
            .map((part) => {
                if (typeof part === 'string') {
                    return part;
                }
                if (part && typeof part === 'object') {
                    const maybeText = (part as { text?: unknown }).text;
                    if (typeof maybeText === 'string') {
                        return maybeText;
                    }
                }
                return stringifyJsonForSearch(part);
            })
            .join(' ');
    }

    return stringifyJsonForSearch(rawMessage);
}

/**
 * Extracts short title text from flattened conversation content.
 */
function extractConversationTitle(messageText: string): string {
    const firstSentence = messageText
        .split(/[.!?]/)
        .map((segment) => segment.trim())
        .find(Boolean) || '';
    if (!firstSentence) {
        return '';
    }

    if (firstSentence.length <= 72) {
        return firstSentence;
    }

    return `${firstSentence.slice(0, 71).trimEnd()}…`;
}

/**
 * Sorts and trims provider output.
 */
function sortAndLimitProviderResults(
    items: ReadonlyArray<ServerSearchResultItem>,
    limit: number,
): ReadonlyArray<ServerSearchResultItem> {
    return [...items]
        .sort((left, right) => {
            if (left.score !== right.score) {
                return right.score - left.score;
            }
            return left.title.localeCompare(right.title);
        })
        .slice(0, Math.max(1, limit));
}

/**
 * Resolves whether federated search is available for current auth state.
 */
async function canSearchFederatedAgents(isAuthenticated: boolean): Promise<boolean> {
    if (isAuthenticated) {
        return true;
    }

    const supabase = $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('Metadata'))
        .select('value')
        .eq('key', 'SHOW_FEDERATED_SERVERS_PUBLICLY')
        .maybeSingle();

    if (error) {
        console.error('[search] Failed to read SHOW_FEDERATED_SERVERS_PUBLICLY:', error);
        return false;
    }

    return (data?.value || '').toLowerCase() === 'true';
}

/**
 * Fetches and validates one remote `/api/agents` payload.
 */
async function fetchFederatedAgentsPayload(serverUrl: string): Promise<ReadonlyArray<FederatedAgentSearchRow> | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FEDERATED_FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(`${serverUrl}/api/agents`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store',
            signal: controller.signal,
        });

        if (!response.ok) {
            return null;
        }

        const payload = (await response.json()) as { agents?: unknown };
        if (!Array.isArray(payload.agents)) {
            return null;
        }

        const normalizedAgents: FederatedAgentSearchRow[] = [];
        for (const rawAgent of payload.agents.slice(0, FEDERATED_AGENTS_PER_SERVER_LIMIT)) {
            if (!rawAgent || typeof rawAgent !== 'object') {
                continue;
            }

            const maybeAgentName = (rawAgent as { agentName?: unknown }).agentName;
            if (typeof maybeAgentName !== 'string' || maybeAgentName.trim().length === 0) {
                continue;
            }

            normalizedAgents.push({
                agentName: maybeAgentName,
                permanentId:
                    typeof (rawAgent as { permanentId?: unknown }).permanentId === 'string'
                        ? (rawAgent as { permanentId: string }).permanentId
                        : null,
                personaDescription:
                    typeof (rawAgent as { personaDescription?: unknown }).personaDescription === 'string'
                        ? (rawAgent as { personaDescription: string }).personaDescription
                        : undefined,
                meta:
                    (rawAgent as { meta?: unknown }).meta && typeof (rawAgent as { meta?: unknown }).meta === 'object'
                        ? ((rawAgent as { meta: FederatedAgentSearchRow['meta'] }).meta || undefined)
                        : undefined,
                url:
                    typeof (rawAgent as { url?: unknown }).url === 'string'
                        ? (rawAgent as { url: string }).url
                        : undefined,
            });
        }

        return normalizedAgents;
    } catch (error) {
        if ((error as { name?: string }).name !== 'AbortError') {
            console.error(`[search] Failed to fetch federated agents from ${serverUrl}:`, error);
        }
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Normalizes server URL strings to origin without trailing slash.
 */
function normalizeServerUrl(serverUrl: string): string {
    try {
        return new URL(serverUrl).origin.replace(TRAILING_SLASH_PATTERN, '');
    } catch {
        return '';
    }
}

/**
 * Extracts host name for federated result labels.
 */
function getServerHostname(serverUrl: string): string {
    try {
        return new URL(serverUrl).hostname;
    } catch {
        return serverUrl;
    }
}
