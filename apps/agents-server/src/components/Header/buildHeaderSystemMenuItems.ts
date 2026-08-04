import {
    Activity,
    Archive,
    BadgeInfo,
    BarChart3,
    Blocks,
    Bot,
    Boxes,
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
    FolderKanban,
    Globe2,
    Gauge,
    History,
    Home,
    Images,
    KeyRound,
    LogIn,
    Mail,
    MailCheck,
    Mails,
    MessageCircle,
    MessageSquareText,
    Mic,
    MousePointerClick,
    Paintbrush,
    PlugZap,
    RefreshCcw,
    RefreshCw,
    Scale,
    ScrollText,
    Search,
    Server,
    ServerCog,
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
import { isHeaderSystemActivityShownForHref, type HeaderSystemActivities } from './resolveHeaderSystemActivities';
import {
    isHeaderSystemWarningShownForCategory,
    isHeaderSystemWarningShownForHref,
    type HeaderSystemWarnings,
} from './resolveHeaderSystemWarnings';
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
    | '/superadmin/servers'
    | '/superadmin/environment'
    | '/superadmin/email-server'
    | '/superadmin/resource-monitor'
    | '/superadmin/update'
    | '/superadmin/database'
    | '/admin/internal-s3'
    | '/superadmin/logs'
    | typeof HARNESS_AUTH_ADMIN_PATH
    | '/superadmin/cli-access'
    | '/admin/models'
    | '/admin/core-agents'
    | '/admin/metadata'
    | '/admin/email-server'
    | '/admin/limits'
    | '/admin/messages'
    | '/admin/backup'
    | '/admin/users'
    | '/admin/custom-css'
    | '/admin/custom-js'
    | '/admin/images'
    | '/admin/files'
    | '/admin/projects'
    | '/admin/login-methods/shibboleth#setup-instructions'
    | '/admin/login-methods/shibboleth'
    | '/admin/usage'
    | '/admin/task-manager'
    | '/superadmin/task-manager'
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
    readonly systemWarnings?: HeaderSystemWarnings;
    readonly systemActivities?: HeaderSystemActivities;
};

/**
 * Shared warning-free fallback for callers that only need the static System menu structure.
 *
 * @private constant of Header
 */
const EMPTY_HEADER_SYSTEM_WARNINGS: HeaderSystemWarnings = {
    warnings: [],
    isSystemWarningShown: false,
};

/**
 * Shared activity-free fallback for callers that only need the static System menu structure.
 *
 * @private constant of Header
 */
const EMPTY_HEADER_SYSTEM_ACTIVITIES: HeaderSystemActivities = {
    activities: [],
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
    '/superadmin/servers': Server,
    '/superadmin/environment': FileCode2,
    '/superadmin/email-server': Mails,
    '/superadmin/resource-monitor': Activity,
    '/superadmin/update': RefreshCw,
    '/superadmin/database': Database,
    '/admin/internal-s3': Boxes,
    '/superadmin/logs': ScrollText,
    [HARNESS_AUTH_ADMIN_PATH]: TerminalSquare,
    '/superadmin/cli-access': Terminal,
    '/admin/models': Bot,
    '/admin/core-agents': Blocks,
    '/admin/metadata': FileJson,
    '/admin/email-server': MailCheck,
    '/admin/limits': Gauge,
    '/admin/messages': Mail,
    '/admin/backup': Archive,
    '/admin/users': Users,
    '/admin/custom-css': Paintbrush,
    '/admin/custom-js': FileCode,
    '/admin/images': Images,
    '/admin/files': FileStack,
    '/admin/projects': FolderKanban,
    '/admin/login-methods/shibboleth#setup-instructions': Shield,
    '/admin/login-methods/shibboleth': ShieldCheck,
    '/admin/usage': ChartNoAxesColumn,
    '/admin/task-manager': ClipboardList,
    '/superadmin/task-manager': ServerCog,
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
 * Kinds of status indicator that can decorate a System menu label.
 *
 * @private type of Header
 */
type SystemMenuIndicatorKind = 'warning' | 'activity';

/**
 * Visual definition of one System menu status indicator.
 *
 * @private type of Header
 */
type SystemMenuIndicatorDefinition = {
    /**
     * Icon rendered after the menu label.
     */
    readonly icon: LucideIcon;

    /**
     * Utility classes applied to the indicator icon.
     */
    readonly className: string;

    /**
     * Accessible description of the indicated state.
     */
    readonly ariaLabel: string;
};

/**
 * Look of every System menu status indicator, kept in one place so labels never style icons themselves.
 *
 * @private constant of Header
 */
const SYSTEM_MENU_INDICATOR_DEFINITIONS: Record<SystemMenuIndicatorKind, SystemMenuIndicatorDefinition> = {
    warning: {
        icon: TriangleAlert,
        className: 'h-4 w-4 text-amber-500',
        ariaLabel: 'Warning',
    },
    activity: {
        icon: RefreshCcw,
        className: 'h-4 w-4 animate-spin text-blue-500',
        ariaLabel: 'Running',
    },
};

/**
 * Resolves which indicator, if any, one System menu destination currently shows.
 *
 * @private type of Header
 */
type SystemMenuIndicatorResolver = (href: string) => SystemMenuIndicatorKind | null;

/**
 * Decorates a System menu label with one shared status indicator.
 *
 * @private function of Header
 */
function createIndicatorMenuLabel(label: string, indicatorKind: SystemMenuIndicatorKind) {
    const indicator = SYSTEM_MENU_INDICATOR_DEFINITIONS[indicatorKind];

    return createElement(
        'span',
        { className: 'inline-flex items-center gap-2' },
        label,
        createElement(indicator.icon, {
            className: indicator.className,
            'aria-label': indicator.ariaLabel,
        }),
    );
}

/**
 * Decorates every System menu entry whose destination currently has a visible status indicator.
 *
 * The warning and activity registries own the route-to-indicator mapping, so adding another
 * operational state does not require scattered leaf-label conditionals throughout this menu tree.
 *
 * @private function of Header
 */
function applySystemSubMenuIndicators(
    items: ReadonlyArray<SubMenuItem>,
    resolveIndicatorKind: SystemMenuIndicatorResolver,
): SubMenuItem[] {
    return items.map((item) => {
        const decoratedItems = item.items ? applySystemSubMenuIndicators(item.items, resolveIndicatorKind) : item.items;

        if (!item.href || typeof item.label !== 'string') {
            return { ...item, items: decoratedItems };
        }

        const indicatorKind = resolveIndicatorKind(item.href);
        return {
            ...item,
            label: indicatorKind ? createIndicatorMenuLabel(item.label, indicatorKind) : item.label,
            items: decoratedItems,
        };
    });
}

/**
 * Creates one category entry inside the System dropdown when there are items to show.
 *
 * @private function of Header
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
                ? createIndicatorMenuLabel(translate(SYSTEM_CATEGORY_TRANSLATION_KEY_MAP[label]), 'warning')
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
    systemWarnings = EMPTY_HEADER_SYSTEM_WARNINGS,
    systemActivities = EMPTY_HEADER_SYSTEM_ACTIVITIES,
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

    const superAdminSystemItems: SubMenuItem[] = [
        {
            label: translate('header.servers'),
            href: '/superadmin/servers',
            isBold: true,
        },
        {
            label: translate('header.environmentVariables'),
            href: '/superadmin/environment',
        },
        ...(isGlobalAdmin
            ? [
                  {
                      label: translate('header.vpsEmailServer'),
                      href: '/superadmin/email-server',
                  } as SubMenuItem,
                  {
                      label: translate('header.resourceMonitor'),
                      href: '/superadmin/resource-monitor',
                  } as SubMenuItem,
                  {
                      label: translate('header.update'),
                      href: '/superadmin/update',
                  } as SubMenuItem,
                  {
                      label: translate('header.database'),
                      href: '/superadmin/database',
                  } as SubMenuItem,
                  {
                      label: translate('header.internalS3'),
                      href: '/admin/internal-s3',
                  } as SubMenuItem,
                  {
                      label: translate('header.logs'),
                      href: '/superadmin/logs',
                  } as SubMenuItem,
                  {
                      label: translate('header.harnessAuth'),
                      href: HARNESS_AUTH_ADMIN_PATH,
                  } as SubMenuItem,
                  {
                      label: translate('header.cliAccess'),
                      href: '/superadmin/cli-access',
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
            label: translate('header.coreAgents'),
            href: '/admin/core-agents',
        },
        {
            label: translate('header.metadata'),
            href: '/admin/metadata',
        },
        {
            label: translate('header.emailServer'),
            href: '/admin/email-server',
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
        {
            label: translate('header.agentProjects'),
            href: '/admin/projects',
        },
    ];

    const loginMethodsSystemItems: SubMenuItem[] = shibbolethAuthenticationStatus?.isActive
        ? [
              {
                  label: translate('header.shibboleth'),
                  href: isHeaderSystemWarningShownForHref(systemWarnings, '/admin/login-methods/shibboleth')
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
        ...(isGlobalAdmin
            ? [
                  {
                      label: translate('header.vpsTaskManager'),
                      href: '/superadmin/task-manager',
                  } as SubMenuItem,
              ]
            : []),
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

    // Note: A warning always wins over a running activity, so a menu entry which needs administrator
    //       attention is never hidden behind the progress of a background job.
    const resolveIndicatorKind: SystemMenuIndicatorResolver = (href) => {
        if (isHeaderSystemWarningShownForHref(systemWarnings, href)) {
            return 'warning';
        }

        if (isHeaderSystemActivityShownForHref(systemActivities, href)) {
            return 'activity';
        }

        return null;
    };
    const applyIndicators = (items: ReadonlyArray<SubMenuItem>): SubMenuItem[] =>
        applySystemSubMenuIndicators(items, resolveIndicatorKind);

    return [
        ...createSystemCategory('My Account', applyIndicators(userAccountSystemItems), translate),
        ...createSystemCategory('Utilities', applyIndicators(utilitiesSystemItems), translate),
        ...createSystemCategory(
            'Super Admin',
            applyIndicators(superAdminSystemItems),
            translate,
            isHeaderSystemWarningShownForCategory(systemWarnings, 'Super Admin'),
        ),
        ...createSystemCategory(
            'Administration',
            applyIndicators(administrationSystemItems),
            translate,
            isHeaderSystemWarningShownForCategory(systemWarnings, 'Administration'),
        ),
        ...createSystemCategory(
            'Login Methods',
            applyIndicators(loginMethodsSystemItems),
            translate,
            isHeaderSystemWarningShownForCategory(systemWarnings, 'Login Methods'),
        ),
        ...createSystemCategory('Monitoring & Usage', applyIndicators(monitoringAndUsageSystemItems), translate),
        ...createSystemCategory('Integrations & Keys', applyIndicators(integrationsAndKeysSystemItems), translate),
        ...createSystemCategory('Developer / Debug', applyIndicators(developerDebugSystemItems), translate),
        ...createSystemCategory('Legal & About', applyIndicators(legalAndAboutSystemItems), translate),
    ];
}
