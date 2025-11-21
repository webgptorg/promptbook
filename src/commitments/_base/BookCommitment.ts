import { COMMITMENT_REGISTRY } from '../index';

/**
 * All available book commitment types
 */
export type BookCommitment = typeof COMMITMENT_REGISTRY[number]['type'];
