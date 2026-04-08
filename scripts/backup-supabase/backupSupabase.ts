import colors from 'colors';
import { mkdir, stat, writeFile } from 'fs/promises';
import JSZip from 'jszip';
import { resolve } from 'path';
import { Client } from 'pg';
import { DatabaseError } from '../../src/errors/DatabaseError';
import { EnvironmentMismatchError } from '../../src/errors/EnvironmentMismatchError';
import { NotFoundError } from '../../src/errors/NotFoundError';
import { spaceTrim } from '../../src/utils/organization/spaceTrim';
import type { BackupSupabaseRuntimeOptions } from './parseBackupSupabaseRuntimeOptions';
import { createBackupSupabaseTableSqlFileContent } from './createBackupSupabaseTableSqlFileContent';
import { fetchBackupSupabaseTableReferences } from './fetchBackupSupabaseTableReferences';

/**
 * Maximum DEFLATE compression level used for ZIP output.
 * @private constant of backupSupabase
 */
const BACKUP_SUPABASE_ZIP_COMPRESSION_LEVEL = 9;

/**
 * Placeholder token for full date+time value in the output filename pattern.
 * @private constant of backupSupabase
 */
const BACKUP_SUPABASE_FILENAME_PATTERN_TOKEN_TIMESTAMP = '%timestamp%';

/**
 * Placeholder token for date-only value in the output filename pattern.
 * @private constant of backupSupabase
 */
const BACKUP_SUPABASE_FILENAME_PATTERN_TOKEN_DATE = '%date%';

/**
 * Placeholder token for time-only value in the output filename pattern.
 * @private constant of backupSupabase
 */
const BACKUP_SUPABASE_FILENAME_PATTERN_TOKEN_TIME = '%time%';

/**
 * Placeholder token for PostgreSQL database name in the output filename pattern.
 * @private constant of backupSupabase
 */
const BACKUP_SUPABASE_FILENAME_PATTERN_TOKEN_DATABASE = '%database%';

/**
 * Runs the complete Supabase backup workflow for selected schemas.
 *
 * @param options Normalized runtime options.
 * @private function of backupSupabase
 */
export async function backupSupabase(options: BackupSupabaseRuntimeOptions): Promise<void> {
    const serverDescription = describeConnection(options.connectionString);
    const outputFilename = renderOutputFilename(options.filenamePattern, options.connectionString);
    const outputFilePath = resolve(options.outputDirectory, outputFilename);

    console.info(colors.bgBlue('🚀 Starting Supabase PostgreSQL backup'));
    console.info(colors.cyan(`🛰️ Server: ${serverDescription}`));
    console.info(colors.cyan(`📚 Schemas: ${options.schemaNames.join(', ')}`));
    console.info(colors.cyan(`📂 Directory: ${normalizePathForLogs(options.outputDirectory)}`));
    console.info(colors.cyan(`📁 File: ${normalizePathForLogs(outputFilePath)}`));

    const client = new Client({
        connectionString: options.connectionString,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.info('🔌 Connected to database');

        const tableReferences = await fetchBackupSupabaseTableReferences(client, options.schemaNames);
        if (tableReferences.length === 0) {
            throw new NotFoundError(
                spaceTrim(`
                    No tables found for schemas: \`${options.schemaNames.join(', ')}\`.

                    Check that the selected schemas exist and contain application tables.
                `),
            );
        }

        const zip = new JSZip();
        for (const tableReference of tableReferences) {
            const tableIdentifierForLogs = `${tableReference.schemaName}.${tableReference.tableName}`;
            console.info(`📄 Exporting ${tableIdentifierForLogs}`);

            const sqlFileContent = await createBackupSupabaseTableSqlFileContent(client, tableReference);
            zip.file(
                `${sanitizePathSegment(tableReference.schemaName)}/${sanitizePathSegment(
                    tableReference.tableName,
                )}.sql`,
                sqlFileContent,
            );
        }

        await mkdir(options.outputDirectory, { recursive: true });
        const zipBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: BACKUP_SUPABASE_ZIP_COMPRESSION_LEVEL },
        });
        await writeFile(outputFilePath, zipBuffer);
        await stat(outputFilePath);

        console.info(colors.bgGreen('✅ Supabase backup completed'));
        console.info(colors.cyan(`📂 Directory: ${normalizePathForLogs(options.outputDirectory)}`));
        console.info(colors.green(`📁 File: ${normalizePathForLogs(outputFilePath)}`));
        console.info(colors.green(`🧾 Tables: ${tableReferences.length}`));
    } catch (error) {
        throw createBackupError(error);
    } finally {
        await client.end();
    }
}

/**
 * Describes the PostgreSQL server endpoint for logs without leaking secrets.
 *
 * @param connectionString Full PostgreSQL connection string.
 * @returns Human-readable server description safe for logs.
 * @private function of backupSupabase
 */
function describeConnection(connectionString: string): string {
    try {
        const parsed = new URL(connectionString);
        const protocol = parsed.protocol.replace(':', '') || 'postgresql';
        const host = parsed.hostname || 'unknown-host';
        const port = parsed.port || '5432';
        const database = parsed.pathname.replace(/^\//, '') || 'unknown-database';
        const username = parsed.username ? `${decodeURIComponent(parsed.username)}@` : '';

        return `${protocol}://${username}${host}:${port}/${database}`;
    } catch {
        return 'PostgreSQL server (masked)';
    }
}

/**
 * Renders the output filename from the configured pattern and resolved token values.
 *
 * @param filenamePattern Raw filename pattern from CLI.
 * @param connectionString PostgreSQL connection string.
 * @returns Rendered filename.
 * @private function of backupSupabase
 */
function renderOutputFilename(filenamePattern: string, connectionString: string): string {
    const now = new Date();
    const date = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const time = `${pad2(now.getHours())}-${pad2(now.getMinutes())}-${pad2(now.getSeconds())}`;
    const database = resolveDatabaseNameFromConnectionString(connectionString);
    const timestamp = `${date}_${time}`;

    return filenamePattern
        .replaceAll(BACKUP_SUPABASE_FILENAME_PATTERN_TOKEN_TIMESTAMP, timestamp)
        .replaceAll(BACKUP_SUPABASE_FILENAME_PATTERN_TOKEN_DATE, date)
        .replaceAll(BACKUP_SUPABASE_FILENAME_PATTERN_TOKEN_TIME, time)
        .replaceAll(BACKUP_SUPABASE_FILENAME_PATTERN_TOKEN_DATABASE, database);
}

/**
 * Resolves the database name from the connection string for the `%database%` token.
 *
 * @param connectionString PostgreSQL connection string.
 * @returns Safe database identifier for filenames.
 * @private function of backupSupabase
 */
function resolveDatabaseNameFromConnectionString(connectionString: string): string {
    try {
        const parsed = new URL(connectionString);
        const databaseName = parsed.pathname.replace(/^\//, '') || 'database';

        return sanitizePathSegment(databaseName);
    } catch {
        return 'database';
    }
}

/**
 * Converts unknown thrown values into branded backup errors.
 *
 * @param error Unknown thrown value.
 * @returns Branded error instance suitable for upper-level handling.
 * @private function of backupSupabase
 */
function createBackupError(error: unknown): Error {
    if (error instanceof DatabaseError || error instanceof EnvironmentMismatchError || error instanceof NotFoundError) {
        return error;
    }

    if (error instanceof Error) {
        return new DatabaseError(error.message);
    }

    return new DatabaseError('Unknown backup failure.');
}

/**
 * Ensures a filesystem path segment cannot escape the ZIP directory structure.
 *
 * @param value Raw segment.
 * @returns Sanitized segment.
 * @private function of backupSupabase
 */
function sanitizePathSegment(value: string): string {
    return value.replace(/[\\/]/g, '_');
}

/**
 * Normalizes path separators for user-facing log lines.
 *
 * @param pathValue Path that may contain Windows separators.
 * @returns Path with POSIX separators.
 * @private function of backupSupabase
 */
function normalizePathForLogs(pathValue: string): string {
    return pathValue.replaceAll('\\', '/');
}

/**
 * Left-pads an integer value with zero to two digits.
 *
 * @param value Numeric value.
 * @returns Two-digit string.
 * @private function of backupSupabase
 */
function pad2(value: number): string {
    return String(value).padStart(2, '0');
}
