import type { AbstractFormfactorDefinition } from '../_common/AbstractFormfactorDefinition';

/**
 * Matcher is form of app that evaluates (spreadsheet) content against defined criteria or patterns,
 * determining if it matches or meets specific requirements. Used for classification,
 * validation, filtering, and quality assessment of inputs.
 *
 * @public exported from `@promptbook/core`
 */
export const MatcherFormfactorDefinition = {
    name: 'EXPERIMENTAL_MATCHER',
    description: `An evaluation system that determines whether content meets specific criteria or patterns.
    Used for content validation, quality assessment, and intelligent filtering tasks. Currently in experimental phase.`,
    documentationUrl: `https://github.com/webgptorg/promptbook/discussions/177`,
    pipelineInterface: {
        inputParameters: [
            /* Input parameters for content to be matched and criteria to match against */
            {
                name: 'nonce',
                description: 'Just to prevent EXPERIMENTAL_MATCHER to be set as implicit formfactor',
                isInput: true,
                isOutput: false,
            },
        ],
        outputParameters: [
            /* Output parameters containing match results, confidence scores, and relevant metadata */
        ],
    },
} as const satisfies AbstractFormfactorDefinition;
