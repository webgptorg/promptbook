import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { CustomJsClient } from './CustomJsClient';

/**
 * Admin page for managing global custom JavaScript injected into Agents Server pages.
 */
export default async function CustomJsPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return <CustomJsClient />;
}
