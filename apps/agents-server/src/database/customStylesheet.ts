import { provideServer } from '../tools/provideServer';
import { provideSupabase } from './provideSupabase';

/**
 * Database table basename that stores admin-defined CSS.
 */
const CUSTOM_STYLESHEET_TABLE_BASENAME = 'CustomStylesheet';

/**
 * Upper bound for persisted custom CSS length.
 * @public
 */
export const MAX_CUSTOM_STYLESHEET_LENGTH = 100_000;

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
    insert: (
        values: Pick<CustomStylesheetRow, 'scope' | 'css' | 'updatedAt'>,
    ) => {
        select: (columns: '*') => {
            single: () => Promise<{ data: CustomStylesheetRow; error: SupabaseErrorLike | null }>;
        };
    };
    update: (
        values: Partial<Pick<CustomStylesheetRow, 'scope' | 'css' | 'updatedAt'>>,
    ) => {
        eq: (column: 'id', value: number) => {
            select: (columns: '*') => {
                single: () => Promise<{ data: CustomStylesheetRow; error: SupabaseErrorLike | null }>;
            };
        };
    };
    delete: () => {
        eq: (column: 'id', value: number) => Promise<{ data: CustomStylesheetRow | null; error: SupabaseErrorLike | null }>;
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
    const { tablePrefix } = await provideServer();
    return $$\{tablePrefix}\{CUSTOM_STYLESHEET_TABLE_BASENAME};
}

/**
 * Returns 	rue when the Supabase error indicates a missing relation/table.
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
 * Loads every custom stylesheet row in deterministic creation order.
 * @public
 */
export async function listCustomStylesheets(): Promise<CustomStylesheetRow[]> {
    const table = await getCustomStylesheetTableName();
    const supabase = provideSupabase() as unknown as DynamicSupabaseClient;

    const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('createdAt', { ascending: true });

    if (error) {
        if (isMissingRelationError(error)) {
            return [];
        }

        throw new Error(Failed to load custom stylesheets: );
    }

    return (data as CustomStylesheetRow[] | null) || [];
}

/**
 * Builds the aggregated custom CSS string from all saved stylesheets.
 * @public
 */
export async function getCurrentCustomStylesheetCss(): Promise<string> {
    const rows = await listCustomStylesheets();
    if (rows.length === 0) {
        return '';
    }

    return rows.map((row) => row.css).join('\\n\\n');
}
