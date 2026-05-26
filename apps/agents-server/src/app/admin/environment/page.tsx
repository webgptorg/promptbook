import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { AdminConfigurationShell } from '../_components/AdminConfigurationShell';
import { EnvironmentVariablesClient } from './EnvironmentVariablesClient';

/**
 * Page for viewing and editing standalone VPS `.env` variables.
 */
export default async function EnvironmentVariablesPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return (
        <AdminConfigurationShell activePage="environment">
            <EnvironmentVariablesClient />
        </AdminConfigurationShell>
    );
}
