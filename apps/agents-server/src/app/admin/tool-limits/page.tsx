import { redirect } from 'next/navigation';
import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';

/**
 * Legacy admin route kept as a redirect to the generalized Limits page.
 */
export default async function AdminToolLimitsPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    redirect('/admin/limits');
}
