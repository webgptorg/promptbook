import type { AbstractFormfactorDefinition } from "../_common/AbstractFormfactorDefinition";

/**
 * Generator is form of app that @@@
 *
 * @public exported from `@promptbook/core`
 */
export const GeneratorFormfactorDefinition = {
	name: "GENERATOR",
	description: `Generates any kind (in HTML with possible scripts and css format) of content from input message`,
	documentationUrl: `https://github.com/webgptorg/promptbook/discussions/184`,
	pipelineInterface: {
		inputParameters: [
			{
				name: "inputMessage",
				description: `Input message to be image made from`,
				isInput: true,
				isOutput: false,
			},
		],
		outputParameters: [
			{
				name: "result",
				description: `Result in HTML to be shown to user`,
				isInput: false,
				isOutput: true,
			},
		],
	},
} as const satisfies AbstractFormfactorDefinition;
