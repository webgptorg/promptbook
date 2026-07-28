import { ForbiddenPage } from '../../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../../utils/isUserAdmin';
import { isUserGlobalAdmin } from '../../../../utils/isUserGlobalAdmin';
import { TaskManagerTaskDetailClient } from './TaskManagerTaskDetailClient';

/**
 * Admin detail page showing everything known about one durable background task.
 */
export default async function AdminTaskManagerTaskDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ taskId: string }>;
    searchParams?: Promise<{ serverDomain?: string }>;
}) {
    const [{ taskId: rawTaskId }, resolvedSearchParams, isAdmin, isSuperAdmin] = await Promise.all([
        params,
        searchParams,
        isUserAdmin(),
        isUserGlobalAdmin(),
    ]);

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return (
        <TaskManagerTaskDetailClient
            taskId={decodeURIComponent(rawTaskId)}
            isSuperAdmin={isSuperAdmin}
            serverDomain={resolvedSearchParams?.serverDomain || null}
        />
    );
}
