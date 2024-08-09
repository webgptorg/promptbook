/**
 * Options for `prettifyPipelineString` function
 */
export type PrettifyOptions = {
    /***
     * If true, adds Mermaid graph to the Promptbook string
     */
    readonly isGraphAdded?: boolean;
    /**
     * If true, the string is prettifyed as markdown
     */
    readonly isPrettifyed?: boolean;
};
