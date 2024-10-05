import { readFile } from 'fs/promises';
import { join } from 'path';
import { KnowledgeSourceJson, PrepareAndScrapeOptions } from '../../../_packages/types.index';
import { $isRunningInNode } from '../../../_packages/utils.index';
import { IS_VERBOSE } from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { UnexpectedError } from '../../../errors/UnexpectedError';
import { extensionToMimeType } from '../../../utils/files/extensionToMimeType';
import { getFileExtension } from '../../../utils/files/getFileExtension';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import { isValidFilePath } from '../../../utils/validators/filePath/isValidFilePath';
import { isValidUrl } from '../../../utils/validators/url/isValidUrl';
import type { ScraperSourceOptions } from '../Scraper';

/**
 * @@@
 */
export async function sourceContentToSourceOptions(
    knowledgeSource: KnowledgeSourceJson,
    options?: Pick<PrepareAndScrapeOptions, 'rootDirname' | 'isVerbose'>,
): Promise<ScraperSourceOptions> {
    const { name, sourceContent } = knowledgeSource;
    const { rootDirname = null, isVerbose = IS_VERBOSE } = options || {};

    TODO_USE(isVerbose);

    if (isValidFilePath(sourceContent)) {
        if (!$isRunningInNode()) {
            throw new EnvironmentMismatchError('Importing knowledge source file works only in Node.js environment');
        }

        if (rootDirname === null) {
            throw new EnvironmentMismatchError('Can not import file knowledge in non-file pipeline');
            //          <- TODO: [🧠] What is the best error type here`
        }

        const filename = join(rootDirname, sourceContent).split('\\').join('/');
        const fileExtension = getFileExtension(filename);
        const mimeType = extensionToMimeType(fileExtension || '');

        // TODO: !!!!!! Test that file exists and is accessible
        // TODO: !!!!!! Test security file - file is scoped to the project (maybe do this in `filesystemTools`)

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
 * TODO: !!!!!! Rename to knowledgeSourceToSourceOptions
 * TODO !!!!!! SourceOptions -> SourceHandler
 */
