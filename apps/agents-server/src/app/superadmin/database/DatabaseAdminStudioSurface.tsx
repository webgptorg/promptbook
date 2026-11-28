'use client';

import { createStudioBFFClient } from '@prisma/studio-core/data/bff';
import { createPostgresAdapter } from '@prisma/studio-core/data/postgres-core';
import { createSQLiteAdapter } from '@prisma/studio-core/data/sqlite-core';
import { Studio } from '@prisma/studio-core/ui';
import { useMemo } from 'react';
import type { AgentsServerDatabaseMode } from '../../../database/agentsServerDatabaseMode';

/**
 * Backend endpoint used by Embedded Prisma Studio.
 */
const DATABASE_ADMIN_STUDIO_ENDPOINT = '/api/admin/database/studio';

/**
 * Props consumed by the hydrated Embedded Prisma Studio surface.
 *
 * @private route component props of DatabaseAdminPage
 */
type DatabaseAdminStudioSurfaceProps = {
    readonly databaseMode: AgentsServerDatabaseMode;
};

/**
 * Renders Prisma Studio with an adapter matching the configured database backend.
 *
 * @param props - Active database mode.
 * @returns Embedded Prisma Studio surface.
 *
 * @private route component of DatabaseAdminPage
 */
export function DatabaseAdminStudioSurface({ databaseMode }: DatabaseAdminStudioSurfaceProps) {
    const adapter = useMemo(() => {
        const executor = createStudioBFFClient({
            url: DATABASE_ADMIN_STUDIO_ENDPOINT,
        });

        return databaseMode === 'sqlite' ? createSQLiteAdapter({ executor }) : createPostgresAdapter({ executor });
    }, [databaseMode]);

    return <Studio adapter={adapter} />;
}
