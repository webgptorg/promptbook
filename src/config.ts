import { ModelRequirements } from './types/ModelRequirements';
import { string_version } from './types/typeAliases';

/**
 * The version of the PTP
 */
export const PTP_VERSION: string_version = '0.1.0';

/**
 * Default model requirements for the pipeline
 */
export const DEFAULT_MODEL_REQUIREMENTS: ModelRequirements = {
    variant: 'CHAT',
};
