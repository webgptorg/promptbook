/**
 * Free disk space below which `ptbk coder` refuses to start a new run.
 *
 * A coding round writes prompt and log artifacts, lets the harness rewrite the project, may install npm packages,
 * may create a git worktree for `--isolate` and usually runs a build, so a run started with less than this
 * would very likely die somewhere in the middle with a filesystem error.
 *
 * @private internal utility of `promptbookCli`
 */
export const LOW_FREE_DISK_SPACE_BYTES = 2 * 1024 * 1024 * 1024;

/**
 * Free disk space below which a started `ptbk coder` run stops at its next checkpoint and waits until space is freed.
 *
 * This limit is lower than `LOW_FREE_DISK_SPACE_BYTES`, because interrupting a run which is already in progress
 * is more expensive than not starting one at all.
 *
 * @private internal utility of `promptbookCli`
 */
export const CRITICALLY_LOW_FREE_DISK_SPACE_BYTES = 1 * 1024 * 1024 * 1024;

/**
 * How long one free disk space measurement is reused before the filesystem is measured again during a run.
 *
 * Pause checkpoints are passed very often - for example on every tick of a timed wait - so without this
 * interval the filesystem would be measured many times per second.
 *
 * @private internal utility of `promptbookCli`
 */
export const FREE_DISK_SPACE_RECHECK_INTERVAL_MS = 60 * 1000;

// Note: [🟡] Code for CLI free disk space handling [freeDiskSpaceConstants](src/cli/cli-commands/common/disk-space/freeDiskSpaceConstants.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
