import { describe, expect, it } from '@jest/globals';
import '../../src/_packages/core.index'; // <- Note: Really importing @@@5
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../llm-providers/_common/getLlmToolsForTestingAndScriptsAndPlayground';
import { preparePersona } from './preparePersona';

describe('how preparePersona works', () => {
    it('should work with simple persona description', () =>
        expect(
            preparePersona(`Copywriter`, {
                llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
            }),
        ).resolves.toEqual({
            modelVariant: 'CHAT',
            modelName: 'gpt-4', // <- TODO: [💕] Allow to specify more model names or more general like gpt-4-*, 1234 context window etc.
            systemMessage: 'You are a skilled copywriter capable of crafting compelling and high-quality content.',
            temperature: 0.5,
        }));

    /*
    TODO: [🎰] Implement tests in such a way that they don't need to be updated every time the model names change
    it('should work with advanced structured persona description', () =>
        expect(
            preparePersona(
                spaceTrim(`
                    Skilled Copywriter with 5 years of experience in the field.

                    - Experience with SEO and SEM
                    - Experience with social media
                    - Experience with email marketing

                `),
                {
                    llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                },
            ),
        ).resolves.toEqual({
            modelVariant: 'CHAT',
            modelName: 'gpt-4-turbo', // <- TODO: [💕]
            systemMessage: 'You are an experienced AI engineer and a helpful assistant.',
            temperature: 0.6,
        }));

    it('should work with creative persona', () =>
        expect(
            preparePersona(`Poem writer with unconventional style of writing in his own language and style`, {
                llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
            }),
        ).resolves.toEqual({
            modelVariant: 'CHAT',
            modelName: 'gpt-4', // <- TODO: [💕]
            systemMessage:
                'You are a poem writer with an unconventional style, crafting verses in your unique language and style.',
            temperature: 0.6,
        }));

    it('should work with non-creative persona', () =>
        expect(
            preparePersona(
                `Technical writer with 5 years of experience in the field. Experience with writing technical documentation, user manuals, and API documentation.`,
                {
                    llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                },
            ),
        ).resolves.toEqual({
            modelVariant: 'CHAT',
            modelName: 'gpt-4', // <- TODO: [💕]
            systemMessage:
                'You are a technical writer with 5 years of experience, skilled in creating technical documentation, user manuals, and API documentation.',
            temperature: 0.5,
        }));

    it('should work French native speaker', () =>
        expect(
            preparePersona(
                `Locuteur natif français, j'aime écrire et je suis passionné par la langue et la culture française.`,
                {
                    llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                },
            ),
        ).resolves.toEqual({
            modelVariant: 'CHAT',
            modelName: 'gpt-4-turbo', // <- TODO: [💕]
            systemMessage:
                'You are an experienced AI engineer and helpful assistant who is a native French speaker, passionate about writing, language, and French culture.',
            temperature: 0.5,
        }));

    it('should work with weird persona description', () =>
        expect(
            preparePersona(`Xyzzy with 5 years of experience in the field. Experience with foo and bar.`, {
                llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
            }),
        ).resolves.toEqual({
            modelVariant: 'CHAT',
            modelName: 'gpt-4', // <- TODO: [💕]
            systemMessage:
                'You are Xyzzy, an experienced AI engineer with 5 years in the field, proficient in technologies such as foo and bar. You assist users with detailed and informed responses.',
            temperature: 0.5,
        }));

    */

    /*
    Note: Probbably no failure cases needed
        > it('should NOT work with bar', () =>
        >     expect(
        >         preparePersona({...}),
        >     ).rejects.toThrowError(/---/));
    */
});
