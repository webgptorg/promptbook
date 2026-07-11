import { describe, expect, it } from '@jest/globals';
import {
    DEFAULT_AGENTS_SERVER_GC_KEEP_VERSIONS_COUNT,
    normalizeAgentsServerGcKeepVersionsCount,
} from './vpsSelfUpdateInstalledVersions';

describe('normalizeAgentsServerGcKeepVersionsCount', () => {
    it('keeps 3 versions by default', () => {
        expect(DEFAULT_AGENTS_SERVER_GC_KEEP_VERSIONS_COUNT).toBe(3);
        expect(normalizeAgentsServerGcKeepVersionsCount(null)).toBe(3);
        expect(normalizeAgentsServerGcKeepVersionsCount(undefined)).toBe(3);
        expect(normalizeAgentsServerGcKeepVersionsCount('')).toBe(3);
        expect(normalizeAgentsServerGcKeepVersionsCount('   ')).toBe(3);
    });

    it('parses configured keep counts', () => {
        expect(normalizeAgentsServerGcKeepVersionsCount('1')).toBe(1);
        expect(normalizeAgentsServerGcKeepVersionsCount('5')).toBe(5);
        expect(normalizeAgentsServerGcKeepVersionsCount(' 10 ')).toBe(10);
    });

    it('falls back to the default for invalid values', () => {
        expect(normalizeAgentsServerGcKeepVersionsCount('0')).toBe(3);
        expect(normalizeAgentsServerGcKeepVersionsCount('-2')).toBe(3);
        expect(normalizeAgentsServerGcKeepVersionsCount('3.5')).toBe(3);
        expect(normalizeAgentsServerGcKeepVersionsCount('three')).toBe(3);
        expect(normalizeAgentsServerGcKeepVersionsCount('1e3')).toBe(3);
    });
});
