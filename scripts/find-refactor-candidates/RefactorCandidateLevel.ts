import { SOURCE_FILE_EXTENSIONS } from './find-refactor-candidates.constants';

/**
 * Supported aggressiveness levels for refactor-candidate scanning.
 */
export const REFACTOR_CANDIDATE_LEVEL_VALUES = ['low', 'medium', 'high', 'xhigh'] as const;

/**
 * Supported aggressiveness levels for refactor-candidate scanning.
 */
export type RefactorCandidateLevel = (typeof REFACTOR_CANDIDATE_LEVEL_VALUES)[number];

/**
 * Thresholds used when deciding whether a file should be suggested for refactoring.
 */
export type RefactorCandidateLevelConfiguration = {
    /**
     * Fallback line-count threshold when a file extension has no dedicated entry.
     */
    readonly maxDefaultLineCount: number;

    /**
     * Per-extension line-count thresholds.
     */
    readonly maxLineCountByExtension: Readonly<Record<string, number>>;

    /**
     * Maximum number of top-level entities before a file is flagged.
     */
    readonly maxEntityCountPerFile: number;

    /**
     * Maximum number of named functions and methods before a file is flagged.
     */
    readonly maxFunctionCountPerFile: number;

    /**
     * Maximum complexity allowed for any single function in the file.
     */
    readonly maxFunctionComplexity: number;
};

/**
 * Default aggressiveness level for refactor-candidate scanning.
 */
export const DEFAULT_REFACTOR_CANDIDATE_LEVEL: RefactorCandidateLevel = 'medium';

/**
 * Threshold table for each supported refactor-candidate scanning level.
 */
const REFACTOR_CANDIDATE_LEVEL_CONFIGURATION_BY_LEVEL: Readonly<
    Record<RefactorCandidateLevel, RefactorCandidateLevelConfiguration>
> = {
    low: createRefactorCandidateLevelConfiguration({
        maxLineCount: 2800,
        maxEntityCountPerFile: 28,
        maxFunctionCountPerFile: 18,
        maxFunctionComplexity: 20,
    }),
    medium: createRefactorCandidateLevelConfiguration({
        maxLineCount: 2000,
        maxEntityCountPerFile: 20,
        maxFunctionCountPerFile: 14,
        maxFunctionComplexity: 16,
    }),
    high: createRefactorCandidateLevelConfiguration({
        maxLineCount: 1500,
        maxEntityCountPerFile: 16,
        maxFunctionCountPerFile: 10,
        maxFunctionComplexity: 12,
    }),
    xhigh: createRefactorCandidateLevelConfiguration({
        maxLineCount: 1000,
        maxEntityCountPerFile: 12,
        maxFunctionCountPerFile: 8,
        maxFunctionComplexity: 8,
    }),
};

/**
 * Resolves the thresholds for a selected refactor-candidate scanning level.
 */
export function getRefactorCandidateLevelConfiguration(
    level: RefactorCandidateLevel = DEFAULT_REFACTOR_CANDIDATE_LEVEL,
): RefactorCandidateLevelConfiguration {
    return REFACTOR_CANDIDATE_LEVEL_CONFIGURATION_BY_LEVEL[level];
}

/**
 * Input used to build one normalized refactor-candidate level configuration.
 */
type CreateRefactorCandidateLevelConfigurationOptions = {
    /**
     * Shared line-count threshold applied to every supported source extension.
     */
    readonly maxLineCount: number;

    /**
     * Maximum number of top-level entities allowed per file.
     */
    readonly maxEntityCountPerFile: number;

    /**
     * Maximum number of named functions and methods allowed per file.
     */
    readonly maxFunctionCountPerFile: number;

    /**
     * Maximum complexity allowed for one function.
     */
    readonly maxFunctionComplexity: number;
};

/**
 * Builds one normalized refactor-candidate level configuration entry.
 */
function createRefactorCandidateLevelConfiguration(
    options: CreateRefactorCandidateLevelConfigurationOptions,
): RefactorCandidateLevelConfiguration {
    const { maxLineCount, maxEntityCountPerFile, maxFunctionCountPerFile, maxFunctionComplexity } = options;

    return {
        maxDefaultLineCount: maxLineCount,
        maxLineCountByExtension: createLineCountLimits(maxLineCount),
        maxEntityCountPerFile,
        maxFunctionCountPerFile,
        maxFunctionComplexity,
    };
}

/**
 * Creates a per-extension line-count table using one shared threshold.
 */
function createLineCountLimits(maxLineCount: number): Readonly<Record<string, number>> {
    const maxLineCountByExtension: Record<string, number> = {};

    for (const extension of SOURCE_FILE_EXTENSIONS) {
        maxLineCountByExtension[extension] = maxLineCount;
    }

    return maxLineCountByExtension;
}

// Note: [🟡] Code for repository script [RefactorCandidateLevel](scripts/find-refactor-candidates/RefactorCandidateLevel.ts) should never be published outside of `@promptbook/cli`
