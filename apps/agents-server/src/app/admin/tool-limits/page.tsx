import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { ToolLimitsClient } from './ToolLimitsClient';

/**
 * Admin page for configuring timeout-related tool limits.
 */
export default async function AdminToolLimitsPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return <ToolLimitsClient />;
}
