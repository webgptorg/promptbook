import { spaceTrim } from 'spacetrim';
import type { ReadonlyDeep } from 'type-fest';
import {
    RESERVED_PARAMETER_MISSING_VALUE,
    RESERVED_PARAMETER_NAMES,
    RESERVED_PARAMETER_RESTRICTED,
} from '../../config';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { ReservedParameters } from '../../types/typeAliases';
import { getContextForTemplate } from './getContextForTemplate';
import { getExamplesForTask } from './getExamplesForTask';
import { getKnowledgeForTemplate } from './getKnowledgeForTemplate';

/**
 * @@@
 *
 * @private internal type of `getReservedParametersForTemplate`
 */
type GetReservedParametersForTemplateOptions = {
    /**
     * @@@
     */
    readonly preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * @@@
     */
    readonly template: ReadonlyDeep<TaskJson>;

    /**
     * @@@
     */
    readonly pipelineIdentification: string;
};

/**
 * @@@
 *
 * @private internal utility of `createPipelineExecutor`
 */
export async function getReservedParametersForTemplate(
    options: GetReservedParametersForTemplateOptions,
): Promise<Readonly<ReservedParameters>> {
    const { preparedPipeline, template, pipelineIdentification } = options;

    const context = await getContextForTemplate(template); // <- [🏍]
    const knowledge = await getKnowledgeForTemplate({ preparedPipeline, template });
    const examples = await getExamplesForTask(template);
    const currentDate = new Date().toISOString(); // <- TODO: [🧠] Better
    const modelName = RESERVED_PARAMETER_MISSING_VALUE;

    const reservedParameters: ReservedParameters = {
        content: RESERVED_PARAMETER_RESTRICTED,
        context, // <- [🏍]
        knowledge,
        examples,
        currentDate,
        modelName,
    };

    // Note: Doublecheck that ALL reserved parameters are defined:
    for (const parameterName of RESERVED_PARAMETER_NAMES) {
        if (reservedParameters[parameterName] === undefined) {
            throw new UnexpectedError(
                spaceTrim(
                    (block) => `
                        Reserved parameter {${parameterName}} is not defined

                        ${block(pipelineIdentification)}
                    `,
                ),
            );
        }
    }

    return reservedParameters;
}
