import { promises as fileSystem } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    loadCachedAveragePromptDurationMs,
    recordPromptDurationSample,
} from './coderRunEstimateCache';

/**
 * Path to the cache directory used by `coderRunEstimateCache`. Hardcoded here to mirror the constant
 * defined in the implementation file so we can clean it up between tests without exporting it.
 */
const ESTIMATE_CACHE_DIRECTORY = join(tmpdir(), 'ptbk-coder-estimates');

describe('coderRunEstimateCache', () => {
    async function clearCache(): Promise<void> {
        await fileSystem.rm(ESTIMATE_CACHE_DIRECTORY, { recursive: true, force: true });
    }

    beforeEach(async () => {
        await clearCache();
    });

    afterAll(async () => {
        await clearCache();
    });

    it('returns undefined when no cache entry exists for the configuration', async () => {
        const cached = await loadCachedAveragePromptDurationMs({
            harness: 'github-copilot',
            model: 'gpt-5.4',
            thinkingLevel: 'xhigh',
        });

        expect(cached).toBeUndefined();
    });

    it('persists a single sample and returns it as the cached average duration', async () => {
        const key = {
            harness: 'github-copilot',
            model: 'gpt-5.4',
            thinkingLevel: 'xhigh',
        } as const;

        await recordPromptDurationSample(key, 60_000);
        const cached = await loadCachedAveragePromptDurationMs(key);

        expect(cached).toBe(60_000);
    });

    it('averages multiple samples for the same configuration', async () => {
        const key = {
            harness: 'github-copilot',
            model: 'gpt-5.4',
            thinkingLevel: 'xhigh',
        } as const;

        await recordPromptDurationSample(key, 60_000);
        await recordPromptDurationSample(key, 120_000);
        const cached = await loadCachedAveragePromptDurationMs(key);

        expect(cached).toBe(90_000);
    });

    it('stores separate caches for distinct harness/model/thinking-level combinations', async () => {
        const firstKey = {
            harness: 'github-copilot',
            model: 'gpt-5.4',
            thinkingLevel: 'xhigh',
        } as const;
        const secondKey = {
            harness: 'github-copilot',
            model: 'gpt-5.4',
            thinkingLevel: 'low',
        } as const;

        await recordPromptDurationSample(firstKey, 60_000);
        await recordPromptDurationSample(secondKey, 30_000);

        expect(await loadCachedAveragePromptDurationMs(firstKey)).toBe(60_000);
        expect(await loadCachedAveragePromptDurationMs(secondKey)).toBe(30_000);
    });

    it('ignores non-positive samples without persisting an entry', async () => {
        const key = {
            harness: 'github-copilot',
            model: 'gpt-5.4',
            thinkingLevel: 'xhigh',
        } as const;

        await recordPromptDurationSample(key, 0);
        await recordPromptDurationSample(key, -1_000);

        expect(await loadCachedAveragePromptDurationMs(key)).toBeUndefined();
    });
});
