import * as dotenv from 'dotenv';
import { join } from 'path';
import { LOOP_LIMIT } from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { $provideFilesystemForNode } from '../../../scrapers/_common/register/$provideFilesystemForNode';
import type { string_name } from '../../../types/typeAliases';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { isFileExisting } from '../../../utils/files/isFileExisting';
import { isRootPath } from '../../../utils/validators/filePath/isRootPath';
import { $llmToolsMetadataRegister } from './$llmToolsMetadataRegister';
import type { LlmToolsConfiguration } from './LlmToolsConfiguration';

/**
 * @@@
 *
 * @@@ .env
 *
 * It looks for environment variables:
 * - `process.env.OPENAI_API_KEY`
 * - `process.env.ANTHROPIC_CLAUDE_API_KEY`
 * - ...
 *
 * @returns @@@
 * @public exported from `@promptbook/node`
 */
export async function $provideLlmToolsConfigurationFromEnv(): Promise<LlmToolsConfiguration> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$provideLlmToolsFromEnv` works only in Node.js environment');
    }

    const envFilePatterns = [
        '.env',
        '.env.test',
        '.env.local',
        '.env.development.local',
        '.env.development',

        '.env.production.local',
        '.env.production',
        '.env.prod.local',
        '.env.prod',

        // <- TODO: Maybe add more patterns
    ];

    let rootDirname = process.cwd();

    up_to_root: for (let i = 0; i < LOOP_LIMIT; i++) {
        for (const pattern of envFilePatterns) {
            const envFilename = join(rootDirname, pattern);

            if (await isFileExisting(envFilename, $provideFilesystemForNode())) {
                dotenv.config({ path: envFilename });
                break up_to_root;
            }
        }

        if (isRootPath(rootDirname)) {
            break up_to_root;
        }

        // Note: If the directory does not exist, try the parent directory
        rootDirname = join(rootDirname, '..');
    }

    const llmToolsConfiguration: LlmToolsConfiguration = $llmToolsMetadataRegister
        .list()
        .map((metadata) => metadata.createConfigurationFromEnv(process.env as Record<string_name, string>))
        .filter((configuration): configuration is LlmToolsConfiguration[number] => configuration !== null);

    return llmToolsConfiguration;
}

/**
 * TODO: [🧠][🪁] Maybe do allow to do auto-install if package not registered and not found
 * TODO: Add Azure OpenAI
 * TODO: [🧠][🍛]
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 * TODO: This should be maybe not under `_common` but under `utils`
 * TODO: [🧠][⚛] Maybe pass env as argument
 * TODO: [®] DRY Register logic */
