import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserGlobalAdmin } from '../../../utils/isUserGlobalAdmin';
import { CliAccessClient } from './CliAccessClient';

/**
 * Super-admin page for raw browser-based access to the VPS shell.
 */
export default async function CliAccessPage() {
    if (!(await isUserGlobalAdmin())) {
        return <ForbiddenPage />;
    }

    return <CliAccessClient />;
}
