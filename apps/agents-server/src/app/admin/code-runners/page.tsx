import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserGlobalAdmin } from '../../../utils/isUserGlobalAdmin';
import { CodeRunnersClient } from './CodeRunnersClient';

/**
 * Super-admin page for configuring standalone code runners.
 */
export default async function CodeRunnersPage() {
    if (!(await isUserGlobalAdmin())) {
        return <ForbiddenPage />;
    }

    return <CodeRunnersClient />;
}
