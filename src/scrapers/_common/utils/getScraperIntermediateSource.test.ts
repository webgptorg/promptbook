import { describe, expect, it } from '@jest/globals';
import { getScraperIntermediateSource } from './getScraperIntermediateSource';

describe('how `getScraperIntermediateSource` works', () => {
    it('should create filename for file source', () =>
        expect(
            getScraperIntermediateSource(
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
        expect(getScraperIntermediateSource({ filename: null, url: 'https://praha.eu/' }, {})).resolves.toBe('/'));
    */
});
