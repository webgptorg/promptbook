import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { forTime } from 'waitasecond';
import { promptbookStringToJson } from '../../conversion/promptbookStringToJson';
import type { PromptbookString } from '../../types/PromptbookString';
import { createPromptbookLibraryFromPromise } from './createPromptbookLibraryFromPromise';

describe('createPromptbookLibraryFromPromise', () => {
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
         `) as PromptbookString;

    const library = createPromptbookLibraryFromPromise(async () => {
        await forTime(100);
        return [promptbook];
    });

    it('should get promptbook by url from library', async () => {
        const promptbookFromLibrary = await library.getPromptbookByUrl('https://example.com/promptbook.json');
        expect(promptbookFromLibrary).toEqual(await promptbookStringToJson(promptbook));
    });
});
