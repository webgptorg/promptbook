import { $provideServer } from '../tools/$provideServer';
import { $provideSupabase } from './$provideSupabase';

/**
 * Scope value used for the global (single) custom JavaScript.
 * @private
 */
export const CUSTOM_JAVASCRIPT_SCOPE = 'GLOBAL';

/**
 * Upper bound for persisted custom JavaScript length.
 * @private
 */
export const MAX_CUSTOM_JAVASCRIPT_LENGTH = 100_000;

/**
 * Database table basename that stores admin-defined JavaScript.
 */
const CUSTOM_JAVASCRIPT_TABLE_BASENAME = 'CustomJavascript';

/**
 * Stored `CustomJavascript` row shape.
 * @private
 */
export type CustomJavascriptRow = {
    id: number;
    createdAt: string;
    updatedAt: string;
    scope: string;
    javascript: string;
};

/**
 * Minimal supabase error shape used by this module.
 * @private
 */
type SupabaseErrorLike = {
    code?: string;
    message?: string;
};

/**
 * Dynamic query interface for `CustomJavascript` table operations.
 *
 * Supabase schema typing cannot express runtime-composed table names, so this
 * local interface captures only operations used in this file.
 * @private
 */
type DynamicCustomJavascriptTableQuery = {
    select: (columns: '*') => {
        eq: (
            column: 'scope',
            value: string,
        ) => {
            maybeSingle: () => Promise<{ data: CustomJavascriptRow | null; error: SupabaseErrorLike | null }>;
        };
    };
    upsert: (
        values: Pick<CustomJavascriptRow, 'scope' | 'javascript' | 'updatedAt'>,
        options: { onConflict: 'scope' },
    ) => {
        select: (columns: '*') => {
            single: () => Promise<{ data: CustomJavascriptRow; error: SupabaseErrorLike | null }>;
        };
    };
};

/**
 * Minimal dynamic supabase client used in this file.
 * @private
 */
type DynamicSupabaseClient = {
    from: (tableName: string) => DynamicCustomJavascriptTableQuery;
};

/**
 * Resolves the prefixed table name for `CustomJavascript`.
 * @private
 */
async function getCustomJavascriptTableName(): Promise<string> {
    const { tablePrefix } = await $provideServer();
    return `${tablePrefix}${CUSTOM_JAVASCRIPT_TABLE_BASENAME}`;
}

/**
 * Returns `true` when Supabase indicates the table is missing.
 * @private
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
 * Reads the current global custom JavaScript row.
 *
 * Returns `null` when the table is missing or the row is absent.
 * @private
 */
export async function getCurrentCustomJavascriptRow(): Promise<CustomJavascriptRow | null> {
    const table = await getCustomJavascriptTableName();
    const supabase = $provideSupabase() as unknown as DynamicSupabaseClient;

    const { data, error } = await supabase.from(table).select('*').eq('scope', CUSTOM_JAVASCRIPT_SCOPE).maybeSingle();

    if (error) {
        if (isMissingRelationError(error)) {
            return null;
        }

        throw new Error(`Failed to load custom JavaScript: ${error.message || String(error)}`);
    }

    return (data as CustomJavascriptRow | null) || null;
}

/**
 * Reads only the JavaScript text of the current global script.
 * @private
 */
export async function getCurrentCustomJavascriptText(): Promise<string> {
    const row = await getCurrentCustomJavascriptRow();
    return row?.javascript ?? '';
}

/**
 * Persists global custom JavaScript using singleton upsert semantics.
 *
 * @param javascript - Raw JavaScript text to persist.
 * @returns Upserted row.
 * @private
 */
export async function saveCustomJavascriptText(javascript: string): Promise<CustomJavascriptRow> {
    if (javascript.length > MAX_CUSTOM_JAVASCRIPT_LENGTH) {
        throw new Error(`Custom JavaScript is too long. Maximum length is ${MAX_CUSTOM_JAVASCRIPT_LENGTH} characters.`);
    }

    const table = await getCustomJavascriptTableName();
    const supabase = $provideSupabase() as unknown as DynamicSupabaseClient;
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from(table)
        .upsert(
            {
                scope: CUSTOM_JAVASCRIPT_SCOPE,
                javascript,
                updatedAt: now,
            },
            { onConflict: 'scope' },
        )
        .select('*')
        .single();

    if (error) {
        if (isMissingRelationError(error)) {
            throw new Error(
                'CustomJavascript table is missing. Apply database migrations before saving custom JavaScript.',
            );
        }

        throw new Error(`Failed to save custom JavaScript: ${error.message || String(error)}`);
    }

    return data as CustomJavascriptRow;
}
