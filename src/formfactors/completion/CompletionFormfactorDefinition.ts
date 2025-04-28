import type { AbstractFormfactorDefinition } from '../_common/AbstractFormfactorDefinition';

/**
 * Completion is formfactor that emulates completion models
 *
 * @public exported from `@promptbook/core`
 */
export const CompletionFormfactorDefinition = {
    name: 'COMPLETION',
    description: `@@@`,
    documentationUrl: `https://github.com/webgptorg/promptbook/discussions/@@`,
    //                                                                     <- TODO: https://github.com/webgptorg/promptbook/discussions/new?category=concepts
    //                                                                              "🔠 Completion Formfactor"

    pipelineInterface: {
        inputParameters: [
            {
                name: 'inputText',
                description: `Input text to be completed`,
                isInput: true,
                isOutput: false,
            },
            {
                name: 'instructions',
                description: `Additional instructions for the model, for example the required length, empty by default`,
                isInput: true,
                isOutput: false,
            },
        ],
        outputParameters: [
            {
                name: 'followingText',
                description: `Text that follows the input text`,
                isInput: false,
                isOutput: true,
            },
        ],
    },
} as const satisfies AbstractFormfactorDefinition;
