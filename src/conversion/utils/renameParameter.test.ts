import { describe, expect, it } from '@jest/globals';
import { validatePipeline } from '../validation/validatePipeline';
import { renameParameter } from './renameParameter';
describe('how renameParameter works', () => {
    it('should rename parameter in simple promptbook', () => {
        expect(
            renameParameter({
                pipeline: validatePipeline({
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
                            blockType: 'PROMPT_TEMPLATE',
                            modelRequirements: {
                                modelVariant: 'CHAT',
                                modelName: 'gpt-3.5-turbo',
                            },
                            content: 'Hello',
                            resultingParameterName: 'greet',
                        },
                    ],
                    knowledgeSources: [],
                    knowledgePieces: [],
                    personas: [],
                    preparations: [],
                }),
                oldParameterName: 'greet',
                newParameterName: 'greeting',
            }),
        ).toEqual(
            validatePipeline({
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
                        blockType: 'PROMPT_TEMPLATE',
                        modelRequirements: {
                            modelVariant: 'CHAT',
                            modelName: 'gpt-3.5-turbo',
                        },
                        content: 'Hello',
                        resultingParameterName: 'greeting',
                    },
                ],
                knowledgeSources: [],
                knowledgePieces: [],
                personas: [],
                preparations: [],
            }),
        );
    });
    it('should rename parameter in normal promptbook', () => {
        expect(
            renameParameter({
                pipeline: validatePipeline({
                    title: '✨ Sample prompt with two consecutive prompts',
                    pipelineUrl: 'https://promptbook.studio/samples/two.ptbk.md',
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
                            blockType: 'PROMPT_TEMPLATE',
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
                            blockType: 'PROMPT_TEMPLATE',
                            modelRequirements: {
                                modelVariant: 'CHAT',
                                modelName: 'gpt-3.5-turbo',
                            },
                            content: 'Write sentence with "{word}" and "{wordSynonym}" in it',
                            resultingParameterName: 'sentenceWithTwoSynonyms',
                        },
                    ],
                    knowledgeSources: [],
                    knowledgePieces: [],
                    personas: [],
                    preparations: [],
                }),
                oldParameterName: 'word',
                newParameterName: 'originalWord',
            }),
        ).toEqual(
            validatePipeline({
                title: '✨ Sample prompt with two consecutive prompts',
                pipelineUrl: 'https://promptbook.studio/samples/two.ptbk.md',
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
                        blockType: 'PROMPT_TEMPLATE',
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
                        blockType: 'PROMPT_TEMPLATE',
                        modelRequirements: {
                            modelVariant: 'CHAT',
                            modelName: 'gpt-3.5-turbo',
                        },
                        content: 'Write sentence with "{originalWord}" and "{wordSynonym}" in it',
                        resultingParameterName: 'sentenceWithTwoSynonyms',
                    },
                ],
                knowledgeSources: [],
                knowledgePieces: [],
                personas: [],
                preparations: [],
            }),
        );
    });
    it('should detect name collision', () => {
        expect(() =>
            renameParameter({
                pipeline: validatePipeline({
                    title: '✨ Sample prompt with two consecutive prompts',
                    pipelineUrl: 'https://promptbook.studio/samples/two.ptbk.md',
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
                            blockType: 'PROMPT_TEMPLATE',
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
                            blockType: 'PROMPT_TEMPLATE',
                            modelRequirements: {
                                modelVariant: 'CHAT',
                                modelName: 'gpt-3.5-turbo',
                            },
                            content: 'Write sentence with "{word}" and "{wordSynonym}" in it',
                            resultingParameterName: 'sentenceWithTwoSynonyms',
                        },
                    ],
                    knowledgeSources: [],
                    knowledgePieces: [],
                    personas: [],
                    preparations: [],
                }),
                oldParameterName: 'word',
                newParameterName: 'wordSynonym',
            }),
        ).toThrowError(
            /Can not replace {word} to {wordSynonym} because {wordSynonym} is already used in the pipeline/i,
        );
    });
});
