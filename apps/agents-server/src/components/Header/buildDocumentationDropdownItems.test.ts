import { describe, expect, it } from '@jest/globals';
import { getVisibleCommitmentDefinitions } from '../../utils/getVisibleCommitmentDefinitions';
import { buildDocumentationDropdownItems } from './buildDocumentationDropdownItems';
import type { SubMenuItem } from './SubMenuItem';

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

describe('buildDocumentationDropdownItems', () => {
    it('puts important commitments before the rest of the documentation catalogue and fades low-level entries', () => {
        const items = buildDocumentationDropdownItems(getVisibleCommitmentDefinitions(), (key) => key);

        expect(items.slice(0, 2).map(({ href }) => href)).toEqual(['/docs', '/swagger']);
        expect(items.slice(2, 6).map(({ href }) => href)).toEqual([
            '/docs/GOAL',
            '/docs/RULE',
            '/docs/KNOWLEDGE',
            '/docs/TEAM',
        ]);
        expect(items[6]?.label).toBe('header.documentationAll');
        expect(items[6]?.items?.length).toBeGreaterThan(0);
        const lastItem = items[6]?.items?.[items[6]!.items!.length - 1];
        const lastLabel = lastItem?.label as { props?: { className?: string } } | undefined;

        expect(lastItem?.href).toBe('/docs/MODEL');
        expect(lastLabel?.props?.className).toContain('opacity-70');
    });

    it('assigns one distinct icon to every documentation menu entry', () => {
        const items = buildDocumentationDropdownItems(getVisibleCommitmentDefinitions(), (key) => key);
        const icons = collectSubMenuIcons(items);

        expect(icons).toHaveLength(countSubMenuItems(items));
        expect(new Set(icons).size).toBe(icons.length);
    });
});
