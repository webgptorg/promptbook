import spaceTrim from 'spacetrim';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { UnexpectedError } from '../../errors/UnexpectedError';
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
    const { template, jokerParameterNames /*, priority*/ } = options;

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

    // TODO: !!!!!!
    //priority + length;

    throw new NotYetImplementedError('FOREACH execution not implemented yet');
}

/**
 * TODO: !!!!!! Make pipelineIdentification more precise
 * TODO: !!!!!! How FOREACH execution looks in the report
 */
