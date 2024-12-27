import type { AbstractFormfactorDefinition } from '../_common/AbstractFormfactorDefinition';

/**
 * Generator is form of app that @@@
 *
 * @public exported from `@promptbook/core`
 */
export const GeneratorFormfactorDefinition = {
    name: 'GENERATOR',
    description: `@@@`,
    documentationUrl: `https://github.com/webgptorg/promptbook/discussions/184`,
    pipelineInterface: {
        inputParameters: [
            /* @@@ */
            {
                name: 'nonce',
                description: 'Just to prevent GENERATOR to be set as implicit formfactor',
                isInput: true,
                isOutput: false,
            },
        ],
        outputParameters: [
            /* @@@ */
        ],
    },
} as const satisfies AbstractFormfactorDefinition;
