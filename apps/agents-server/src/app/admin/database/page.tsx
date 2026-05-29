import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { resolveAgentsServerDatabaseMode } from '../../../database/agentsServerDatabaseMode';
import { isUserGlobalAdmin } from '../../../utils/isUserGlobalAdmin';
import { DatabaseAdminClient } from './DatabaseAdminClient';

/**
 * Super-admin page exposing raw database access through Embedded Prisma Studio.
 */
export default async function DatabaseAdminPage() {
    if (!(await isUserGlobalAdmin())) {
        return <ForbiddenPage />;
    }

    const databaseMode = resolveAgentsServerDatabaseMode();
    const databaseModeLabel =
        databaseMode === 'sqlite' ? 'SQLite' : databaseMode === 'postgres' ? 'PostgreSQL' : 'Supabase';

    return (
        <div className="flex h-[calc(100vh-60px)] flex-col overflow-hidden bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-3 dark:border-gray-800">
                <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-gray-400">Super Admin</p>
                    <h1 className="text-xl font-semibold">Database</h1>
                </div>
                <span className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 dark:border-gray-700 dark:text-gray-300">
                    {databaseModeLabel}
                </span>
            </div>
            <div className="min-h-0 flex-1">
                <DatabaseAdminClient databaseMode={databaseMode} />
            </div>
        </div>
    );
}
