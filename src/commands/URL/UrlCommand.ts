/**
 * Parsed URL command
 *
 * @see ./urlCommandParser.ts for more details
 * @private within the commands folder
 */
export type UrlCommand = {
    readonly type: 'URL';
    readonly pipelineUrl: URL;
};
