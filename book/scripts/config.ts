/**
 * The regular expression to match the import statement in the markdown files
 */
export const IMPORT_REGEX = /<!--\s*Import\s+(?<importPath>.*)\s*-->.*<!--\s*\/Import\s+\k<importPath>\s*-->/gis;

/**
 * Warning message for the generated sections and files files
 *
 * @private within the repository
 */
export const GENERATOR_WARNING = `⚠️ WARNING: This section was imported, make changes in source; any manual changes here will be overwritten`;
