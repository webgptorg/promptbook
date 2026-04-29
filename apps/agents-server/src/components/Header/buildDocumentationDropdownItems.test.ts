import { describe, expect, it } from '@jest/globals';
import { getVisibleCommitmentDefinitions } from '../../utils/getVisibleCommitmentDefinitions';
import { buildDocumentationDropdownItems } from './buildDocumentationDropdownItems';

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
});
