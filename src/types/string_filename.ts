/**
 * Semantic helper
 *
 * For example `"C:/Users/me/work/collboard/modules-sdk/src/colldev/commands/develop/ColldevDevelop.tsx"`
 */
export type string_absolute_filename = string;

/**
 * Semantic helper
 *
 * For example `"./src/colldev/commands/develop/ColldevDevelop.tsx"`
 */
export type string_relative_filename = string;

/**
 * Semantic helper
 */
export type string_filename = string_absolute_filename | string_relative_filename;

// TODO: Do not use universal string_filename/string_dirname but specific ones likestring_relative_filename

/**
 * Semantic helper
 *
 * For example `"C:/Users/me/work/collboard/modules-sdk/src/colldev/commands/develop/ColldevDevelop.tsx"`
 */
export type string_absolute_dirname = string;

/**
 * Semantic helper
 *
 * For example `"./src/colldev/commands/develop/ColldevDevelop.tsx"`
 */
export type string_relative_dirname = string;

/**
 * Semantic helper
 */
export type string_dirname = string_absolute_dirname | string_relative_dirname;

/**
 * Semantic helper
 *
 * For example `"C:/Users/me/AppData/Local/Pandoc/pandoc.exe"`
 * For example `"C:/Program Files/LibreOffice/program/swriter.exe"`
 */
export type string_executable_path = string;
