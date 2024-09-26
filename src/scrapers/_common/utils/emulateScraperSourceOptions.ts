import { readFileSync } from 'fs';
import { string_file_path } from '../../../types/typeAliases';
import { ScraperSourceOptions } from '../AbstractScraper';

// TODO: !!!!!! Write this test OR remove it with whole folder

/**
 * @@@
 */
export function emulateScraperSourceOptions(sampleFilePath: string_file_path): ScraperSourceOptions {
    const mimeType = 'text/markdown';
    //                 <- !!!!!! Unhardcode this

    return {
        source: sampleFilePath,
        mimeType,
        async asBlob() {
            const content = readFileSync(sampleFilePath);
            //  <- Note: Its OK to use sync in tooling for tests
            return new Blob(
                [
                    content,

                    // <- TODO: !!!!!! Maybe not working
                ],
                { type: mimeType },
            );
        },
        async asJson() {
            return JSON.parse(readFileSync(sampleFilePath, 'utf-8'));
            //  <- Note: Its OK to use sync in tooling for tests
        },
        async asText() {
            return readFileSync(sampleFilePath, 'utf-8');
            //  <- Note: Its OK to use sync in tooling for tests
        },
    };
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
