import type { ReadonlyDeep } from 'type-fest';
import type { PipelineJson, TemplateJson, TODO_any } from '../../_packages/types.index';

/**
 * @@@
 *
 * @private internal type of `Xxxxx`
 */
type XxxxOptions = {
    /**
     * @@@
     */
    preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * @@@
     */
    template: ReadonlyDeep<TemplateJson>;

    /**
     * @@@
     */
    pipelineIdentification: string;
};

/**
 * @@@
 *
 * @private internal utility of `createPipelineExecutor`
 */
export function Xxxxx(options: XxxxOptions): TODO_any {
    const { preparedPipeline, template, pipelineIdentification } = options;
}
