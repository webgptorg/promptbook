import { describe, expect, it } from '@jest/globals';
import { buildHeaderMenuItems } from './buildHeaderMenuItems';

/**
 * No-op setter used for menu-builder tests.
 */
const SET_MENU_OPEN = () => undefined;

/**
 * System submenu entries that are non-empty so only the access gate decides System visibility.
 */
const SYSTEM_MENU_ENTRIES = [
    {
        label: 'Settings',
        href: '/system/settings',
    },
];

describe('buildHeaderMenuItems', () => {
    it('assigns distinct icons to top-level Documentation and System entries', () => {
        const items = buildHeaderMenuItems({
            documentationDropdownItems: [],
            documentationLabel: 'Documentation',
            hasMenuAccess: true,
            isDocsOpen: false,
            isMobileDocsOpen: false,
            isMobileSystemOpen: false,
            isSystemOpen: false,
            setIsDocsOpen: SET_MENU_OPEN,
            setIsMobileDocsOpen: SET_MENU_OPEN,
            setIsMobileSystemOpen: SET_MENU_OPEN,
            setIsSystemOpen: SET_MENU_OPEN,
            systemLabel: 'System',
            systemMenuEntries: SYSTEM_MENU_ENTRIES,
        });
        const icons = items.map((item) => item.icon);

        expect(icons).toHaveLength(2);
        expect(icons.every(Boolean)).toBe(true);
        expect(new Set(icons).size).toBe(icons.length);
    });

    it('hides both the Documentation and System menus from viewers without menu access', () => {
        const items = buildHeaderMenuItems({
            documentationDropdownItems: [],
            documentationLabel: 'Documentation',
            hasMenuAccess: false,
            isDocsOpen: false,
            isMobileDocsOpen: false,
            isMobileSystemOpen: false,
            isSystemOpen: false,
            setIsDocsOpen: SET_MENU_OPEN,
            setIsMobileDocsOpen: SET_MENU_OPEN,
            setIsMobileSystemOpen: SET_MENU_OPEN,
            setIsSystemOpen: SET_MENU_OPEN,
            systemLabel: 'System',
            systemMenuEntries: SYSTEM_MENU_ENTRIES,
        });

        expect(items.map((item) => item.id)).not.toContain('documentation');
        expect(items.map((item) => item.id)).not.toContain('system');
    });
});
