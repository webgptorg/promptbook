/**
 * Semantic helper;
 * Percentage from 0 to 1 (100%) (and below and above)
 */
export type number_percent = number;

/**
 * Semantic helper;
 * Model temperature
 */
export type number_model_temperature = number_percent;

/**
 * Semantic helper;
 * Seed for random generator
 *
 * Percentage from 0 to 1 (100%)
 * TODO: Is seed (in OpenAI) number from 0 to 1?
 */
export type number_seed = number_percent;
