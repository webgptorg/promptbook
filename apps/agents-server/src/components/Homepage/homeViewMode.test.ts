import { describe, expect, it } from '@jest/globals';
import { getHomeViewQueryValue, resolveHomeViewMode, resolveHomeViewModeFromSearchParam } from './homeViewMode';

describe('homeViewMode', () => {
    it('resolves the new maze query token alongside the existing homepage modes', () => {
        expect(resolveHomeViewMode('graph')).toBe('GRAPH');
        expect(resolveHomeViewMode('office')).toBe('OFFICE');
        expect(resolveHomeViewMode('maze')).toBe('MAZE');
        expect(resolveHomeViewMode('pixel-office')).toBe('PIXEL_OFFICE');
        expect(resolveHomeViewMode('unexpected')).toBe('LIST');
    });

    it('encodes and decodes the maze mode through search-param helpers', () => {
        expect(getHomeViewQueryValue('MAZE')).toBe('maze');
        expect(resolveHomeViewModeFromSearchParam(['maze'])).toBe('MAZE');
        expect(resolveHomeViewModeFromSearchParam(undefined)).toBe('LIST');
    });
});
