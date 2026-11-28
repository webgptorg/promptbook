import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { CustomCssClient } from './CustomCssClient';

/**
 * Admin page for managing global custom CSS injected into Agents Server pages.
 */
export default async function CustomCssPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return <CustomCssClient />;
}
