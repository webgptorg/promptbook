import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { BrowserTestClient } from './BrowserTestClient';

/**
 * Handles browser test page.
 */
export default async function BrowserTestPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return <BrowserTestClient />;
}
