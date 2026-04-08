import type { string_reserved_parameter_name_private } from './string_reserved_parameter_name_private';
import type { string_parameter_value_private } from './string_parameter_value_private';

/**
 * Represents a mapping of reserved parameter names to their values.
 * Reserved parameters are used internally by the pipeline and should not be set by users.
 *
 * Note: [🚉] This is fully serializable as JSON
 * @private internal utility of `string_parameter_name.ts`
 */
export type ReservedParameters_private = Record<string_reserved_parameter_name_private, string_parameter_value_private>;
