import type { PipelineJson } from "../../pipeline/PipelineJson/PipelineJson";

/**
 * @@@
 *
 * Note: It is usefull @@@
 *
 * @param pipeline
 * @public exported from `@promptbook/utils`
 */
export function clonePipeline(pipeline: PipelineJson): PipelineJson {
	// Note: Not using spread operator (...) because @@@

	const {
		pipelineUrl,
		sourceFile,
		title,
		bookVersion,
		description,
		formfactorName,
		parameters,
		tasks,
		knowledgeSources,
		knowledgePieces,
		personas,
		preparations,
		sources,
	} = pipeline;

	return {
		pipelineUrl,
		sourceFile,
		title,
		bookVersion,
		description,
		formfactorName,
		parameters,
		tasks,
		knowledgeSources,
		knowledgePieces,
		personas,
		preparations,
		sources,
	};
}

/**
 * TODO: [🍙] Make some standard order of json properties
 */
