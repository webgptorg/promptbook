import spaceTrim from 'spacetrim';
import type { Promisable } from 'type-fest';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { TODO_any } from '../../utils/organization/TODO_any';
import type { TODO_string } from '../../utils/organization/TODO_string';
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
    const { template, jokerParameterNames, parameters, priority } = options;

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

    const resultString = await textLinesFormat.forEachCell(parameterValue, async (subparameterValue, index) => {
        const subparameters = {
            ...parameters,
            [template.foreach!.subparameterName]:
                // <- Note: [👩‍👩‍👧] Maybe detect parameter collision here?
                // <- TODO: [🦥]
                subparameterValue,
        };

        // Note: [👨‍👨‍👧] Now we can freeze `subparameters` because we are sure that all and only used parameters are defined and are not going to be changed
        Object.freeze(subparameters);

        const subresultString = await executeAttempts({
            ...options,
            priority: priority + index,
            parameters: subparameters,
        });

        return subresultString;
    });

    return resultString;
}

const textLinesFormat = {
    async forEachCell(
        value: TODO_string,
        mapCallback: (cellValue: string, index: number) => Promisable<TODO_string>,
    ): Promise<string> {
        const lines = value.split('\n');

        const mappedLines = await Promise.all(lines.map((line, index) => /* not await */ mapCallback(line, index)));

        return mappedLines.join('\n');
    },
};

/**
 * TODO: !!!!!! Make pipelineIdentification more precise
 * TODO: !!!!!! How FOREACH execution looks in the report
 * TODO: [🧠][🦥] Better (less confusing) name for "cell" / "subvalue" / "subparameter"
 */
