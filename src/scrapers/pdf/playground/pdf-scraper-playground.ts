#!/usr/bin/env ts-node

import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

import { join } from "path";
import colors from "colors"; // <- TODO: [🔶] Make system to put color and style to both node and browser
import { writeFile } from "fs/promises";
import { usageToHuman } from "../../../execution/utils/usageToHuman";
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from "../../../llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground";
import { stringifyPipelineJson } from "../../../utils/editable/utils/stringifyPipelineJson";
import { $provideFilesystemForNode } from "../../_common/register/$provideFilesystemForNode";
import { makeKnowledgeSourceHandler } from "../../_common/utils/makeKnowledgeSourceHandler";
import { PdfScraper } from "../PdfScraper";

playground()
	.catch((error) => {
		console.error(colors.bgRed(error.name || "NamelessError"));
		console.error(error);
		process.exit(1);
	})
	.then(() => {
		process.exit(0);
	});

async function playground() {
	console.info(`🧸  Scrape knowledge from PDFs (playground)`);

	// Do here stuff you want to test
	//========================================>

	//const example = '10-simple.doc';
	const example = "10-simple.pdf";
	//               <- TODO: [👩🏿‍🤝‍👩🏼] Read here the examples directory and itterate through all of them

	const llmTools = await $provideLlmToolsForTestingAndScriptsAndPlayground({
		isCacheReloaded: true,
	});
	const rootDirname = join(__dirname, "..", "examples");

	const pdfScraper = new PdfScraper(
		{ llm: await $provideLlmToolsForTestingAndScriptsAndPlayground() },
		{
			rootDirname,
		},
	);

	const knowledge = await pdfScraper.scrape(
		await makeKnowledgeSourceHandler(
			{ knowledgeSourceContent: example },
			{ fs: $provideFilesystemForNode() },
			{ rootDirname },
		),
	);

	console.info(colors.cyan(usageToHuman(llmTools.getTotalUsage())));
	console.info(colors.bgGreen(" Knowledge: "));
	console.info(knowledge);

	await writeFile(
		join(
			__dirname,
			`../examples/${example}.knowledge.json` /* <- TODO: [👩🏿‍🤝‍👩🏼] Read here the examples directory and itterate through all of them */,
		),
		stringifyPipelineJson(knowledge),
		"utf-8",
	);
	/**/

	//========================================/
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
