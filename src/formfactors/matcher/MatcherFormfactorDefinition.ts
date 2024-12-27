import type { AbstractFormfactorDefinition } from '../_common/AbstractFormfactorDefinition';

/**
 * Matcher is form of app that @@@
 *
 * @public exported from `@promptbook/core`
 */
export const MatcherFormfactorDefinition = {
    name: 'EXPERIMENTAL_MATCHER',
    description: `@@@`,
    documentationUrl: `https://github.com/webgptorg/promptbook/discussions/177`,
    pipelineInterface: {
        inputParameters: [
            /* @@@ */
            {
                name: 'nonce',
                description: 'Just to prevent EXPERIMENTAL_MATCHER to be set as implicit formfactor',
                isInput: true,
                isOutput: false,
            },
        ],
        outputParameters: [
            /* @@@ */
        ],
    },
} as const satisfies AbstractFormfactorDefinition;
