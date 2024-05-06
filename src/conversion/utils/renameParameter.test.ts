import { describe, expect, it } from '@jest/globals';
import { validatePromptbookJson } from '../../_packages/core.index';
import { renameParameter } from './renameParameter';

describe('how renameParameter works', () => {
    it('should rename parameter in simple promptbook', () => {
        expect(
            renameParameter({
                promptbook: validatePromptbookJson({
                    title: '✨ Sample prompt',
                    promptbookVersion: '1.0.0',
                    description: 'Show how to use a simple prompt with no parameters.',
                    parameters: [
                        {
                            name: 'greet',
                            isInput: false,
                            isOutput: true,
                        },
                    ],
                    promptTemplates: [
                        {
                            name: 'prompt',
                            title: '💬 Prompt',
                            dependentParameterNames: [],
                            executionType: 'PROMPT_TEMPLATE',
                            modelRequirements: {
                                modelVariant: 'CHAT',
                                modelName: 'gpt-3.5-turbo',
                            },
                            content: 'Hello',
                            resultingParameterName: 'greet',
                        },
                    ],
                }),
                oldParameterName: 'greet',
                newParameterName: 'greeting',
            }),
        ).toEqual(
            validatePromptbookJson({
                title: '✨ Sample prompt',
                promptbookVersion: '1.0.0',
                description: 'Show how to use a simple prompt with no parameters.',
                parameters: [
                    {
                        name: 'greeting',
                        isInput: false,
                        isOutput: true,
                    },
                ],
                promptTemplates: [
                    {
                        name: 'prompt',
                        title: '💬 Prompt',
                        dependentParameterNames: [],
                        executionType: 'PROMPT_TEMPLATE',
                        modelRequirements: {
                            modelVariant: 'CHAT',
                            modelName: 'gpt-3.5-turbo',
                        },
                        content: 'Hello',
                        resultingParameterName: 'greeting',
                    },
                ],
            }),
        );
    });

    it('should rename parameter in normal promptbook', () => {
        expect(
            renameParameter({
                promptbook: validatePromptbookJson({
                    title: '✨ Sample prompt with two consecutive prompts',
                    promptbookUrl: 'https://promptbook.example.com/samples/two.ptbk.md@v1',
                    promptbookVersion: '1.0.0',
                    description: 'Show how to use two consecutive prompts with one parameter each.',
                    parameters: [
                        {
                            name: 'word',
                            description: 'Any single word',
                            isInput: true,
                            isOutput: false,
                        },
                        {
                            name: 'sentenceWithTwoSynonyms',
                            isInput: false,
                            isOutput: true,
                        },
                        {
                            name: 'wordSynonym',
                            isInput: false,
                            isOutput: false,
                        },
                    ],
                    promptTemplates: [
                        {
                            name: 'synonym',
                            title: '💬 Synonym',
                            description: 'Synonym for word',
                            dependentParameterNames: ['word'],
                            executionType: 'PROMPT_TEMPLATE',
                            modelRequirements: {
                                modelVariant: 'CHAT',
                                modelName: 'gpt-3.5-turbo',
                            },
                            content: 'Write synonym for "{word}"',
                            resultingParameterName: 'wordSynonym',
                        },
                        {
                            name: 'sentence',
                            title: '💬 Sentence',
                            description: 'Sentence with word and wordSynonym',
                            dependentParameterNames: ['word', 'wordSynonym'],
                            executionType: 'PROMPT_TEMPLATE',
                            modelRequirements: {
                                modelVariant: 'CHAT',
                                modelName: 'gpt-3.5-turbo',
                            },
                            content: 'Write sentence with "{word}" and "{wordSynonym}" in it',
                            resultingParameterName: 'sentenceWithTwoSynonyms',
                        },
                    ],
                }),
                oldParameterName: 'word',
                newParameterName: 'originalWord',
            }),
        ).toEqual(
            validatePromptbookJson({
                title: '✨ Sample prompt with two consecutive prompts',
                promptbookUrl: 'https://promptbook.example.com/samples/two.ptbk.md@v1',
                promptbookVersion: '1.0.0',
                description: 'Show how to use two consecutive prompts with one parameter each.',
                parameters: [
                    {
                        name: 'originalWord',
                        description: 'Any single word',
                        isInput: true,
                        isOutput: false,
                    },
                    {
                        name: 'sentenceWithTwoSynonyms',
                        isInput: false,
                        isOutput: true,
                    },
                    {
                        name: 'wordSynonym',
                        isInput: false,
                        isOutput: false,
                    },
                ],
                promptTemplates: [
                    {
                        name: 'synonym',
                        title: '💬 Synonym',
                        description: 'Synonym for word',
                        dependentParameterNames: ['originalWord'],
                        executionType: 'PROMPT_TEMPLATE',
                        modelRequirements: {
                            modelVariant: 'CHAT',
                            modelName: 'gpt-3.5-turbo',
                        },
                        content: 'Write synonym for "{originalWord}"',
                        resultingParameterName: 'wordSynonym',
                    },
                    {
                        name: 'sentence',
                        title: '💬 Sentence',
                        description: 'Sentence with word and wordSynonym',
                        dependentParameterNames: ['originalWord', 'wordSynonym'],
                        executionType: 'PROMPT_TEMPLATE',
                        modelRequirements: {
                            modelVariant: 'CHAT',
                            modelName: 'gpt-3.5-turbo',
                        },
                        content: 'Write sentence with "{originalWord}" and "{wordSynonym}" in it',
                        resultingParameterName: 'sentenceWithTwoSynonyms',
                    },
                ],
            }),
        );
    });

    it('should detect name collision', () => {
        expect(() =>
            renameParameter({
                promptbook: validatePromptbookJson({
                    title: '✨ Sample prompt with two consecutive prompts',
                    promptbookUrl: 'https://promptbook.example.com/samples/two.ptbk.md@v1',
                    promptbookVersion: '1.0.0',
                    description: 'Show how to use two consecutive prompts with one parameter each.',
                    parameters: [
                        {
                            name: 'word',
                            description: 'Any single word',
                            isInput: true,
                            isOutput: false,
                        },
                        {
                            name: 'sentenceWithTwoSynonyms',
                            isInput: false,
                            isOutput: true,
                        },
                        {
                            name: 'wordSynonym',
                            isInput: false,
                            isOutput: false,
                        },
                    ],
                    promptTemplates: [
                        {
                            name: 'synonym',
                            title: '💬 Synonym',
                            description: 'Synonym for word',
                            dependentParameterNames: ['word'],
                            executionType: 'PROMPT_TEMPLATE',
                            modelRequirements: {
                                modelVariant: 'CHAT',
                                modelName: 'gpt-3.5-turbo',
                            },
                            content: 'Write synonym for "{word}"',
                            resultingParameterName: 'wordSynonym',
                        },
                        {
                            name: 'sentence',
                            title: '💬 Sentence',
                            description: 'Sentence with word and wordSynonym',
                            dependentParameterNames: ['word', 'wordSynonym'],
                            executionType: 'PROMPT_TEMPLATE',
                            modelRequirements: {
                                modelVariant: 'CHAT',
                                modelName: 'gpt-3.5-turbo',
                            },
                            content: 'Write sentence with "{word}" and "{wordSynonym}" in it',
                            resultingParameterName: 'sentenceWithTwoSynonyms',
                        },
                    ],
                }),
                oldParameterName: 'word',
                newParameterName: 'wordSynonym',
            }),
        ).toThrowError(
            /Can not replace {word} to {wordSynonym} because {wordSynonym} is already used in the promptbook/i,
        );
    });
});
