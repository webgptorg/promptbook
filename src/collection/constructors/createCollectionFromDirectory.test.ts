import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import { unpreparePipeline } from '../../prepare/unpreparePipeline';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import type { PipelineString } from '../../types/PipelineString';
import { keepUnused } from '../../utils/organization/keepUnused';
import { createCollectionFromDirectory } from './createCollectionFromDirectory';

describe('createCollectionFromDirectory', () => {
    // Note: It doesn't matter if the code block is ``` or >
    const pipeline = spaceTrim(`
          # ✨ Example prompt with URL

          Show how to use a simple prompt with no parameters.

          -   PIPELINE URL https://promptbook.studio/examples/simple.book.md
          -   OUTPUT PARAMETER \`{greetingResponse}\`


          ## 💬 Prompt

          > Hello

          -> {greetingResponse}


          ### Normal response

          -   EXAMPLE

          > Hello, how are you?

          -> {greetingResponse}

          ### Formal response

          -   EXAMPLE

          > Dear Sir, how may I help you?

          -> {greetingResponse}

          ### Informal response

          -   EXAMPLE

          > Hey, what's up?

          -> {greetingResponse}



    `) as PipelineString;

    it('should get pipeline by url from collection', async () => {
        expect.assertions(1);
        const collection = await createCollectionFromDirectory(
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
            'https://promptbook.studio/examples/simple.book.md',
        );

        pipelineFromCollection = unpreparePipeline(pipelineFromCollection);
        pipelineFromCollection = { ...pipelineFromCollection, sourceFile: undefined };

        expect(pipelineFromCollection).toEqual(await pipelineStringToJson(pipeline, {}));
    });

    it('should get lazy-loaded pipeline by url from collection', async () => {
        expect.assertions(1);

        const collection = await createCollectionFromDirectory(
            './examples/pipelines',
            { fs: $provideFilesystemForNode() },
            {
                isVerbose: true,
                isRecursive: false,
                isLazyLoaded: true,
            },
        );
        let pipelineFromCollection = await collection.getPipelineByUrl(
            'https://promptbook.studio/examples/simple.book.md',
        );

        pipelineFromCollection = unpreparePipeline(pipelineFromCollection);
        pipelineFromCollection = { ...pipelineFromCollection, sourceFile: undefined };

        expect(pipelineFromCollection).toEqual(await pipelineStringToJson(pipeline, {}));
    });

    it('should get different pipeline by url from collection', async () => {
        expect.assertions(1);

        const collection = await createCollectionFromDirectory(
            './examples/pipelines',
            { fs: $provideFilesystemForNode() },
            {
                isVerbose: true,
                isRecursive: false,
            },
        );
        let pipelineFromCollection = await collection.getPipelineByUrl(
            'https://promptbook.studio/examples/jokers.book.md',
        );

        pipelineFromCollection = unpreparePipeline(pipelineFromCollection);
        pipelineFromCollection = { ...pipelineFromCollection, sourceFile: undefined };

        expect(pipelineFromCollection).not.toEqual(await pipelineStringToJson(pipeline, {}));
    });

    it('should NOT crash when include error pipelines but lazy-loaded', () =>
        expect(
            (async () => {
                const collection = await createCollectionFromDirectory(
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
                const collection = await createCollectionFromDirectory(
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
              const collection = await   createCollectionFromDirectory('./examples/pipelines',{}, {
                    isVerbose: true,
                    isRecursive: false,
                });
                const pipelineFromCollection = await collection.getPipelineByUrl(
                    'https://promptbook.studio/webgpt/write-website-content.book.md',
                );
                return pipelineFromCollection.title;
            })(),
        ).resolves.toBe('🌍 Create website content'));
    */
});
