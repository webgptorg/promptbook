import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { UsersList } from '../../../components/UsersList/UsersList';
import { isUserAdmin } from '../../../utils/isUserAdmin';

export default async function AdminUsersPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    // Full users management (list + create) is only available on this page
    return (
        <div className="container mx-auto px-4 py-8">
            <UsersList allowCreate />
        </div>
    );
}
