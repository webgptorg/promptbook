import { describe, expect, it } from '@jest/globals';
import { getHomeViewQueryValue, resolveHomeViewMode, resolveHomeViewModeFromSearchParam } from './homeViewMode';

describe('homeViewMode', () => {
    it('resolves the maze query token to the new maze view', () => {
        expect(resolveHomeViewMode('maze')).toBe('MAZE');
        expect(resolveHomeViewModeFromSearchParam(['maze'])).toBe('MAZE');
        expect(getHomeViewQueryValue('MAZE')).toBe('maze');
    });
});
