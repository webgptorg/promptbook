import { readFileSync } from 'fs';
import type { string_filename, string_url } from '../../../types/typeAliases';
import { extensionToMimeType } from '../../../utils/files/extensionToMimeType';
import { getFileExtension } from '../../../utils/files/getFileExtension';
import { isValidFilePath } from '../../../utils/validators/filePath/isValidFilePath';
import { isValidUrl } from '../../../utils/validators/url/isValidUrl';
import type { ScraperSourceOptions } from '../Scraper';

/**
 * @@@
 *
 *
 * Note: This is synchronous - its OK to use sync in tooling for test tooling
 *       For URL, there is not fetched real mime type but hardcoded to `text/html`
 */
export async function emulateScraperSourceOptions(
    sampleFilePathOrUrl: string_filename | string_url,
): Promise<ScraperSourceOptions> {
    if (isValidFilePath(sampleFilePathOrUrl)) {
        const filename = sampleFilePathOrUrl;
        const fileExtension = getFileExtension(filename);
        const mimeType = extensionToMimeType(fileExtension || '');

        return {
            source: filename,
            filename,
            url: null,
            mimeType,
            asBlob() {
                const content = readFileSync(filename);
                //  <- Note: Its OK to use sync in tooling for tests
                return new Blob(
                    [
                        content,

                        // <- TODO: !!!!!! Maybe not working
                    ],
                    { type: mimeType },
                );
            },
            asJson() {
                return JSON.parse(readFileSync(filename, 'utf-8'));
                //  <- Note: Its OK to use sync in tooling for tests
            },
            asText() {
                return readFileSync(filename, 'utf-8');
                //  <- Note: Its OK to use sync in tooling for tests
            },
        };
    } else if (isValidUrl(sampleFilePathOrUrl)) {
        const url = sampleFilePathOrUrl;
        const mimeType = 'text/html';

        return {
            source: url,
            filename: null,
            url,
            mimeType,
            async asBlob() {
                const response = await fetch(url);
                const content = await response.blob();
                return content;
            },
            async asJson() {
                const response = await fetch(url);
                const content = await response.json();
                return content;
            },
            async asText() {
                const response = await fetch(url);
                const content = await response.text();
                return content;
            },
        };
    } else {
        throw new Error('Invalid file path or url');
    }
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
