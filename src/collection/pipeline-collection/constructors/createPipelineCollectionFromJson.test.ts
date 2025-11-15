import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { compilePipeline } from '../../../conversion/compilePipeline';
import type { PipelineString } from '../../../pipeline/PipelineString';
import { createPipelineCollectionFromJson } from './createPipelineCollectionFromJson';

describe('createPipelineCollectionFromJson', () => {
    const pipelineString = spaceTrim(`
            # Example prompt

            Show how to use a simple completion prompt

            -   PROMPTBOOK VERSION 1.0.0
            -   PIPELINE URL https://promptbook.studio/examples/pipeline.book
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
        const collection = createPipelineCollectionFromJson(pipeline);
        const pipelineFromCollection = await collection.getPipelineByUrl(
            'https://promptbook.studio/examples/pipeline.book',
        );
        expect(pipelineFromCollection).toEqual(await compilePipeline(pipelineString));
    });
});
