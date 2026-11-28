/**
 * VS Code setting key used to route pasted markdown images into prompt-specific screenshots.
 */
const MARKDOWN_COPY_FILES_DESTINATION_SETTING_KEY = 'markdown.copyFiles.destination';

/**
 * Markdown glob used for coder prompt files inside VS Code settings.
 */
const PROMPTS_MARKDOWN_FILE_GLOB = 'prompts/*md';

/**
 * Screenshot destination used for pasted prompt images inside VS Code settings.
 */
const PROMPTS_SCREENSHOT_DESTINATION = './prompts/screenshots/${documentBaseName}.png';

/**
 * Default VS Code settings initialized by `ptbk coder init`.
 */
const DEFAULT_CODER_VSCODE_SETTINGS = {
    [MARKDOWN_COPY_FILES_DESTINATION_SETTING_KEY]: {
        [PROMPTS_MARKDOWN_FILE_GLOB]: PROMPTS_SCREENSHOT_DESTINATION,
    },
} as const satisfies Readonly<Record<string, Readonly<Record<string, string>>>>;

/**
 * Lists the default VS Code settings initialized by `ptbk coder init`.
 *
 * @private internal utility of `coder init` command
 */
export function getDefaultCoderVscodeSettings(): Readonly<Record<string, Readonly<Record<string, string>>>> {
    return DEFAULT_CODER_VSCODE_SETTINGS;
}

// Note: [🟡] Code for coder init VS Code settings [getDefaultCoderVscodeSettings](src/cli/cli-commands/coder/getDefaultCoderVscodeSettings.ts) should never be published outside of `@promptbook/cli`
