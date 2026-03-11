import colors from 'colors';
import * as dotenv from 'dotenv';
import {
    DATABASE_MIGRATION_APPLIED_BY,
    resolveDatabaseMigrationRuntimeConfiguration,
    runDatabaseMigrations,
} from './runDatabaseMigrations';

dotenv.config();

/**
 * Runs manual migration command from CLI arguments.
 */
async function migrate(): Promise<void> {
    console.info(colors.bgBlue('🚀 Starting database migration'));

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
        console.error(error);
        process.exit(1);
    }
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
