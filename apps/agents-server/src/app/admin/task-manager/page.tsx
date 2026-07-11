import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { isUserGlobalAdmin } from '../../../utils/isUserGlobalAdmin';
import { TaskManagerClient } from './TaskManagerClient';

/**
 * Admin task-manager page showing durable background chat work across the server.
 */
export default async function AdminTaskManagerPage() {
    const [isAdmin, isSuperAdmin] = await Promise.all([isUserAdmin(), isUserGlobalAdmin()]);

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return <TaskManagerClient isSuperAdmin={isSuperAdmin} />;
}
