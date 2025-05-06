import type { AbstractFormfactorDefinition } from '../_common/AbstractFormfactorDefinition';

/**
 * Translator is form of app that transforms input text from one form to another,
 * such as language translation, style conversion, tone modification, or other text transformations.
 *
 * @public exported from `@promptbook/core`
 */
export const TranslatorFormfactorDefinition = {
    name: 'TRANSLATOR',
    description: `A text transformation system that converts input content into different forms,
    including language translations, paraphrasing, style conversions, and tone adjustments.
    This form factor takes one input and produces one transformed output.`,
    documentationUrl: `https://github.com/webgptorg/promptbook/discussions/175`,
    pipelineInterface: {
        inputParameters: [
            {
                name: 'inputMessage',
                description: `Input message to be translated`,
                isInput: true,
                isOutput: false,
            },
        ],
        outputParameters: [
            {
                name: 'outputMessage',
                description: `Translated output message`,
                isInput: false,
                isOutput: true,
            },
        ],
        // <- TODO: [🤓] Maybe add {summary}
        // <- TODO: [🧠] maybe change to {inputText}, {inputText} / or make system for any name of first input and first outpur parameter
    },
} as const satisfies AbstractFormfactorDefinition;
