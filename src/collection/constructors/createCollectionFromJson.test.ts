import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import type { PipelineString } from '../../types/PipelineString';
import { createCollectionFromJson } from './createCollectionFromJson';

describe('createCollectionFromJson', () => {
    const pipelineString = spaceTrim(`
            # Sample prompt

            Show how to use a simple completion prompt

            -   PROMPTBOOK VERSION 1.0.0
            -   PIPELINE URL https://example.com/pipeline.json
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
        const pipelineFromCollection = await collection.getPipelineByUrl('https://example.com/pipeline.json');
        expect(pipelineFromCollection).toEqual(await pipelineStringToJson(pipelineString));
    });
});
