import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserGlobalAdmin } from '../../../utils/isUserGlobalAdmin';
import { TaskManagerClient } from '../../admin/task-manager/TaskManagerClient';

/**
 * Superadmin task-manager page showing durable background work across every server on the VPS.
 */
export default async function SuperadminTaskManagerPage() {
    if (!(await isUserGlobalAdmin())) {
        return <ForbiddenPage />;
    }

    return <TaskManagerClient isSuperAdmin scope="vps" />;
}
