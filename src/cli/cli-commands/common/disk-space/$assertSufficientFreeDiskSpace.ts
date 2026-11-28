import { spaceTrim } from 'spacetrim';
import { LimitReachedError } from '../../../../errors/LimitReachedError';
import { $readFreeDiskSpaceStatus } from './$readFreeDiskSpaceStatus';
import { formatLowFreeDiskSpaceWarning } from './formatLowFreeDiskSpaceWarning';

/**
 * Refuses to start one `ptbk coder` command when the disk which hosts the project is nearly full.
 *
 * A run which starts without enough free disk space fails somewhere in the middle, after the coding agent has
 * already rewritten a part of the project, so it is stopped before it writes anything at all.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it reads the state of the filesystem
 *
 * @throws {LimitReachedError} when there is not enough free disk space left to start
 * @private internal utility of `promptbookCli`
 */
export async function $assertSufficientFreeDiskSpace(inspectedPath: string): Promise<void> {
    const freeDiskSpaceStatus = await $readFreeDiskSpaceStatus(inspectedPath);

    if (freeDiskSpaceStatus === null || freeDiskSpaceStatus.level === 'sufficient') {
        return;
    }

    throw new LimitReachedError(
        spaceTrim(
            (block) => `
                There is not enough free disk space to run \`ptbk coder\`.

                ${block(formatLowFreeDiskSpaceWarning(freeDiskSpaceStatus))}
            `,
        ),
    );
}

// Note: [🟡] Code for CLI free disk space handling [$assertSufficientFreeDiskSpace](src/cli/cli-commands/common/disk-space/$assertSufficientFreeDiskSpace.ts) should never be published outside of `@promptbook/cli`
