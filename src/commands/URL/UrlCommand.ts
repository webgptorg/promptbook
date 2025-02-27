/**
 * Parsed URL command
 *
 * @see ./urlCommandParser.ts for more details
 * @public exported from `@promptbook/editable`
 */
export type UrlCommand = {
	readonly type: "URL";
	readonly pipelineUrl: URL;
};
