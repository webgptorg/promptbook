import type { TupleToUnion } from 'type-fest';
import { RESERVED_PARAMETER_NAMES } from '../constants';

/**
 * Semantic helper
 * Unique identifier of reserved parameter
 *
 * For example `"context"`
 *
 * @private internal utility of `string_name.ts`
 */
export type string_reserved_parameter_name_private = TupleToUnion<typeof RESERVED_PARAMETER_NAMES>;
