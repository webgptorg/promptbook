/**
 * Prints one live shell output chunk to the terminal when console mirroring is enabled.
 */
export function printLiveScriptChunk(
    chunk: string,
    source: 'stdout' | 'stderr',
    shouldPrintLiveOutput: boolean,
): void {
    if (!shouldPrintLiveOutput) {
        return;
    }

    if (source === 'stderr') {
        if (chunk.trim()) {
            console.warn(chunk);
        }

        return;
    }

    console.info(chunk);
}
