import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { AdminConfigurationShell } from '../_components/AdminConfigurationShell';
import { LimitsClient } from './LimitsClient';

/**
 * Dedicated admin page for configuring operational server limits.
 */
export default async function LimitsPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return (
        <AdminConfigurationShell activePage="limits">
            <LimitsClient />
        </AdminConfigurationShell>
    );
}
