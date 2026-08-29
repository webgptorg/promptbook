/**
 * Supported values of the `--git-changes` option, which decides what happens with a dirty working tree.
 *
 * - `fail` — refuse to start while the working tree has uncommitted changes
 * - `ignore` — start anyway and leave the uncommitted changes where they are
 * - `continue` — resume the single prompt which was left in the middle of its implementation
 *
 * @private internal shared utility of `ptbk coder run`
 */
export const GIT_CHANGES_MODE_VALUES = ['fail', 'ignore', 'continue'] as const;

/**
 * Behavior requested for a working tree which has uncommitted changes.
 *
 * @private internal shared utility of `ptbk coder run`
 */
export type GitChangesMode = (typeof GIT_CHANGES_MODE_VALUES)[number];

/**
 * Mode applied when `--git-changes` is not used at all.
 *
 * @private internal shared utility of `ptbk coder run`
 */
export const DEFAULT_GIT_CHANGES_MODE: GitChangesMode = 'fail';

/**
 * Checks whether a value is a supported `--git-changes` mode.
 *
 * @private internal shared utility of `ptbk coder run`
 */
export function isGitChangesMode(value: string): value is GitChangesMode {
    return GIT_CHANGES_MODE_VALUES.includes(value as GitChangesMode);
}

// Note: [🟡] Code for CLI command [run](src/cli/cli-commands/coder/run.ts) should never be published outside of `@promptbook/cli`
