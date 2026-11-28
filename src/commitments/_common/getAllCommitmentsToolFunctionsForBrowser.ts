import type { CommitmentToolFunctions } from './commitmentToolFunctions';
import { collectCommitmentToolFunctions, createToolFunctionsProxy } from './commitmentToolFunctions';

/**
 * Constant for commitment tool functions proxy.
 */
const commitmentToolFunctionsProxy = createToolFunctionsProxy(collectCommitmentToolFunctions);

/**
 * Gets all function implementations provided by all commitments
 *
 * Note: This function is intended for browser use, there is also equivalent `getAllCommitmentsToolFunctionsForNode` for server use
 *
 * @public exported from `@promptbook/browser`
 */
export function getAllCommitmentsToolFunctionsForBrowser(): CommitmentToolFunctions {
    return commitmentToolFunctionsProxy;
}
