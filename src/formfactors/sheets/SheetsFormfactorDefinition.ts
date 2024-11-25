import type { AbstractFormfactorDefinition } from '../_common/AbstractFormfactorDefinition';

/**
 * Sheets is form of app that @@@
 *
 * @public exported from `@promptbook/core`
 */
export const SheetsFormfactorDefinition = {
    name: 'SHEETS',
    description: `@@@`,
    documentationUrl: `https://github.com/webgptorg/promptbook/discussions/176`,
    pipelineInterface: {
        inputParameters: [
            {
                name: 'inputSheet',
                description: `Input sheet to be processed as csv`,
                isInput: true,
                isOutput: false,
            },
        ],
        outputParameters: [
            {
                name: 'outputSheet',
                description: `Output sheet as csv`,
                isInput: false,
                isOutput: true,
            },
        ],
    },
} as const satisfies AbstractFormfactorDefinition;
