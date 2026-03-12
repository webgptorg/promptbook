import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserGlobalAdmin } from '../../../utils/isUserGlobalAdmin';
import { ServersClient } from './ServersClient';

/**
 * Global-admin page for managing same-instance registered servers.
 */
export default async function AdminServersPage() {
    if (!(await isUserGlobalAdmin())) {
        return <ForbiddenPage />;
    }

    return <ServersClient />;
}
