import { promises as fileSystem } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Sub-directory of the OS temp folder where per-config estimate caches are stored.
 *
 * @private internal constant of `coderRunEstimateCache`
 */
const ESTIMATE_CACHE_DIRECTORY_NAME = 'ptbk-coder-estimates';

/**
 * Cache key used to uniquely identify the average prompt duration for a given runner configuration.
 *
 * @private internal type of `coderRunEstimateCache`
 */
export type CoderRunEstimateCacheKey = {
    readonly harness: string;
    readonly model?: string;
    readonly thinkingLevel?: string;
};

/**
 * On-disk shape persisted per `(harness, model, thinking-level)` combination.
 *
 * @private internal type of `coderRunEstimateCache`
 */
type CoderRunEstimateCacheEntry = {
    readonly averagePromptDurationMs: number;
    readonly sampleCount: number;
    readonly updatedAt: string;
};

/**
 * Absolute path to the directory where estimate caches are persisted.
 *
 * @private internal utility of `coderRunEstimateCache`
 */
function getEstimateCacheDirectory(): string {
    return join(tmpdir(), ESTIMATE_CACHE_DIRECTORY_NAME);
}

/**
 * Sanitizes a single identifier component so that it is safe to use as a filename segment.
 *
 * @private internal utility of `coderRunEstimateCache`
 */
function sanitizeFileNameSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Builds the cache filename for a given runner configuration.
 *
 * @private internal utility of `coderRunEstimateCache`
 */
function buildEstimateCacheFileName(key: CoderRunEstimateCacheKey): string {
    const harnessSegment = sanitizeFileNameSegment(key.harness);
    const modelSegment = sanitizeFileNameSegment(key.model ?? 'default');
    const thinkingLevelSegment = sanitizeFileNameSegment(key.thinkingLevel ?? 'default');
    return `${harnessSegment}__${modelSegment}__${thinkingLevelSegment}.json`;
}

/**
 * Reads the previously persisted cache entry for a configuration if available.
 *
 * @private internal utility of `coderRunEstimateCache`
 */
async function readEstimateCacheEntry(filePath: string): Promise<CoderRunEstimateCacheEntry | undefined> {
    try {
        const content = await fileSystem.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content) as Partial<CoderRunEstimateCacheEntry>;
        if (
            typeof parsed.averagePromptDurationMs !== 'number' ||
            !Number.isFinite(parsed.averagePromptDurationMs) ||
            parsed.averagePromptDurationMs <= 0 ||
            typeof parsed.sampleCount !== 'number' ||
            !Number.isFinite(parsed.sampleCount) ||
            parsed.sampleCount <= 0
        ) {
            return undefined;
        }
        return {
            averagePromptDurationMs: parsed.averagePromptDurationMs,
            sampleCount: parsed.sampleCount,
            updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
        };
    } catch {
        return undefined;
    }
}

/**
 * Loads the cached average prompt duration for the given runner configuration.
 *
 * Returns `undefined` when no usable cache entry exists. Cache failures must never break the run, so this
 * function swallows IO and parsing errors instead of throwing.
 *
 * @public exported for use by the coder run progress displays
 */
export async function loadCachedAveragePromptDurationMs(
    key: CoderRunEstimateCacheKey,
): Promise<number | undefined> {
    const filePath = join(getEstimateCacheDirectory(), buildEstimateCacheFileName(key));
    const entry = await readEstimateCacheEntry(filePath);
    return entry?.averagePromptDurationMs;
}

/**
 * Records a new prompt-duration sample for the given runner configuration into the temp folder cache.
 *
 * Updates a running average so future `ptbk coder run` / `ptbk coder server` invocations can show
 * meaningful estimates immediately, before the first prompt of the new session has completed.
 *
 * Cache failures are swallowed because the next-run estimate is best-effort and must not affect the
 * current run.
 *
 * @public exported for use by the prompt round finalizer
 */
export async function recordPromptDurationSample(
    key: CoderRunEstimateCacheKey,
    promptDurationMs: number,
): Promise<void> {
    if (!Number.isFinite(promptDurationMs) || promptDurationMs <= 0) {
        return;
    }

    try {
        const cacheDirectory = getEstimateCacheDirectory();
        await fileSystem.mkdir(cacheDirectory, { recursive: true });
        const filePath = join(cacheDirectory, buildEstimateCacheFileName(key));

        const previousEntry = await readEstimateCacheEntry(filePath);
        const previousSampleCount = previousEntry?.sampleCount ?? 0;
        const previousTotalMs = (previousEntry?.averagePromptDurationMs ?? 0) * previousSampleCount;
        const nextSampleCount = previousSampleCount + 1;
        const nextAveragePromptDurationMs = (previousTotalMs + promptDurationMs) / nextSampleCount;

        const nextEntry: CoderRunEstimateCacheEntry = {
            averagePromptDurationMs: nextAveragePromptDurationMs,
            sampleCount: nextSampleCount,
            updatedAt: new Date().toISOString(),
        };

        await fileSystem.writeFile(filePath, JSON.stringify(nextEntry, null, 4), 'utf-8');
    } catch {
        // Note: Persisting the estimate cache is best-effort. Failures must not affect the current run.
    }
}

// Note: [🟡] Code in this file is only used from `@promptbook/cli` orchestration scripts and is not shipped to other consumers.
