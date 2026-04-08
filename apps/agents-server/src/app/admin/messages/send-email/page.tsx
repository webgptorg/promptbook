import { ForbiddenPage } from '../../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../../utils/isUserAdmin';
import { SendEmailClient } from './SendEmailClient';

/**
 * Handles admin send email page.
 */
export default async function AdminSendEmailPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return <SendEmailClient />;
}
