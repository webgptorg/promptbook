import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { pipelineStringToJson } from '../conversion/pipelineStringToJson';
import type { PipelineString } from '../types/PipelineString';
import { collectionToJson } from './collectionToJson';
import { createCollectionFromJson } from './constructors/createCollectionFromJson';

describe('createCollectionFromJson', () => {
    const pipelineString = spaceTrim(`
            # Example prompt

            Show how to use a simple completion prompt

            -   PROMPTBOOK VERSION 1.0.0
            -   PIPELINE URL https://promptbook.studio/example.book.md
            -   INPUT  PARAMETER {thing} Any thing to buy
            -   OUTPUT PARAMETER {response}

            ## Prompt

            - MODEL VARIANT Completion
            - MODEL NAME \`gpt-3.5-turbo-instruct\`
            - EXPECT MIN 2 LINES
            - EXPECT MAX 5 LINES
            - EXPECT MIN 10 WORDS

            \`\`\`
            One day I went to the shop and bought {thing}.
            Now I have {thing}.
            \`\`\`

            -> {response}
         `) as PipelineString;

    it('should get pipeline by url from collection', async () => {
        expect.assertions(1);
        const pipeline = await pipelineStringToJson(pipelineString);
        const collection = createCollectionFromJson(pipeline);

        // Note: This is the actual test:
        const collectionJson = await collectionToJson(collection);
        expect([pipeline]).toEqual(collectionJson);
    });
});

/**
 * Note: [🐠] For example here URL https://example.com/pipeline.book.md is not valid
 *       because it is on private network BUT its very hard to debug because
 *       there is no error message and false return (the error) happen deep in:
 *       `isValidPipelineUrl` -> `isValidPipelineUrl` -> `isUrlOnPrivateNetwork`
 */
