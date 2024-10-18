import { join } from 'path';
import spaceTrim from 'spacetrim';
import type { SetOptional } from 'type-fest';
import { sourceContentToName } from '../../../commands/KNOWLEDGE/utils/sourceContentToName';
import { IS_VERBOSE } from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { NotFoundError } from '../../../errors/NotFoundError';
import { UnexpectedError } from '../../../errors/UnexpectedError';
import type { ExecutionTools } from '../../../execution/ExecutionTools';
import type { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import type { KnowledgeSourceJson } from '../../../types/PipelineJson/KnowledgeSourceJson';
import { extensionToMimeType } from '../../../utils/files/extensionToMimeType';
import { getFileExtension } from '../../../utils/files/getFileExtension';
import { isFileExisting } from '../../../utils/files/isFileExisting';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import { isValidFilePath } from '../../../utils/validators/filePath/isValidFilePath';
import { isValidUrl } from '../../../utils/validators/url/isValidUrl';
import type { ScraperSourceHandler } from '../Scraper';

/**
 * @@@
 *
 * @private for scraper utilities
 */
export async function makeKnowledgeSourceHandler(
    knowledgeSource: SetOptional<KnowledgeSourceJson, 'name'>,
    tools: Pick<ExecutionTools, 'fs'>,
    options?: Pick<PrepareAndScrapeOptions, 'rootDirname' | 'isVerbose'>,
): Promise<ScraperSourceHandler> {
    const { sourceContent } = knowledgeSource;
    let { name } = knowledgeSource;
    const {
        rootDirname = null,
        // <- TODO: process.cwd() if running in Node.js
        isVerbose = IS_VERBOSE,
    } = options || {};

    TODO_USE(isVerbose);

    if (!name) {
        name = sourceContentToName(sourceContent);
    }

    if (isValidUrl(sourceContent)) {
        const url = sourceContent;
        const response = await fetch(url); // <- TODO: [🧠] Scraping and fetch proxy
        const mimeType = response.headers.get('content-type')?.split(';')[0] || 'text/html';

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
    } else if (isValidFilePath(sourceContent) || /\.[a-z]{1,10}$/i.exec(sourceContent as string)) {
        if (tools.fs === undefined) {
            throw new EnvironmentMismatchError('Can not import file knowledge without filesystem tools');
            //          <- TODO: [🧠] What is the best error type here`
        }

        if (rootDirname === null) {
            throw new EnvironmentMismatchError('Can not import file knowledge in non-file pipeline');
            //          <- TODO: [🧠] What is the best error type here`
        }

        const filename = join(rootDirname, sourceContent).split('\\').join('/');
        const fileExtension = getFileExtension(filename);
        const mimeType = extensionToMimeType(fileExtension || '');

        if (!(await isFileExisting(filename, tools.fs))) {
            throw new NotFoundError(
                spaceTrim(
                    (block) => `
                          Can not make source handler for file which does not exist:

                          File:
                          ${block(filename)}
                      `,
                ),
            );
        }

        // TODO: !!!!!! Test security file - file is scoped to the project (maybe do this in `filesystemTools`)

        return {
            source: name,
            filename,
            url: null,
            mimeType,
            async asBlob() {
                const content = await tools.fs!.readFile(filename);
                return new Blob(
                    [
                        content,

                        // <- TODO: !!!!!! Maybe not working
                    ],
                    { type: mimeType },
                );
            },
            async asJson() {
                return JSON.parse(await tools.fs!.readFile(filename, 'utf-8'));
            },
            async asText() {
                return await tools.fs!.readFile(filename, 'utf-8');
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
