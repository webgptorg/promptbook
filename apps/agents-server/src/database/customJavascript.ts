import { $provideServer } from '../tools/$provideServer';
import { $provideSupabase } from './$provideSupabase';
import { getAnalyticsCustomJavascript } from '../utils/analytics/analyticsIntegrations';

/**
 * Upper bound for persisted custom JavaScript length.
 * @private
 */
export const MAX_CUSTOM_JAVASCRIPT_LENGTH = 100_000;

const CUSTOM_JAVASCRIPT_TABLE_BASENAME = 'CustomJavascript';

/**
 * Stored `CustomJavascript` row shape.
 * @private
 */
export type CustomJavascriptRow = {
    id: number;
    createdAt: string;
    updatedAt: string | null;
    scope: string;
    javascript: string;
};

/**
 * Validation error thrown when the provided script data is invalid.
 * @private
 */
export class CustomJavascriptValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CustomJavascriptValidationError';
    }
}

/**
 * Minimal supabase error shape used by this module.
 * @private
 */
type SupabaseErrorLike = {
    code?: string;
    message?: string;
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
 * Returns a typed supabase client for the `CustomJavascript` table.
 * @private
 */
function getCustomJavascriptClient() {
    return $provideSupabase() as unknown as { from: (tableName: string) => any };
}

/**
 * Reads every custom JavaScript row stored in the database.
 *
 * When the table is missing, returns an empty list so callers can emit defaults.
 * @private
 */
export async function getCustomJavascriptFiles(): Promise<CustomJavascriptRow[]> {
    const table = await getCustomJavascriptTableName();
    const supabase = getCustomJavascriptClient();

    const { data, error } = await supabase.from(table).select('*').order('scope', { ascending: true });

    if (error) {
        if (isMissingRelationError(error)) {
            return [];
        }

        throw new Error(`Failed to load custom JavaScript: ${error.message || String(error)}`);
    }

    return (data as CustomJavascriptRow[] | null) || [];
}

/**
 * Reads only the aggregated JavaScript text of all configured scripts.
 * @private
 */
export async function getCurrentCustomJavascriptText(): Promise<string> {
    const rows = await getCustomJavascriptFiles();
    const snippets = rows.map((row) => row.javascript).filter(Boolean);
    return snippets.join('\n\n');
}

/**
 * Builds the aggregated custom JavaScript combined with the analytics integrations.
 * @private
 */
export async function getCustomJavascriptWithIntegrations(): Promise<string> {
    const [customScript, analyticsScript] = await Promise.all([
        getCurrentCustomJavascriptText(),
        getAnalyticsCustomJavascript(),
    ]);

    return [customScript, analyticsScript].filter(Boolean).join('\n\n');
}

/**
 * Input payload used when saving a custom JavaScript file.
 * @private
 */
export type SaveCustomJavascriptFileInput = {
    id?: number;
    scope: string;
    javascript: string;
};

/**
 * Persists a single custom JavaScript file.
 *
 * Supports inserts and updates while enforcing length and naming constraints.
 * @private
 */
export async function saveCustomJavascriptFile({
    id,
    scope,
    javascript,
}: SaveCustomJavascriptFileInput): Promise<CustomJavascriptRow> {
    const trimmedScope = scope.trim();
    if (!trimmedScope) {
        throw new CustomJavascriptValidationError('Custom JavaScript file name is required.');
    }

    if (javascript.length > MAX_CUSTOM_JAVASCRIPT_LENGTH) {
        throw new CustomJavascriptValidationError(
            `Custom JavaScript is too long. Maximum length is ${MAX_CUSTOM_JAVASCRIPT_LENGTH} characters.`,
        );
    }

    const table = await getCustomJavascriptTableName();
    const supabase = getCustomJavascriptClient();
    const now = new Date().toISOString();
    const values = { scope: trimmedScope, javascript, updatedAt: now };

    const query = id
        ? supabase.from(table).update(values).eq('id', id)
        : supabase.from(table).insert(values);

    const { data, error } = await query.select('*').single();

    if (error) {
        if (isMissingRelationError(error)) {
            throw new Error(
                'CustomJavascript table is missing. Apply database migrations before saving custom JavaScript.',
            );
        }

        if (error.code === '23505') {
            throw new CustomJavascriptValidationError('A custom JavaScript file with this name already exists.');
        }

        throw new Error(`Failed to save custom JavaScript: ${error.message || String(error)}`);
    }

    return data as CustomJavascriptRow;
}

/**
 * Deletes a persisted custom JavaScript file.
 * @private
 */
export async function deleteCustomJavascriptFile(id: number): Promise<void> {
    const table = await getCustomJavascriptTableName();
    const supabase = getCustomJavascriptClient();

    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) {
        if (isMissingRelationError(error)) {
            throw new Error('CustomJavascript table is missing. Apply database migrations before deleting files.');
        }

        throw new Error(`Failed to delete custom JavaScript: ${error.message || String(error)}`);
    }
}
