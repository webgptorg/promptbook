import {
    isHeaderSystemWarningShownForCategory,
    isHeaderSystemWarningShownForHref,
    resolveHeaderSystemWarnings,
} from './resolveHeaderSystemWarnings';

describe('resolveHeaderSystemWarnings', () => {
    it('hides every admin warning from anonymous and regular viewers', () => {
        const warnings = resolveHeaderSystemWarnings({
            isAdmin: false,
            isGlobalAdmin: false,
            shibbolethAuthenticationStatus: { isActive: true, isConfigured: false },
            resourceMonitorWarningStatus: { isWarningShown: true, issues: [], warningMessages: [] },
            isCoreAgentsMissing: true,
            isAgentEmailWarningShown: true,
            isAgentProjectsDnsWarningShown: true,
            isVpsEmailServerWarningShown: true,
            isServersDnsWarningShown: true,
            isInternalS3WarningShown: true,
        });

        expect(warnings.warnings.every((warning) => !warning.isShown)).toBe(true);
        expect(warnings.isSystemWarningShown).toBe(false);
    });

    it('shows the misconfigured Shibboleth warning only to an administrator', () => {
        const shibbolethAuthenticationStatus = { isActive: true, isConfigured: false } as const;

        expect(
            isHeaderSystemWarningShownForHref(
                resolveHeaderSystemWarnings({ isAdmin: false, isGlobalAdmin: false, shibbolethAuthenticationStatus }),
                '/admin/login-methods/shibboleth',
            ),
        ).toBe(false);
        expect(
            isHeaderSystemWarningShownForHref(
                resolveHeaderSystemWarnings({ isAdmin: true, isGlobalAdmin: false, shibbolethAuthenticationStatus }),
                '/admin/login-methods/shibboleth#setup-instructions',
            ),
        ).toBe(true);
    });

    it('does not warn when Shibboleth is active and correctly configured', () => {
        const warnings = resolveHeaderSystemWarnings({
            isAdmin: true,
            isGlobalAdmin: false,
            shibbolethAuthenticationStatus: { isActive: true, isConfigured: true },
        });

        expect(isHeaderSystemWarningShownForHref(warnings, '/admin/login-methods/shibboleth')).toBe(false);
    });

    it('shows resource pressure only to the super admin', () => {
        const resourceMonitorWarningStatus = { isWarningShown: true, issues: [], warningMessages: [] } as const;

        expect(
            isHeaderSystemWarningShownForHref(
                resolveHeaderSystemWarnings({ isAdmin: true, isGlobalAdmin: false, resourceMonitorWarningStatus }),
                '/superadmin/resource-monitor',
            ),
        ).toBe(false);
        expect(
            isHeaderSystemWarningShownForHref(
                resolveHeaderSystemWarnings({ isAdmin: true, isGlobalAdmin: true, resourceMonitorWarningStatus }),
                '/superadmin/resource-monitor',
            ),
        ).toBe(true);
    });

    it('shows per-server operational warnings only to administrators', () => {
        for (const href of ['/admin/core-agents', '/admin/email-server', '/admin/projects']) {
            expect(
                isHeaderSystemWarningShownForHref(
                    resolveHeaderSystemWarnings({
                        isAdmin: false,
                        isGlobalAdmin: false,
                        isCoreAgentsMissing: true,
                        isAgentEmailWarningShown: true,
                        isAgentProjectsDnsWarningShown: true,
                    }),
                    href,
                ),
            ).toBe(false);
            expect(
                isHeaderSystemWarningShownForHref(
                    resolveHeaderSystemWarnings({
                        isAdmin: true,
                        isGlobalAdmin: false,
                        isCoreAgentsMissing: true,
                        isAgentEmailWarningShown: true,
                        isAgentProjectsDnsWarningShown: true,
                    }),
                    href,
                ),
            ).toBe(true);
        }
    });

    it('shows VPS operational warnings only to the super admin', () => {
        for (const href of ['/superadmin/servers', '/superadmin/email-server', '/admin/internal-s3']) {
            expect(
                isHeaderSystemWarningShownForHref(
                    resolveHeaderSystemWarnings({
                        isAdmin: true,
                        isGlobalAdmin: false,
                        isServersDnsWarningShown: true,
                        isVpsEmailServerWarningShown: true,
                        isInternalS3WarningShown: true,
                    }),
                    href,
                ),
            ).toBe(false);
            expect(
                isHeaderSystemWarningShownForHref(
                    resolveHeaderSystemWarnings({
                        isAdmin: true,
                        isGlobalAdmin: true,
                        isServersDnsWarningShown: true,
                        isVpsEmailServerWarningShown: true,
                        isInternalS3WarningShown: true,
                    }),
                    href,
                ),
            ).toBe(true);
        }
    });

    it('aggregates item warnings into their category and top-level System indicators', () => {
        const warnings = resolveHeaderSystemWarnings({
            isAdmin: true,
            isGlobalAdmin: true,
            isAgentEmailWarningShown: true,
            isServersDnsWarningShown: true,
        });

        expect(isHeaderSystemWarningShownForCategory(warnings, 'Administration')).toBe(true);
        expect(isHeaderSystemWarningShownForCategory(warnings, 'Super Admin')).toBe(true);
        expect(isHeaderSystemWarningShownForCategory(warnings, 'Login Methods')).toBe(false);
        expect(warnings.isSystemWarningShown).toBe(true);
    });
});
