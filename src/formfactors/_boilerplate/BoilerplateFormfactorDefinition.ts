import type { AbstractFormfactorDefinition } from '../_common/AbstractFormfactorDefinition';

/**
 * Boilerplate is form of app that @@@
 *
 * @public exported from `@promptbook/core`
 */
export const BoilerplateFormfactorDefinition = {
    name: 'BOILERPLATE',
    description: `@@@`,
    documentationUrl: `https://github.com/webgptorg/promptbook/discussions/@@`,
    pipelineInterface: {
        inputParameterNames: [],
        outputParameterNames: [],
    },
} as const satisfies AbstractFormfactorDefinition;
