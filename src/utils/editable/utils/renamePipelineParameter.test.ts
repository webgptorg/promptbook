import { describe, expect, it } from '@jest/globals';
import { validatePipeline } from '../../../conversion/validation/validatePipeline';
import { renamePipelineParameter } from './renamePipelineParameter';
describe('how renamePipelineParameter works', () => {
    it('should rename parameter in simple promptbook', () => {
        expect(
            renamePipelineParameter({
                pipeline: validatePipeline({
                    title: '✨ Example prompt',
                    bookVersion: '1.0.0',
                    description: 'Show how to use a simple prompt with no parameters.',
                    formfactorName: 'GENERIC',
                    parameters: [
                        {
                            name: 'greet',
                            isInput: false,
                            isOutput: true,
                        },
                    ],
                    tasks: [
                        {
                            name: 'prompt',
                            title: '💬 Prompt',
                            dependentParameterNames: [],
                            taskType: 'PROMPT_TASK',
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
                    sources: [],
                }),
                oldParameterName: 'greet',
                newParameterName: 'greeting',
            }),
        ).toEqual(
            validatePipeline({
                title: '✨ Example prompt',
                bookVersion: '1.0.0',
                description: 'Show how to use a simple prompt with no parameters.',
                formfactorName: 'GENERIC',
                parameters: [
                    {
                        name: 'greeting',
                        isInput: false,
                        isOutput: true,
                    },
                ],
                tasks: [
                    {
                        name: 'prompt',
                        title: '💬 Prompt',
                        dependentParameterNames: [],
                        taskType: 'PROMPT_TASK',
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
                sources: [],
            }),
        );
    });
    it('should rename parameter in normal promptbook', () => {
        expect(
            renamePipelineParameter({
                pipeline: validatePipeline({
                    title: '✨ Example prompt with two consecutive prompts',
                    pipelineUrl: 'https://promptbook.studio/examples/two.book',
                    bookVersion: '1.0.0',
                    description: 'Show how to use two consecutive prompts with one parameter each.',
                    formfactorName: 'GENERIC',
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
                    tasks: [
                        {
                            name: 'synonym',
                            title: '💬 Synonym',
                            description: 'Synonym for word',
                            dependentParameterNames: ['word'],
                            taskType: 'PROMPT_TASK',
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
                            taskType: 'PROMPT_TASK',
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
                    sources: [],
                }),
                oldParameterName: 'word',
                newParameterName: 'originalWord',
            }),
        ).toEqual(
            validatePipeline({
                title: '✨ Example prompt with two consecutive prompts',
                pipelineUrl: 'https://promptbook.studio/examples/two.book',
                bookVersion: '1.0.0',
                description: 'Show how to use two consecutive prompts with one parameter each.',
                formfactorName: 'GENERIC',
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
                tasks: [
                    {
                        name: 'synonym',
                        title: '💬 Synonym',
                        description: 'Synonym for word',
                        dependentParameterNames: ['originalWord'],
                        taskType: 'PROMPT_TASK',
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
                        taskType: 'PROMPT_TASK',
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
                sources: [],
            }),
        );
    });
    it('should detect name collision', () => {
        expect(() =>
            renamePipelineParameter({
                pipeline: validatePipeline({
                    title: '✨ Example prompt with two consecutive prompts',
                    pipelineUrl: 'https://promptbook.studio/examples/two.book',
                    bookVersion: '1.0.0',
                    description: 'Show how to use two consecutive prompts with one parameter each.',
                    formfactorName: 'GENERIC',
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
                    tasks: [
                        {
                            name: 'synonym',
                            title: '💬 Synonym',
                            description: 'Synonym for word',
                            dependentParameterNames: ['word'],
                            taskType: 'PROMPT_TASK',
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
                            taskType: 'PROMPT_TASK',
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
                    sources: [],
                }),
                oldParameterName: 'word',
                newParameterName: 'wordSynonym',
            }),
        ).toThrowError(
            /Can not replace {word} to {wordSynonym} because {wordSynonym} is already used in the pipeline/i,
        );
    });
});
