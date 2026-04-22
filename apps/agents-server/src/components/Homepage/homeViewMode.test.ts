import { describe, expect, it } from '@jest/globals';
import { getHomeViewQueryValue, resolveHomeViewMode, resolveHomeViewModeFromSearchParam } from './homeViewMode';

describe('homeViewMode', () => {
    it('resolves the new maze query token', () => {
        expect(resolveHomeViewMode('maze')).toBe('MAZE');
        expect(resolveHomeViewModeFromSearchParam(['maze'])).toBe('MAZE');
        expect(getHomeViewQueryValue('MAZE')).toBe('maze');
    });

    it('keeps list mode as the safe fallback', () => {
        expect(resolveHomeViewMode('unknown-mode')).toBe('LIST');
        expect(getHomeViewQueryValue('LIST')).toBeNull();
    });
});
