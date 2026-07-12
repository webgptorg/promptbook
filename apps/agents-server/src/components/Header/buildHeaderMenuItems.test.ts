import { describe, expect, it } from '@jest/globals';
import { buildHeaderMenuItems } from './buildHeaderMenuItems';

/**
 * No-op setter used for menu-builder tests.
 */
const SET_MENU_OPEN = () => undefined;

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
            systemMenuEntries: [
                {
                    label: 'Settings',
                    href: '/system/settings',
                },
            ],
        });
        const icons = items.map((item) => item.icon);

        expect(icons).toHaveLength(2);
        expect(icons.every(Boolean)).toBe(true);
        expect(new Set(icons).size).toBe(icons.length);
    });
});
