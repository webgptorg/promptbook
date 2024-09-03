import { spaceTrim } from 'spacetrim';
import type { ReadonlyDeep } from 'type-fest';
import {
    RESERVED_PARAMETER_MISSING_VALUE,
    RESERVED_PARAMETER_NAMES,
    RESERVED_PARAMETER_RESTRICTED,
} from '../../config';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { TemplateJson } from '../../types/PipelineJson/TemplateJson';
import type { ReservedParameters } from '../../types/typeAliases';
import { getContextForTemplate } from './getContextForTemplate';
import { getKnowledgeForTemplate } from './getKnowledgeForTemplate';
import { getSamplesForTemplate } from './getSamplesForTemplate';

/**
 * @@@
 *
 * @private @@@
 */
export async function getReservedParametersForTemplate(
    preparedPipeline: ReadonlyDeep<PipelineJson>,
    template: ReadonlyDeep<TemplateJson>,
    pipelineIdentification: string,
): Promise<Readonly<ReservedParameters>> {
    const context = await getContextForTemplate(template); // <- [🏍]
    const knowledge = await getKnowledgeForTemplate(preparedPipeline, template);
    const samples = await getSamplesForTemplate(template);
    const currentDate = new Date().toISOString(); // <- TODO: [🧠] Better
    const modelName = RESERVED_PARAMETER_MISSING_VALUE;

    const reservedParameters: ReservedParameters = {
        content: RESERVED_PARAMETER_RESTRICTED,
        context, // <- [🏍]
        knowledge,
        samples,
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
