import spaceTrim from 'spacetrim';
import { union } from '../../_packages/utils.index';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { FORMAT_DEFINITIONS } from '../../formats';
import type { TODO_any } from '../../utils/organization/TODO_any';
import type { ExecuteAttemptsOptions } from './40-executeAttempts';
import { executeAttempts } from './40-executeAttempts';

/**
 * @@@
 *
 * @private internal type of `executeFormatCells`
 */
type ExecuteFormatCellsOptions = ExecuteAttemptsOptions;

/**
 * @@@
 *
 * @private internal utility of `createPipelineExecutor`
 */
export async function executeFormatCells(options: ExecuteFormatCellsOptions): Promise<TODO_any> {
    const { template, jokerParameterNames, parameters, priority, pipelineIdentification } = options;

    if (template.foreach === undefined) {
        return /* not await */ executeAttempts(options);
    }

    if (jokerParameterNames.length !== 0) {
        throw new UnexpectedError(
            spaceTrim(`
                JOKER parameters are not supported together with FOREACH command

                [🧞‍♀️] This should be prevented in \`validatePipeline\`
            `),
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
                `,
            ),
        );
    }

    const subvalueDefinition = formatDefinition.subvalueDefinitions.find(
        (subvalueDefinition) =>
            [subvalueDefinition.subvalueName, ...(subvalueDefinition.aliases || [])].includes(
                template.foreach!.cellName,
            ),
        // <- Note: All names here are already normalized
    );

    if (subvalueDefinition === undefined) {
        throw new UnexpectedError(
            // <- TODO: [🧠][🧐] Should be formats fixed per promptbook version or behave as plugins (=> change UnexpectedError)
            spaceTrim(
                (block) => `
                    Unsupported cell name "${template.foreach!.cellName}" for format "${template.foreach!.formatName}"

                    Available cell names for format "${formatDefinition.formatName}":
                    ${block(
                        formatDefinition.subvalueDefinitions
                            .map((subvalueDefinition) => subvalueDefinition.subvalueName)
                            .map((subvalueName) => `- ${subvalueName}`)
                            .join('\n'),
                    )}

                    [⛷] This should never happen because cell name should be validated during parsing
                `,
            ),
            // <- TODO: [🦥]
        );
    }

    const resultString = await subvalueDefinition.mapValues(parameterValue, async (subparameters, index) => {
        const definedSubparametersNames = new Set(Object.keys(subparameters));
        const expectedSubparameterNames = new Set(template.foreach!.subparameterNames);

        const allSubparameters = {
            ...parameters,
        };

        // TODO: !!!!!! Special situation 1:1 with arbitrary parameter names

        // TODO: [👩🏾‍🤝‍👩🏻] Some more elegant way how to compare expected and defined parameters
        for (const subparameterName of Array.from(union(definedSubparametersNames, expectedSubparameterNames))) {
            // Situation: Parameter is defined and expected
            if (definedSubparametersNames.has(subparameterName) && expectedSubparameterNames.has(subparameterName)) {
                allSubparameters[subparameterName] = subparameters[subparameterName]!;
                // <- Note: [👩‍👩‍👧] Maybe detect parameter collision here?
                // <- TODO: [🦥]
            }

            // Situation: Parameter is defined but NOT expected
            else if (
                definedSubparametersNames.has(subparameterName) &&
                !expectedSubparameterNames.has(subparameterName)
            ) {
                // Do not pass this parameter to prompt
            }

            // Situation: Parameter is NOT defined BUT expected
            else if (
                !definedSubparametersNames.has(subparameterName) &&
                expectedSubparameterNames.has(subparameterName)
            ) {
                throw new PipelineExecutionError(
                    spaceTrim(
                        (block) => `
                            Parameter {${subparameterName}} is NOT defined
                            BUT used in template "${template.title || template.name}" for FOREACH command

                            - You have probbably passed wrong data to pipeline

                            ${block(
                                pipelineIdentification /* <- TODO: Should it be used here, if not remove, if yes put in all other places in this folder */,
                            )}

                        `,
                    ),
                );
            }
        }

        // Note: [👨‍👨‍👧] Now we can freeze `subparameters` because we are sure that all and only used parameters are defined and are not going to be changed
        Object.freeze(allSubparameters);

        const subresultString = await executeAttempts({
            ...options,
            priority: priority + index,
            parameters: allSubparameters,
        });

        return subresultString;
    });

    return resultString;
}

/**
 * TODO: !!!!!! Make pipelineIdentification more precise
 * TODO: !!!!!! How FOREACH execution looks in the report
 * TODO: [🧠][🦥] Better (less confusing) name for "cell" / "subvalue" / "subparameter"
 * TODO: []
 */
