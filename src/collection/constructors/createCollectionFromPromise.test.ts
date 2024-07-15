import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { forTime } from 'waitasecond';
import { pipelineStringToJson } from '../../conversion/pipelineStringToJson';
import type { PipelineString } from '../../types/PipelineString';
import { createCollectionFromPromise } from './createCollectionFromPromise';

describe('createCollectionFromPromise', () => {
    const promptbook = spaceTrim(`
            # Sample prompt

            Show how to use a simple completion prompt

            -   PROMPTBOOK VERSION 1.0.0
            -   PROMPTBOOK URL https://example.com/promptbook.json
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

    const collection = createCollectionFromPromise(async () => {
        await forTime(100);
        return [await pipelineStringToJson(promptbook)];
    });

    it('should get promptbook by url from collection', async () => {
        expect.assertions(1);
        const promptbookFromLibrary = await collection.getPipelineByUrl('https://example.com/promptbook.json');
        expect(promptbookFromLibrary).toEqual(await pipelineStringToJson(promptbook));
    });
});
