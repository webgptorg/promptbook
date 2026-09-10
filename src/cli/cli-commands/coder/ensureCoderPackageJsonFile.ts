import { getDefaultCoderPackageJsonScripts } from './getDefaultCoderPackageJsonScripts';
import type { MergedStringRecordJsonFile } from './mergeStringRecordJsonFile';
import { mergeStringRecordJsonFile } from './mergeStringRecordJsonFile';

/**
 * Relative path to `package.json` in the initialized project.
 */
const PACKAGE_JSON_FILE_PATH = 'package.json';

/**
 * Ensures `package.json` contains the standalone Promptbook coder helper scripts.
 *
 * Scripts which the project already defines are kept as they are, only missing ones are added.
 *
 * @private function of `initializeCoderProjectConfiguration`
 */
export async function ensureCoderPackageJsonFile(projectPath: string): Promise<MergedStringRecordJsonFile> {
    return mergeStringRecordJsonFile({
        projectPath,
        relativeFilePath: PACKAGE_JSON_FILE_PATH,
        fieldPath: 'scripts',
        nextEntries: getDefaultCoderPackageJsonScripts(),
    });
}

// Note: [🟡] Code for coder init package.json bootstrapping [ensureCoderPackageJsonFile](src/cli/cli-commands/coder/ensureCoderPackageJsonFile.ts) should never be published outside of `@promptbook/cli`
