import { DEFAULT_IS_VERBOSE } from "../../config";
import type { string_url } from "../../types/typeAliases";
import type { PipelineCollection } from "../PipelineCollection";
import { createCollectionFromPromise } from "./createCollectionFromPromise";

/**
 * Options for `createCollectionFromDirectory` function
 */
type CreatePipelineCollectionFromUrlyOptions = {
	/**
	 * If true, the collection creation outputs information about each file it reads
	 *
	 * @default false
	 */
	readonly isVerbose?: boolean;

	/**
	 * If true, directory will be scanned only when needed not during the construction
	 *
	 * @default false
	 */
	readonly isLazyLoaded?: boolean;
};

/**
 * Constructs Promptbook from remote Promptbase URL
 * @returns PipelineCollection
 * @public exported from `@promptbook/core`
 */
export async function createCollectionFromUrl(
	url: string_url | URL,
	options: CreatePipelineCollectionFromUrlyOptions,
): Promise<PipelineCollection> {
	const { isVerbose = DEFAULT_IS_VERBOSE, isLazyLoaded = false } =
		options || {};

	const collection = createCollectionFromPromise(async () => {
		if (isVerbose) {
			console.info(`Creating pipeline collection from url ${url.toString()}`);
		}

		throw new Error("Not implemented yet");
	});

	if (isLazyLoaded === false) {
		await collection.listPipelines();
	}

	return collection;

	// TODO: [main] !!3 [🏳‍🌈] Allow variant with .json .js and .ts files
	// TODO: [🧠][🏳‍🌈] .js and .ts files should create getter function of the collection
	// TODO: Look at WebGPT "📖 Make Promptbook collection" and https://webgpt.cz/_books.json
	// TODO: Implement via createCollectionFromPromise
}

/**
 * TODO: [main] !!4 [🧠] Library precompilation and do not mix markdown and json promptbooks
 */
