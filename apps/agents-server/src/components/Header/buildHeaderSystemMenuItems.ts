import {
    Activity,
    Archive,
    BadgeInfo,
    BarChart3,
    Bot,
    Brain,
    Bug,
    Building2,
    ChartNoAxesColumn,
    ClipboardList,
    Crown,
    Database,
    FileAudio,
    FileCode,
    FileCode2,
    FileJson,
    FileSearch,
    FileStack,
    FlaskConical,
    Globe2,
    Gauge,
    History,
    Home,
    Images,
    KeyRound,
    LogIn,
    Mail,
    MessageCircle,
    MessageSquareText,
    Mic,
    MousePointerClick,
    Paintbrush,
    PlugZap,
    RefreshCw,
    Scale,
    ScrollText,
    Search,
    Server,
    Shield,
    ShieldCheck,
    SlidersHorizontal,
    Star,
    Terminal,
    TerminalSquare,
    TriangleAlert,
    UserCircle,
    UserRound,
    Users,
    WalletCards,
    Wrench,
    type LucideIcon,
} from 'lucide-react';
import { createElement } from 'react';
import { HARNESS_AUTH_ADMIN_PATH } from '../../constants/harnessAuthRoutes';
import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';
import type { ShibbolethAuthenticationMenuStatus } from '../../constants/shibbolethAuth';
import type { ChatFeedbackMode } from '../../utils/chatFeedbackMode';
import type { UserInfo } from '../../utils/getCurrentUser';
import type { ServerResourceWarningStatus } from '../../utils/resourceMonitor/resourceMonitorTypes';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Translation function shape used by Header-specific menu builders.
 *
 * @private type of Header
 */
type HeaderTranslate = (key: ServerTranslationKey, variables?: Readonly<Record<string, string | number>>) => string;

/**
 * Supported category names inside the System dropdown.
 *
 * @private type of Header
 */
type SystemCategoryLabel =
    | 'My Account'
    | 'Utilities'
    | 'Super Admin'
    | 'Administration'
    | 'Login Methods'
    | 'Monitoring & Usage'
    | 'Integrations & Keys'
    | 'Developer / Debug'
    | 'Legal & About';

/**
 * Hrefs owned by the System dropdown that receive a dedicated icon.
 *
 * @private type of Header
 */
type SystemMenuItemHref =
    | '/system/settings'
    | '/system/profile'
    | '/system/user-memory'
    | '/system/user-wallet'
    | '/system/utilities'
    | '/system/utilities/mocked-chats'
    | '/admin/about'
    | 'https://ptbk.io/'
    | '/admin/servers'
    | '/admin/environment'
    | '/admin/resource-monitor'
    | '/admin/update'
    | '/admin/database'
    | '/admin/logs'
    | typeof HARNESS_AUTH_ADMIN_PATH
    | '/admin/cli-access'
    | '/admin/models'
    | '/admin/metadata'
    | '/admin/limits'
    | '/admin/messages'
    | '/admin/backup'
    | '/admin/users'
    | '/admin/custom-css'
    | '/admin/custom-js'
    | '/admin/images'
    | '/admin/files'
    | '/admin/login-methods/shibboleth#setup-instructions'
    | '/admin/login-methods/shibboleth'
    | '/admin/usage'
    | '/admin/task-manager'
    | '/admin/chat-history'
    | '/admin/chat-feedback'
    | '/admin/api-tokens'
    | '/swagger'
    | '/admin/browser-test'
    | '/admin/voice-input-test'
    | '/admin/transcriptions'
    | '/admin/search-engine-test'
    | '/admin/error-simulation'
    | '/experiments/story';

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
    readonly shibbolethAuthenticationStatus?: ShibbolethAuthenticationMenuStatus;
    readonly resourceMonitorWarningStatus?: ServerResourceWarningStatus;
};

/**
 * Default icon used for each System dropdown category.
 */
const SYSTEM_CATEGORY_ICON_MAP: Record<SystemCategoryLabel, LucideIcon> = {
    'My Account': UserRound,
    Utilities: Wrench,
    'Super Admin': Crown,
    Administration: Building2,
    'Login Methods': LogIn,
    'Monitoring & Usage': BarChart3,
    'Integrations & Keys': PlugZap,
    'Developer / Debug': Bug,
    'Legal & About': Scale,
};

/**
 * Dedicated icon used for each System dropdown leaf entry.
 */
const SYSTEM_MENU_ICON_BY_HREF: Record<SystemMenuItemHref, LucideIcon> = {
    '/system/settings': SlidersHorizontal,
    '/system/profile': UserCircle,
    '/system/user-memory': Brain,
    '/system/user-wallet': WalletCards,
    '/system/utilities': MousePointerClick,
    '/system/utilities/mocked-chats': MessageSquareText,
    '/admin/about': BadgeInfo,
    'https://ptbk.io/': Home,
    '/admin/servers': Server,
    '/admin/environment': FileCode2,
    '/admin/resource-monitor': Activity,
    '/admin/update': RefreshCw,
    '/admin/database': Database,
    '/admin/logs': ScrollText,
    [HARNESS_AUTH_ADMIN_PATH]: TerminalSquare,
    '/admin/cli-access': Terminal,
    '/admin/models': Bot,
    '/admin/metadata': FileJson,
    '/admin/limits': Gauge,
    '/admin/messages': Mail,
    '/admin/backup': Archive,
    '/admin/users': Users,
    '/admin/custom-css': Paintbrush,
    '/admin/custom-js': FileCode,
    '/admin/images': Images,
    '/admin/files': FileStack,
    '/admin/login-methods/shibboleth#setup-instructions': Shield,
    '/admin/login-methods/shibboleth': ShieldCheck,
    '/admin/usage': ChartNoAxesColumn,
    '/admin/task-manager': ClipboardList,
    '/admin/chat-history': History,
    '/admin/chat-feedback': MessageCircle,
    '/admin/api-tokens': KeyRound,
    '/swagger': FileSearch,
    '/admin/browser-test': Globe2,
    '/admin/voice-input-test': Mic,
    '/admin/transcriptions': FileAudio,
    '/admin/search-engine-test': Search,
    '/admin/error-simulation': FlaskConical,
    '/experiments/story': Star,
};

/**
 * Translation key used for each System dropdown category label.
 */
const SYSTEM_CATEGORY_TRANSLATION_KEY_MAP: Record<SystemCategoryLabel, ServerTranslationKey> = {
    'My Account': 'header.myAccount',
    Utilities: 'header.utilities',
    'Super Admin': 'header.superAdmin',
    Administration: 'header.administration',
    'Login Methods': 'header.loginMethods',
    'Monitoring & Usage': 'header.monitoringAndUsage',
    'Integrations & Keys': 'header.integrationsAndKeys',
    'Developer / Debug': 'header.developerDebug',
    'Legal & About': 'header.legalAndAbout',
};

/**
 * Checks whether a href is one of the System dropdown routes with a dedicated icon.
 */
function isSystemMenuItemHref(href: string): href is SystemMenuItemHref {
    return Object.prototype.hasOwnProperty.call(SYSTEM_MENU_ICON_BY_HREF, href);
}

/**
 * Resolves the icon for one System submenu entry.
 */
function resolveSystemSubMenuIcon(
    item: SubMenuItem,
    fallbackIcon: NonNullable<SubMenuItem['icon']>,
): NonNullable<SubMenuItem['icon']> {
    if (item.icon) {
        return item.icon;
    }

    if (item.href && isSystemMenuItemHref(item.href)) {
        return SYSTEM_MENU_ICON_BY_HREF[item.href];
    }

    return fallbackIcon;
}

/**
 * Adds a stable icon to each System submenu entry without repeating icon assignments in every item literal.
 */
function applySystemSubMenuIcons(
    items: ReadonlyArray<SubMenuItem>,
    fallbackIcon: NonNullable<SubMenuItem['icon']>,
): SubMenuItem[] {
    return items.map((item) => {
        const resolvedIcon = resolveSystemSubMenuIcon(item, fallbackIcon);
        return {
            ...item,
            icon: resolvedIcon,
            items: item.items ? applySystemSubMenuIcons(item.items, resolvedIcon) : item.items,
        };
    });
}

/**
 * Decorates a menu label with the warning indicator used for misconfigured login methods.
 */
function createWarningMenuLabel(label: string) {
    return createElement(
        'span',
        { className: 'inline-flex items-center gap-2' },
        label,
        createElement(TriangleAlert, {
            className: 'h-4 w-4 text-amber-500',
            'aria-label': 'Warning',
        }),
    );
}

/**
 * Creates one category entry inside the System dropdown when there are items to show.
 */
function createSystemCategory(
    label: SystemCategoryLabel,
    items: ReadonlyArray<SubMenuItem>,
    translate: HeaderTranslate,
    isWarningShown = false,
): SubMenuItem[] {
    if (items.length === 0) {
        return [];
    }

    const categoryIcon = SYSTEM_CATEGORY_ICON_MAP[label];
    return [
        {
            label: isWarningShown
                ? createWarningMenuLabel(translate(SYSTEM_CATEGORY_TRANSLATION_KEY_MAP[label]))
                : translate(SYSTEM_CATEGORY_TRANSLATION_KEY_MAP[label]),
            icon: categoryIcon,
            items: applySystemSubMenuIcons(items, categoryIcon),
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
    shibbolethAuthenticationStatus,
    resourceMonitorWarningStatus,
}: BuildHeaderSystemMenuItemsOptions): SubMenuItem[] {
    const userAccountSystemItems: SubMenuItem[] = [
        {
            label: translate('header.settings'),
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
            ...createSystemCategory('My Account', userAccountSystemItems, translate),
            ...createSystemCategory('Utilities', utilitiesSystemItems, translate),
            ...createSystemCategory('Legal & About', legalAndAboutSystemItems, translate),
        ];
    }

    const isResourceMonitorWarningShown = Boolean(isGlobalAdmin && resourceMonitorWarningStatus?.isWarningShown);
    const superAdminSystemItems: SubMenuItem[] = [
        {
            label: translate('header.servers'),
            href: '/admin/servers',
            isBold: true,
        },
        {
            label: translate('header.environmentVariables'),
            href: '/admin/environment',
        },
        ...(isGlobalAdmin
            ? [
                  {
                      label: isResourceMonitorWarningShown
                          ? createWarningMenuLabel(translate('header.resourceMonitor'))
                          : translate('header.resourceMonitor'),
                      href: '/admin/resource-monitor',
                  } as SubMenuItem,
                  {
                      label: translate('header.update'),
                      href: '/admin/update',
                  } as SubMenuItem,
                  {
                      label: translate('header.database'),
                      href: '/admin/database',
                  } as SubMenuItem,
                  {
                      label: translate('header.logs'),
                      href: '/admin/logs',
                  } as SubMenuItem,
                  {
                      label: translate('header.harnessAuth'),
                      href: HARNESS_AUTH_ADMIN_PATH,
                  } as SubMenuItem,
                  {
                      label: translate('header.cliAccess'),
                      href: '/admin/cli-access',
                  } as SubMenuItem,
              ]
            : []),
    ];

    const administrationSystemItems: SubMenuItem[] = [
        {
            label: translate('header.models'),
            href: '/admin/models',
        },
        {
            label: translate('header.metadata'),
            href: '/admin/metadata',
        },
        {
            label: translate('header.toolLimits'),
            href: '/admin/limits',
        },
        {
            label: translate('header.messagesEmails'),
            href: '/admin/messages',
        },
        {
            label: translate('header.backups'),
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

    const isShibbolethConfigurationWarningShown = Boolean(
        shibbolethAuthenticationStatus?.isActive && !shibbolethAuthenticationStatus.isConfigured,
    );
    const loginMethodsSystemItems: SubMenuItem[] = shibbolethAuthenticationStatus?.isActive
        ? [
              {
                  label: isShibbolethConfigurationWarningShown
                      ? createWarningMenuLabel(translate('header.shibboleth'))
                      : translate('header.shibboleth'),
                  href: isShibbolethConfigurationWarningShown
                      ? '/admin/login-methods/shibboleth#setup-instructions'
                      : '/admin/login-methods/shibboleth',
              },
          ]
        : [];

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
            label: translate('header.transcriptions'),
            href: '/admin/transcriptions',
        },
        {
            label: translate('header.searchEngineTest'),
            href: '/admin/search-engine-test',
        },
        {
            label: translate('header.errorSimulation'),
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
        ...createSystemCategory('My Account', userAccountSystemItems, translate),
        ...createSystemCategory('Utilities', utilitiesSystemItems, translate),
        ...createSystemCategory('Super Admin', superAdminSystemItems, translate, isResourceMonitorWarningShown),
        ...createSystemCategory('Administration', administrationSystemItems, translate),
        ...createSystemCategory(
            'Login Methods',
            loginMethodsSystemItems,
            translate,
            isShibbolethConfigurationWarningShown,
        ),
        ...createSystemCategory('Monitoring & Usage', monitoringAndUsageSystemItems, translate),
        ...createSystemCategory('Integrations & Keys', integrationsAndKeysSystemItems, translate),
        ...createSystemCategory('Developer / Debug', developerDebugSystemItems, translate),
        ...createSystemCategory('Legal & About', legalAndAboutSystemItems, translate),
    ];
}
