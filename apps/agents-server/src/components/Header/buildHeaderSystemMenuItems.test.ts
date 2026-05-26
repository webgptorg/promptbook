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
                'translated:header.logs',
                'translated:header.codeRunners',
                'translated:header.toolLimits',
                'translated:header.backups',
                'translated:header.transcriptions',
                'translated:header.errorSimulation',
            ]),
        );
    });
});
