import type { AbstractFormfactorDefinition } from '../_common/AbstractFormfactorDefinition';

/**
 * Boilerplate is form of app that serves as a template structure for creating other formfactors
 * and should not be used directly in production.
 *
 * @public exported from `@promptbook/core`
 */
export const BoilerplateFormfactorDefinition = {
    name: 'BOILERPLATE',
    description: `A template structure for creating new formfactors, providing the base architecture and interfaces that should be implemented.`,
    documentationUrl: `https://github.com/webgptorg/promptbook/discussions/@@`,
    //                                                                     <- TODO: https://github.com/webgptorg/promptbook/discussions/new?category=concepts
    //                                                                              "🔠 Boilerplate Formfactor"

    pipelineInterface: {
        inputParameters: [
            /* <- Example input parameters should be defined here */
        ],
        outputParameters: [
            /* <- Example output parameters should be defined here */
        ],
    },
} as const satisfies AbstractFormfactorDefinition;
