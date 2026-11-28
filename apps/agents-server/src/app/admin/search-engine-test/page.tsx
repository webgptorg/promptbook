import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { SearchEngineTestClient } from './SearchEngineTestClient';

/**
 * Handles search engine test page.
 */
export default async function SearchEngineTestPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return <SearchEngineTestClient />;
}
