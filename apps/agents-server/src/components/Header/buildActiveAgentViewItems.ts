import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';
import { createAgentViewLabel, createChatGptLikeViewLabel } from './createAgentViewLabel';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Translation function shape used by Header-specific menu builders.
 *
 * @private type of Header
 */
type HeaderTranslate = (key: ServerTranslationKey, variables?: Record<string, string>) => string;

/**
 * Options needed to assemble the active-agent view dropdown.
 *
 * @private type of Header
 */
type BuildActiveAgentViewItemsOptions = {
    readonly activeAgentNavigationId: string | null;
    readonly agentMoreViewItems: ReadonlyArray<SubMenuItem>;
    readonly isAdmin: boolean;
    readonly translate: HeaderTranslate;
};

/**
 * Builds the active-agent view dropdown entries for the current route context.
 *
 * @private function of Header
 */
export function buildActiveAgentViewItems({
    activeAgentNavigationId,
    agentMoreViewItems,
    isAdmin,
    translate,
}: BuildActiveAgentViewItemsOptions): SubMenuItem[] {
    if (!activeAgentNavigationId) {
        return [];
    }

    const encodedAgentNavigationId = encodeURIComponent(activeAgentNavigationId);
    const activeAgentBasePath = `/agents/${encodedAgentNavigationId}`;
    const items: SubMenuItem[] = [
        {
            label: createAgentViewLabel('Profile', translate),
            href: activeAgentBasePath,
        },
        {
            label: createAgentViewLabel('Chat', translate),
            href: `${activeAgentBasePath}/chat`,
        },
        {
            label: createChatGptLikeViewLabel(),
            href: `${activeAgentBasePath}/chat/chatgpt-like`,
        },
        {
            label: createAgentViewLabel('Timeouts', translate),
            href: `${activeAgentBasePath}/timeouts`,
        },
    ];

    if (isAdmin) {
        items.push({
            label: createAgentViewLabel('Book', translate),
            href: `${activeAgentBasePath}/book`,
        });
    }

    if (agentMoreViewItems.length > 0) {
        items.push({
            label: createAgentViewLabel('More', translate),
            items: [...agentMoreViewItems],
        });
    }

    return items;
}
