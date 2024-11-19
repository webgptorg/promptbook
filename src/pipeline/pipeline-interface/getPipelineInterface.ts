import { PipelineJson } from '@promptbook/types';
import { PipelineInterface } from './PipelineInterface';

/**
 * @@@
 *
 * @param pipeline @@@
 */
export function getPipelineInterface(
    pipeline: PipelineJson,
    // <- TODO: ...pipelines: Array<PipelineJson>
): PipelineInterface {
    const pipelineInterface: PipelineInterface = {
        inputParameterNames: [],
        outputParameterNames: [],
    };

    for (const parameter of pipeline.parameters) {
        const { name, isInput, isOutput } = parameter;

        if (isInput) {
            pipelineInterface.inputParameterNames.push(name);
        }

        if (isOutput) {
            pipelineInterface.outputParameterNames.push(name);
        }
    }

    for (const key of ['inputParameterNames', 'outputParameterNames'] as Array<keyof PipelineInterface>) {
        pipelineInterface[key].sort((a, b) => a.localeCompare(b));
    }

    return Object.freeze(pipelineInterface);
}

/**
 * TODO: [🔼] !!! Transfer to promptbook
 * TODO: !!! Write unit test
 */
