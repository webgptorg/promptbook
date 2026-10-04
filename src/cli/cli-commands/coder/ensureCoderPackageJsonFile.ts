import { getDefaultCoderPackageJsonScripts } from './getDefaultCoderPackageJsonScripts';
import type { MergedStringRecordJsonFile } from './mergeStringRecordJsonFile';
import { mergeStringRecordJsonFile } from './mergeStringRecordJsonFile';
import { prepareCoderPackageJsonScripts, type PreparedCoderPackageJsonScripts } from './prepareCoderPackageJsonScripts';
import { findLegacyCoderCheckCallers } from './findLegacyCoderCheckCallers';

/**
 * Relative path to `package.json` in the initialized project.
 */
const PACKAGE_JSON_FILE_PATH = 'package.json';

/**
 * Ensures `package.json` contains the standalone Promptbook coder helper scripts.
 *
 * Project definitions are preserved; missing scripts and narrowly recognized generated migrations are applied.
 *
 * @private function of `initializeCoderProjectConfiguration`
 */
export async function ensureCoderPackageJsonFile(
    projectPath: string,
): Promise<MergedStringRecordJsonFile & Omit<PreparedCoderPackageJsonScripts, 'scripts'>> {
    let preparation: PreparedCoderPackageJsonScripts;
    const mergedFile = await mergeStringRecordJsonFile({
        projectPath,
        relativeFilePath: PACKAGE_JSON_FILE_PATH,
        fieldPath: 'scripts',
        nextEntries: getDefaultCoderPackageJsonScripts(),
        transformExistingEntries: async (entries) => {
            const legacyNames = Object.keys(entries).filter(
                (name) => name === 'test-for-ptbk-coder' || name === 'check-for-ptbk-coder',
            );
            const externalCallers = await findLegacyCoderCheckCallers(projectPath, legacyNames);
            preparation = prepareCoderPackageJsonScripts(entries, externalCallers);
            return preparation.scripts;
        },
    });
    return {
        ...mergedFile,
        checkScriptSummary: preparation!.checkScriptSummary,
        migrationInstructions: preparation!.migrationInstructions,
        isCheckConfigured: preparation!.isCheckConfigured,
    };
}

// Note: [🟡] Code for coder init package.json bootstrapping [ensureCoderPackageJsonFile](src/cli/cli-commands/coder/ensureCoderPackageJsonFile.ts) should never be published outside of `@promptbook/cli`
