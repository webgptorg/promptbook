import type { InitializationStatus } from './boilerplateTemplates';
import { getDefaultCoderVscodeSettings } from './getDefaultCoderVscodeSettings';
import { mergeStringRecordJsonFile } from './mergeStringRecordJsonFile';

/**
 * Relative path to the VS Code settings file initialized by `ptbk coder init`.
 */
const VSCODE_SETTINGS_FILE_PATH = '.vscode/settings.json';

/**
 * Relative path to the VS Code directory initialized by `ptbk coder init`.
 */
const VSCODE_DIRECTORY_PATH = '.vscode';

/**
 * Ensures VS Code routes pasted prompt images into `prompts/screenshots`.
 *
 * @private function of `initializeCoderProjectConfiguration`
 */
export async function ensureCoderVscodeSettingsFile(projectPath: string): Promise<InitializationStatus> {
    const [fieldPath, nextEntries] = resolveDefaultCoderVscodeSettingsEntry();

    return mergeStringRecordJsonFile({
        projectPath,
        relativeFilePath: VSCODE_SETTINGS_FILE_PATH,
        fieldPath,
        nextEntries,
        ensureParentDirectoryPath: VSCODE_DIRECTORY_PATH,
    });
}

/**
 * Resolves the default string-record entry that `coder init` merges into VS Code settings.
 */
function resolveDefaultCoderVscodeSettingsEntry(): readonly [string, Readonly<Record<string, string>>] {
    const [defaultVscodeSettingsEntry] = Object.entries(getDefaultCoderVscodeSettings());
    if (!defaultVscodeSettingsEntry) {
        throw new Error('Default coder VS Code settings must define at least one string-record entry.');
    }

    return defaultVscodeSettingsEntry;
}

// Note: [🟡] Code for coder init VS Code bootstrapping [ensureCoderVscodeSettingsFile](src/cli/cli-commands/coder/ensureCoderVscodeSettingsFile.ts) should never be published outside of `@promptbook/cli`
