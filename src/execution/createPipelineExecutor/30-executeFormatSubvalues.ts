import spaceTrim from 'spacetrim';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { FORMAT_DEFINITIONS } from '../../formats/index';
import type { string_parameter_name, string_parameter_value } from '../../types/typeAliases';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { mapAvailableToExpectedParameters } from '../../utils/parameters/mapAvailableToExpectedParameters';
import type { ExecuteAttemptsOptions } from './40-executeAttempts';
import { executeAttempts } from './40-executeAttempts';

/**
 * @@@
 *
 * @private internal type of `executeFormatSubvalues`
 */
type ExecuteFormatCellsOptions = ExecuteAttemptsOptions;

/**
 * @@@
 *
 * @private internal utility of `createPipelineExecutor`
 */
export async function executeFormatSubvalues(options: ExecuteFormatCellsOptions): Promise<TODO_any> {
    const { template, jokerParameterNames, parameters, priority, csvSettings, pipelineIdentification } = options;

    if (template.foreach === undefined) {
        return /* not await */ executeAttempts(options);
    }

    if (jokerParameterNames.length !== 0) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    JOKER parameters are not supported together with FOREACH command

                    [🧞‍♀️] This should be prevented in \`validatePipeline\`

                    ${block(pipelineIdentification)}
                `,
            ),
        );
    }

    const parameterValue = parameters[template.foreach.parameterName] || '';

    const formatDefinition = FORMAT_DEFINITIONS.find(
        (formatDefinition) =>
            [formatDefinition.formatName, ...(formatDefinition.aliases || [])].includes(template.foreach!.formatName),
        // <- Note: All names here are already normalized
    );

    if (formatDefinition === undefined) {
        throw new UnexpectedError(
            // <- TODO: [🧠][🧐] Should be formats fixed per promptbook version or behave as plugins (=> change UnexpectedError)
            spaceTrim(
                (block) => `
                    Unsupported format "${template.foreach!.formatName}"

                    Available formats:
                    ${block(
                        FORMAT_DEFINITIONS.map((formatDefinition) => formatDefinition.formatName)
                            .map((formatName) => `- ${formatName}`)
                            .join('\n'),
                    )}

                    [⛷] This should never happen because format name should be validated during parsing

                    ${block(pipelineIdentification)}
                `,
            ),
        );
    }

    const subvalueDefinition = formatDefinition.subvalueDefinitions.find(
        (subvalueDefinition) =>
            [subvalueDefinition.subvalueName, ...(subvalueDefinition.aliases || [])].includes(
                template.foreach!.subformatName,
            ),
        // <- Note: All names here are already normalized
    );

    if (subvalueDefinition === undefined) {
        throw new UnexpectedError(
            // <- TODO: [🧠][🧐] Should be formats fixed per promptbook version or behave as plugins (=> change UnexpectedError)
            spaceTrim(
                (block) => `
                    Unsupported subformat name "${template.foreach!.subformatName}" for format "${
                    template.foreach!.formatName
                }"

                    Available subformat names for format "${formatDefinition.formatName}":
                    ${block(
                        formatDefinition.subvalueDefinitions
                            .map((subvalueDefinition) => subvalueDefinition.subvalueName)
                            .map((subvalueName) => `- ${subvalueName}`)
                            .join('\n'),
                    )}

                    [⛷] This should never happen because subformat name should be validated during parsing

                    ${block(pipelineIdentification)}
                `,
            ),
        );
    }

    let formatSettings: TODO_any;

    if (formatDefinition.formatName === 'CSV') {
        formatSettings = csvSettings;
        // <- TODO: [🤹‍♂️] More universal, make simmilar pattern for other formats for example \n vs \r\n in text
    }

    const resultString = await subvalueDefinition.mapValues(
        parameterValue,
        template.foreach.outputSubparameterName,
        formatSettings,
        async (subparameters, index) => {
            let mappedParameters: Record<string_parameter_name, string_parameter_value>;

            // TODO: [🤹‍♂️][🪂] Limit to N concurrent executions
            // TODO: When done [🐚] Report progress also for each subvalue here

            try {
                mappedParameters = mapAvailableToExpectedParameters({
                    expectedParameters: Object.fromEntries(
                        template.foreach!.inputSubparameterNames.map((subparameterName) => [subparameterName, null]),
                    ),
                    availableParameters: subparameters,
                });
            } catch (error) {
                if (!(error instanceof PipelineExecutionError)) {
                    throw error;
                }

                throw new PipelineExecutionError(
                    spaceTrim(
                        (block) => `
                        ${(error as PipelineExecutionError).message}

                        This is error in FOREACH command
                        You have probbably passed wrong data to pipeline or wrong data was generated which are processed by FOREACH command

                        ${block(pipelineIdentification)}
                        Subparameter index: ${index}
                    `,
                    ),
                );
            }

            const allSubparameters = {
                ...parameters,
                ...mappedParameters,
            };

            // Note: [👨‍👨‍👧] Now we can freeze `subparameters` because we are sure that all and only used parameters are defined and are not going to be changed
            Object.freeze(allSubparameters);

            const subresultString = await executeAttempts({
                ...options,
                priority: priority + index,
                parameters: allSubparameters,
                pipelineIdentification: spaceTrim(
                    (block) => `
                        ${block(pipelineIdentification)}
                        Subparameter index: ${index}
                    `,
                ),
            });

            return subresultString;
        },
    );

    return resultString;
}
