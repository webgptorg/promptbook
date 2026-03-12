import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { TaskManagerClient } from './TaskManagerClient';

/**
 * Admin task-manager page showing durable background chat work across the server.
 */
export default async function AdminTaskManagerPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return <TaskManagerClient />;
}
