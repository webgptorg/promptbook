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
        // <- TODO: !!!!!! maybe {inputText}, {inputText}
    },
} as const satisfies AbstractFormfactorDefinition;
