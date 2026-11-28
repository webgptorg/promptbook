'use client';

import dynamic from 'next/dynamic';
import type { AgentsServerDatabaseMode } from '../../../database/agentsServerDatabaseMode';

/**
 * Props consumed by the lazy Embedded Prisma Studio client.
 *
 * @private route component props of DatabaseAdminPage
 */
type DatabaseAdminClientProps = {
    readonly databaseMode: AgentsServerDatabaseMode;
};

/**
 * Client-only Embedded Prisma Studio surface.
 */
const DatabaseAdminStudioSurface = dynamic(
    () => import('./DatabaseAdminStudioSurface').then((module) => module.DatabaseAdminStudioSurface),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">Loading database...</div>
        ),
    },
);

/**
 * Renders the Embedded Prisma Studio client after hydration.
 *
 * @param props - Active database mode.
 * @returns Database admin client.
 *
 * @private route component of DatabaseAdminPage
 */
export function DatabaseAdminClient({ databaseMode }: DatabaseAdminClientProps) {
    return <DatabaseAdminStudioSurface databaseMode={databaseMode} />;
}
