import { SHA256 as sha256 } from 'crypto-js';
import hexEncoder from 'crypto-js/enc-hex';
import { mkdir, rm } from 'fs/promises';
import { dirname, join } from 'path';
import { titleToName } from '../../../conversion/utils/titleToName';
import type { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import { nameToSubfolderPath } from '../../../storage/file-cache-storage/utils/nameToSubfolderPath';
import type { string_file_extension } from '../../../types/typeAliases';
import { normalizeToKebabCase } from '../../../utils/normalization/normalize-to-kebab-case';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import type { ScraperSourceHandler } from '../Scraper';
import type { ScraperIntermediateSource } from '../ScraperIntermediateSource';

/**
 * @@@
 *
 * @private internal utility of `getScraperIntermediateSource`
 */
type GetScraperIntermediateSourceSource = Pick<ScraperSourceHandler, 'filename' | 'url'>;

/**
 * @@@
 *
 * @private internal utility of `getScraperIntermediateSource`
 */
type GetScraperIntermediateSourceHandler = Required<
    Pick<PrepareAndScrapeOptions, 'rootDirname' | 'cacheDirname' | 'intermediateFilesStrategy' | 'isVerbose'>
> & {
    readonly extension: string_file_extension;
};

/**
 * Create a filename for intermediate cache for scrapers
 *
 * Note: It also checks if directory exists and creates it if not
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
            // <- TODO: [🧠] Probbably hash file content instead of filename - now hash does not provide any extra value
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

    TODO_USE(rootDirname); // <- TODO: !!!!!!

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

    await mkdir(dirname(cacheFilename), { recursive: true });

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
 * 2) Need to switch between a `rootDirname` and `cacheDirname` <- TODO: !!!!
 * TODO: [🐱‍🐉][🧠] Make some smart crop
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
