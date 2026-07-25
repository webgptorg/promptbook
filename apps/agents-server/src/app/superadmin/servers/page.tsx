import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { ServersClient } from './ServersClient';

/**
 * Admin page for viewing same-instance registered servers.
 */
export default async function AdminServersPage() {
    if (!(await isUserAdmin())) {
        return <ForbiddenPage />;
    }

    return <ServersClient />;
}
