/**
 * Options for `prettifyPipelineString` function
 */
export type PrettifyOptions = {
    /***
     * If true, adds Mermaid graph to the Promptbook string
     */
    isGraphAdded?: boolean;

    /**
     * If true, the string is prettifyed as markdown
     */
    isPrettifyed?: boolean;
};
