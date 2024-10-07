import { SHA256 as sha256 } from 'crypto-js';
import hexEncoder from 'crypto-js/enc-hex';
import { mkdir, rm } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { normalizeToKebabCase } from '../../../_packages/utils.index';
import type { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import { nameToSubfolderPath } from '../../../storage/file-cache-storage/utils/nameToSubfolderPath';
import { string_file_extension } from '../../../types/typeAliases';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import { ScraperSourceHandler } from '../Scraper';
import { ScraperIntermediateSource } from '../ScraperIntermediateSource';

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
    Pick<PrepareAndScrapeOptions, 'rootDirname' | 'cacheDirname' | 'isCacheCleaned' | 'isVerbose'>
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
    const { rootDirname, cacheDirname, isCacheCleaned, extension, isVerbose } = options;

    // TODO: [👬] DRY
    const hash = sha256(
        //    <- TODO: [🥬] Encapsulate sha256 to some private utility function
        hexEncoder.parse(
            sourceFilename || url || 'untitled',
            // <- TODO: [🧠] Probbably hash file content instead of filename - now hash does not provide any extra value
        ),
    )
        .toString(/* hex */)
        .substring(0, 20);
    //    <- TODO: [🥬] Make some system for hashes and ids of promptbook

    let semanticNameRaw: string;

    if (sourceFilename !== null) {
        semanticNameRaw = basename(sourceFilename);
    } else if (url !== null) {
        semanticNameRaw = url.split(/^https?:\/\//).join('');
    } else {
        semanticNameRaw = '';
    }

    const semanticName = normalizeToKebabCase(semanticNameRaw).substring(0, 20);
    // <- TODO: [🐱‍🐉]

    const pieces = ['intermediate', semanticName, hash].filter((piece) => piece !== '');

    const name = pieces.join('-');
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
            if (isCacheCleaned) {
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
 */
