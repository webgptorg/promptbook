import type { WritableDeep } from 'type-fest';
import { deepClone } from '../../utils/serialization/deepClone';
import type { TODO_remove_as } from '../../utils/organization/TODO_remove_as';
import { $deepFreeze } from '../../utils/serialization/$deepFreeze';
import type { PipelineJson } from '../PipelineJson/PipelineJson';
import type { PipelineInterface } from './PipelineInterface';

/**
 * @@@
 *
 * @see https://github.com/webgptorg/promptbook/discussions/171
 *
 * @public exported from `@promptbook/core`
 */
export function getPipelineInterface(pipeline: PipelineJson): PipelineInterface {
    const pipelineInterface: WritableDeep<PipelineInterface> = {
        inputParameters: [],
        outputParameters: [],
    };

    for (const parameter of pipeline.parameters) {
        const { isInput, isOutput } = parameter;

        if (isInput) {
            pipelineInterface.inputParameters.push(
                deepClone(parameter),
                // <- Note: Clone to prevent mutation when `$deepFreeze` is called at the end
            );
        }

        if (isOutput) {
            pipelineInterface.outputParameters.push(
                deepClone(parameter),
                // <- Note: Clone to prevent mutation when `$deepFreeze` is called at the end
            );
        }
    }

    for (const key of ['inputParameters', 'outputParameters'] as Array<keyof PipelineInterface>) {
        pipelineInterface[key].sort(({ name: name1 }, { name: name2 }) => name1.localeCompare(name2));
        // <- TODO: [🧠] Should we compare a descriptions?
        // <- TODO: [🧠][🛴] Maybe add type + expectations into the intefrace, like "a person name"
    }

    return $deepFreeze(pipelineInterface) as TODO_remove_as<PipelineInterface>;
}

/**
 * TODO: !!!!!!! Write unit test
 */
