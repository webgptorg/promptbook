import type { AbstractFormfactorDefinition } from "../_common/AbstractFormfactorDefinition";

/**
 * Image generator is form of app that generates image from input message
 *
 * @public exported from `@promptbook/core`
 */
export const ImageGeneratorFormfactorDefinition = {
	name: "IMAGE_GENERATOR",
	description: `Generates prompt for image generation from input message`,
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
				name: "prompt",
				description: `Prompt to be used for image generation`,
				isInput: false,
				isOutput: true,
			},
		],
	},
} as const satisfies AbstractFormfactorDefinition;
