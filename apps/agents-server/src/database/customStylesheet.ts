import { $provideServer } from '../tools/$provideServer';
import { $provideSupabase } from './$provideSupabase';

/**
 * Scope value used for the global (single) custom stylesheet.
 */
export const CUSTOM_STYLESHEET_SCOPE = 'GLOBAL';

/**
 * Upper bound for persisted custom CSS length.
 */
export const MAX_CUSTOM_STYLESHEET_LENGTH = 100_000;

/**
 * Database table basename that stores admin-defined CSS.
 */
const CUSTOM_STYLESHEET_TABLE_BASENAME = 'CustomStylesheet';

/**
 * Stored `CustomStylesheet` row shape.
 */
export type CustomStylesheetRow = {
    id: number;
    createdAt: string;
    updatedAt: string;
    scope: string;
    css: string;
};

/**
 * Minimal supabase error shape used by this module.
 */
type SupabaseErrorLike = {
    code?: string;
    message?: string;
};

/**
 * Dynamic query interface for `CustomStylesheet` table operations.
 *
 * Supabase schema typing cannot express runtime-composed table names, so this
 * local interface captures only operations used in this file.
 */
type DynamicCustomStylesheetTableQuery = {
    select: (columns: '*') => {
        eq: (
            column: 'scope',
            value: string,
        ) => {
            maybeSingle: () => Promise<{ data: CustomStylesheetRow | null; error: SupabaseErrorLike | null }>;
        };
    };
    upsert: (
        values: Pick<CustomStylesheetRow, 'scope' | 'css' | 'updatedAt'>,
        options: { onConflict: 'scope' },
    ) => {
        select: (columns: '*') => {
            single: () => Promise<{ data: CustomStylesheetRow; error: SupabaseErrorLike | null }>;
        };
    };
};

/**
 * Minimal dynamic supabase client used in this file.
 */
type DynamicSupabaseClient = {
    from: (tableName: string) => DynamicCustomStylesheetTableQuery;
};

/**
 * Resolves the prefixed table name for `CustomStylesheet`.
 */
async function getCustomStylesheetTableName(): Promise<string> {
    const { tablePrefix } = await $provideServer();
    return `${tablePrefix}${CUSTOM_STYLESHEET_TABLE_BASENAME}`;
}

/**
 * Returns `true` when the Supabase error indicates a missing relation/table.
 */
function isMissingRelationError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const code = typeof (error as { code?: unknown }).code === 'string' ? (error as { code: string }).code : '';
    const message =
        typeof (error as { message?: unknown }).message === 'string'
            ? (error as { message: string }).message
            : String(error);

    return code === '42P01' || /relation .* does not exist/i.test(message);
}

/**
 * Reads the current global custom stylesheet row.
 *
 * Returns `null` when there is no stored row (or when migration is not yet applied).
 */
export async function getCurrentCustomStylesheetRow(): Promise<CustomStylesheetRow | null> {
    const table = await getCustomStylesheetTableName();
    const supabase = $provideSupabase() as unknown as DynamicSupabaseClient;

    const { data, error } = await supabase.from(table).select('*').eq('scope', CUSTOM_STYLESHEET_SCOPE).maybeSingle();

    if (error) {
        if (isMissingRelationError(error)) {
            return null;
        }

        throw new Error(`Failed to load custom stylesheet: ${error.message || String(error)}`);
    }

    return (data as CustomStylesheetRow | null) || null;
}

/**
 * Reads only the CSS text of the current global stylesheet.
 */
export async function getCurrentCustomStylesheetCss(): Promise<string> {
    const row = await getCurrentCustomStylesheetRow();
    return row?.css ?? '';
}

/**
 * Persists global custom CSS using singleton upsert semantics.
 *
 * @param css - Raw CSS text to persist.
 * @returns Upserted row.
 */
export async function saveCustomStylesheetCss(css: string): Promise<CustomStylesheetRow> {
    if (css.length > MAX_CUSTOM_STYLESHEET_LENGTH) {
        throw new Error(`Custom CSS is too long. Maximum length is ${MAX_CUSTOM_STYLESHEET_LENGTH} characters.`);
    }

    const table = await getCustomStylesheetTableName();
    const supabase = $provideSupabase() as unknown as DynamicSupabaseClient;
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from(table)
        .upsert(
            {
                scope: CUSTOM_STYLESHEET_SCOPE,
                css,
                updatedAt: now,
            },
            { onConflict: 'scope' },
        )
        .select('*')
        .single();

    if (error) {
        if (isMissingRelationError(error)) {
            throw new Error('CustomStylesheet table is missing. Apply database migrations before saving custom CSS.');
        }

        throw new Error(`Failed to save custom stylesheet: ${error.message || String(error)}`);
    }

    return data as CustomStylesheetRow;
}
