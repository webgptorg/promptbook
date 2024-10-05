import { readFile } from 'fs/promises';
import { KnowledgeSourceJson } from '../../../_packages/types.index';
import { UnexpectedError } from '../../../errors/UnexpectedError';
import { extensionToMimeType } from '../../../utils/files/extensionToMimeType';
import { getFileExtension } from '../../../utils/files/getFileExtension';
import { isValidFilePath } from '../../../utils/validators/filePath/isValidFilePath';
import { isValidUrl } from '../../../utils/validators/url/isValidUrl';
import type { ScraperSourceOptions } from '../Scraper';

/**
 * @@@
 */
export async function sourceContentToSourceOptions(
    knowledgeSource: KnowledgeSourceJson,
): Promise<ScraperSourceOptions> {
    const { name, sourceContent } = knowledgeSource;

    if (isValidFilePath(sourceContent)) {
        const filename = sourceContent;
        const fileExtension = getFileExtension(filename);
        const mimeType = extensionToMimeType(fileExtension || '');

        return {
            source: name,
            filename,
            url: null,
            mimeType,
            async asBlob() {
                const content = await readFile(filename);
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
                return JSON.parse(await readFile(filename, 'utf-8'));
                //  <- Note: Its OK to use sync in tooling for tests
            },
            async asText() {
                return await readFile(filename, 'utf-8');
                //  <- Note: Its OK to use sync in tooling for tests
            },
        };
    } else if (isValidUrl(sourceContent)) {
        const url = sourceContent;
        const response = await fetch(url);
        const mimeType = response.type;

        return {
            source: name,
            filename: null,
            url,
            mimeType,
            async asBlob() {
                // TODO: [👨🏻‍🤝‍👨🏻] This can be called multiple times BUT when called second time, response in already consumed
                const content = await response.blob();
                return content;
            },
            async asJson() {
                // TODO: [👨🏻‍🤝‍👨🏻]
                const content = await response.json();
                return content;
            },
            async asText() {
                // TODO: [👨🏻‍🤝‍👨🏻]
                const content = await response.text();
                return content;
            },
        };
    } else {
        return {
            source: name,
            filename: null,
            url: null,
            mimeType: 'text/markdown',
            asText() {
                return knowledgeSource.sourceContent;
            },
            asJson() {
                throw new UnexpectedError(
                    'Did not expect that `markdownScraper` would need to get the content `asJson`',
                );
            },
            asBlob() {
                throw new UnexpectedError(
                    'Did not expect that `markdownScraper` would need to get the content `asBlob`',
                );
            },
        };
    }
}

/**
 * TODO !!!!!! SourceOptions -> SourceHandler
 */
