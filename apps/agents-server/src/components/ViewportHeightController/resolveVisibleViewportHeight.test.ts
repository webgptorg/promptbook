import { resolveVisibleViewportHeight } from './resolveVisibleViewportHeight';

describe('resolveVisibleViewportHeight', () => {
    it('prefers VisualViewport height when available', () => {
        expect(
            resolveVisibleViewportHeight({
                innerHeight: 812,
                visualViewport: { height: 743.4 },
            }),
        ).toBe(743);
    });

    it('falls back to innerHeight when VisualViewport is missing', () => {
        expect(
            resolveVisibleViewportHeight({
                innerHeight: 812,
            }),
        ).toBe(812);
    });

    it('ignores invalid VisualViewport heights', () => {
        expect(
            resolveVisibleViewportHeight({
                innerHeight: 667,
                visualViewport: { height: 0 },
            }),
        ).toBe(667);
    });
});
