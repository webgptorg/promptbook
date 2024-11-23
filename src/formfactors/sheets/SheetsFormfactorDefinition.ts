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
        inputParameterNames: ['inputSheet'],
        outputParameterNames: ['outputSheet'],
    },
} as const satisfies AbstractFormfactorDefinition;
