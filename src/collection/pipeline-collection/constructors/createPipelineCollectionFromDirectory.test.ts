import { describe, expect, it } from '@jest/globals';
import { unpreparePipeline } from '../../../prepare/unpreparePipeline';
import { $provideFilesystemForNode } from '../../../scrapers/_common/register/$provideFilesystemForNode';
import { keepUnused } from '../../../utils/organization/keepUnused';
import { createPipelineCollectionFromDirectory } from './createPipelineCollectionFromDirectory';

describe('createPipelineCollectionFromDirectory', () => {
    it('should get pipeline by url from collection', async () => {
        expect.assertions(1);
        const collection = await createPipelineCollectionFromDirectory(
            './examples/pipelines',
            {
                fs: $provideFilesystemForNode(),
            },
            {
                isVerbose: true,
                isRecursive: false,
                isLazyLoaded: false,
            },
        );
        let pipelineFromCollection = await collection.getPipelineByUrl(
            'https://promptbook.studio/examples/simple.book',
        );

        pipelineFromCollection = unpreparePipeline(pipelineFromCollection);
        pipelineFromCollection = { ...pipelineFromCollection, sourceFile: undefined };

        expect(pipelineFromCollection).toMatchObject({ title: `✨ Example prompt with URL` });
    });

    it('should get lazy-loaded pipeline by url from collection', async () => {
        expect.assertions(1);

        const collection = await createPipelineCollectionFromDirectory(
            './examples/pipelines',
            { fs: $provideFilesystemForNode() },
            {
                isVerbose: true,
                isRecursive: false,
                isLazyLoaded: true,
            },
        );
        let pipelineFromCollection = await collection.getPipelineByUrl(
            'https://promptbook.studio/examples/simple.book',
        );

        pipelineFromCollection = unpreparePipeline(pipelineFromCollection);
        pipelineFromCollection = { ...pipelineFromCollection, sourceFile: undefined };

        expect(pipelineFromCollection).toMatchObject({ title: `✨ Example prompt with URL` });
    });

    it('should get different pipeline by url from collection', async () => {
        expect.assertions(1);

        const collection = await createPipelineCollectionFromDirectory(
            './examples/pipelines',
            { fs: $provideFilesystemForNode() },
            {
                isVerbose: true,
                isRecursive: false,
            },
        );
        let pipelineFromCollection = await collection.getPipelineByUrl(
            'https://promptbook.studio/examples/jokers.book',
        );

        pipelineFromCollection = unpreparePipeline(pipelineFromCollection);
        pipelineFromCollection = { ...pipelineFromCollection, sourceFile: undefined };

        expect(pipelineFromCollection).not.toMatchObject({ title: `✨ Example prompt with URL` });
    });

    it('should NOT crash when include error pipelines but lazy-loaded', () =>
        expect(
            (async () => {
                const collection = await createPipelineCollectionFromDirectory(
                    './examples/pipelines',
                    { fs: $provideFilesystemForNode() },
                    {
                        isVerbose: true,
                        // Note: Including subdirectories BUT lazy-loaded so it should not crash even if there are errors
                        isRecursive: true,
                        isLazyLoaded: true,
                    },
                );
                keepUnused(collection);
            })(),
        ).resolves.not.toThrow());

    it('should crash when include error pipelines', () =>
        expect(
            (async () => {
                const collection = await createPipelineCollectionFromDirectory(
                    './examples/pipelines',
                    { fs: $provideFilesystemForNode() },
                    {
                        isVerbose: true,
                        // Note: Including subdirectories BUT lazy-loaded so it should not crash even if there are errors
                        isRecursive: true,
                        isLazyLoaded: false,
                    },
                );
                keepUnused(collection);
            })(),
        ).rejects.toThrowError(/^ParseError in pipeline examples.*/i));

    /*
    TODO: Make separate folder for errors and enable this test
    it('should find pipeline in subdirectory', () =>
        expect(
            (async () => {
              const collection = await   createPipelineCollectionFromDirectory('./examples/pipelines',{}, {
                    isVerbose: true,
                    isRecursive: false,
                });
                const pipelineFromCollection = await collection.getPipelineByUrl(
                    'https://promptbook.studio/webgpt/write-website-content.book',
                );
                return pipelineFromCollection.title;
            })(),
        ).resolves.toBe('🌍 Create website content'));
    */
});
