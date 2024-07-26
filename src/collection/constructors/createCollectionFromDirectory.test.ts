import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import type { PipelineString } from '../../types/PipelineString';
import { really_any } from '../../types/typeAliases';
import { just } from '../../utils/just';
import { createCollectionFromDirectory } from './createCollectionFromDirectory';

describe('createCollectionFromDirectory', () => {
    const pipeline = spaceTrim(`
          # ✨ Sample prompt with URL

          Show how to use a simple prompt with no parameters.

          -   PIPELINE URL https://promptbook.studio/samples/simple.ptbk.md
          -   PROMPTBOOK VERSION 1.0.0
          -   OUTPUT PARAMETER \`{greetingResponse}\`


          ## 💬 Prompt

          \`\`\`text
          Hello
          \`\`\`

          -> {greetingResponse}


    `) as PipelineString;

    it('should get pipeline by url from collection', async () => {
        expect.assertions(1);
        const collection = await createCollectionFromDirectory('./samples/templates', {
            isVerbose: true,
            isRecursive: false,
            isLazyLoaded: false,
        });
        const pipelineFromCollection = await collection.getPipelineByUrl(
            'https://promptbook.studio/samples/simple.ptbk.md',
        );

        delete (pipelineFromCollection as really_any).sourceFile;

        expect(pipelineFromCollection).toEqual(await pipelineStringToJson(pipeline));
    });

    it('should get lazy-loaded pipeline by url from collection', async () => {
        expect.assertions(1);

        const collection = await createCollectionFromDirectory('./samples/templates', {
            isVerbose: true,
            isRecursive: false,
            isLazyLoaded: true,
        });
        const pipelineFromCollection = await collection.getPipelineByUrl(
            'https://promptbook.studio/samples/simple.ptbk.md',
        );

        delete (pipelineFromCollection as really_any).sourceFile;

        expect(pipelineFromCollection).toEqual(await pipelineStringToJson(pipeline));
    });

    it('should get different pipeline by url from collection', async () => {
        expect.assertions(1);

        const collection = await createCollectionFromDirectory('./samples/templates', {
            isVerbose: true,
            isRecursive: false,
        });
        const pipelineFromCollection = await collection.getPipelineByUrl(
            'https://promptbook.studio/samples/jokers.ptbk.md',
        );

        delete (pipelineFromCollection as really_any).sourceFile;

        expect(pipelineFromCollection).not.toEqual(await pipelineStringToJson(pipeline));
    });

    it('should NOT crash when include error pipelines but lazy-loaded', () =>
        expect(
            (async () => {
                const collection = await createCollectionFromDirectory('./samples/templates', {
                    isVerbose: true,
                    isRecursive: true /* <- Note: Include Errors */,
                    isLazyLoaded: true,
                });
                just(collection);
            })(),
        ).resolves.not.toThrow());

    it('should crash when include error pipelines', () =>
        expect(
            (async () => {
                const collection = await createCollectionFromDirectory('./samples/templates', {
                    isVerbose: true,
                    isRecursive: true /* <- Note: Include Errors */,
                    isLazyLoaded: false,
                });
                just(collection);
            })(),
        ).rejects.toThrowError(/Error during loading pipeline/i));

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
