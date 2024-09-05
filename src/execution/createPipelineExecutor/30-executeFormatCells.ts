import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { executeAttempts, ExecuteAttemptsOptions } from './40-executeAttempts';

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
    const { template } = options;

    if (template.foreach === undefined) {
        return /* not await */ executeAttempts(options);
    }

    throw new NotYetImplementedError('FOREACH execution not implemented yet');
}
