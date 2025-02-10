import hexEncoder from 'crypto-js/enc-hex';
import sha256 from 'crypto-js/sha256';
import { dirname, join } from 'node:path';
import spaceTrim from 'spacetrim';
import type { SetOptional } from 'type-fest';
import { knowledgeSourceContentToName } from '../../../commands/KNOWLEDGE/utils/knowledgeSourceContentToName';
import {
    DEFAULT_DOWNLOAD_CACHE_DIRNAME,
    DEFAULT_IS_VERBOSE,
    DEFAULT_MAX_FILE_SIZE,
    MAX_FILENAME_LENGTH,
} from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { LimitReachedError } from '../../../errors/LimitReachedError';
import { NotFoundError } from '../../../errors/NotFoundError';
import { UnexpectedError } from '../../../errors/UnexpectedError';
import type { ExecutionTools } from '../../../execution/ExecutionTools';
import type { KnowledgeSourceJson } from '../../../pipeline/PipelineJson/KnowledgeSourceJson';
import type { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import { nameToSubfolderPath } from '../../../storage/file-cache-storage/utils/nameToSubfolderPath';
import { extensionToMimeType } from '../../../utils/files/extensionToMimeType';
import { getFileExtension } from '../../../utils/files/getFileExtension';
import { isFileExisting } from '../../../utils/files/isFileExisting';
import { mimeTypeToExtension } from '../../../utils/files/mimeTypeToExtension';
import { titleToName } from '../../../utils/normalization/titleToName';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import { isValidFilePath } from '../../../utils/validators/filePath/isValidFilePath';
import { isValidUrl } from '../../../utils/validators/url/isValidUrl';
import type { ScraperSourceHandler } from '../Scraper';
import { scraperFetch } from './scraperFetch';

/**
 * @@@
 *
 * @public exported from `@promptbook/core`
 */
export async function makeKnowledgeSourceHandler(
    knowledgeSource: SetOptional<KnowledgeSourceJson, 'name'>,
    tools: Pick<ExecutionTools, 'fs' | 'fetch'>,
    options?: Pick<PrepareAndScrapeOptions, 'rootDirname' | 'isVerbose'>,
): Promise<ScraperSourceHandler> {
    // console.log('!! makeKnowledgeSourceHandler', knowledgeSource);

    const { fetch = scraperFetch } = tools;
    const { knowledgeSourceContent } = knowledgeSource;
    let { name } = knowledgeSource;
    const {
        rootDirname = null,
        // <- TODO: process.cwd() if running in Node.js
        isVerbose = DEFAULT_IS_VERBOSE,
    } = options || {};

    TODO_USE(isVerbose);

    if (!name) {
        name = knowledgeSourceContentToName(knowledgeSourceContent);
    }

    if (isValidUrl(knowledgeSourceContent)) {
        const url = knowledgeSourceContent;
        const response = await fetch(url); // <- TODO: [🧠] Scraping and fetch proxy
        const mimeType = response.headers.get('content-type')?.split(';')[0] || 'text/html';

        if (tools.fs === undefined || !url.endsWith('.pdf' /* <- TODO: [💵] */)) {
            return {
                source: name,
                filename: null,
                url,
                mimeType,
                /*
              TODO: [🥽]
                  > async asBlob() {
                  >     // TODO: [👨🏻‍🤝‍👨🏻] This can be called multiple times BUT when called second time, response in already consumed
                  >     const content = await response.blob();
                  >     return content;
                  > },
              */
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
        }

        const basename = url.split('/').pop() || titleToName(url);
        const hash = sha256(hexEncoder.parse(url)).toString(/* hex */);
        //    <- TODO: [🥬] Encapsulate sha256 to some private utility function

        const rootDirname = join(
            process.cwd(),
            DEFAULT_DOWNLOAD_CACHE_DIRNAME,
            // <- TODO: [🦒] Allow to override (pass different value into the function)
        );

        const filepath = join(
            ...nameToSubfolderPath(hash /* <- TODO: [🎎] Maybe add some SHA256 prefix */),
            `${basename.substring(0, MAX_FILENAME_LENGTH)}.${mimeTypeToExtension(mimeType)}`,
        );

        await tools.fs!.mkdir(dirname(join(rootDirname, filepath)), { recursive: true });
        const fileContent = Buffer.from(await response.arrayBuffer());

        if (fileContent.length > DEFAULT_MAX_FILE_SIZE /* <- TODO: Allow to pass different value to remote server */) {
            throw new LimitReachedError(
                `File is too large (${Math.round(
                    fileContent.length / 1024 / 1024,
                )}MB). Maximum allowed size is ${Math.round(DEFAULT_MAX_FILE_SIZE / 1024 / 1024)}MB.`,
            );
        }

        await tools.fs!.writeFile(join(rootDirname, filepath), fileContent);

        // TODO: [💵] Check the file security
        // TODO: [🧹][🧠] Delete the file after the scraping is done

        return makeKnowledgeSourceHandler({ name, knowledgeSourceContent: filepath }, tools, {
            ...options,
            rootDirname,
        });
    } else if (isValidFilePath(knowledgeSourceContent)) {
        if (tools.fs === undefined) {
            throw new EnvironmentMismatchError('Can not import file knowledge without filesystem tools');
            //          <- TODO: [🧠] What is the best error type here`
        }

        if (rootDirname === null) {
            throw new EnvironmentMismatchError('Can not import file knowledge in non-file pipeline');
            //          <- TODO: [🧠] What is the best error type here`
        }

        const filename = join(rootDirname, knowledgeSourceContent).split('\\').join('/');
        const fileExtension = getFileExtension(filename);
        const mimeType = extensionToMimeType(fileExtension || '');

        if (!(await isFileExisting(filename, tools.fs))) {
            throw new NotFoundError(
                spaceTrim(
                    (block) => `
                          Can not make source handler for file which does not exist:

                          File:
                          ${block(knowledgeSourceContent)}

                          Full file path:
                          ${block(filename)}
                      `,
                ),
            );
        }

        // TODO: [🧠][😿] Test security file - file is scoped to the project (BUT maybe do this in `filesystemTools`)

        return {
            source: name,
            filename,
            url: null,
            mimeType,
            /*
            TODO: [🥽]
                > async asBlob() {
                >     const content = await tools.fs!.readFile(filename);
                >     return new Blob(
                >         [
                >             content,
                >             // <- TODO: [🥽] This is NOT tested, test it
                >         ],
                >         { type: mimeType },
                >     );
                > },
            */
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
                return knowledgeSource.knowledgeSourceContent;
            },
            asJson() {
                throw new UnexpectedError(
                    'Did not expect that `markdownScraper` would need to get the content `asJson`',
                );
            },
            /*
            TODO: [🥽]
                > asBlob() {
                >     throw new UnexpectedError(
                >         'Did not expect that `markdownScraper` would need to get the content `asBlob`',
                >     );
                > },
            */
        };
    }
}
