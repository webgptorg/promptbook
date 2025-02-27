import type { AbstractFormfactorDefinition } from "../_common/AbstractFormfactorDefinition";

/**
 * Boilerplate is form of app that @@@
 *
 * @public exported from `@promptbook/core`
 */
export const BoilerplateFormfactorDefinition = {
	name: "BOILERPLATE",
	description: `@@@`,
	documentationUrl: `https://github.com/webgptorg/promptbook/discussions/@@`,
	//                                                                     <- TODO: https://github.com/webgptorg/promptbook/discussions/new?category=concepts
	//                                                                              "🔠 Boilerplate Formfactor"

	pipelineInterface: {
		inputParameters: [
			/* @@@ */
		],
		outputParameters: [
			/* @@@ */
		],
	},
} as const satisfies AbstractFormfactorDefinition;
