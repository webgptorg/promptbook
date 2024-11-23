import type { AbstractFormfactorDefinition } from '../_common/AbstractFormfactorDefinition';

/**
 * Translator is form of app that @@@
 *
 * @public exported from `@promptbook/core`
 */
export const TranslatorFormfactorDefinition = {
    name: 'TRANSLATOR',
    description: `@@@`,
    documentationUrl: `https://github.com/webgptorg/promptbook/discussions/@@`,
    pipelineInterface: {
        inputParameterNames: ['inputMessage'],
        outputParameterNames: ['outputMessage'],
        // <- TODO: !!!!!! Maybe add {summary}
        // <- TODO: [🧠] maybe change to {inputText}, {inputText} / or make system for any name of first input and first outpur parameter
    },
} as const satisfies AbstractFormfactorDefinition;
