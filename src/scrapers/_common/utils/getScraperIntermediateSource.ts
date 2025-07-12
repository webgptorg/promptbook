import { SHA256 as sha256 } from 'crypto-js';
import hexEncoder from 'crypto-js/enc-hex';
import { mkdir, rm } from 'fs/promises';
import { dirname, join } from 'path';
import type { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import { nameToSubfolderPath } from '../../../storage/file-cache-storage/utils/nameToSubfolderPath';
import type { string_file_extension } from '../../../types/typeAliases';
import { normalizeToKebabCase } from '../../../utils/normalization/normalize-to-kebab-case';
import { titleToName } from '../../../utils/normalization/titleToName';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import type { ScraperSourceHandler } from '../Scraper';
import type { ScraperIntermediateSource } from '../ScraperIntermediateSource';

/**
 * Type representing source information for generating intermediate storage.
 * Contains essential file and URL information needed to create a deterministic storage path.
 *
 * @private internal utility of `getScraperIntermediateSource`
 */
type GetScraperIntermediateSourceSource = Pick<ScraperSourceHandler, 'filename' | 'url'>;

/**
 * Options for intermediate source generation and management.
 * Configures how intermediate files are named, stored, and cleaned up.
 *
 * @private internal utility of `getScraperIntermediateSource`
 */
type GetScraperIntermediateSourceHandler = Required<
    Pick<PrepareAndScrapeOptions, 'rootDirname' | 'cacheDirname' | 'intermediateFilesStrategy' | 'isVerbose'>
> & {
    readonly extension: string_file_extension;
};

/**
 * Retrieves an intermediate source for a scraper based on the knowledge source.
 * Manages the caching and retrieval of intermediate scraper results for optimized performance.
 *
 * @private as internal utility for scrapers
 */
export async function getScraperIntermediateSource(
    source: GetScraperIntermediateSourceSource,
    options: GetScraperIntermediateSourceHandler,
): Promise<ScraperIntermediateSource> {
    const { filename: sourceFilename, url } = source;
    const { rootDirname, cacheDirname, intermediateFilesStrategy, extension, isVerbose } = options;

    // TODO: [👬] DRY
    const hash = sha256(
        //    <- TODO: [🥬] Encapsulate sha256 to some private utility function
        hexEncoder.parse(
            sourceFilename || url || 'untitled',
            // <- TODO: [🧠] Probably hash file content instead of filename - now hash does not provide any extra value
        ),
    )
        .toString(/* hex */)
        .substring(
            0,
            20,
            // <- TODO: Use MAX_FILENAME_LENGTH
        );
    //    <- TODO: [🥬] Make some system for hashes and ids of promptbook

    const semanticName = normalizeToKebabCase(
        titleToName((sourceFilename || url || '').split('intermediate').join('')),
    ).substring(
        0,
        20,
        // <- TODO: Use MAX_FILENAME_LENGTH
        // <- TODO: [🐱‍🐉]
    );
    // <- TODO: [🐱‍🐉]

    const pieces = ['intermediate', semanticName, hash].filter((piece) => piece !== '');

    const name = pieces.join('-').split('--').join('-');
    // <- TODO: Use MAX_FILENAME_LENGTH

    TODO_USE(rootDirname); // <- TODO: [😡]

    const cacheFilename =
        join(
            process.cwd(),
            cacheDirname,
            ...nameToSubfolderPath(hash /* <- TODO: [🎎] Maybe add some SHA256 prefix */),
            name,
        )
            .split('\\')
            .join('/') +
        '.' +
        extension;

    // Note: Try to create cache directory, but don't fail if filesystem has issues
    try {
        await mkdir(dirname(cacheFilename), { recursive: true });
    } catch (error) {
        // Note: If we can't create cache directory, continue without it
        //       This handles read-only filesystems, permission issues, and missing parent directories
        if (error instanceof Error && (
            error.message.includes('EROFS') ||
            error.message.includes('read-only') ||
            error.message.includes('EACCES') ||
            error.message.includes('EPERM') ||
            error.message.includes('ENOENT')
        )) {
            // Silently ignore filesystem errors - caching is optional
        } else {
            // Re-throw other unexpected errors
            throw error;
        }
    }

    let isDestroyed = true;
    const fileHandler = {
        filename: cacheFilename,
        get isDestroyed() {
            return isDestroyed;
        },
        async destroy() {
            if (intermediateFilesStrategy === 'HIDE_AND_CLEAN') {
                if (isVerbose) {
                    console.info('legacyDocumentScraper: Clening cache');
                }
                await rm(cacheFilename);
                // TODO: [🐿][🧠] Maybe remove empty folders
            }

            isDestroyed = true;
        },
    } satisfies ScraperIntermediateSource;

    return fileHandler;
}

/**
 * Note: Not using `FileCacheStorage` for two reasons:
 * 1) Need to store more than serialized JSONs
 * 2) Need to switch between a `rootDirname` and `cacheDirname` <- TODO: [😡]
 * TODO: [🐱‍🐉][🧠] Make some smart crop
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
