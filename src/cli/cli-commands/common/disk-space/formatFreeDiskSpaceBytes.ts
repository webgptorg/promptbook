/**
 * Byte units used when one amount of disk space is written for a human.
 */
const FREE_DISK_SPACE_BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

/**
 * Writes one byte count as a compact human-readable amount of disk space, for example `812 MB` or `1.5 GB`.
 *
 * @private internal utility of `promptbookCli`
 */
export function formatFreeDiskSpaceBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }

    const unitIndex = Math.min(FREE_DISK_SPACE_BYTE_UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / Math.pow(1024, unitIndex);
    // Note: One decimal place only matters for small values, `476 GB` is more readable than `476.3 GB`
    const decimalPlaceCount = value >= 10 || unitIndex === 0 ? 0 : 1;
    // Note: An empty decimal place only adds noise, `2 GB` is more readable than `2.0 GB`
    const displayedValue = value.toFixed(decimalPlaceCount).replace(/\.0$/, '');

    return `${displayedValue} ${FREE_DISK_SPACE_BYTE_UNITS[unitIndex]}`;
}

// Note: [🟡] Code for CLI free disk space handling [formatFreeDiskSpaceBytes](src/cli/cli-commands/common/disk-space/formatFreeDiskSpaceBytes.ts) should never be published outside of `@promptbook/cli`
