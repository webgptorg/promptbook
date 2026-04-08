import type { really_unknown } from '../utils/organization/really_unknown';
import type { ReservedParameters_private } from './ReservedParameters_private';
import type { string_parameter_name } from './string_parameter_name';

/**
 * Parameters to pass to execution of the pipeline
 *
 * Note: [🚉] This should be fully serializable as JSON
 * @see https://ptbk.io/parameters
 * @private internal utility of `string_parameter_name.ts`
 */
export type InputParameters_private = Exclude<Record<string_parameter_name, really_unknown>, ReservedParameters_private>;
