import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { compilePipeline } from '../conversion/compilePipeline';
import type { PipelineString } from '../pipeline/PipelineString';
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
    // <- TODO: [📼] Use`book\`` string literal notation

    it('should get pipeline by url from collection', async () => {
        expect.assertions(1);
        const pipeline = await compilePipeline(pipelineString);
        const collection = createCollectionFromJson(pipeline);

        // Note: This is the actual test:
        const collectionJson = await collectionToJson(collection);
        expect([pipeline]).toEqual(collectionJson);
    });
});

/**
 * Note: [🐠] For example here URL https://example.com/pipeline.book is not valid
 *       because it is on private network BUT its very hard to debug because
 *       there is no error message and false return (the error) happen deep in:
 *       `isValidPipelineUrl` -> `isValidPipelineUrl` -> `isUrlOnPrivateNetwork`
 */
