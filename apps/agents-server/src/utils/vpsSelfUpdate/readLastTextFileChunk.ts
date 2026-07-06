import { open, stat } from 'fs/promises';

/**
 * Reads the trailing chunk of a text log file for the browser UI.
 *
 * @param filePath - File to tail.
 * @param byteLimit - Maximum bytes to read from the end of the file.
 * @returns UTF-8 tail text or `null` when missing.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readLastTextFileChunk(filePath: string | null, byteLimit = 32768): Promise<string | null> {
    if (!filePath) {
        return null;
    }

    try {
        const fileHandle = await open(filePath, 'r');
        try {
            const fileStats = await stat(filePath);
            const readLength = Math.min(fileStats.size, byteLimit);
            const offset = Math.max(0, fileStats.size - readLength);
            const buffer = Buffer.alloc(readLength);
            const { bytesRead } = await fileHandle.read(buffer, 0, readLength, offset);
            const text = buffer.subarray(0, bytesRead).toString('utf-8');
            return offset > 0 ? text.replace(/^[^\n]*\n/u, '') : text;
        } finally {
            await fileHandle.close();
        }
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}
