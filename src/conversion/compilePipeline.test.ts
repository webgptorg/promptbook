import { readdirSync } from "fs";
import { join } from "path";
import { describe, it } from "@jest/globals";
import { compilePipeline } from "./compilePipeline";
import { importPipelineWithoutPreparation } from "./validation/_importPipeline";

describe("compilePipeline", () => {
	const examplesDir = "../../examples/pipelines"; // <- TODO: [🚏] DRY, to config

	const examples = readdirSync(join(__dirname, examplesDir), {
		withFileTypes: true,
		recursive: false,
	})
		//                         <- Note: In production it is not good practice to use synchronous functions
		//                                  But this is only a test before the build, so it is okay
		.filter((dirent) => dirent.isFile())
		.filter(({ name }) => name.endsWith(".book"));

	for (const { name } of examples) {
		it(`should compile ${name}`, async () => {
			const pipelineFromMarkdownPromise = importPipelineWithoutPreparation(
				name as `${string}.book`,
			)
				.then((pipelineString) => compilePipeline(pipelineString))
				.then((pipeline) => ({ ...pipeline, title: undefined })); // <- Note: [0] Title is not compared because it can be changed in `preparePipeline`

			const pipelineJson = {
				...(await importPipelineWithoutPreparation(
					join(examplesDir, name).replace(
						".book",
						".bookc",
					) as `${string}.bookc`,
				)),
				title: undefined,
				// <- Note: [0]
			};

			await expect(pipelineFromMarkdownPromise).resolves.toEqual(pipelineJson);
		});
	}
});
