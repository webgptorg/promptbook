import { join } from 'path';
import spaceTrim from 'spacetrim';
import { createCollectionFromDirectory } from '../collection/pipeline-collection/constructors/createCollectionFromDirectory';
import { DEFAULT_BOOKS_DIRNAME, LOOP_LIMIT } from '../config';
import { saveArchive } from '../conversion/archive/saveArchive';
import { compilePipeline } from '../conversion/compilePipeline';
import { NotFoundError } from '../errors/NotFoundError';
import type { ExecutionTools } from '../execution/ExecutionTools';
import { isValidPipelineString } from '../pipeline/isValidPipelineString';
import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';
import type { PipelineString } from '../pipeline/PipelineString';
import { validatePipelineString } from '../pipeline/validatePipelineString';
import type { PrepareAndScrapeOptions } from '../prepare/PrepareAndScrapeOptions';
import type { string_filename, string_pipeline_url } from '../types/typeAliases';
import { isDirectoryExisting } from '../utils/files/isDirectoryExisting';
import { isFileExisting } from '../utils/files/isFileExisting';
import { isRootPath } from '../utils/validators/filePath/isRootPath';
import { isValidFilePath } from '../utils/validators/filePath/isValidFilePath';
import { isValidPipelineUrl } from '../utils/validators/url/isValidPipelineUrl';

/**
 * @see ./wizard.ts `getPipeline` method
 *
 * @private usable through `ptbk run` and `@promptbook/wizard`
 */
export async function $getCompiledBook(
    tools: Required<Pick<ExecutionTools, 'fs' | 'fetch'>>,
    pipelineSource: string_filename | string_pipeline_url | PipelineString,
    options?: PrepareAndScrapeOptions,
): Promise<PipelineJson> {
    const { fs, fetch } = tools;

    // Strategy 1️⃣: If the pipelineSource is a filename - try to load it from the file
    if (isValidFilePath(pipelineSource)) {
        // console.log(`Strategy 1️⃣`);

        const filePathRaw = pipelineSource;
        let filePath: string_filename | null = null;
        let filePathCandidates = [filePathRaw, `${filePathRaw}.md`, `${filePathRaw}.book`, `${filePathRaw}.book`]; // <- TODO: [🕝] To config
        filePathCandidates = [...filePathCandidates, ...filePathCandidates.map((path) => path.split('\\').join('/'))];
        //                       <- Note: This line is to work with Windows paths
        //                                File "C:Usersmeworkaihello-worldbookshello.book" does not exist
        //                                @see https://collboard.fra1.cdn.digitaloceanspaces.com/usercontent/education/image/png/1/2/ad/image.png

        for (const filePathCandidate of filePathCandidates) {
            if (
                await isFileExisting(filePathCandidate, fs)
                // <- TODO: Also test that among the candidates the file is book not just any file
            ) {
                filePath = filePathCandidate;
                const pipelineString = validatePipelineString(await fs.readFile(filePath, 'utf-8'));
                const pipelineJson = await compilePipeline(pipelineString, tools, {
                    rootDirname: process.cwd(),
                    ...options,
                });

                const compiledFilePath = filePath.replace('.book.md', '.book').replace('.book', '.bookc');

                // Note: Try to save the compiled book to disk for caching, but don't fail if the filesystem is read-only
                try {
                    await saveArchive(compiledFilePath, [pipelineJson], fs);
                } catch (error) {
                    // Note: Ignore filesystem errors (like EROFS on read-only systems like Vercel)
                    //       The compiled book can still be used even if it can't be cached
                    if (
                        error instanceof Error &&
                        (error.message.includes('EROFS') ||
                            error.message.includes('read-only') ||
                            error.message.includes('EACCES') ||
                            error.message.includes('EPERM') ||
                            error.message.includes('ENOENT'))
                    ) {
                        // Silently ignore read-only filesystem errors
                    } else {
                        // Re-throw other unexpected errors
                        throw error;
                    }
                }

                return pipelineJson;
            }
        }
    } /* not else */

    // Strategy 2️⃣: If the pipelineSource is a URL - try to find the pipeline on disk in `DEFAULT_BOOKS_DIRNAME` (= `./books`) directory recursively up to the root
    if (isValidPipelineUrl(pipelineSource)) {
        // console.log(`Strategy 2️⃣`);

        let rootDirname = process.cwd();

        up_to_root: for (let i = 0; i < LOOP_LIMIT; i++) {
            const booksDirname = join(rootDirname, DEFAULT_BOOKS_DIRNAME /* <- TODO: [🕝] Make here more candidates */);

            // console.log({ rootDirname, booksDirname });

            if (await isDirectoryExisting(booksDirname, fs)) {
                const collection = await createCollectionFromDirectory(booksDirname, tools, {
                    isRecursive: true,
                    rootDirname: booksDirname, // <- TODO: Avoid confusion with `rootDirname` and `booksDirname`
                    ...options,
                });

                // console.log('listPipelines', await collection.listPipelines());

                const pipeline = await (async () => {
                    try {
                        return await collection.getPipelineByUrl(pipelineSource);
                    } catch (error) {
                        if (!(error instanceof NotFoundError)) {
                            throw error;
                        }

                        // Note: If the pipeline was not found in the collection, try next strategy
                        return null;
                    }
                })();

                // console.log({ pipeline });

                if (pipeline !== null) {
                    // This will break the loop and return the pipeline from the function `$getCompiledBook`
                    return pipeline;
                }
            }

            if (isRootPath(rootDirname)) {
                break up_to_root;
            }

            // Note: If the directory does not exist, try the parent directory
            rootDirname = join(rootDirname, '..');
        }
    } /* not else */

    // Strategy 3️⃣: If the pipelineSource is a URL - try to fetch it from the internet
    if (isValidPipelineUrl(pipelineSource)) {
        // console.log(`Strategy 3️⃣`);

        const response = await fetch(pipelineSource);

        if (response.status >= 300) {
            throw new NotFoundError(
                spaceTrim(
                    (block) => `
                        Book not found on URL:
                        ${block(pipelineSource)}

                        Request failed with status ${block(response.status.toString())} ${block(response.statusText)}
                    `,
                ),
            );
        }
        const pipelineString = await response.text();

        // console.log({ pipelineString });

        if (!isValidPipelineString(pipelineString)) {
            throw new NotFoundError(
                spaceTrim(
                    (block) => `
                        Book not found on URL:
                        ${block(pipelineSource)}

                        Requested URL does not seem to contain a valid book
                    `,
                ),
            );
        }

        const pipelineJson = await compilePipeline(pipelineString, tools, {
            rootDirname: null, // <- TODO: !!6 Allow to use knowledge in pipelines loaded from URLs like `https://raw.githubusercontent.com/webgptorg/book/refs/heads/main/books/templates/chatbot.book`
            ...options,
        });

        return pipelineJson;
    } /* not else */

    // Strategy 4️⃣: If the pipelineSource is a PipelineString - try to parse it
    if (isValidPipelineString(pipelineSource)) {
        // console.log(`Strategy 4️⃣`);

        const pipelineJson = await compilePipeline(pipelineSource, tools, {
            rootDirname: null,
            ...options,
        });

        return pipelineJson;
    } /* not else */

    throw new NotFoundError(
        spaceTrim(
            (block) => `
                Book not found:
                ${block(pipelineSource)}

                Pipelines can be loaded from:
                1) As a file ./books/write-cv.book
                2) As a URL https://promptbook.studio/hejny/write-cv.book found in ./books folder recursively
                2) As a URL https://promptbook.studio/hejny/write-cv.book fetched from the internet
                3) As a string


            `,
        ),
    );
}

/**
 * TODO: Write unit test
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
