import type { string_filename } from './string_filename';
import type { string_markdown } from './string_markdown';
import type { string_url } from './string_url';

/**
 * Source of one knowledge piece.
 *
 * It can be a link, a relative path to file or direct text content.
 *
 * For example `"https://pavolhejny.com/"`
 * For example `"./pavol-hejny-cv.pdf"`
 * For example `"Pavol Hejný has web https://pavolhejny.com/"`
 * For example `"Pavol Hejný is web developer and creator of Promptbook and Collboard"`
 *
 * Note: Distinguishes between `string_knowledge_source_content` and `string_knowledge_source_link`:
 * `string_knowledge_source_content` refers to the actual content or source of knowledge
 * `string_knowledge_source_link` refers to a reference or link to the knowledge source
 */
export type string_knowledge_source_content = string_knowledge_source_link | string_markdown;

/**
 * One link to a knowledge source.
 *
 * It can be a URL or relative path.
 *
 * For example `"https://pavolhejny.com/"`
 * For example `"./pavol-hejny-cv.pdf"`
 *
 * Note: string_knowledge_source_link refers to a reference or link to the knowledge source, while string_knowledge_source_content can be the link or the actual content.
 */
export type string_knowledge_source_link = string_url | string_filename;
