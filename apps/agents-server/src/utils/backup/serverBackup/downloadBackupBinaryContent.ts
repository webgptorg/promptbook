/**
 * Downloads one binary file for backup inclusion.
 *
 * @param url - Public binary URL to fetch.
 * @returns Download result with either binary content or an explanatory error.
 *
 * @private function of `createServerBackupZipStream`
 */
export async function downloadBackupBinaryContent(url: string | null): Promise<{
    content: ArrayBuffer | null;
    error: string | null;
}> {
    if (!url) {
        return {
            content: null,
            error: 'Missing content URL.',
        };
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            return {
                content: null,
                error: `Failed to download content (${response.status} ${response.statusText}).`,
            };
        }

        return {
            content: await response.arrayBuffer(),
            error: null,
        };
    } catch (error) {
        return {
            content: null,
            error: error instanceof Error ? error.message : 'Unknown download error.',
        };
    }
}
