import { spaceTrim } from 'spacetrim';
import type { FreeDiskSpaceStatus } from './FreeDiskSpaceStatus';
import { formatFreeDiskSpaceBytes } from './formatFreeDiskSpaceBytes';
import { CRITICALLY_LOW_FREE_DISK_SPACE_BYTES, LOW_FREE_DISK_SPACE_BYTES } from './freeDiskSpaceConstants';

/**
 * Writes the shared warning which explains one low free disk space measurement and how to get out of it.
 *
 * The very same wording is used by the check which refuses to start a run and by the check which pauses
 * a run that ran out of disk space while it was working.
 *
 * @private internal utility of `promptbookCli`
 */
export function formatLowFreeDiskSpaceWarning(freeDiskSpaceStatus: FreeDiskSpaceStatus): string {
    const { inspectedPath } = freeDiskSpaceStatus;
    const availableSpace = formatFreeDiskSpaceBytes(freeDiskSpaceStatus.availableBytes);
    const totalSpace = formatFreeDiskSpaceBytes(freeDiskSpaceStatus.totalBytes);
    const requiredSpaceToStart = formatFreeDiskSpaceBytes(LOW_FREE_DISK_SPACE_BYTES);
    const requiredSpaceToContinue = formatFreeDiskSpaceBytes(CRITICALLY_LOW_FREE_DISK_SPACE_BYTES);

    return spaceTrim(`
        Only **${availableSpace}** of ${totalSpace} is left on the disk which hosts \`${inspectedPath}\`.

        **\`ptbk coder\` needs at least ${requiredSpaceToStart} of free disk space to start a run and at least ${requiredSpaceToContinue} to keep one running.**

        Actionable hints:
        - Free up disk space on the drive which hosts \`${inspectedPath}\`.
        - Remove build artifacts, package caches and \`node_modules\` folders of projects you are not working on.
        - Remove the temporary worktrees which earlier \`--isolate\` runs left behind.
    `);
}

// Note: [🟡] Code for CLI free disk space handling [formatLowFreeDiskSpaceWarning](src/cli/cli-commands/common/disk-space/formatLowFreeDiskSpaceWarning.ts) should never be published outside of `@promptbook/cli`
