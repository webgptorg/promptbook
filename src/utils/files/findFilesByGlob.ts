import { glob, type GlobOptionsWithFileTypesUnset } from 'glob';
import type { string_filename } from '../../types/string_filename';

/**
 * Options of `findFilesByGlob`
 *
 * Note: These are the options of `glob` itself, only `ignore` also accepts a readonly array
 *       @see https://www.npmjs.com/package/glob#options
 *
 * @private internal type of `findFilesByGlob`
 */
export type FindFilesByGlobOptions = Omit<GlobOptionsWithFileTypesUnset, 'ignore'> & {
    /**
     * Glob patterns which are excluded from the result
     */
    readonly ignore?: string | ReadonlyArray<string>;
};

/**
 * Finds all filenames matching a glob pattern
 *
 * Note: This is the single place where `glob` is used, so that every caller gets the same shape of results
 *       on every operating system - POSIX separators and a stable order - which `glob` itself does not guarantee
 *
 * @param pattern Glob pattern to match, for example `./src/**\/*.ts`
 * @param options Options passed to `glob`
 * @returns Matching filenames with `/` separators, sorted alphabetically
 * @private within the repository
 */
export async function findFilesByGlob(
    pattern: string,
    options: FindFilesByGlobOptions = {},
): Promise<Array<string_filename>> {
    const { ignore, ...restOptions } = options;

    const matchedFilenames = await glob(pattern, {
        ...restOptions,
        ignore: typeof ignore === 'string' || ignore === undefined ? ignore : [...ignore],
    });

    return matchedFilenames
        .map((matchedFilename) => matchedFilename.split('\\').join('/'))
        .sort((filenameA, filenameB) => filenameA.localeCompare(filenameB, 'en'));
}

// Note: Not [~🟢~] because it is not directly dependent on `fs`, same as `listAllFiles`
