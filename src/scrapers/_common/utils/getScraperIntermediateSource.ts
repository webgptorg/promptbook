import { SHA256 as sha256 } from 'crypto-js';
import hexEncoder from 'crypto-js/enc-hex';
import { mkdir, rm } from 'fs/promises';
import { basename, dirname } from 'path';
import { join } from 'path/posix';
import type { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import { nameToSubfolderPath } from '../../../storage/file-cache-storage/utils/nameToSubfolderPath';
import { string_file_extension } from '../../../types/typeAliases';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import { ScraperSourceOptions } from '../Scraper';

/**
 * @@@
 *
 * @private internal utility of `getScraperIntermediateSource`
 */
type GetScraperIntermediateSourceSource = Pick<ScraperSourceOptions, 'filename' | 'url'>;

/**
 * @@@
 *
 * @private internal utility of `getScraperIntermediateSource`
 */
type GetScraperIntermediateSourceOptions = Required<
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
    options: GetScraperIntermediateSourceOptions,
): Promise<ScraperIntermediateSource> {
    const { filename: sourceFilename, url } = source;
    const { rootDirname, cacheDirname, isCacheCleaned, extension, isVerbose } = options;

    // TODO: [👬] DRY

    const hash = sha256(
        hexEncoder.parse(
            sourceFilename || url || 'untitled',
            // <- TODO: !!!!!! Probbably hash file content instead of filename
        ),
    ).toString(/* hex */);
    //    <- TODO: [🥬] Encapsulate sha256 to some private utility function

    const name = basename(sourceFilename || url || 'untitled') + '-' + hash;

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
    } satisfies Converter & ScraperIntermediateSource;

    return fileHandler;
}

/**
 * Note: Not using `FileCacheStorage` for two reasons:
 * 1) Need to store more than serialized JSONs
 * 2) Need to switch between a `rootDirname` and `cacheDirname` <- TODO: !!!!
 */
