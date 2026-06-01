import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';
import type { UserInfo } from '../../utils/getCurrentUser';
import { buildHeaderSystemMenuItems } from './buildHeaderSystemMenuItems';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Stable authenticated-user fixture used to exercise the System dropdown tree.
 */
const FIXTURE_USER: UserInfo = {
    username: 'demo',
    isAdmin: true,
    profileImageUrl: null,
};

/**
 * Recursively collects plain-string labels from nested submenu items.
 */
function collectStringLabels(items: ReadonlyArray<SubMenuItem>): string[] {
    return items.flatMap((item) => {
        const currentLabel = typeof item.label === 'string' ? [item.label] : [];
        return [...currentLabel, ...(item.items ? collectStringLabels(item.items) : [])];
    });
}

describe('buildHeaderSystemMenuItems', () => {
    it('translates system categories and the remaining settings-related labels instead of hardcoding English text', () => {
        const translate = (key: ServerTranslationKey) => `translated:${key}`;
        const items = buildHeaderSystemMenuItems({
            translate,
            currentUser: FIXTURE_USER,
            isAdmin: true,
            isGlobalAdmin: true,
            isExperimental: true,
            feedbackMode: 'stars',
        });

        expect(items.map((item) => item.label)).toEqual([
            'translated:header.myAccount',
            'translated:header.utilities',
            'translated:header.superAdmin',
            'translated:header.administration',
            'translated:header.monitoringAndUsage',
            'translated:header.integrationsAndKeys',
            'translated:header.developerDebug',
            'translated:header.legalAndAbout',
        ]);

        const flatLabels = collectStringLabels(items);
        expect(flatLabels).toEqual(
            expect.arrayContaining([
                'translated:header.settings',
                'translated:header.environmentVariables',
                'translated:header.update',
                'translated:header.database',
                'translated:header.logs',
                'translated:header.codeRunners',
                'translated:header.cliAccess',
                'translated:header.toolLimits',
                'translated:header.backups',
                'translated:header.transcriptions',
                'translated:header.errorSimulation',
            ]),
        );
    });

    it('shows the raw super-admin maintenance links only to the super admin', () => {
        const translate = (key: ServerTranslationKey) => `translated:${key}`;
        const normalAdminItems = buildHeaderSystemMenuItems({
            translate,
            currentUser: FIXTURE_USER,
            isAdmin: true,
            isGlobalAdmin: false,
            isExperimental: false,
            feedbackMode: 'stars',
        });
        const userItems = buildHeaderSystemMenuItems({
            translate,
            currentUser: { ...FIXTURE_USER, isAdmin: false },
            isAdmin: false,
            isGlobalAdmin: false,
            isExperimental: false,
            feedbackMode: 'stars',
        });

        expect(collectStringLabels(normalAdminItems)).not.toContain('translated:header.database');
        expect(collectStringLabels(normalAdminItems)).not.toContain('translated:header.update');
        expect(collectStringLabels(normalAdminItems)).not.toContain('translated:header.cliAccess');
        expect(userItems.map((item) => item.label)).not.toContain('translated:header.superAdmin');
    });

    it('adds Shibboleth under login methods only when Shibboleth authentication is active', () => {
        const translate = (key: ServerTranslationKey) => `translated:${key}`;
        const inactiveItems = buildHeaderSystemMenuItems({
            translate,
            currentUser: FIXTURE_USER,
            isAdmin: true,
            isGlobalAdmin: false,
            isExperimental: false,
            feedbackMode: 'stars',
            shibbolethAuthenticationStatus: {
                isActive: false,
                isConfigured: false,
            },
        });
        const activeItems = buildHeaderSystemMenuItems({
            translate,
            currentUser: FIXTURE_USER,
            isAdmin: true,
            isGlobalAdmin: false,
            isExperimental: false,
            feedbackMode: 'stars',
            shibbolethAuthenticationStatus: {
                isActive: true,
                isConfigured: true,
            },
        });

        expect(collectStringLabels(inactiveItems)).not.toContain('translated:header.shibboleth');
        expect(activeItems.map((item) => item.label)).toContain('translated:header.loginMethods');
        expect(collectStringLabels(activeItems)).toContain('translated:header.shibboleth');
    });
});
