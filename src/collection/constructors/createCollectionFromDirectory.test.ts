import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import { unpreparePipeline } from '../../prepare/unpreparePipeline';
import type { PipelineString } from '../../types/PipelineString';
import { keepUnused } from '../../utils/organization/keepUnused';
import type { really_any } from '../../utils/organization/really_any';
import { createCollectionFromDirectory } from './createCollectionFromDirectory';

describe('createCollectionFromDirectory', () => {
    // Note: It doesn't matter if the code block is ``` or >
    const pipeline = spaceTrim(`
          # ✨ Sample prompt with URL

          Show how to use a simple prompt with no parameters.

          -   PIPELINE URL https://promptbook.studio/samples/simple.ptbk.md
          -   PROMPTBOOK VERSION 1.0.0
          -   OUTPUT PARAMETER \`{greetingResponse}\`


          ## 💬 Prompt

          > Hello

          -> {greetingResponse}


          ### Normal response

          -   SAMPLE

          > Hello, how are you?

          -> {greetingResponse}

          ### Formal response

          -   SAMPLE

          > Dear Sir, how may I help you?

          -> {greetingResponse}

          ### Informal response

          -   SAMPLE

          > Hey, what's up?

          -> {greetingResponse}



    `) as PipelineString;

    it('should get pipeline by url from collection', async () => {
        expect.assertions(1);
        const collection = await createCollectionFromDirectory('./samples/templates', {
            llmTools: null,
            isVerbose: true,
            isRecursive: false,
            isLazyLoaded: false,
        });
        let pipelineFromCollection = await collection.getPipelineByUrl(
            'https://promptbook.studio/samples/simple.ptbk.md',
        );

        pipelineFromCollection = unpreparePipeline(pipelineFromCollection);
        delete (pipelineFromCollection as really_any).sourceFile;

        expect(pipelineFromCollection).toEqual(await pipelineStringToJson(pipeline));
    });

    it('should get lazy-loaded pipeline by url from collection', async () => {
        expect.assertions(1);

        const collection = await createCollectionFromDirectory('./samples/templates', {
            llmTools: null,
            isVerbose: true,
            isRecursive: false,
            isLazyLoaded: true,
        });
        let pipelineFromCollection = await collection.getPipelineByUrl(
            'https://promptbook.studio/samples/simple.ptbk.md',
        );

        pipelineFromCollection = unpreparePipeline(pipelineFromCollection);
        delete (pipelineFromCollection as really_any).sourceFile;

        expect(pipelineFromCollection).toEqual(await pipelineStringToJson(pipeline));
    });

    it('should get different pipeline by url from collection', async () => {
        expect.assertions(1);

        const collection = await createCollectionFromDirectory('./samples/templates', {
            llmTools: null,
            isVerbose: true,
            isRecursive: false,
        });
        let pipelineFromCollection = await collection.getPipelineByUrl(
            'https://promptbook.studio/samples/jokers.ptbk.md',
        );

        pipelineFromCollection = unpreparePipeline(pipelineFromCollection);
        delete (pipelineFromCollection as really_any).sourceFile;

        expect(pipelineFromCollection).not.toEqual(await pipelineStringToJson(pipeline));
    });

    it('should NOT crash when include error pipelines but lazy-loaded', () =>
        expect(
            (async () => {
                const collection = await createCollectionFromDirectory('./samples/templates', {
                    llmTools: null,
                    isVerbose: true,
                    // Note: Including subdirectories BUT lazy-loaded so it should not crash even if there are errors
                    isRecursive: true,
                    isLazyLoaded: true,
                });
                keepUnused(collection);
            })(),
        ).resolves.not.toThrow());

    it('should crash when include error pipelines', () =>
        expect(
            (async () => {
                const collection = await createCollectionFromDirectory('./samples/templates', {
                    llmTools: null,
                    isVerbose: true,
                    // Note: Including subdirectories BUT lazy-loaded so it should not crash even if there are errors
                    isRecursive: true,
                    isLazyLoaded: false,
                });
                keepUnused(collection);
            })(),
        ).rejects.toThrowError(/^PipelineLogicError in pipeline samples.*/i));

    /*
    TODO: Make separate folder for errors and enable this test
    it('should find pipeline in subdirectory', () =>
        expect(
            (async () => {
              const collection = await   createCollectionFromDirectory('./samples/templates', {
                    isVerbose: true,
                    isRecursive: false,
                });
                const pipelineFromCollection = await collection.getPipelineByUrl(
                    'https://promptbook.studio/webgpt/write-website-content.ptbk.md',
                );
                return pipelineFromCollection.title;
            })(),
        ).resolves.toBe('🌍 Create website content'));
    */
});
