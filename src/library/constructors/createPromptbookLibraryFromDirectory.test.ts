import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { promptbookStringToJson } from '../../conversion/promptbookStringToJson';
import type { PromptbookString } from '../../types/PromptbookString';
import { createPromptbookLibraryFromDirectory } from './createPromptbookLibraryFromDirectory';

describe('createPromptbookLibraryFromDirectory', () => {
    const promptbook = spaceTrim(`
          # ✨ Sample prompt with URL

          Show how to use a simple prompt with no parameters.

          -   PROMPTBOOK URL https://promptbook.example.com/samples/simple.ptbk.md
          -   PROMPTBOOK VERSION 1.0.0
          -   MODEL VARIANT Chat
          -   MODEL NAME gpt-3.5-turbo
          -   OUTPUT PARAMETER \`{greeting}\`


          ## 💬 Prompt

          \`\`\`text
          Hello
          \`\`\`

          -> {greeting}


    `) as PromptbookString;

    it('should get promptbook by url from library', () =>
        expect(
            (async () => {
                const library = await createPromptbookLibraryFromDirectory('./samples/templates', {
                    isVerbose: true,
                    isRecursive: false,
                    isLazyLoaded: false,
                });
                const promptbookFromLibrary = await library.getPromptbookByUrl(
                    'https://promptbook.example.com/samples/simple.ptbk.md',
                );
                return promptbookFromLibrary;
            })(),
        ).resolves.toEqual(promptbookStringToJson(promptbook)));

    it('should get lazy-loaded promptbook by url from library', () =>
        expect(
            (async () => {
                const library = await createPromptbookLibraryFromDirectory('./samples/templates', {
                    isVerbose: true,
                    isRecursive: false,
                    isLazyLoaded: true,
                });
                const promptbookFromLibrary = await library.getPromptbookByUrl(
                    'https://promptbook.example.com/samples/simple.ptbk.md',
                );
                return promptbookFromLibrary;
            })(),
        ).resolves.toEqual(promptbookStringToJson(promptbook)));

    it('should get different promptbook by url from library', () =>
        expect(
            (async () => {
                const library = await createPromptbookLibraryFromDirectory('./samples/templates', {
                    isVerbose: true,
                    isRecursive: false,
                });
                const promptbookFromLibrary = await library.getPromptbookByUrl(
                    'https://promptbook.example.com/samples/jokers.ptbk.md',
                );
                return promptbookFromLibrary.title;
            })(),
        ).resolves.toBe('✨ Sample: Jokers'));

    /*
    TODO: Make separate folder for errors and enable this test
    it('should find promptbook in subdirectory', () =>
        expect(
            (async () => {
              const library = await   createPromptbookLibraryFromDirectory('./samples/templates', {
                    isVerbose: true,
                    isRecursive: false,
                });
                const promptbookFromLibrary = await library.getPromptbookByUrl(
                    'https://promptbook.webgpt.com/en/write-website-content.ptbk.md',
                );
                return promptbookFromLibrary.title;
            })(),
        ).resolves.toBe('🌍 Create website content'));
    */
});
