/**
 * Represents the structure of a markdown file.
 */
export type MarkdownStructure = {
    /**
     * The section level of the markdown file.
     * h1 is level 1, h2 is level 2, etc.
     */
    level: number;

    /**
     * The title of the markdown file.
     */
    title: string;

    /**
     * Content of the section.
     * It contains text, images, formatting, ul, ol, hr, blockquotes, etc. BUT not headings and sub-sections
     */
    content: string;

    /**
     * The sub-sections of current section which are recursively structured.
     */
    sections: MarkdownStructure[];
};
