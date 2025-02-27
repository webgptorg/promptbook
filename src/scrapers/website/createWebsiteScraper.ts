import type { ExecutionTools } from "../../execution/ExecutionTools";
import type { PrepareAndScrapeOptions } from "../../prepare/PrepareAndScrapeOptions";
import { keepTypeImported } from "../../utils/organization/keepTypeImported";
import type { ScraperConstructor } from "../_common/register/ScraperConstructor";
import { WebsiteScraper } from "./WebsiteScraper";
import { websiteScraperMetadata } from "./register-metadata";

keepTypeImported<ScraperConstructor>();

/**
 * @@@
 *
 * @public exported from `@promptbook/website-crawler`
 */
export const createWebsiteScraper = Object.assign(
	(
		tools: Pick<ExecutionTools, "llm">,
		options: PrepareAndScrapeOptions,
	): WebsiteScraper => {
		return new WebsiteScraper(tools, options);
	},
	websiteScraperMetadata,
) satisfies ScraperConstructor; /* <- Note: [🤛] */

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
