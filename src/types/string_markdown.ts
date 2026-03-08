/**
 * Semantic helper
 *
 * For example `"<div>Hello World!</div>"`
 */
export type string_html = string;

/**
 * Semantic helper
 *
 * For example `"<foo>bar</foo>"`
 *
 *
 * TODO: [🎞️] Probably use some object-based method for working with XMLs
 */
export type string_xml = string;

/**
 * Semantic helper
 *
 * For example `"**Hello** World!"`
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export type string_markdown = string;

/**
 * Semantic helper
 *
 * Markdown text with exactly ONE heading on first line NO less NO more
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export type string_markdown_section = string;

/**
 * Semantic helper
 *
 * Markdown without any headings like h1, h2
 * BUT with formatting, lists, blockquotes, blocks, etc. is allowed
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export type string_markdown_section_content = string;

/**
 * Semantic helper
 *
 * Markdown text without any structure like h1, h2, lists, blockquotes, blocks, etc.
 * BUT with bold, italic, etc. is allowed
 *
 * For example `"**Hello** World!"`
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export type string_markdown_text = string;

/**
 * Semantic helper
 *
 * Markdown code block language
 *
 * For example ```js -> `"js"`
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export type string_markdown_codeblock_language = 'book' | 'markdown' | 'text' | 'javascript' | 'css' | 'json';
//          <- TODO: [🏥] DRY

/**
 * A URL pointing to Promptbook documentation or a specific discussion.
 *
 * For example: `https://github.com/webgptorg/promptbook/discussions/123`
 */
export type string_promptbook_documentation_url = `https://github.com/webgptorg/promptbook/discussions/${
    | number
    | `@@${string}`}`;

/**
 * Semantic helper
 *
 * For example `.foo{border: 1px solid red}`
 */
export type string_css = string;

/**
 * Semantic helper
 *
 * For example `"<svg><circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" /></svg>"`
 */
export type string_svg = string;

/**
 * Semantic helper
 *
 * For example `console.info("Hello World!")` or `print("Hello World!")`
 */
export type string_script = string;

/**
 * Semantic helper
 *
 * For example `console.info("Hello World!")`
 */
export type string_javascript = string;

/**
 * Semantic helper
 *
 * For example `console.info("Hello World!" as string)`
 */
export type string_typescript = string;

/**
 * Semantic helper for JSON strings
 *
 * Note: TType is a type of the JSON object inside the string
 *
 * For example `{"foo": "bar"}`
 */
export type string_json<TType> = string & { _type: 'string_json'; scheme: TType };

/**
 * Semantic helper
 *
 * For example `menu`
 */
export type string_css_class = string;

/**
 * Semantic helper
 *
 * For example `border`
 */
export type string_css_property = string;

/**
 * Semantic helper
 *
 * For example `"Arial, sans-serif"`
 */
export type string_fonts = string;

/**
 * Semantic helper
 *
 * For example `13px`
 */
export type string_css_value = string | number;

/**
 * Semantic helper
 *
 * For example `.foo`
 */
export type string_css_selector = string;
