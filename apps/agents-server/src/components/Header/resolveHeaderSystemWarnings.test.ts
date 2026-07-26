import { resolveHeaderSystemWarnings } from './resolveHeaderSystemWarnings';

describe('resolveHeaderSystemWarnings', () => {
    it('hides every admin warning from anonymous and regular viewers', () => {
        const warnings = resolveHeaderSystemWarnings({
            isAdmin: false,
            isGlobalAdmin: false,
            shibbolethAuthenticationStatus: { isActive: true, isConfigured: false },
            resourceMonitorWarningStatus: { isWarningShown: true, issues: [], warningMessages: [] },
            isCoreAgentsMissing: true,
        });

        expect(warnings).toEqual({
            isShibbolethConfigurationWarningShown: false,
            isResourceMonitorWarningShown: false,
            isCoreAgentsWarningShown: false,
            isSystemWarningShown: false,
        });
    });

    it('shows the misconfigured Shibboleth warning only to an administrator', () => {
        const shibbolethAuthenticationStatus = { isActive: true, isConfigured: false } as const;

        expect(
            resolveHeaderSystemWarnings({ isAdmin: false, isGlobalAdmin: false, shibbolethAuthenticationStatus })
                .isShibbolethConfigurationWarningShown,
        ).toBe(false);
        expect(
            resolveHeaderSystemWarnings({ isAdmin: true, isGlobalAdmin: false, shibbolethAuthenticationStatus })
                .isShibbolethConfigurationWarningShown,
        ).toBe(true);
    });

    it('does not warn when Shibboleth is active and correctly configured', () => {
        expect(
            resolveHeaderSystemWarnings({
                isAdmin: true,
                isGlobalAdmin: false,
                shibbolethAuthenticationStatus: { isActive: true, isConfigured: true },
            }).isShibbolethConfigurationWarningShown,
        ).toBe(false);
    });

    it('shows the resource monitor warning only to the super admin', () => {
        const resourceMonitorWarningStatus = { isWarningShown: true, issues: [], warningMessages: [] } as const;

        expect(
            resolveHeaderSystemWarnings({ isAdmin: true, isGlobalAdmin: false, resourceMonitorWarningStatus })
                .isResourceMonitorWarningShown,
        ).toBe(false);
        expect(
            resolveHeaderSystemWarnings({ isAdmin: true, isGlobalAdmin: true, resourceMonitorWarningStatus })
                .isResourceMonitorWarningShown,
        ).toBe(true);
    });

    it('shows the missing-core-agents warning only to an administrator', () => {
        expect(
            resolveHeaderSystemWarnings({ isAdmin: false, isGlobalAdmin: false, isCoreAgentsMissing: true })
                .isCoreAgentsWarningShown,
        ).toBe(false);
        expect(
            resolveHeaderSystemWarnings({ isAdmin: true, isGlobalAdmin: false, isCoreAgentsMissing: true })
                .isCoreAgentsWarningShown,
        ).toBe(true);
    });

    it('aggregates the individual warnings into the top-level System indicator', () => {
        expect(
            resolveHeaderSystemWarnings({ isAdmin: true, isGlobalAdmin: false, isCoreAgentsMissing: true })
                .isSystemWarningShown,
        ).toBe(true);
        expect(resolveHeaderSystemWarnings({ isAdmin: true, isGlobalAdmin: true }).isSystemWarningShown).toBe(false);
    });
});
