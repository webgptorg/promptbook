import type { AvailableModel } from "../../execution/AvailableModel";
import type { number_usd } from "../../types/typeAliases";
import { exportJson } from "../../utils/serialization/exportJson";
import { computeUsage } from "../openai/computeUsage";

/**
 * List of available Anthropic Claude models with pricing
 *
 * Note: Done at 2024-08-16
 *
 * @see https://docs.anthropic.com/en/docs/models-overview
 * @public exported from `@promptbook/anthropic-claude`
 */
export const ANTHROPIC_CLAUDE_MODELS: ReadonlyArray<
	AvailableModel & {
		pricing?: {
			readonly prompt: number_usd;
			readonly output: number_usd;
		};
	}
> = exportJson({
	name: "ANTHROPIC_CLAUDE_MODELS",
	value: [
		{
			modelVariant: "CHAT",
			modelTitle: "Claude 3.5 Sonnet",
			modelName: "claude-3-5-sonnet-20240620",
			pricing: {
				prompt: computeUsage(`$3.00 / 1M tokens`),
				output: computeUsage(`$15.00 / 1M tokens`),
			},
		},
		{
			modelVariant: "CHAT",
			modelTitle: "Claude 3 Opus",
			modelName: "claude-3-opus-20240229",
			pricing: {
				prompt: computeUsage(`$15.00 / 1M tokens`),
				output: computeUsage(`$75.00 / 1M tokens`),
			},
		},
		{
			modelVariant: "CHAT",
			modelTitle: "Claude 3 Sonnet",
			modelName: "claude-3-sonnet-20240229",
			pricing: {
				prompt: computeUsage(`$3.00 / 1M tokens`),
				output: computeUsage(`$15.00 / 1M tokens`),
			},
		},
		{
			modelVariant: "CHAT",
			modelTitle: "Claude 3 Haiku",
			modelName: "	claude-3-haiku-20240307",
			pricing: {
				prompt: computeUsage(`$0.25 / 1M tokens`),
				output: computeUsage(`$1.25 / 1M tokens`),
			},
		},
		{
			modelVariant: "CHAT",
			modelTitle: "Claude 2.1",
			modelName: "claude-2.1",
			pricing: {
				prompt: computeUsage(`$8.00 / 1M tokens`),
				output: computeUsage(`$24.00 / 1M tokens`),
			},
		},
		{
			modelVariant: "CHAT",
			modelTitle: "Claude 2",
			modelName: "claude-2.0",
			pricing: {
				prompt: computeUsage(`$8.00 / 1M tokens`),
				output: computeUsage(`$24.00 / 1M tokens`),
			},
		},
		{
			modelVariant: "CHAT",
			modelTitle: "	Claude Instant 1.2",
			modelName: "claude-instant-1.2",
			pricing: {
				prompt: computeUsage(`$0.80 / 1M tokens`),
				output: computeUsage(`$2.40 / 1M tokens`),
			},
		},

		// TODO: [main] !!3 Claude 1 and 2 has also completion versions - ask Hoagy
	],
});

/**
 * Note: [🤖] Add models of new variant
 * TODO: [🧠][main] !!3 Add embedding models OR Anthropic has only chat+completion models?
 * TODO: [🧠] Some mechanism to propagate unsureness
 * TODO: [🧠][👮‍♀️] Put here more info like description, isVision, trainingDateCutoff, languages, strengths (	Top-level performance, intelligence, fluency, and understanding), contextWindow,...
 * TODO: [🎰] Some mechanism to auto-update available models
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
