import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserGlobalAdmin } from '../../../utils/isUserGlobalAdmin';
import { LogsClient } from './LogsClient';

/**
 * Super-admin page for viewing standalone VPS pm2 logs.
 */
export default async function LogsPage() {
    if (!(await isUserGlobalAdmin())) {
        return <ForbiddenPage />;
    }

    return <LogsClient />;
}
