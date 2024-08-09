import { RESERVED_PARAMETER_NAMES } from '../config';
/**
 * Semantic helper
 */
export type string_business_category_name = 'restaurant' | 'grocery' | 'person' | 'conference' | string;
/**
 * Semantic helper
 *
 * For example `"gpt-4"`
 */
export type string_model_name = 'gpt-4' | 'gpt-4-0314' | 'gpt-4-0613' | 'gpt-4-32k' | 'gpt-4-32k-0314' | 'gpt-4-32k-0613' | 'gpt-3.5-turbo' | 'gpt-3.5-turbo-16k' | 'gpt-3.5-turbo-0301' | 'gpt-3.5-turbo-0613' | 'gpt-3.5-turbo-16k-0613' | string;
/**
 * Semantic helper
 *
 * For example `"A cat wearing a hat"`
 */
export type string_prompt = string;
/**
 * Semantic helper
 *
 * For example `"A cat wearing a {item}"`
 */
export type string_template = string;
/**
 * Semantic helper
 *
 * For example `"How many hats does the cat wear?"`
 */
export type string_text_prompt = string_prompt;
/**
 * Semantic helper
 *
 * For example `"How many hats does the cat wear?"`
 */
export type string_chat_prompt = string_text_prompt;
/**
 * Semantic helper
 *
 * For example `"You are an AI assistant. You are here to help me with my work."`
 */
export type string_system_message = string_text_prompt;
/**
 * Semantic helper
 *
 * For example `"Following is a text about cats: Once upon a time there was a cat"`
 */
export type string_completion_prompt = string_text_prompt;
/**
 * Semantic helper
 *
 * For example `"index"` or `"explanation"`
 * Always in kebab-case
 */
export type string_page = 'index' | string;
/**
 * Semantic helper
 *
 * For example `"text/plain"` or `"application/collboard"`
 */
export type string_mime_type = string;
/**
 * Semantic helper
 *
 * For example `"text/*"` or `"image/*"`
 *
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#unique_file_type_specifiers
 */
export type string_mime_type_with_wildcard = string;
/**
 * Semantic helper
 *
 * For example `"a"`
 */
export type string_char = string;
/**
 * Semantic helper
 * Unique identifier of anything
 *
 * For example `"ainautes"`
 */
export type string_name = string;
/**
 * Semantic helper
 * Unique identifier of anything
 *
 * For example `"eventName"`
 */
export type string_parameter_name = string_name;
/**
 * Semantic helper
 * Unique identifier of parameter
 *
 * For example `"DevConf 2024"`
 */
export type string_parameter_value = string;
/**
 * Parameters of the pipeline
 *
 * There are three types of parameters:
 * - **INPUT PARAMETERs** are required to execute the pipeline.
 * - **Intermediate parameters** are used internally in the pipeline.
 * - **OUTPUT PARAMETERs** are not used internally in the pipeline, but are returned as the result of the pipeline execution.
 *
 * @see https://ptbk.io/parameters
 */
export type Parameters = Exclude<Record<string_parameter_name, string_parameter_value>, ReservedParameters>;
/**
 * Semantic helper
 * Unique identifier of reserved parameter
 *
 * For example `"context"`
 */
export type string_reserved_parameter_name = typeof RESERVED_PARAMETER_NAMES[number];
/**
 * @@@
 */
export type ReservedParameters = Record<string_reserved_parameter_name, string_parameter_value>;
/**
 * Semantic helper
 * Title of anything
 *
 * For example `"Ai*nautes"`
 */
export type string_title = string;
/**
 * Description of persona
 *
 * For example `"Skilled copywriter"`
 */
export type string_persona_description = string;
/**
 * Source of one knowledge
 *
 * It can be a link, a relative path to file or direct text
 *
 * For example `"https://pavolhejny.com/"`
 * For example `"./pavol-hejny-cv.pdf"`
 * For example `"Pavol Hejný has web https://pavolhejny.com/"`
 * For example `"Pavol Hejný is web developer and creator of Promptbook and Collboard"`
 *
 * @@@ string_knowledge_source vs string_knowledge_source_link
 */
export type string_knowledge_source = string_knowledge_source_link | string_markdown;
/**
 * One link to knowledge source
 *
 * It can be a link or relative path
 *
 * For example `"https://pavolhejny.com/"`
 * For example `"./pavol-hejny-cv.pdf"`
 *
 * @@@ string_knowledge_source vs string_knowledge_source_link
 */
export type string_knowledge_source_link = string_url | string_file_path;
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
 * TODO: [🎞️] Probbably use some object-based method for working with XMLs
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
 * @@@
 */
export type string_promptbook_documentation_url = `https://github.com/webgptorg/promptbook/discussions/${number | '@@'}`;
/**
 * Semantic helper
 *
 * For example `"towns.cz"`
 */
export type string_domain = string;
/**
 * Semantic helper
 *
 * For example `"com"`
 */
export type string_tdl = string;
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
 * Semantic helper for JSON strings
 *
 * Note: TType is a type of the JSON object inside the string
 *
 * For example `{"foo": "bar"}`
 */
export type string_json<TType> = string & {
    _type: 'string_json';
    scheme: TType;
};
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
 * For example `13px`
 */
export type string_css_value = string;
/**
 * Semantic helper
 *
 * For example `.foo`
 */
export type string_css_selector = string;
/**
 * Semantic helper
 *
 * For example `"https://collboard.com/9SeSQTupmQHwuSrLi"`
 */
export type string_url = string;
/**
 * Semantic helper
 *
 * For example `"https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md"`
 */
export type string_pipeline_url = string;
/**
 * Semantic helper
 *
 * For example `"https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md#keywords"`
 */
export type string_pipeline_url_with_hashtemplate = string;
/**
 * Semantic helper
 *
 * For example `"data:text/plain;base64,SGVsbG8sIFdvcmxkIQ=="`
 */
export type string_data_url = `data:${string_mime_type};base64,${string_base64}`;
/**
 * Semantic helper
 *
 * For example `"SGVsbG8sIFdvcmxkIQ=="`
 */
export type string_base64 = string;
/**
 * Semantic helper
 *
 * For example `"https://collboard.com/9SeSQTupmQHwuSrLi"` OR `/9SeSQTupmQHwuSrLi`
 */
export type string_href = string;
/**
 * Semantic helper
 *
 * For example `"https://collboard.com/9SeSQTupmQHwuSrLi.png?width=1200&height=630"`
 */
export type string_url_image = string;
/**
 * Semantic helper
 *
 * For example `"/9SeSQTupmQHwuSrLi"`
 */
export type string_uri = string;
/**
 * Semantic helper
 *
 * For example `"9SeSQTupmQHwuSrLi"`
 */
export type string_uri_part = string;
/**
 * Semantic helper, ID of the board used in URL and API
 *
 * For example `"9SeSQTupmQHwuSrLi"` <- TODO: !! Update
 */
export type string_uriid = string_uri_part;
/**
 * Semantic helper
 *
 * For example `"localhost"` or `"collboard.com"`
 */
export type string_hostname = string;
/**
 * Semantic helper
 *
 * For example `"localhost:9977"` or `"collboard.com"`
 */
export type string_host = string;
/**
 * Semantic helper
 */
export type string_protocol = 'http:' | 'https:';
/**
 * Semantic helper
 *
 * For example `"pavol@hejny.org"`
 */
export type string_email = string;
/**
 * Semantic helper
 *
 * For example `"pavol@hejny.org, jirka@webgpt.cz"`
 */
export type string_emails = string;
/**
 * Branded type for UUIDs version 4
 * This will not allow to pass some random string where should be only a valid UUID
 *
 * Use utils:
 *   - `randomUuid` to generate
 *   - `isValidUuid  to check validity
 *
 * For example `"5a0a153d-7be9-4018-9eda-e0e2e2b89bd9"`
 */
export type string_uuid = string & {
    readonly _type: 'uuid';
};
/**
 * Branded type client id
 */
export type client_id = string & {
    readonly _type: 'client_id';
};
/**
 * Semantic helper
 *
 * For example `"b126926439c5fcb83609888a11283723c1ef137c0ad599a77a1be81812bd221d"`
 */
export type string_sha256 = string;
/**
 * Semantic helper
 *
 * For example `"4.2.4"`
 */
export type string_semantic_version = string;
/**
 * Semantic helper
 *
 * For example `"^4.2.4"`
 */
export type string_version_dependency = string;
/**
 * Semantic helper
 *
 * For example `"png"`
 */
export type string_file_extension = string;
/**
 * Semantic helper
 *
 * For example `"C:/Users/me/work/collboard/modules-sdk/src/colldev/commands/develop/ColldevDevelop.tsx"`
 */
export type string_file_absolute_path = string;
/**
 * Semantic helper
 *
 * For example `"./src/colldev/commands/develop/ColldevDevelop.tsx"`
 */
export type string_file_relative_path = string;
/**
 * Semantic helper
 */
export type string_file_path = string_file_absolute_path | string_file_relative_path;
/**
 * Semantic helper
 *
 * For example `"C:/Users/me/work/collboard/modules-sdk/src/colldev/commands/develop/ColldevDevelop.tsx"`
 */
export type string_folder_absolute_path = string;
/**
 * Semantic helper
 *
 * For example `"./src/colldev/commands/develop/ColldevDevelop.tsx"`
 */
export type string_folder_relative_path = string;
/**
 * Semantic helper
 */
export type string_folder_path = string_file_absolute_path | string_file_relative_path;
/**
 * Semantic helper
 */
export type string_filename = string;
/**
 * Semantic helper
 *
 * For example `"John Smith"`
 */
export type string_person_fullname = string;
/**
 * Semantic helper
 * Full profile of the person with his email and web (like in package.json)
 *
 * For example `"Pavol Hejný <pavol@hejny.org> (https://pavolhejny.com)"`
 */
export type string_person_profile = string;
/**
 * Semantic helper
 *
 * For example `"MIT"`
 */
export type string_license = string;
/**
 * Semantic helper for attributes
 *
 * - case insensitive
 *
 * For example `"color"`
 */
export type string_attribute = string;
/**
 * Semantic helper for attributes context
 * Each attribute value scope with a attribute name has its own current value
 *
 * - case insensitive
 *
 * For example `"tools"`
 */
export type string_attribute_value_scope = string;
/**
 * Semantic helper for css/html colors
 *
 * For example `"white"` or `"#009edd"`
 */
export type string_color = string;
/**
 * Semantic helper; For example "SHARE_ICON/EDIT_LINK"
 */
export type string_translate_name = string;
/**
 * Semantic helper; For example "ShareIcon/ edit link"
 */
export type string_translate_name_not_normalized = string;
/**
 * Semantic helper; For example "cs" or "en"
 * Implementing ISO 639-1
 *
 * TODO: Probably use enum
 */
export type string_translate_language = 'en' | 'cs';
/**
 * Semantic helper; For example "callbackName" or "renderMe"
 */
export type string_javascript_name = string;
export type string_token = string;
export type string_license_token = string_token;
export type string_password = string;
export type string_ssh_key = string;
export type string_pgp_key = string;
/**
 * Semantic helper for `Date.toISOString()` result
 *
 * @example "2011-10-05T14:48:00.000Z".
 * @see https://en.wikipedia.org/wiki/ISO_8601
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
 */
export type string_date_iso8601 = `${number}-${number}-${number}${string}${number}:${number}:${number}${string}`;
/**
 * Semantic helper for US Dollars
 */
export type number_usd = number;
/**
 * Semantic helper for incremental IDs
 */
export type number_id = number_integer & (number_positive | 0);
/**
 * Semantic helper for number of rows and columns
 */
export type number_linecol_number = number_integer & number_positive;
/**
 * Semantic helper for number of tokens
 */
export type number_tokens = number_integer & (number_positive | 0);
export type number_positive = number;
export type number_negative = number;
export type number_integer = number;
/**
 * Semantic helper;
 * Percentage from 0 to 1 (100%) (and bellow and above)
 */
export type number_percent = number;
/**
 * Semantic helper;
 * Model temperature
 */
export type number_model_temperature = number_percent;
/**
 * Semantic helper;
 * Seed for random generator
 *
 * Percentage from 0 to 1 (100%)
 * TODO: Is seed (in OpenAI) number from 0 to 1?
 */
export type number_seed = number_percent;
/**
 * Likeness of the wallpaper
 *
 * - 👍 is eqivalent for 1
 * - 👎 is eqivalent for -1
 * - ❤ is eqivalent for more than 1
 * - etc
 */
export type number_likeness = number;
export type number_miliseconds = number_integer;
export type number_seconds = number;
export type number_minutes = number;
export type number_hours = number;
export type number_days = number;
export type number_weeks = number;
export type number_months = number;
export type number_years = number;
export type number_bytes = number_integer & number_positive;
export type number_kilobytes = number_positive;
export type number_megabytes = number_positive;
export type number_gigabytes = number_positive;
export type number_terabytes = number_positive;
/**.
 * TODO: !!! Change "For example" to @example
 * TODO: !! Change to branded types
 * TODO: Delete type aliases that are not exported or used internally
 */
