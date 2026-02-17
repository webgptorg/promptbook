import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { UserProfileClient } from './UserProfileClient';

export default async function UserProfilePage() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return <ForbiddenPage />;
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="mx-auto max-w-4xl space-y-8">
                <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.4em] text-gray-400">System</p>
                    <h1 className="text-3xl font-semibold text-gray-900">Profile</h1>
                    <p className="text-sm text-gray-600">
                        Choose a friendly image that will appear in the header user menu and control panel.
                    </p>
                </div>
                <UserProfileClient
                    username={currentUser.username}
                    initialProfileImageUrl={currentUser.profileImageUrl}
                />
            </div>
        </div>
    );
}
