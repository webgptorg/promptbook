/**
 * How much free disk space is left, measured against the `ptbk coder` free disk space limits.
 *
 * - `sufficient` - there is enough free disk space to start a run and to keep it running
 * - `low` - there is not enough free disk space to start a new run
 * - `critical` - there is not enough free disk space to keep a started run going
 *
 * @private internal utility of `promptbookCli`
 */
export type FreeDiskSpaceLevel = 'sufficient' | 'low' | 'critical';

/**
 * One measurement of the free disk space on the filesystem which hosts the inspected path.
 *
 * @private internal utility of `promptbookCli`
 */
export type FreeDiskSpaceStatus = {
    /**
     * Path whose filesystem was measured.
     */
    readonly inspectedPath: string;

    /**
     * Bytes which are still available to the current user on that filesystem.
     */
    readonly availableBytes: number;

    /**
     * Total size of that filesystem in bytes.
     */
    readonly totalBytes: number;

    /**
     * Severity of the measured free disk space.
     */
    readonly level: FreeDiskSpaceLevel;
};

// Note: [🟡] Code for CLI free disk space handling [FreeDiskSpaceStatus](src/cli/cli-commands/common/disk-space/FreeDiskSpaceStatus.ts) should never be published outside of `@promptbook/cli`
