import type { ServerSearchProvider } from '../ServerSearchProvider';
import type { ServerSearchResultItem } from '../ServerSearchResultItem';
import { createServerSearchMatcher } from '../createServerSearchMatcher';
import { sortAndLimitProviderResults } from './sortAndLimitProviderResults';

/**
 * Static navigation destination model.
 *
 * @private function of createDefaultServerSearchProviders
 */
type NavigationSearchItem = {
    id: string;
    title: string;
    href: string;
    description: string;
    icon: ServerSearchResultItem['icon'];
    adminOnly?: boolean;
    authOnly?: boolean;
};

/**
 * Creates provider for static navigation destinations.
 *
 * @returns Configured navigation search provider.
 * @private function of createDefaultServerSearchProviders
 */
export function createNavigationSearchProvider(): ServerSearchProvider {
    return {
        id: 'navigation',
        label: 'Navigation',
        async search(context) {
            const results: ServerSearchResultItem[] = [];
            for (const item of createNavigationItems()) {
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
 * Provides static navigation candidates used by the navigation provider.
 *
 * @returns List of navigation entries with auth/admin visibility markers.
 * @private function of createDefaultServerSearchProviders
 */
function createNavigationItems(): ReadonlyArray<NavigationSearchItem> {
    return [
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
}
