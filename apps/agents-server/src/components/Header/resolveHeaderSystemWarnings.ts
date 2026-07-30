import type { ShibbolethAuthenticationMenuStatus } from '../../constants/shibbolethAuth';
import type { ServerResourceWarningStatus } from '../../utils/resourceMonitor/resourceMonitorTypes';

/**
 * System dropdown categories that can contain an administrator warning.
 *
 * @private type of Header
 */
export type HeaderSystemWarningCategory = 'Super Admin' | 'Administration' | 'Login Methods';

/**
 * System-menu hrefs that can display an administrator warning indicator.
 *
 * @private type of Header
 */
type HeaderSystemWarningHref =
    | '/superadmin/servers'
    | '/superadmin/email-server'
    | '/superadmin/resource-monitor'
    | '/admin/internal-s3'
    | '/admin/core-agents'
    | '/admin/email-server'
    | '/admin/projects'
    | '/admin/login-methods/shibboleth';

/**
 * One resolved warning together with the System-menu location it decorates.
 *
 * @private type of Header
 */
type HeaderSystemWarning = {
    /**
     * System dropdown category that contains the warning source.
     */
    readonly category: HeaderSystemWarningCategory;

    /**
     * Fragment-free href of the System menu item to decorate.
     */
    readonly href: HeaderSystemWarningHref;

    /**
     * Whether the current viewer is permitted to see this warning.
     */
    readonly isShown: boolean;
};

/**
 * Inputs needed to decide which System warnings the current viewer is allowed to see.
 *
 * @private type of Header
 */
export type ResolveHeaderSystemWarningsOptions = {
    /**
     * Whether the current viewer is a per-server administrator.
     */
    readonly isAdmin: boolean;

    /**
     * Whether the current viewer is the environment-backed super-admin.
     */
    readonly isGlobalAdmin: boolean;

    /**
     * Shibboleth authentication status, used to detect a misconfigured login method.
     */
    readonly shibbolethAuthenticationStatus?: ShibbolethAuthenticationMenuStatus;

    /**
     * Resource monitor status, used to detect server resource pressure.
     */
    readonly resourceMonitorWarningStatus?: ServerResourceWarningStatus;

    /**
     * Whether one or more bundled core agents are missing on this server.
     */
    readonly isCoreAgentsMissing?: boolean;

    /**
     * Whether the current server's Stalwart email integration needs administrator attention.
     */
    readonly isAgentEmailWarningShown?: boolean;

    /**
     * Whether one or more generated project domains need DNS configuration.
     */
    readonly isAgentProjectsDnsWarningShown?: boolean;

    /**
     * Whether the VPS-wide Stalwart email configuration needs super-admin attention.
     */
    readonly isVpsEmailServerWarningShown?: boolean;

    /**
     * Whether one or more registered server or project domains need DNS configuration.
     */
    readonly isServersDnsWarningShown?: boolean;

    /**
     * Whether the active self-contained S3 storage is incomplete or unavailable.
     */
    readonly isInternalS3WarningShown?: boolean;
};

/**
 * Visibility of System warnings together with the aggregate indicator.
 *
 * @private type of Header
 */
export type HeaderSystemWarnings = {
    /**
     * Individual warnings keyed by their System-menu destination.
     */
    readonly warnings: ReadonlyArray<HeaderSystemWarning>;

    /**
     * Whether any System warning should decorate the top-level System menu label.
     */
    readonly isSystemWarningShown: boolean;
};

/**
 * Resolves the complete warning registry for the current System menu.
 *
 * Each warning defines both its visibility policy and its menu destination in one place. This keeps
 * the top-level System indicator, category labels, and individual menu entries in agreement while
 * preventing admin-only operational details from leaking to normal or anonymous viewers.
 *
 * @private function of Header
 */
export function resolveHeaderSystemWarnings({
    isAdmin,
    isGlobalAdmin,
    shibbolethAuthenticationStatus,
    resourceMonitorWarningStatus,
    isCoreAgentsMissing = false,
    isAgentEmailWarningShown = false,
    isAgentProjectsDnsWarningShown = false,
    isVpsEmailServerWarningShown = false,
    isServersDnsWarningShown = false,
    isInternalS3WarningShown = false,
}: ResolveHeaderSystemWarningsOptions): HeaderSystemWarnings {
    const warnings: ReadonlyArray<HeaderSystemWarning> = [
        {
            category: 'Super Admin',
            href: '/superadmin/servers',
            isShown: Boolean(isGlobalAdmin && isServersDnsWarningShown),
        },
        {
            category: 'Super Admin',
            href: '/superadmin/email-server',
            isShown: Boolean(isGlobalAdmin && isVpsEmailServerWarningShown),
        },
        {
            category: 'Super Admin',
            href: '/superadmin/resource-monitor',
            isShown: Boolean(isGlobalAdmin && resourceMonitorWarningStatus?.isWarningShown),
        },
        {
            category: 'Super Admin',
            href: '/admin/internal-s3',
            isShown: Boolean(isGlobalAdmin && isInternalS3WarningShown),
        },
        {
            category: 'Administration',
            href: '/admin/core-agents',
            isShown: Boolean(isAdmin && isCoreAgentsMissing),
        },
        {
            category: 'Administration',
            href: '/admin/email-server',
            isShown: Boolean(isAdmin && isAgentEmailWarningShown),
        },
        {
            category: 'Administration',
            href: '/admin/projects',
            isShown: Boolean(isAdmin && isAgentProjectsDnsWarningShown),
        },
        {
            category: 'Login Methods',
            href: '/admin/login-methods/shibboleth',
            isShown: Boolean(
                isAdmin && shibbolethAuthenticationStatus?.isActive && !shibbolethAuthenticationStatus.isConfigured,
            ),
        },
    ];

    return {
        warnings,
        isSystemWarningShown: warnings.some((warning) => warning.isShown),
    };
}

/**
 * Checks whether a System menu href should display its warning indicator.
 *
 * @private function of Header
 */
export function isHeaderSystemWarningShownForHref(warnings: HeaderSystemWarnings, href: string): boolean {
    const hrefWithoutFragment = href.split('#', 1)[0];

    return warnings.warnings.some((warning) => warning.href === hrefWithoutFragment && warning.isShown);
}

/**
 * Checks whether a System dropdown category contains a visible warning.
 *
 * @private function of Header
 */
export function isHeaderSystemWarningShownForCategory(
    warnings: HeaderSystemWarnings,
    category: HeaderSystemWarningCategory,
): boolean {
    return warnings.warnings.some((warning) => warning.category === category && warning.isShown);
}
