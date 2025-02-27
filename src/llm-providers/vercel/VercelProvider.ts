import type { createGoogleGenerativeAI } from "@ai-sdk/google"; // <- TODO: This shoud be installed just as dev dependency in the `@promptbook/vercel` package, because it is only used as a type
import type { createOpenAI } from "@ai-sdk/openai"; // <- TODO: This shoud be installed just as dev dependency in the `@promptbook/vercel` package, because it is only used as a type

/**
 * This is common interface for all v1 Vercel providers
 *
 * @public exported from `@promptbook/vercel`
 */
export type VercelProvider =
	| ReturnType<typeof createOpenAI>
	| ReturnType<typeof createGoogleGenerativeAI>;

/**
 * ^^^^
 * TODO: Is there some way to get the type of the provider directly,
 *       NOT this stupid way via inferring the return type from a specific vercel provider⁉
 */
