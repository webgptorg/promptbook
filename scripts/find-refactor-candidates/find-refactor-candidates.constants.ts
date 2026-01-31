/**
 * Root folders that contain source-like files for scanning.
 */
export const SOURCE_ROOTS: ReadonlyArray<string> = [
    'src',
    'apps',
    'scripts',
    'examples',
    'packages',
    'agents',
    'other',
];

/**
 * File extensions treated as source code or source-like text.
 */
export const SOURCE_FILE_EXTENSIONS: ReadonlyArray<string> = ['.ts', '.tsx', '.js', '.jsx', '.md', '.txt'];

/**
 * Glob patterns that should be ignored when scanning for source files.
 */
export const SOURCE_FILE_IGNORE_GLOBS: ReadonlyArray<string> = [
    '**/node_modules/**',
    '**/.git/**',
    '**/.idea/**',
    '**/.vscode/**',
    '**/.promptbook/**',
    '**/.next/**',
    '**/.tmp/**',
    '**/tmp/**',
    '**/coverage/**',
    '**/dist/**',
    '**/build/**',
    '**/out/**',
    '**/prompts/**',
    '**/changelog/**',
];

/**
 * Default maximum line count for source files.
 */
export const DEFAULT_MAX_LINE_COUNT = 500;

/**
 * Per-extension line count limits.
 */
export const LINE_COUNT_LIMITS_BY_EXTENSION: Readonly<Record<string, number>> = {
    '.ts': 500,
    '.tsx': 500,
    '.js': 500,
    '.jsx': 500,
    '.md': 500,
    '.txt': 500,
};

/**
 * Glob patterns that are exempt from line-count checks.
 */
export const LINE_COUNT_EXEMPT_GLOBS: ReadonlyArray<string> = ['other/cspell-dictionaries/**/*.txt'];

/**
 * Maximum number of entities before a file is flagged.
 */
export const MAX_ENTITIES_PER_FILE = 4;

/**
 * File extensions eligible for entity counting.
 */
export const ENTITY_COUNT_EXTENSIONS: ReadonlyArray<string> = ['.ts', '.tsx', '.js', '.jsx'];

/**
 * Markers that identify generated files which should be skipped.
 */
export const GENERATED_CODE_MARKERS: ReadonlyArray<string> = [
    'WARNING: This code has been generated',
    'This code has been generated so that any manual changes will be overwritten',
];

/**
 * Name of the prompts directory.
 */
export const PROMPTS_DIR_NAME = 'prompts';

/**
 * Step size used for prompt numbering.
 */
export const PROMPT_NUMBER_STEP = 10;

/**
 * Prefix used for generated prompt slugs.
 */
export const PROMPT_SLUG_PREFIX = 'refactor';

/**
 * Label used to mark the target file in generated prompts.
 */
export const PROMPT_TARGET_LABEL = 'Target file';

/**
 * Maximum length for generated prompt slugs.
 */
export const PROMPT_SLUG_MAX_LENGTH = 80;

/**
 * Note: [?] Code in this file should never be published in any package
 */
