import colors from 'colors';
import { spaceTrim } from 'spacetrim';
import { $readFreeDiskSpaceStatus } from '../../../src/cli/cli-commands/common/disk-space/$readFreeDiskSpaceStatus';
import { formatFreeDiskSpaceBytes } from '../../../src/cli/cli-commands/common/disk-space/formatFreeDiskSpaceBytes';
import { formatLowFreeDiskSpaceWarning } from '../../../src/cli/cli-commands/common/disk-space/formatLowFreeDiskSpaceWarning';
import { FREE_DISK_SPACE_RECHECK_INTERVAL_MS } from '../../../src/cli/cli-commands/common/disk-space/freeDiskSpaceConstants';
import { announcePauseTargetLabel, requestPause } from './waitForPause';

/**
 * Measures the free disk space of a run which is already in progress and requests a pause when it became critical.
 *
 * @private internal utility of `ptbk coder` free disk space handling
 */
export type FreeDiskSpaceGuard = () => Promise<void>;

/**
 * Creates the guard which watches the free disk space while one `ptbk coder` run is in progress.
 *
 * The guard runs at every pause checkpoint of the run. When the disk became critically full it reports the
 * warning and requests a pause, so the run stops at that checkpoint instead of failing in the middle of a
 * coding round, and continues once the user has freed some space and pressed `P`.
 *
 * @private internal utility of `ptbk coder` free disk space handling
 */
export function createFreeDiskSpaceGuard(options: {
    /**
     * Path whose filesystem is watched, usually the project the coder runs in.
     */
    readonly inspectedPath: string;

    /**
     * Whether the run may stop and wait for somebody to free the disk space, disabled by `--no-questions`.
     */
    readonly isAskingQuestionsEnabled: boolean;
}): FreeDiskSpaceGuard {
    const { inspectedPath, isAskingQuestionsEnabled } = options;

    let lastMeasurementTimeMs: number | undefined;

    return async (): Promise<void> => {
        if (
            lastMeasurementTimeMs !== undefined &&
            Date.now() - lastMeasurementTimeMs < FREE_DISK_SPACE_RECHECK_INTERVAL_MS
        ) {
            return;
        }

        lastMeasurementTimeMs = Date.now();

        const freeDiskSpaceStatus = await $readFreeDiskSpaceStatus(inspectedPath);

        if (freeDiskSpaceStatus === null || freeDiskSpaceStatus.level !== 'critical') {
            return;
        }

        console.warn(
            colors.yellow(
                spaceTrim(
                    (block) => `
                        The disk is running out of space while \`ptbk coder\` is working.

                        ${block(formatLowFreeDiskSpaceWarning(freeDiskSpaceStatus))}
                        - Press \`P\` to continue once the disk space is freed, or start the run with \`--no-questions\` to never pause on a full disk.
                    `,
                ),
            ),
        );

        if (!isAskingQuestionsEnabled) {
            // Note: `--no-questions` forbids stopping and waiting for somebody who would free the disk space,
            //       so the run keeps going and the warning above is the only thing which is reported
            return;
        }

        announcePauseTargetLabel(
            `continuing with only ${formatFreeDiskSpaceBytes(
                freeDiskSpaceStatus.availableBytes,
            )} of free disk space left`,
        );
        requestPause();
    };
}

// Note: [🟡] Code for `ptbk coder` free disk space handling [createFreeDiskSpaceGuard](scripts/run-codex-prompts/common/createFreeDiskSpaceGuard.ts) should never be published outside of `@promptbook/cli`
