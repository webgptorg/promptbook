import type { ServerSearchProvider } from './ServerSearchProvider';
import { createAgentsSearchProvider } from './createDefaultServerSearchProviders/createAgentsSearchProvider';
import { createConversationsSearchProvider } from './createDefaultServerSearchProviders/createConversationsSearchProvider';
import { createDocumentationSearchProvider } from './createDefaultServerSearchProviders/createDocumentationSearchProvider';
import { createFederatedAgentsSearchProvider } from './createDefaultServerSearchProviders/createFederatedAgentsSearchProvider';
import { createFilesSearchProvider } from './createDefaultServerSearchProviders/createFilesSearchProvider';
import { createFoldersSearchProvider } from './createDefaultServerSearchProviders/createFoldersSearchProvider';
import { createImagesSearchProvider } from './createDefaultServerSearchProviders/createImagesSearchProvider';
import { createMessagesSearchProvider } from './createDefaultServerSearchProviders/createMessagesSearchProvider';
import { createMetadataSearchProvider } from './createDefaultServerSearchProviders/createMetadataSearchProvider';
import { createNavigationSearchProvider } from './createDefaultServerSearchProviders/createNavigationSearchProvider';
import { createUsersSearchProvider } from './createDefaultServerSearchProviders/createUsersSearchProvider';

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
