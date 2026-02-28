import { MAX_CUSTOM_STYLESHEET_LENGTH } from '../constants/customStylesheet';
import { $provideServer } from '../tools/$provideServer';
import { $provideSupabase } from './$provideSupabase';

/**
 * Database table basename that stores admin-defined CSS.
 */
const CUSTOM_STYLESHEET_TABLE_BASENAME = 'CustomStylesheet';

/**
 * Stored CustomStylesheet row shape.
 * @public
 */
export type CustomStylesheetRow = {
    id: number;
    createdAt: string;
    updatedAt: string;
    scope: string;
    css: string;
};

/**
 * Validation error thrown when CSS payload is invalid.
 * @public
 */
export class CustomStylesheetValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CustomStylesheetValidationError';
    }
}

/**
 * Minimal supabase error shape used by this module.
 */
type SupabaseErrorLike = {
    code?: string;
    message?: string;
};

/**
 * Dynamic query interface for CustomStylesheet table operations.
 * @private
 */
type DynamicCustomStylesheetTableQuery = {
    select: (columns: '*') => {
        order: (
            column: 'createdAt',
            options: { ascending: boolean },
        ) => Promise<{ data: CustomStylesheetRow[] | null; error: SupabaseErrorLike | null }>;
    };
    insert: (values: Pick<CustomStylesheetRow, 'scope' | 'css' | 'updatedAt'>) => {
        select: (columns: '*') => {
            single: () => Promise<{ data: CustomStylesheetRow; error: SupabaseErrorLike | null }>;
        };
    };
    update: (values: Partial<Pick<CustomStylesheetRow, 'scope' | 'css' | 'updatedAt'>>) => {
        eq: (
            column: 'id',
            value: number,
        ) => {
            select: (columns: '*') => {
                single: () => Promise<{ data: CustomStylesheetRow; error: SupabaseErrorLike | null }>;
            };
        };
    };
    delete: () => {
        eq: (
            column: 'id',
            value: number,
        ) => Promise<{ data: CustomStylesheetRow | null; error: SupabaseErrorLike | null }>;
    };
};

type DynamicSupabaseClient = {
    from: (tableName: string) => DynamicCustomStylesheetTableQuery;
};

/**
 * Resolves the prefixed table name for CustomStylesheet.
 * @private
 */
async function getCustomStylesheetTableName(): Promise<string> {
    const { tablePrefix } = await $provideServer();
    return `${tablePrefix}${CUSTOM_STYLESHEET_TABLE_BASENAME}`;
}

/**
 * Returns true when the Supabase error indicates a missing relation/table.
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
 * Returns a typed supabase client for the CustomStylesheet table.
 * @private
 */
function getCustomStylesheetClient(): DynamicSupabaseClient {
    return $provideSupabase() as unknown as DynamicSupabaseClient;
}

/**
 * Loads every custom stylesheet row in deterministic creation order.
 * @public
 */
export async function listCustomStylesheets(): Promise<CustomStylesheetRow[]> {
    const table = await getCustomStylesheetTableName();
    const supabase = getCustomStylesheetClient();

    const { data, error } = await supabase.from(table).select('*').order('createdAt', { ascending: true });

    if (error) {
        if (isMissingRelationError(error)) {
            return [];
        }

        throw new Error(`Failed to load custom stylesheets: ${error.message || String(error)}`);
    }

    return (data as CustomStylesheetRow[] | null) || [];
}

/**
 * Builds the aggregated custom CSS string from all saved stylesheets.
 * @public
 */
export async function getAggregatedCustomStylesheetCss(): Promise<string> {
    const files = await listCustomStylesheets();
    const snippets = files.map((file) => file.css).filter(Boolean);
    return snippets.join('\n\n');
}

/**
 * Input payload used when saving a custom stylesheet.
 * @public
 */
export type SaveCustomStylesheetFileInput = {
    id?: number;
    scope: string;
    css: string;
};

/**
 * Persists a single custom stylesheet entry.
 * @public
 */
export async function saveCustomStylesheetFile({
    id,
    scope,
    css,
}: SaveCustomStylesheetFileInput): Promise<CustomStylesheetRow> {
    const trimmedScope = scope.trim();

    if (!trimmedScope) {
        throw new CustomStylesheetValidationError('Stylesheet name is required.');
    }

    if (css.length > MAX_CUSTOM_STYLESHEET_LENGTH) {
        throw new CustomStylesheetValidationError(
            `Custom CSS exceeds maximum length of ${MAX_CUSTOM_STYLESHEET_LENGTH} characters.`,
        );
    }

    const table = await getCustomStylesheetTableName();
    const supabase = getCustomStylesheetClient();
    const now = new Date().toISOString();
    const values = { scope: trimmedScope, css, updatedAt: now };

    const query = id ? supabase.from(table).update(values).eq('id', id) : supabase.from(table).insert(values);
    const { data, error } = await query.select('*').single();

    if (error) {
        if (isMissingRelationError(error)) {
            throw new Error('CustomStylesheet table is missing. Apply database migrations before saving CSS.');
        }

        if (error.code === '23505') {
            throw new CustomStylesheetValidationError('A stylesheet with this name already exists.');
        }

        throw new Error(`Failed to save custom stylesheet: ${error.message || String(error)}`);
    }

    return data as CustomStylesheetRow;
}

/**
 * Deletes a persisted stylesheet row.
 * @public
 */
export async function deleteCustomStylesheetFile(id: number): Promise<void> {
    const table = await getCustomStylesheetTableName();
    const supabase = getCustomStylesheetClient();

    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) {
        if (isMissingRelationError(error)) {
            throw new Error(
                'CustomStylesheet table is missing. Apply database migrations before deleting stylesheets.',
            );
        }

        throw new Error(`Failed to delete custom stylesheet: ${error.message || String(error)}`);
    }
}
