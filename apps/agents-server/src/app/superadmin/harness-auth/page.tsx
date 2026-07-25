import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserGlobalAdmin } from '../../../utils/isUserGlobalAdmin';
import { HarnessAuthClient } from './HarnessAuthClient';

/**
 * Super-admin page for configuring standalone harness authentication.
 */
export default async function HarnessAuthPage() {
    if (!(await isUserGlobalAdmin())) {
        return <ForbiddenPage />;
    }

    return <HarnessAuthClient />;
}
