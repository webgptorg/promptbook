#!/usr/bin/env ts-node
// backup-supabase.ts

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import colors from 'colors';
import commander from 'commander';
import { basename } from 'path';
import { assertsError } from '../../src/errors/assertsError';
import { spaceTrim } from '../../src/utils/organization/spaceTrim';
import { assertBackupSupabaseRootCwd } from './assertBackupSupabaseRootCwd';
import { backupSupabase } from './backupSupabase';
import {
    DEFAULT_BACKUP_SUPABASE_FILENAME_PATTERN,
    DEFAULT_BACKUP_SUPABASE_OUTPUT_DIRECTORY,
    DEFAULT_BACKUP_SUPABASE_SCHEMA_NAMES,
    type BackupSupabaseCommandOptions,
    parseBackupSupabaseRuntimeOptions,
} from './parseBackupSupabaseRuntimeOptions';

/**
 * Commander program used by the backup CLI entrypoint.
 */
const program = new commander.Command();

assertBackupSupabaseRootCwd('backup-supabase.ts');

program.name('backup-supabase');
program.description('Back up Supabase PostgreSQL schema + data into one ZIP file (without pg_dump).');
program.option(
    '--connection-string <connectionString>',
    'PostgreSQL connection string. Defaults to POSTGRES_URL / DATABASE_URL environment variables.',
);
program.option('--schemas <schemas>', 'Comma-separated schema names to include.', DEFAULT_BACKUP_SUPABASE_SCHEMA_NAMES);
program.option(
    '--output-dir <outputDir>',
    'Output directory for backup ZIP files.',
    DEFAULT_BACKUP_SUPABASE_OUTPUT_DIRECTORY,
);
program.option(
    '--filename-pattern <filenamePattern>',
    spaceTrim(`
        Output filename pattern.
        Supported tokens: %timestamp%, %date%, %time%, %database%
    `),
    DEFAULT_BACKUP_SUPABASE_FILENAME_PATTERN,
);
program.parse(process.argv);

/**
 * Constant for runtime options.
 */
const runtimeOptions = parseBackupSupabaseRuntimeOptions(program.opts() as BackupSupabaseCommandOptions);

backupSupabase(runtimeOptions)
    .catch((error) => {
        assertsError(error);
        console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
        console.error(colors.red(error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

// Note: [⚫] Code for repository script [backup-supabase](scripts/backup-supabase/backup-supabase.ts) should never be published in any package
