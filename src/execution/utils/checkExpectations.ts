import { ExpectError } from '../../errors/ExpectError';
import type { Expectations } from '../../types/PipelineJson/Expectations';
import type { ExpectationUnit } from '../../types/PipelineJson/Expectations';
import { CountUtils } from '../../utils/expectation-counters/index';

/**
 * Function checkExpectations will check if the expectations on given value are met
 *
 * Note: There are two simmilar functions:
 * - `checkExpectations` which throws an error if the expectations are not met
 * - `isPassingExpectations` which returns a boolean
 *
 * @throws {ExpectError} if the expectations are not met
 * @returns {void} Nothing
 * @private internal function of `createPipelineExecutor`
 */
export function checkExpectations(expectations: Expectations, value: string): void {
    for (const [unit, { max, min }] of Object.entries(expectations)) {
        const amount = CountUtils[unit.toUpperCase() as ExpectationUnit](value);

        if (min && amount < min) {
            throw new ExpectError(`Expected at least ${min} ${unit} but got ${amount}`);
        } /* not else */

        if (max && amount > max) {
            throw new ExpectError(`Expected at most ${max} ${unit} but got ${amount}`);
        }
    }
}

/**
 * Function checkExpectations will check if the expectations on given value are met
 *
 * Note: There are two simmilar functions:
 * - `checkExpectations` which throws an error if the expectations are not met
 * - `isPassingExpectations` which returns a boolean
 *
 * @returns {boolean} True if the expectations are met
 * @public exported from `@promptbook/core`
 */
export function isPassingExpectations(expectations: Expectations, value: string): boolean {
    try {
        checkExpectations(expectations, value);
        return true;
    } catch (error) {
        if (!(error instanceof ExpectError)) {
            throw error;
        }
        return false;
    }
}

/**
 * TODO: [💝] Unite object for expecting amount and format
 * TODO: [🧠][🤠] This should be part of `TextFormatDefinition`
 * Note: [💝] and [🤠] are interconnected together
 */
