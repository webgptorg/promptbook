import { spaceTrim } from 'spacetrim';
import { PipelineJson } from '../../_packages/types.index';
import {
    RESERVED_PARAMETER_MISSING_VALUE,
    RESERVED_PARAMETER_NAMES,
    RESERVED_PARAMETER_RESTRICTED,
} from '../../config';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { TemplateJson } from '../../types/PipelineJson/TemplateJson';
import { ReservedParameters } from '../../types/typeAliases';
import { getContextForTemplate } from './getContextForTemplate';
import { getKnowledgeForTemplate } from './getKnowledgeForTemplate';
import { getSamplesForTemplate } from './getSamplesForTemplate';

export async function getReservedParametersForTemplate(
    preparedPipeline: PipelineJson,
    template: TemplateJson,
    pipelineIdentification: string,
): Promise<ReservedParameters> {
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
