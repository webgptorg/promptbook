import { describe, expect, it } from '@jest/globals';
import { join } from 'path';
import { getScraperIntermediateSource } from './getScraperIntermediateSource';

describe('how `getScraperIntermediateSource` works', () => {
    it('should create cache filename for file source and relative path', () =>
        expect(
            getScraperIntermediateSource(
                {
                    filename: 'prague.pdf',
                    url: null,
                },
                {
                    rootDirname: './',
                    cacheDirname: '.coolproject-cache/',
                    isCacheCleaned: false,
                    isVerbose: false,
                    extension: 'md',
                },
            ).then(({ filename }) => filename),
        ).resolves.toBe(
            join(process.cwd(), '.coolproject-cache/8/0/intermediate-prague-pdf-80efa46cc0147c9b65fd.md')
                .split('\\')
                .join('/'),
        ));

    it('should create cache filename for file source and relative ./ path', () =>
        expect(
            getScraperIntermediateSource(
                {
                    filename: 'prague.pdf',
                    url: null,
                },
                {
                    rootDirname: './coolproject',
                    cacheDirname: '/home/user/coolproject/.promptbook/',
                    isCacheCleaned: false,
                    isVerbose: false,
                    extension: 'md',
                },
            ).then(({ filename }) => filename),
        ).resolves.toBe(
            join(process.cwd(), 'coolproject/.promptbook/8/0/intermediate-prague-pdf-80efa46cc0147c9b65fd.md')
                .split('\\')
                .join('/'),
        ));

    it('should create cache filename for file source and relative ../ path', () =>
        expect(
            getScraperIntermediateSource(
                {
                    filename: 'prague.pdf',
                    url: null,
                },
                {
                    rootDirname: 'coolproject',
                    cacheDirname: '/home/user/coolproject/.promptbook/',
                    isCacheCleaned: false,
                    isVerbose: false,
                    extension: 'md',
                },
            ).then(({ filename }) => filename),
        ).resolves.toBe(
            join(process.cwd(), '..', 'coolproject/.promptbook/8/0/intermediate-prague-pdf-80efa46cc0147c9b65fd.md')
                .split('\\')
                .join('/'),
        ));

    it('should create cache filename for file source and absolute linux path', () =>
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
        ).resolves.toBe('/home/user/coolproject/.promptbook/8/0/intermediate-prague-pdf-80efa46cc0147c9b65fd.md'));

    it('should create cache filename for file source and absolute windows path', () =>
        expect(
            getScraperIntermediateSource(
                {
                    filename: 'prague.pdf',
                    url: null,
                },
                {
                    rootDirname: 'C://home/user/coolproject/promptbook-collection/',
                    cacheDirname: 'C://home/user/coolproject/.promptbook/',
                    isCacheCleaned: false,
                    isVerbose: false,
                    extension: 'md',
                },
            ).then(({ filename }) => filename),
        ).resolves.toBe('C://home/user/coolproject/.promptbook/8/0/intermediate-prague-pdf-80efa46cc0147c9b65fd.md'));

    it('should create cache filename for url source', () =>
        expect(
            getScraperIntermediateSource(
                { filename: null, url: 'https://praha.eu/' },
                {
                    rootDirname: null,
                    cacheDirname: '/home/user/coolproject/.promptbook/',
                    isCacheCleaned: false,
                    isVerbose: false,
                    extension: 'md',
                },
            ),
        ).resolves.toBe('/'));
});

/**
 * TODO: [🐱‍🐉][🧠] Make some smart crop
 */
