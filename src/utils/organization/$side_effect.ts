import type { really_any } from './really_any';

/**
 * Organizational helper to mark a function that produces side effects
 *
 * @private within the repository
 */
export type $side_effect = void | really_any;
