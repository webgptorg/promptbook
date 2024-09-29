import { readFileSync } from 'fs';
import { isValidFilePath, isValidUrl } from '../../../_packages/utils.index';
import { string_file_path, string_url } from '../../../types/typeAliases';
import { extensionToMimeType } from '../../../utils/files/extensionToMimeType';
import { getFileExtension } from '../../../utils/files/getFileExtension';
import { ScraperSourceOptions } from '../AbstractScraper';

/**
 * @@@
 *
 *
 * Note: This is synchronous - its OK to use sync in tooling for test tooling
 *       For URL, there is not fetched real mime type but hardcoded to `text/html`
 */
export function emulateScraperSourceOptions(sampleFilePathOrUrl: string_file_path | string_url): ScraperSourceOptions {
    if (isValidFilePath(sampleFilePathOrUrl)) {
        const filePath = sampleFilePathOrUrl;
        const fileExtension = getFileExtension(filePath);
        const mimeType = extensionToMimeType(fileExtension || '');

        return {
            source: filePath,
            filePath,
            url: null,
            mimeType,
            asBlob() {
                const content = readFileSync(filePath);
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
                return JSON.parse(readFileSync(filePath, 'utf-8'));
                //  <- Note: Its OK to use sync in tooling for tests
            },
            asText() {
                return readFileSync(filePath, 'utf-8');
                //  <- Note: Its OK to use sync in tooling for tests
            },
        };
    } else if (isValidUrl(sampleFilePathOrUrl)) {
        const url = sampleFilePathOrUrl;
        const mimeType = 'text/html';

        return {
            source: url,
            filePath: null,
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
