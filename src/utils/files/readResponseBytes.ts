/**
 * Reads a bounded byte prefix from a fetch `Response`.
 *
 * @param {Response} response - HTTP response whose body should be consumed.
 * @param {number} maxBytes - Maximum number of bytes to capture.
 * @param {{ captureOverflowByte?: boolean }} [options] - Optional capture behavior.
 * @returns {Promise<{ bytes: Uint8Array }>} Captured bytes, optionally including one overflow byte.
 * @private internal utility for bounded response reads
 */
export async function readResponseBytes(
    response: Response,
    maxBytes: number,
    options: {
        captureOverflowByte?: boolean;
    } = {},
): Promise<{
    readonly bytes: Uint8Array;
}> {
    const safeMaxBytes = Math.max(0, Math.floor(maxBytes));
    const captureOverflowByte = options.captureOverflowByte !== false;
    const maxCaptureBytes = safeMaxBytes + (captureOverflowByte ? 1 : 0);

    if (!response.body) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        return {
            bytes: bytes.byteLength > maxCaptureBytes ? bytes.subarray(0, maxCaptureBytes) : bytes,
        };
    }

    const reader = response.body.getReader();
    const chunks: Array<Uint8Array> = [];
    let totalLength = 0;

    try {
        while (totalLength < maxCaptureBytes) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            if (!value || value.byteLength === 0) {
                continue;
            }

            const remainingBytes = maxCaptureBytes - totalLength;
            const chunk = value.byteLength > remainingBytes ? value.subarray(0, remainingBytes) : value;
            chunks.push(chunk);
            totalLength += chunk.byteLength;
        }
    } finally {
        await reader.cancel().catch(() => {});
    }

    const bytes = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }

    return { bytes };
}
