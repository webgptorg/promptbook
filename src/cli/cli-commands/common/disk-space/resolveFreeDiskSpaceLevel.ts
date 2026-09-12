import type { FreeDiskSpaceLevel } from './FreeDiskSpaceStatus';
import { CRITICALLY_LOW_FREE_DISK_SPACE_BYTES, LOW_FREE_DISK_SPACE_BYTES } from './freeDiskSpaceConstants';

/**
 * Classifies one measured amount of free disk space against the `ptbk coder` free disk space limits.
 *
 * @private internal utility of `promptbookCli`
 */
export function resolveFreeDiskSpaceLevel(availableBytes: number): FreeDiskSpaceLevel {
    if (availableBytes < CRITICALLY_LOW_FREE_DISK_SPACE_BYTES) {
        return 'critical';
    }

    if (availableBytes < LOW_FREE_DISK_SPACE_BYTES) {
        return 'low';
    }

    return 'sufficient';
}

// Note: [🟡] Code for CLI free disk space handling [resolveFreeDiskSpaceLevel](src/cli/cli-commands/common/disk-space/resolveFreeDiskSpaceLevel.ts) should never be published outside of `@promptbook/cli`
