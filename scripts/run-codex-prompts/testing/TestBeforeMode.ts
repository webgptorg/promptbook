/**
 * Modes supported by `ptbk coder run --test-before`.
 */
export const TEST_BEFORE_MODE_VALUES = ['no', 'yes-and-fail', 'yes-and-fix'] as const;

/**
 * Behavior requested for the pre-coding verification run.
 */
export type TestBeforeMode = (typeof TEST_BEFORE_MODE_VALUES)[number];

/**
 * Default verification command used when a pre-coding mode is enabled without an explicit `--test` command.
 */
export const DEFAULT_CODER_TEST_COMMAND = 'npm test';

/**
 * Checks whether a value is a supported `--test-before` mode.
 */
export function isTestBeforeMode(value: string): value is TestBeforeMode {
    return TEST_BEFORE_MODE_VALUES.includes(value as TestBeforeMode);
}
