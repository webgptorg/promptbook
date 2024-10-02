import { describe, expect, it } from '@jest/globals';
import { getScraperSourceCacheFileHandler } from './getScraperSourceCacheFileHandler';

describe('how `getScraperSourceCacheFileHandler` works', () => {
    it('should create filename for file source', () =>
        expect(
            getScraperSourceCacheFileHandler(
                {
                    filename: 'prague.pdf',
                    url: null,
                },
                {
                    rootDirname: '/home/user/coolproject/promptbook-collection/',
                    cacheDirname: '/home/user/coolproject/.promptbook/',
                    isCacheCleaned: false,
                    isVerbose: false,
                    extension: 'md',
                },
            ).then(({ filename }) => filename),
        ).resolves.toBe('/'));

    /*
    !!!!!!
    it('should create filename for url source', () =>
        expect(getScraperSourceCacheFileHandler({ filename: null, url: 'https://praha.eu/' }, {})).resolves.toBe('/'));
    */
});
