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
 * Resolves the shared command without enabling checks when both command and preflight mode are absent.
 */
export function resolveCoderCheckCommand(
    checkCommand?: string,
    checkBefore: CheckBeforeMode = 'no',
): string | undefined {
    return checkCommand ?? (checkBefore === 'no' ? undefined : DEFAULT_CODER_CHECK_COMMAND);
}

/**
 * Checks whether a value is a supported `--check-before` mode.
 */
export function isCheckBeforeMode(value: string): value is CheckBeforeMode {
    return CHECK_BEFORE_MODE_VALUES.includes(value as CheckBeforeMode);
}
