import { TupleToUnion } from 'type-fest';
import { string_version } from '../../../../../utils/typeAliases';
import { ModelRequirements } from './types/ModelRequirements';

/**
 * The version of the PTP
 */
export const PTP_VERSION: string_version = `0.1.0`;

/**
 * Default model requirements for the pipeline
 */
export const DEFAULT_MODEL_REQUIREMENTS: ModelRequirements = {
    variant: 'CHAT',
};
