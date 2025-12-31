import hexEncoder from 'crypto-js/enc-hex';
import sha256 from 'crypto-js/sha256';
import { dirname, isAbsolute, join } from 'path';
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
import { jsonParse } from '../../../formats/json/utils/jsonParse';
import type { KnowledgeSourceJson } from '../../../pipeline/PipelineJson/KnowledgeSourceJson';
import type { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import { nameToSubfolderPath } from '../../../storage/file-cache-storage/utils/nameToSubfolderPath';
import { extensionToMimeType } from '../../../utils/files/extensionToMimeType';
import { getFileExtension } from '../../../utils/files/getFileExtension';
import { isFileExisting } from '../../../utils/files/isFileExisting';
import { mimeTypeToExtension } from '../../../utils/files/mimeTypeToExtension';
import { titleToName } from '../../../utils/normalization/titleToName';
import { isValidFilePath } from '../../../utils/validators/filePath/isValidFilePath';
import { isValidUrl } from '../../../utils/validators/url/isValidUrl';
import type { ScraperSourceHandler } from '../Scraper';
import { promptbookFetch } from './promptbookFetch';

/**
 * Factory function that creates a handler for processing knowledge sources.
 * Provides standardized processing of different types of knowledge sources
 * across various scraper implementations.
 *
 * @public exported from `@promptbook/core`
 */
export async function makeKnowledgeSourceHandler(
    knowledgeSource: SetOptional<KnowledgeSourceJson, 'name'>,
    tools: Pick<ExecutionTools, 'fs' | 'fetch'>,
    options?: Pick<PrepareAndScrapeOptions, 'rootDirname' | 'isVerbose'>,
): Promise<ScraperSourceHandler> {

    const { fetch = promptbookFetch } = tools;
    const { knowledgeSourceContent } = knowledgeSource;
    let { name } = knowledgeSource;
    const {
        rootDirname = null,
        // <- TODO: process.cwd() if running in Node.js
        isVerbose = DEFAULT_IS_VERBOSE,
    } = options || {};

    if (!name) {
        name = knowledgeSourceContentToName(knowledgeSourceContent);
    }

    if (isValidUrl(knowledgeSourceContent)) {
        const url = knowledgeSourceContent;

        if (isVerbose) {
            console.info(`📄 [1] "${name}" is available at "${url}"`);
        }

        const response = await fetch(url); // <- TODO: [🧠] Scraping and fetch proxy
        const mimeType = response.headers.get('content-type')?.split(';')[0] || 'text/html';

        if (tools.fs === undefined || !url.endsWith('.pdf' /* <- TODO: [💵] */)) {
            if (isVerbose) {
                console.info(`📄 [2] "${name}" tools.fs is not available or URL is not a PDF.`);
            }

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

        // Note: Try to create cache directory, but don't fail if filesystem has issues
        try {
            await tools.fs!.mkdir(dirname(join(rootDirname, filepath)), { recursive: true });
        } catch (error) {
            if (isVerbose) {
                console.info(`📄 [3] "${name}" error creating cache directory`);
            }

            // Note: If we can't create cache directory, we'll handle it when trying to write the file
            //       This handles read-only filesystems, permission issues, and missing parent directories
            if (
                error instanceof Error &&
                (error.message.includes('EROFS') ||
                    error.message.includes('read-only') ||
                    error.message.includes('EACCES') ||
                    error.message.includes('EPERM') ||
                    error.message.includes('ENOENT'))
            ) {
                // Continue - we'll handle the error when trying to write the file
            } else {
                // Re-throw other unexpected errors
                throw error;
            }
        }

        const fileContent = Buffer.from(await response.arrayBuffer());

        if (fileContent.length > DEFAULT_MAX_FILE_SIZE /* <- TODO: Allow to pass different value to remote server */) {
            throw new LimitReachedError(
                `File is too large (${Math.round(
                    fileContent.length / 1024 / 1024,
                )}MB). Maximum allowed size is ${Math.round(DEFAULT_MAX_FILE_SIZE / 1024 / 1024)}MB.`,
            );
        }

        // Note: Try to cache the downloaded file, but don't fail if the filesystem is read-only
        try {
            await tools.fs!.writeFile(join(rootDirname, filepath), fileContent);
        } catch (error) {
            if (isVerbose) {
                console.info(`📄 [4] "${name}" error writing cache file`);
            }

            // Note: If we can't write to cache, we'll process the file directly from memory
            //       This handles read-only filesystems like Vercel
            if (
                error instanceof Error &&
                (error.message.includes('EROFS') ||
                    error.message.includes('read-only') ||
                    error.message.includes('EACCES') ||
                    error.message.includes('EPERM') ||
                    error.message.includes('ENOENT'))
            ) {
                // Return a handler that works directly with the downloaded content
                return {
                    source: name,
                    filename: null,
                    url,
                    mimeType,
                    async asJson() {
                        return JSON.parse(fileContent.toString('utf-8'));
                    },
                    async asText() {
                        return fileContent.toString('utf-8');
                    },
                };
            } else {
                // Re-throw other unexpected errors
                throw error;
            }
        }

        // TODO: [💵] Check the file security
        // TODO: [🧹][🧠] Delete the file after the scraping is done

        if (isVerbose) {
            console.info(`📄 [5] "${name}" cached at "${join(rootDirname, filepath)}"`);
        }

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

        const filename = isAbsolute(knowledgeSourceContent)
            ? knowledgeSourceContent
            : join(rootDirname, knowledgeSourceContent).split('\\').join('/');

        if (isVerbose) {
            console.info(`📄 [6] "${name}" is a valid file "${filename}"`);
        }

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
                return jsonParse(await tools.fs!.readFile(filename, 'utf-8'));
            },
            async asText() {
                return await tools.fs!.readFile(filename, 'utf-8');
            },
        };
    } else {
        if (isVerbose) {
            console.info(`📄 [7] "${name}" is just a explicit string text with a knowledge source`);
            console.info('---');
            console.info(knowledgeSourceContent);
            console.info('---');
        }

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
