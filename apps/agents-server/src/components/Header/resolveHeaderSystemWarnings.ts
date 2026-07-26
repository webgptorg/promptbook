import type { ShibbolethAuthenticationMenuStatus } from '../../constants/shibbolethAuth';
import type { ServerResourceWarningStatus } from '../../utils/resourceMonitor/resourceMonitorTypes';

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
};

/**
 * Visibility of each System warning together with the aggregate indicator.
 *
 * @private type of Header
 */
export type HeaderSystemWarnings = {
    /**
     * Whether the Shibboleth login method is active but not fully configured.
     */
    readonly isShibbolethConfigurationWarningShown: boolean;

    /**
     * Whether a monitored server resource is currently under pressure.
     */
    readonly isResourceMonitorWarningShown: boolean;

    /**
     * Whether one or more bundled core agents are missing on this server.
     */
    readonly isCoreAgentsWarningShown: boolean;

    /**
     * Whether any System warning should decorate the top-level System menu label.
     */
    readonly isSystemWarningShown: boolean;
};

/**
 * Resolves which System warnings the current viewer is allowed to see.
 *
 * Every System warning describes a server configuration or operational problem that only the
 * responsible administrator should act on (resource pressure, misconfigured login methods, missing
 * core agents), so each warning is gated behind the matching admin capability. Centralizing the
 * policy here keeps the top-level System label indicator and the individual System submenu entries
 * in agreement and prevents admin-only warnings from leaking to regular or anonymous visitors.
 *
 * @private function of Header
 */
export function resolveHeaderSystemWarnings({
    isAdmin,
    isGlobalAdmin,
    shibbolethAuthenticationStatus,
    resourceMonitorWarningStatus,
    isCoreAgentsMissing = false,
}: ResolveHeaderSystemWarningsOptions): HeaderSystemWarnings {
    const isShibbolethConfigurationWarningShown = Boolean(
        isAdmin && shibbolethAuthenticationStatus?.isActive && !shibbolethAuthenticationStatus.isConfigured,
    );
    const isResourceMonitorWarningShown = Boolean(isGlobalAdmin && resourceMonitorWarningStatus?.isWarningShown);
    const isCoreAgentsWarningShown = Boolean(isAdmin && isCoreAgentsMissing);

    return {
        isShibbolethConfigurationWarningShown,
        isResourceMonitorWarningShown,
        isCoreAgentsWarningShown,
        isSystemWarningShown:
            isShibbolethConfigurationWarningShown || isResourceMonitorWarningShown || isCoreAgentsWarningShown,
    };
}
