import { GENERIC_PIPELINE_INTERFACE } from '../../pipeline/pipeline-interface/constants';
import type { AbstractFormfactorDefinition } from '../_common/AbstractFormfactorDefinition';

/**
 * @@@
 *
 * @public exported from `@promptbook/core`
 */
export const GenericFormfactorDefinition = {
    name: 'GENERIC',
    description: `@@@`,
    documentationUrl: `https://github.com/webgptorg/promptbook/discussions/@@`,
    pipelineInterface: GENERIC_PIPELINE_INTERFACE,
} as const satisfies AbstractFormfactorDefinition;
