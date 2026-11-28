import { SOURCE_FILE_EXTENSIONS } from './find-refactor-candidates.constants';

/**
 * Supported aggressiveness levels for refactor-candidate scanning.
 */
export const REFACTOR_CANDIDATE_LEVEL_VALUES = ['xlow', 'low', 'medium', 'high', 'xhigh', 'extreme'] as const;

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
const REFACTOR_CANDIDATE_LEVEL_DETAILS_BY_LEVEL: Readonly<
    Record<RefactorCandidateLevel, RefactorCandidateLevelDetails>
> = {
    xlow: createRefactorCandidateLevelDetails({
        description: 'Extremely benevolent scan that flags only very obvious refactor targets.',
        maxLineCount: 9600,
        maxEntityCountPerFile: 72,
        maxFunctionCountPerFile: 48,
        maxFunctionComplexity: 40,
    }),
    low: createRefactorCandidateLevelDetails({
        description: 'Conservative scan for only the most obvious refactor targets.',
        maxLineCount: 3600,
        maxEntityCountPerFile: 30,
        maxFunctionCountPerFile: 20,
        maxFunctionComplexity: 24,
    }),
    medium: createRefactorCandidateLevelDetails({
        description: 'Default scan using the current standard thresholds.',
        maxLineCount: 1800,
        maxEntityCountPerFile: 16,
        maxFunctionCountPerFile: 12,
        maxFunctionComplexity: 16,
    }),
    high: createRefactorCandidateLevelDetails({
        description: 'Strict scan that finds more crowded or complex files.',
        maxLineCount: 900,
        maxEntityCountPerFile: 9,
        maxFunctionCountPerFile: 8,
        maxFunctionComplexity: 11,
    }),
    xhigh: createRefactorCandidateLevelDetails({
        description: 'Very strict scan for denser and more complex candidates.',
        maxLineCount: 450,
        maxEntityCountPerFile: 5,
        maxFunctionCountPerFile: 5,
        maxFunctionComplexity: 7,
    }),
    extreme: createRefactorCandidateLevelDetails({
        description: 'Most aggressive scan that surfaces even weak refactor opportunities.',
        maxLineCount: 180,
        maxEntityCountPerFile: 2,
        maxFunctionCountPerFile: 2,
        maxFunctionComplexity: 4,
    }),
};

/**
 * Resolves the thresholds for a selected refactor-candidate scanning level.
 */
export function getRefactorCandidateLevelConfiguration(
    level: RefactorCandidateLevel = DEFAULT_REFACTOR_CANDIDATE_LEVEL,
): RefactorCandidateLevelConfiguration {
    return REFACTOR_CANDIDATE_LEVEL_DETAILS_BY_LEVEL[level].configuration;
}

/**
 * Resolves the user-facing description for a selected refactor-candidate scanning level.
 */
export function getRefactorCandidateLevelDescription(level: RefactorCandidateLevel): string {
    return REFACTOR_CANDIDATE_LEVEL_DETAILS_BY_LEVEL[level].description;
}

/**
 * Shared metadata stored for one refactor-candidate scanning level.
 */
type RefactorCandidateLevelDetails = {
    /**
     * Human-readable summary used in CLI help text.
     */
    readonly description: string;

    /**
     * Thresholds used by the scanner for this level.
     */
    readonly configuration: RefactorCandidateLevelConfiguration;
};

/**
 * Input used to build one normalized refactor-candidate level entry.
 */
type CreateRefactorCandidateLevelDetailsOptions = {
    /**
     * Human-readable summary used in CLI help text.
     */
    readonly description: string;

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
 * Builds one normalized refactor-candidate level entry.
 */
function createRefactorCandidateLevelDetails(
    options: CreateRefactorCandidateLevelDetailsOptions,
): RefactorCandidateLevelDetails {
    const { description, maxLineCount, maxEntityCountPerFile, maxFunctionCountPerFile, maxFunctionComplexity } = options;

    return {
        description,
        configuration: createRefactorCandidateLevelConfiguration({
            maxLineCount,
            maxEntityCountPerFile,
            maxFunctionCountPerFile,
            maxFunctionComplexity,
        }),
    };
}

/**
 * Builds one normalized refactor-candidate level configuration entry.
 */
function createRefactorCandidateLevelConfiguration(
    options: Omit<CreateRefactorCandidateLevelDetailsOptions, 'description'>,
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
