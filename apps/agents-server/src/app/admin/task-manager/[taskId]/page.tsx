import { ForbiddenPage } from '../../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../../utils/isUserAdmin';
import { isUserGlobalAdmin } from '../../../../utils/isUserGlobalAdmin';
import { TaskManagerTaskDetailClient } from './TaskManagerTaskDetailClient';

/**
 * Admin detail page showing everything known about one durable background task.
 */
export default async function AdminTaskManagerTaskDetailPage({
    params,
}: {
    params: Promise<{ taskId: string }>;
}) {
    const [{ taskId: rawTaskId }, isAdmin, isSuperAdmin] = await Promise.all([
        params,
        isUserAdmin(),
        isUserGlobalAdmin(),
    ]);

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return <TaskManagerTaskDetailClient taskId={decodeURIComponent(rawTaskId)} isSuperAdmin={isSuperAdmin} />;
}
