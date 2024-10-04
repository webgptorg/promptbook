import { describe, expect, it } from '@jest/globals';
import { getScraperIntermediateSource } from './getScraperIntermediateSource';
import { join } from 'path';

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
        ).resolves.toBe(
            join(
                process.cwd(),
                '/home/user/coolproject/.promptbook/8/0/prague.pdf-80efa46cc0147c9b65fd46cbf90638196e6540197b655ddb6eb704c38a2bdd23.md',
            )
                .split('\\')
                .join('/'),
        ));

    /*
    !!!!!!
    it('should create filename for url source', () =>
        expect(getScraperIntermediateSource({ filename: null, url: 'https://praha.eu/' }, {})).resolves.toBe('/'));
    */
});
