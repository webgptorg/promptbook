import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

dotenv.config();

async function migrate() {
    console.info('🚀 Starting database migration');

    // Parse CLI arguments for --only flag
    const args = process.argv.slice(2);
    let onlyPrefixes: string[] | null = null;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--only' && args[i + 1]) {
            onlyPrefixes = args[i + 1]
                .split(',')
                .map((prefix) => prefix.trim())
                .filter((prefix) => prefix !== '');
            break;
        } else if (args[i]?.startsWith('--only=')) {
            onlyPrefixes = args[i]
                .substring('--only='.length)
                .split(',')
                .map((prefix) => prefix.trim())
                .filter((prefix) => prefix !== '');
            break;
        }
    }

    // 1. Get configuration
    const prefixesEnv = process.env.SUPABASE_MIGRATION_PREFIXES;
    if (!prefixesEnv) {
        console.warn('⚠️ SUPABASE_MIGRATION_PREFIXES is not defined. Skipping migration.');
        return;
    }
    let prefixes = prefixesEnv
        .split(',')
        .map((prefix) => prefix.trim())
        .filter((prefix) => prefix !== '');

    if (prefixes.length === 0) {
        console.warn('⚠️ No prefixes found in SUPABASE_MIGRATION_PREFIXES. Skipping migration.');
        return;
    }

    // Filter prefixes if --only flag is provided
    if (onlyPrefixes !== null) {
        const invalidPrefixes = onlyPrefixes.filter((prefix) => !prefixes.includes(prefix));
        if (invalidPrefixes.length > 0) {
            console.error(`❌ Invalid prefixes specified in --only: ${invalidPrefixes.join(', ')}`);
            console.error(`   Available prefixes: ${prefixes.join(', ')}`);
            process.exit(1);
        }
        prefixes = onlyPrefixes;
        console.info(`🎯 Running migrations only for: ${prefixes.join(', ')}`);
    }

    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ POSTGRES_URL or DATABASE_URL is not defined.');
        process.exit(1);
    }

    console.info(`📋 Found ${prefixes.length} prefixes to migrate: ${prefixes.join(', ')}`);

    // 2. Connect to database
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }, // Required for some Supabase/Heroku connections
    });

    try {
        await client.connect();
        console.info('🔌 Connected to database');

        // 3. Read migration files
        const migrationsDir = path.join(__dirname, 'migrations');
        if (!fs.existsSync(migrationsDir)) {
            console.error(`❌ Migrations directory not found at ${migrationsDir}`);
            process.exit(1);
        }

        const migrationFiles = fs
            .readdirSync(migrationsDir)
            .filter((file) => file.endsWith('.sql'))
            .sort(); // Ensure files are processed in order

        console.info(`📂 Found ${migrationFiles.length} migration files`);

        // 4. Iterate over prefixes and apply migrations
        for (const prefix of prefixes) {
            console.info(`\n🏗️ Migrating prefix: "${prefix}"`);
            const migrationsTableName = `${prefix}Migrations`;

            // 4.1 Create migrations table if not exists
            const createMigrationsTableSql = `
                CREATE TABLE IF NOT EXISTS "${migrationsTableName}" (
                    "filename" TEXT PRIMARY KEY,
                    "appliedAt" TIMESTAMP WITH TIME ZONE DEFAULT now()
                );
            `;
            await client.query(createMigrationsTableSql);

            // Enable RLS for migrations table
            const enableRlsSql = `ALTER TABLE "${migrationsTableName}" ENABLE ROW LEVEL SECURITY;`;
            await client.query(enableRlsSql);

            // 4.2 Get applied migrations
            const { rows: appliedMigrationsRows } = await client.query(
                `SELECT "filename" FROM "${migrationsTableName}"`,
            );
            const appliedMigrations = new Set(appliedMigrationsRows.map((migrationRow) => migrationRow.filename));

            // 4.3 Apply new migrations in one big transaction
            let migrationError = null;
            await client.query('BEGIN');
            try {
                for (const file of migrationFiles) {
                    if (appliedMigrations.has(file)) {
                        // console.info(`  ⏭️  Skipping ${file} (already applied)`);
                        continue;
                    }

                    console.info(`  🚀 Applying ${path.join(migrationsDir, file).split('\\').join('/')}...`);
                    const filePath = path.join(migrationsDir, file);
                    let sql = fs.readFileSync(filePath, 'utf-8');

                    // Replace prefix placeholder
                    sql = sql.replace(/prefix_/g, prefix);

                    try {
                        await client.query(sql);
                        await client.query(`INSERT INTO "${migrationsTableName}" ("filename") VALUES ($1)`, [file]);
                        console.info(`  ✅ Applied ${file}`);
                    } catch (error) {
                        console.error(`  ❌ Failed to apply ${file}:`);
                        console.error(error);

                        migrationError = error;
                        break;
                    }
                }
                if (migrationError) {
                    await client.query('ROLLBACK');
                    throw migrationError;
                } else {
                    await client.query('COMMIT');
                }
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
        }

        console.info('\n🎉 All migrations completed successfully');
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
