import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserGlobalAdmin } from '../../../utils/isUserGlobalAdmin';
import { UpdateClient } from './UpdateClient';

/**
 * Super-admin page for branch-aware standalone VPS self-updates.
 */
export default async function UpdatePage() {
    if (!(await isUserGlobalAdmin())) {
        return <ForbiddenPage />;
    }

    return <UpdateClient />;
}
