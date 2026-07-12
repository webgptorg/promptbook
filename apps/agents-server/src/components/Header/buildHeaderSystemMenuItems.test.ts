import { isValidElement } from 'react';

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

/**
 * Counts every submenu item including nested entries.
 */
function countSubMenuItems(items: ReadonlyArray<SubMenuItem>): number {
    return items.reduce((count, item) => count + 1 + (item.items ? countSubMenuItems(item.items) : 0), 0);
}

/**
 * Collects every rendered submenu icon including nested entries.
 */
function collectSubMenuIcons(items: ReadonlyArray<SubMenuItem>): Array<NonNullable<SubMenuItem['icon']>> {
    return items.flatMap((item) => [
        ...(item.icon ? [item.icon] : []),
        ...(item.items ? collectSubMenuIcons(item.items) : []),
    ]);
}

/**
 * Finds one menu entry by href.
 */
function findItemByHref(items: ReadonlyArray<SubMenuItem>, href: string): SubMenuItem | null {
    for (const item of items) {
        if (item.href === href) {
            return item;
        }

        const childItem = item.items ? findItemByHref(item.items, href) : null;
        if (childItem) {
            return childItem;
        }
    }

    return null;
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
                'translated:header.resourceMonitor',
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
        expect(collectStringLabels(normalAdminItems)).not.toContain('translated:header.resourceMonitor');
        expect(collectStringLabels(normalAdminItems)).not.toContain('translated:header.cliAccess');
        expect(userItems.map((item) => item.label)).not.toContain('translated:header.superAdmin');
    });

    it('decorates the resource monitor menu item when resources are under pressure', () => {
        const translate = (key: ServerTranslationKey) => `translated:${key}`;
        const items = buildHeaderSystemMenuItems({
            translate,
            currentUser: FIXTURE_USER,
            isAdmin: true,
            isGlobalAdmin: true,
            isExperimental: false,
            feedbackMode: 'stars',
            resourceMonitorWarningStatus: {
                isWarningShown: true,
                issues: [
                    {
                        resource: 'memory',
                        message: 'Free memory is low.',
                    },
                ],
                warningMessages: ['Free memory is low.'],
            },
        });
        const resourceMonitorItem = findItemByHref(items, '/admin/resource-monitor');

        expect(resourceMonitorItem).not.toBeNull();
        expect(isValidElement(resourceMonitorItem?.label)).toBe(true);
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

    it('assigns one distinct icon to every System menu entry', () => {
        const translate = (key: ServerTranslationKey) => `translated:${key}`;
        const items = buildHeaderSystemMenuItems({
            translate,
            currentUser: FIXTURE_USER,
            isAdmin: true,
            isGlobalAdmin: true,
            isExperimental: true,
            feedbackMode: 'stars',
            shibbolethAuthenticationStatus: {
                isActive: true,
                isConfigured: false,
            },
            resourceMonitorWarningStatus: {
                isWarningShown: true,
                issues: [
                    {
                        resource: 'memory',
                        message: 'Free memory is low.',
                    },
                ],
                warningMessages: ['Free memory is low.'],
            },
        });
        const icons = collectSubMenuIcons(items);

        expect(icons).toHaveLength(countSubMenuItems(items));
        expect(new Set(icons).size).toBe(icons.length);
    });
});
