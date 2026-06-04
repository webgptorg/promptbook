import * as dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AgentCollectionInSupabase } from '../../../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/AgentCollectionInSupabase';
import type { AgentCollection } from '../../../../../src/collection/agent-collection/AgentCollection';
import { isAgentsServerSqliteMode } from '../../database/agentsServerDatabaseMode';
import { $provideLocalSqliteSupabase } from '../../database/sqlite/$provideLocalSqliteSupabase';
import { installDefaultAgentsFromDirectory } from './defaultAgents';

/**
 * Environment variable pointing to the installed Agents Server `.env` file.
 *
 * @private install-time default-agent utility
 */
const AGENTS_SERVER_ENV_FILE_ENV_NAME = 'PTBK_AGENTS_SERVER_ENV_FILE';

/**
 * Environment variable pointing to the repository `agents/default` directory.
 *
 * @private install-time default-agent utility
 */
const DEFAULT_AGENTS_DIRECTORY_ENV_NAME = 'PTBK_DEFAULT_AGENTS_DIR';

/**
 * Environment variable containing the current server table prefix.
 *
 * @private install-time default-agent utility
 */
const SUPABASE_TABLE_PREFIX_ENV_NAME = 'SUPABASE_TABLE_PREFIX';

/**
 * Public Supabase URL environment variable.
 *
 * @private install-time default-agent utility
 */
const NEXT_PUBLIC_SUPABASE_URL_ENV_NAME = 'NEXT_PUBLIC_SUPABASE_URL';

/**
 * Supabase service role key environment variable.
 *
 * @private install-time default-agent utility
 */
const SUPABASE_SERVICE_ROLE_KEY_ENV_NAME = 'SUPABASE_SERVICE_ROLE_KEY';

/**
 * Public Supabase anon key environment variable used as a fallback when service role is unavailable.
 *
 * @private install-time default-agent utility
 */
const NEXT_PUBLIC_SUPABASE_ANON_KEY_ENV_NAME = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';

/**
 * Loads the installed Agents Server environment for the detached installer script.
 *
 * @private install-time default-agent utility
 */
function loadDefaultAgentInstallEnvironment(): void {
    const explicitEnvFilePath = process.env[AGENTS_SERVER_ENV_FILE_ENV_NAME]?.trim();
    if (explicitEnvFilePath) {
        const explicitLoadResult = dotenv.config({ path: explicitEnvFilePath });
        if (!explicitLoadResult.error) {
            return;
        }
    }

    dotenv.config();
}

/**
 * Creates the install-time agent collection using the same database backend as the server.
 *
 * @returns Agent collection bound to the configured table prefix.
 *
 * @private install-time default-agent utility
 */
function createDefaultAgentInstallCollection(): AgentCollection {
    return new AgentCollectionInSupabase(createDefaultAgentInstallSupabaseClient(), {
        tablePrefix: process.env[SUPABASE_TABLE_PREFIX_ENV_NAME] || '',
    });
}

/**
 * Creates the Supabase-shaped client used by the install-time agent collection.
 *
 * @returns Supabase or local SQLite client.
 *
 * @private install-time default-agent utility
 */
function createDefaultAgentInstallSupabaseClient(): SupabaseClient {
    if (isAgentsServerSqliteMode()) {
        return $provideLocalSqliteSupabase();
    }

    const supabaseUrl = process.env[NEXT_PUBLIC_SUPABASE_URL_ENV_NAME];
    const supabaseKey =
        process.env[SUPABASE_SERVICE_ROLE_KEY_ENV_NAME] || process.env[NEXT_PUBLIC_SUPABASE_ANON_KEY_ENV_NAME];

    if (!supabaseUrl || !supabaseKey) {
        throw new Error(
            `Missing \`${NEXT_PUBLIC_SUPABASE_URL_ENV_NAME}\` and \`${SUPABASE_SERVICE_ROLE_KEY_ENV_NAME}\` for Supabase default-agent installation.`,
        );
    }

    return createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

/**
 * Runs the default-agent install command.
 *
 * @private install-time default-agent utility
 */
async function installDefaultAgents(): Promise<void> {
    loadDefaultAgentInstallEnvironment();

    const defaultAgentsDirectoryPath = process.env[DEFAULT_AGENTS_DIRECTORY_ENV_NAME]?.trim();
    if (!defaultAgentsDirectoryPath) {
        throw new Error(`Missing \`${DEFAULT_AGENTS_DIRECTORY_ENV_NAME}\` environment variable.`);
    }

    const result = await installDefaultAgentsFromDirectory({
        collection: createDefaultAgentInstallCollection(),
        defaultAgentsDirectoryPath,
        logger: console,
    });

    console.info(
        `[default-agents] Finished. Installed ${result.installedCount}, skipped ${result.skippedCount}.`,
    );
}

installDefaultAgents().catch((error) => {
    console.error('[default-agents] Failed to install default agents.');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
