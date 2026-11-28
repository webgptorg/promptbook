import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { BackupClient } from './BackupClient';

/**
 * Admin-only backups page.
 */
export default async function AdminBackupPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return <BackupClient />;
}
