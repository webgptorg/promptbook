import type { AvailableModel } from '../../execution/LlmExecutionTools';
import type { number_usd } from '../../types/typeAliases';
/**
 * List of available Anthropic Claude models with pricing
 *
 * Note: Done at 2024-05-25
 *
 * @see https://docs.anthropic.com/en/docs/models-overview
 */
export declare const ANTHROPIC_CLAUDE_MODELS: Array<AvailableModel & {
    pricing?: {
        readonly prompt: number_usd;
        readonly output: number_usd;
    };
}>;
/**
 * Note: [🤖] Add models of new variant
 * TODO: [🧠] !!! Add embedding models OR Anthropic has only chat+completion models?
 * TODO: [🧠] Some mechanism to propagate unsureness
 * TODO: [🧠][👮‍♀️] Put here more info like description, isVision, trainingDateCutoff, languages, strengths (	Top-level performance, intelligence, fluency, and understanding), contextWindow,...
 * TODO: [🕚] Make this list dynamic - dynamically can be listed modelNames but not modelVariant, legacy status, context length and pricing
 */
