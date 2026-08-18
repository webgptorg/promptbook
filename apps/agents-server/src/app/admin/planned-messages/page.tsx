import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { isUserGlobalAdmin } from '../../../utils/isUserGlobalAdmin';
import { PlannedMessageManagerClient } from './PlannedMessageManagerClient';

/**
 * Admin page managing every planned message (durable chat timeout) of the server.
 */
export default async function AdminPlannedMessagesPage() {
    const [isAdmin, isSuperAdmin] = await Promise.all([isUserAdmin(), isUserGlobalAdmin()]);

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return <PlannedMessageManagerClient isSuperAdmin={isSuperAdmin} />;
}
