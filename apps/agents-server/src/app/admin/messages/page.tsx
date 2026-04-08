import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { MessagesClient } from './MessagesClient';

/**
 * Handles admin messages page.
 */
export default async function AdminMessagesPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return <MessagesClient />;
}
