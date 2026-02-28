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

    const runtimeConfiguration = resolveDatabaseMigrationRuntimeConfiguration(console);
    if (!runtimeConfiguration) {
        return;
    }

    const onlyPrefixes = parseOnlyPrefixesFromCliArguments(process.argv.slice(2));
    if (onlyPrefixes !== null) {
        console.info(colors.cyan(`🎯 Running migrations only for: ${onlyPrefixes.join(', ')}`));
    }

    try {
        await runDatabaseMigrations({
            prefixes: runtimeConfiguration.prefixes,
            connectionString: runtimeConfiguration.connectionString,
            onlyPrefixes,
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
 * @param args CLI arguments.
 * @returns Selected prefix list or `null` when not provided.
 */
function parseOnlyPrefixesFromCliArguments(args: ReadonlyArray<string>): Array<string> | null {
    for (let index = 0; index < args.length; index++) {
        const arg = args[index];
        if (arg === '--only' && args[index + 1]) {
            return args[index + 1]
                .split(',')
                .map((prefix) => prefix.trim())
                .filter((prefix) => prefix !== '');
        }
        if (arg?.startsWith('--only=')) {
            return arg
                .substring('--only='.length)
                .split(',')
                .map((prefix) => prefix.trim())
                .filter((prefix) => prefix !== '');
        }
    }
    return null;
}

migrate();
