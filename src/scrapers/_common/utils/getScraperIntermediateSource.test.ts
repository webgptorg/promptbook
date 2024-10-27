import { describe, expect, it } from '@jest/globals';
import { join } from 'path';
import { getScraperIntermediateSource } from './getScraperIntermediateSource';

describe('how `getScraperIntermediateSource` works', () => {
    it('should create cache filename for file source', () =>
        expect(
            getScraperIntermediateSource(
                {
                    filename: 'prague.pdf',
                    url: null,
                },
                {
                    rootDirname: '/home/user/coolproject/promptbook-collection/',
                    cacheDirname: '/home/user/coolproject/.promptbook/',
                    intermediateFilesStrategy: 'HIDE_AND_KEEP',
                    isVerbose: false,
                    extension: 'md',
                },
            ).then(({ filename }) => filename),
        ).resolves.toBe(
            join(
                process.cwd(),
                '/home/user/coolproject/.promptbook/8/0/intermediate-prague-pdf-80efa46cc0147c9b65fd.md',
            )
                .split('\\')
                .join('/'),
        ));

    it('should create filename for url source', () =>
        expect(
            getScraperIntermediateSource(
                { filename: null, url: 'https://praha.eu/' },
                {
                    rootDirname: '/home/user/coolproject/promptbook-collection/',
                    cacheDirname: '/home/user/coolproject/.promptbook/',
                    intermediateFilesStrategy: 'HIDE_AND_KEEP',
                    isVerbose: false,
                    extension: 'md',
                },
            ).then(({ filename }) => filename),
        ).resolves.toBe(
            join(process.cwd(), '/home/user/coolproject/.promptbook/2/0/intermediate-praha-eu-203eb08e746a0a13aad7.md')
                .split('\\')
                .join('/'),
        ));
});

/**
 * TODO: [🐱‍🐉][🧠] Make some smart crop
 */
