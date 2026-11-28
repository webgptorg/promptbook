import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { $isRunningInNode } from '../../utils/environment/$isRunningInNode';
import { spaceTrim } from '../../utils/organization/spaceTrim';
import type { CommitmentToolFunctions } from './commitmentToolFunctions';
import { collectCommitmentToolFunctions, createToolFunctionsProxy } from './commitmentToolFunctions';

/**
 * Constant for node tool functions proxy.
 */
const nodeToolFunctionsProxy = createToolFunctionsProxy(collectCommitmentToolFunctions);

/**
 * Gets all function implementations provided by all commitments
 *
 * Note: This function is intended for server use, there is also equivalent `getAllCommitmentsToolFunctionsForBrowser` for browser use
 *
 * @public exported from `@promptbook/node`
 */
export function getAllCommitmentsToolFunctionsForNode(): CommitmentToolFunctions {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError(
            spaceTrim(`
                Function getAllCommitmentsToolFunctionsForNode should be run in Node.js environment.

                - In browser use getAllCommitmentsToolFunctionsForBrowser instead.
                - This function can include server-only tools which cannot run in browser environment.

            `),
        );
    }

    return nodeToolFunctionsProxy;
}

// Note: [??] Code in this file should never be never released in packages that could be imported into browser environment
// TODO: [??] Unite `xxxForServer` and `xxxForNode` naming
