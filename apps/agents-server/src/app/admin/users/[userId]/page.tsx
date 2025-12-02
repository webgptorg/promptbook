'use server';

import { ForbiddenPage } from '../../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../../utils/isUserAdmin';
import { UserDetailClient } from './UserDetailClient';

export default async function UserDetailPage({
    params,
}: {
    params: Promise<{ userId: string }>;
}) {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    const { userId } = await params;

    return <UserDetailClient userId={decodeURIComponent(userId)} />;
}
