import {
    BarChart3,
    Code2,
    Globe2,
    KeyRound,
    Settings2,
    UserRound,
    Wrench,
    type LucideIcon,
} from 'lucide-react';
import type { ChatFeedbackMode } from '../../utils/chatFeedbackMode';
import type { UserInfo } from '../../utils/getCurrentUser';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Translation function shape used by Header-specific menu builders.
 *
 * @private type of Header
 */
type HeaderTranslate = (key: string, variables?: Record<string, string>) => string;

/**
 * Supported category names inside the System dropdown.
 *
 * @private type of Header
 */
type SystemCategoryLabel =
    | 'My Account'
    | 'Utilities'
    | 'Administration'
    | 'Monitoring & Usage'
    | 'Integrations & Keys'
    | 'Developer / Debug'
    | 'Legal & About';

/**
 * Input required to build the System dropdown tree.
 *
 * @private type of Header
 */
type BuildHeaderSystemMenuItemsOptions = {
    readonly translate: HeaderTranslate;
    readonly currentUser: UserInfo | null;
    readonly isAdmin: boolean;
    readonly isGlobalAdmin: boolean;
    readonly isExperimental: boolean;
    readonly feedbackMode: ChatFeedbackMode;
};

/**
 * Default icon used for each System dropdown category.
 */
const SYSTEM_CATEGORY_ICON_MAP: Record<SystemCategoryLabel, LucideIcon> = {
    'My Account': UserRound,
    Utilities: Wrench,
    Administration: Settings2,
    'Monitoring & Usage': BarChart3,
    'Integrations & Keys': KeyRound,
    'Developer / Debug': Code2,
    'Legal & About': Globe2,
};

/**
 * Propagates one fallback icon to submenu entries that do not specify their own icon.
 */
function applyFallbackSubMenuIcon(
    items: ReadonlyArray<SubMenuItem>,
    fallbackIcon: NonNullable<SubMenuItem['icon']>,
): SubMenuItem[] {
    return items.map((item) => {
        const resolvedIcon = item.icon ?? fallbackIcon;
        return {
            ...item,
            icon: resolvedIcon,
            items: item.items ? applyFallbackSubMenuIcon(item.items, resolvedIcon) : item.items,
        };
    });
}

/**
 * Creates one category entry inside the System dropdown when there are items to show.
 */
function createSystemCategory(label: SystemCategoryLabel, items: ReadonlyArray<SubMenuItem>): SubMenuItem[] {
    if (items.length === 0) {
        return [];
    }

    const categoryIcon = SYSTEM_CATEGORY_ICON_MAP[label];
    return [
        {
            label,
            icon: categoryIcon,
            items: applyFallbackSubMenuIcon(items, categoryIcon),
        },
    ];
}

/**
 * Builds the full System dropdown tree for the current user/admin context.
 *
 * @private function of Header
 */
export function buildHeaderSystemMenuItems({
    translate,
    currentUser,
    isAdmin,
    isGlobalAdmin,
    isExperimental,
    feedbackMode,
}: BuildHeaderSystemMenuItemsOptions): SubMenuItem[] {
    const userAccountSystemItems: SubMenuItem[] = [
        {
            label: 'Settings',
            href: '/system/settings',
            isBold: true,
        },
        ...(currentUser
            ? [
                  {
                      label: translate('common.profile'),
                      href: '/system/profile',
                  },
                  {
                      label: translate('header.userMemory'),
                      href: '/system/user-memory',
                  },
                  {
                      label: translate('header.userWallet'),
                      href: '/system/user-wallet',
                  },
              ]
            : []),
    ];

    const legalAndAboutSystemItems: SubMenuItem[] = [
        ...(isAdmin
            ? [
                  {
                      label: translate('header.versionInfo'),
                      href: '/admin/about',
                  } as SubMenuItem,
              ]
            : []),
        {
            label: translate('header.landingPage'),
            href: 'https://ptbk.io/',
        },
    ];

    const utilitiesSystemItems: SubMenuItem[] = currentUser
        ? [
              {
                  label: translate('header.utilities'),
                  href: '/system/utilities',
                  isBold: true,
              },
              {
                  label: translate('header.mockedChats'),
                  href: '/system/utilities/mocked-chats',
              },
          ]
        : [];

    if (!isAdmin) {
        return [
            ...createSystemCategory('My Account', userAccountSystemItems),
            ...createSystemCategory('Utilities', utilitiesSystemItems),
            ...createSystemCategory('Legal & About', legalAndAboutSystemItems),
        ];
    }

    const administrationSystemItems: SubMenuItem[] = [
        ...(isGlobalAdmin
            ? [
                  {
                      label: translate('header.servers'),
                      href: '/admin/servers',
                      isBold: true,
                  } as SubMenuItem,
              ]
            : []),
        {
            label: translate('header.models'),
            href: '/admin/models',
        },
        {
            label: translate('header.metadata'),
            href: '/admin/metadata',
        },
        {
            label: 'Tool limits',
            href: '/admin/tool-limits',
        },
        {
            label: translate('header.messagesEmails'),
            href: '/admin/messages',
        },
        {
            label: 'Backups',
            href: '/admin/backup',
            isBordered: true,
        },
        {
            label: translate('header.users'),
            href: '/admin/users',
            isBold: true,
            isBordered: true,
        },
        {
            label: translate('header.customCss'),
            href: '/admin/custom-css',
        },
        {
            label: translate('header.customJs'),
            href: '/admin/custom-js',
        },
        {
            label: translate('header.imagesGallery'),
            href: '/admin/images',
        },
        {
            label: translate('header.files'),
            href: '/admin/files',
        },
    ];

    const monitoringAndUsageSystemItems: SubMenuItem[] = [
        {
            label: translate('header.usageAnalytics'),
            href: '/admin/usage',
        },
        {
            label: translate('header.taskManager'),
            href: '/admin/task-manager',
        },
        {
            label: translate('header.chatHistory'),
            href: '/admin/chat-history',
        },
        ...(feedbackMode !== 'off'
            ? [
                  {
                      label: translate('header.chatFeedback'),
                      href: '/admin/chat-feedback',
                  } as SubMenuItem,
              ]
            : []),
    ];

    const integrationsAndKeysSystemItems: SubMenuItem[] = [
        {
            label: translate('header.apiTokens'),
            href: '/admin/api-tokens',
        },
        {
            label: translate('header.openApiDocumentation'),
            href: '/swagger',
        },
    ];

    const developerDebugSystemItems: SubMenuItem[] = [
        {
            label: translate('header.browser'),
            href: '/admin/browser-test',
        },
        {
            label: translate('header.voiceInputTest'),
            href: '/admin/voice-input-test',
        },
        {
            label: translate('header.searchEngineTest'),
            href: '/admin/search-engine-test',
        },
        {
            label: 'Error simulation',
            href: '/admin/error-simulation',
        },
        ...(isExperimental
            ? [
                  {
                      label: translate('header.story'),
                      href: '/experiments/story',
                      isBold: true,
                  } as SubMenuItem,
              ]
            : []),
    ];

    return [
        ...createSystemCategory('My Account', userAccountSystemItems),
        ...createSystemCategory('Utilities', utilitiesSystemItems),
        ...createSystemCategory('Administration', administrationSystemItems),
        ...createSystemCategory('Monitoring & Usage', monitoringAndUsageSystemItems),
        ...createSystemCategory('Integrations & Keys', integrationsAndKeysSystemItems),
        ...createSystemCategory('Developer / Debug', developerDebugSystemItems),
        ...createSystemCategory('Legal & About', legalAndAboutSystemItems),
    ];
}
