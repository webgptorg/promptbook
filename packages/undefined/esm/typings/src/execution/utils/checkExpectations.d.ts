import type { Expectations } from '../../types/PipelineJson/Expectations';
/**
 * Function checkExpectations will check if the expectations on given value are met
 *
 * Note: There are two simmilar functions:
 * - `checkExpectations` which throws an error if the expectations are not met
 * - `isPassingExpectations` which returns a boolean
 *
 * @throws {ExpectError} if the expectations are not met
 * @returns {void} Nothing
 * @public exported from `@promptbook/core`
 */
export declare function checkExpectations(expectations: Expectations, value: string): void;
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
export declare function isPassingExpectations(expectations: Expectations, value: string): boolean;
/**
 * TODO: [💝] Unite object for expecting amount and format
 */
