import type { PostgrestError } from '@supabase/postgrest-js';
import { assertsError } from '../../errors/assertsError';

/**
 * Pattern used to extract the violated unique constraint name from a Supabase error message.
 */
const UNIQUE_CONSTRAINT_PATTERN = /unique constraint "([^\"]+)"/i;

/**
 * Holds the data necessary to translate a Postgres constraint name into a user-facing error.
 *
 * @private Internal helper for Supabase-backed collections
 */
export type UniqueConstraintTranslation = {
    /**
     * The suffix of the constraint name that should trigger this translation.
     */
    readonly suffix: string;
    /**
     * Builds the domain-specific error to throw when the constraint matches.
     */
    readonly buildError: () => Error;
};

/**
 * Extracts the constraint identifier from the database error message.
 *
 * @param message - Supabase error message text.
 * @returns The quoted constraint name when available.
 */
function extractConstraintName(message?: string | null): string | null {
    if (!message) {
        return null;
    }

    const match = message.match(UNIQUE_CONSTRAINT_PATTERN);
    return match ? match[1] ?? null : null;
}

/**
 * Detects whether the provided Postgrest error is a unique constraint violation.
 *
 * @param error - Supabase error payload.
 * @returns True when the error represents a unique constraint violation.
 */
function isUniqueConstraintViolation(error?: PostgrestError | null): boolean {
    return error?.code === '23505';
}

/**
 * Converts a Supabase unique constraint violation into a domain-specific error.
 *
 * @param error - Resulting Postgrest error from Supabase.
 * @param translations - Array of translations keyed by constraint suffix.
 * @returns A translated error when the constraint suffix matches, otherwise `null`.
 * @private Internal helper for Supabase-backed collections
 */
export function translateSupabaseUniqueConstraintError(
    error: PostgrestError | null,
    translations: ReadonlyArray<UniqueConstraintTranslation>,
): Error | null {
    if (!isUniqueConstraintViolation(error)) {
        return null;
    }

    assertsError(error);

    const constraintName = extractConstraintName(error.message);
    if (!constraintName) {
        return null;
    }

    for (const translation of translations) {
        if (constraintName.endsWith(translation.suffix)) {
            return translation.buildError();
        }
    }

    return null;
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
