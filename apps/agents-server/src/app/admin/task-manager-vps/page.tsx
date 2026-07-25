import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserGlobalAdmin } from '../../../utils/isUserGlobalAdmin';
import { TaskManagerClient } from '../task-manager/TaskManagerClient';

/**
 * Superadmin task-manager page showing durable background chat work across every server on the VPS.
 */
export default async function AdminVpsTaskManagerPage() {
    if (!(await isUserGlobalAdmin())) {
        return <ForbiddenPage />;
    }

    return <TaskManagerClient isSuperAdmin scope="vps" />;
}
