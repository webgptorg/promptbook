import { readFileSync } from 'fs';
import { PipelineJson, string_filename } from '../../_packages/types.index';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { validatePipeline } from '../validation/validatePipeline';

// TODO: !!!!!! Delete

/**
 * Synchroneously loads the books from the archive file with `.bookc` extension
 *
 * Note: Use this ONLY in tests and for development purposes, otherwise use the async version `loadArchive`
 *
 * @param filePath Path to the archive file with `.bookc` extension
 * @param fs Filesystem tools
 * @returns Pipelines loaded from the archive
 *
 * @private utility of Prompbook
 */
export function loadArchiveSync(filePath: string_filename): Array<PipelineJson> {
    if (!filePath.endsWith('.bookc')) {
        throw new UnexpectedError(`Archive file must have '.bookc' extension`);
    }

    // Note: Module `jszip-sync` has no types available, so it is imported using `require`
    //       @see https://stackoverflow.com/questions/37000981/how-to-import-node-module-in-typescript-without-type-definitions
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const JSZip = require('jszip-sync');

    const data = readFileSync(filePath);
    //                       <- Note: In production it is not good practice to use synchronous functions
    //                                But this is only a test before the build, so it is okay

    console.log({ JSZip });

    const archive = JSZip.loadSync(data);

    const indexFile = archive.file('index.book.json');

    if (!indexFile) {
        throw new UnexpectedError(`Archive does not contain 'index.book.json' file`);
    }

    const collectionJson = JSON.parse(indexFile.asText());

    for (const pipeline of collectionJson) {
        validatePipeline(pipeline);
    }

    return collectionJson;
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
