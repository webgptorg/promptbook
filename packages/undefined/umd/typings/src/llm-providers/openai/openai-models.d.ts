import type { AvailableModel } from '../../execution/LlmExecutionTools';
import type { number_usd } from '../../types/typeAliases';
/**
 * List of available OpenAI models with pricing
 *
 * Note: Done at 2024-05-20
 *
 * @see https://platform.openai.com/docs/models/
 * @see https://openai.com/api/pricing/
 * @public exported from `@promptbook/openai`
 */
export declare const OPENAI_MODELS: Array<AvailableModel & {
    pricing?: {
        readonly prompt: number_usd;
        readonly output: number_usd;
    };
}>;
/**
 * Note: [🤖] Add models of new variant
 * TODO: [🧠] Some mechanism to propagate unsureness
 * TODO: [🕚][👮‍♀️] Make this list dynamic - dynamically can be listed modelNames but not modelVariant, legacy status, context length and pricing
 * TODO: [🧠][👮‍♀️] Put here more info like description, isVision, trainingDateCutoff, languages, strengths (	Top-level performance, intelligence, fluency, and understanding), contextWindow,...
 * @see https://platform.openai.com/docs/models/gpt-4-turbo-and-gpt-4
 * @see https://openai.com/api/pricing/
 * @see /other/playground/playground.ts
 * TODO: [🍓] Make better
 * TODO: Change model titles to human eg: "gpt-4-turbo-2024-04-09" -> "GPT-4 Turbo (2024-04-09)"
 * TODO: [🚸] Not all models are compatible with JSON mode, add this information here and use it
 */
