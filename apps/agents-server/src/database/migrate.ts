import colors from 'colors';
import * as dotenv from 'dotenv';
import {
    DATABASE_MIGRATION_APPLIED_BY,
    resolveDatabaseMigrationRuntimeConfiguration,
    runDatabaseMigrations,
} from './runDatabaseMigrations';
import { isAgentsServerSqliteMode } from './agentsServerDatabaseMode';

/**
 * Environment variable pointing to the installed Agents Server `.env` file.
 */
const AGENTS_SERVER_ENV_FILE_ENV_NAME = 'PTBK_AGENTS_SERVER_ENV_FILE';

loadDatabaseMigrationEnvironment();

/**
 * Runs manual migration command from CLI arguments.
 */
async function migrate(): Promise<void> {
    console.info(colors.bgBlue('🚀 Starting database migration'));

    if (isAgentsServerSqliteMode()) {
        console.info(colors.yellow('⏭️ Skipping PostgreSQL migrations because Agents Server uses local SQLite.'));
        return;
    }

    const runtimeConfiguration = await resolveDatabaseMigrationRuntimeConfiguration(console);
    if (!runtimeConfiguration) {
        return;
    }

    const onlyTargets = parseOnlyMigrationTargetsFromCliArguments(process.argv.slice(2));
    if (onlyTargets !== null) {
        console.info(colors.cyan(`🎯 Running migrations only for: ${onlyTargets.join(', ')}`));
    }

    try {
        await runDatabaseMigrations({
            prefixes: runtimeConfiguration.prefixes,
            registeredServers: runtimeConfiguration.registeredServers,
            connectionString: runtimeConfiguration.connectionString,
            onlyTargets,
            appliedBy: DATABASE_MIGRATION_APPLIED_BY.MANUAL,
            logger: console,
            logSqlStatements: true,
        });
        console.info(colors.bgGreen('\n🎉 All migrations completed successfully'));
    } catch (error) {
        console.error(colors.bgRed('\n❌ Migration failed:'));
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error(error);
        }
        process.exit(1);
    }
}

/**
 * Loads database migration environment variables.
 *
 * Self-update runs the migration command from the repository checkout, while
 * the deployed Agents Server `.env` lives in the installation directory.
 */
function loadDatabaseMigrationEnvironment(): void {
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
 * Parses optional `--only` flag from CLI arguments.
 *
 * Targets may reference `production`, `preview`, registered server names, or raw table prefixes.
 *
 * @param args - CLI arguments.
 * @returns Selected migration targets or `null` when not provided.
 */
function parseOnlyMigrationTargetsFromCliArguments(args: ReadonlyArray<string>): Array<string> | null {
    for (let index = 0; index < args.length; index++) {
        const arg = args[index];
        if (arg === '--only' && args[index + 1]) {
            return parseMigrationTargets(args[index + 1]);
        }
        if (arg?.startsWith('--only=')) {
            return parseMigrationTargets(arg.substring('--only='.length));
        }
    }
    return null;
}

/**
 * Splits one comma-separated `--only` value into ordered tokens.
 *
 * @param rawTargets - Raw CLI value.
 * @returns Parsed non-empty tokens.
 */
function parseMigrationTargets(rawTargets: string): Array<string> {
    return rawTargets
        .split(',')
        .map((target) => target.trim())
        .filter((target) => target !== '');
}

migrate();
