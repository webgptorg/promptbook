import type { PipelineString } from '../../types/PipelineString';
import type { PrettifyOptions } from './PrettifyOptions';
/**
 * Prettyfies Promptbook string and adds Mermaid graph
 *
 * @public exported from `@promptbook/core`
 */
export declare function prettifyPipelineString(pipelineString: PipelineString, options: PrettifyOptions): Promise<PipelineString>;
/**
 * TODO: Maybe use some Mermaid package instead of string templating
 * TODO: [🕌] When more than 2 functionalities, split into separate functions
 */
