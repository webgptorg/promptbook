/**
 * Modes supported by `ptbk coder run --check-before`.
 */
export const CHECK_BEFORE_MODE_VALUES = ['no', 'yes-and-fail', 'yes-and-fix'] as const;

/**
 * Behavior requested for the pre-coding check run.
 */
export type CheckBeforeMode = (typeof CHECK_BEFORE_MODE_VALUES)[number];

/**
 * Default check command used when a pre-coding mode is enabled without an explicit `--check` command.
 */
export const DEFAULT_CODER_CHECK_COMMAND = 'npm run check';

/**
 * Checks whether a value is a supported `--check-before` mode.
 */
export function isCheckBeforeMode(value: string): value is CheckBeforeMode {
    return CHECK_BEFORE_MODE_VALUES.includes(value as CheckBeforeMode);
}
