/**
 * Extracts an optional filename from a `Content-Disposition` header value.
 *
 * @param contentDisposition - Raw response header value.
 * @returns Parsed filename or `null` when the header has no usable filename.
 */
export function parseFilenameFromContentDisposition(contentDisposition: string | null): string | null {
    if (!contentDisposition) {
        return null;
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        try {
            return decodeURIComponent(utf8Match[1]);
        } catch {
            return utf8Match[1];
        }
    }

    const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    return plainMatch?.[1] || null;
}

/**
 * Triggers a browser download for a prepared Blob payload.
 *
 * @param blob - Download payload to save locally.
 * @param filename - Suggested filename for the browser save dialog.
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
}
