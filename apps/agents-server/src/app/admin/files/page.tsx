import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { isUserGlobalAdmin } from '../../../utils/isUserGlobalAdmin';
import { AdminStorageTabs } from '../_components/AdminStorageTabs';
import { FilesGalleryClient } from './FilesGalleryClient';

/**
 * Handles files gallery page.
 */
export default async function FilesGalleryPage() {
    const [isAdmin, isGlobalAdmin] = await Promise.all([isUserAdmin(), isUserGlobalAdmin()]);

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            {isGlobalAdmin ? (
                <div className="mt-20">
                    <AdminStorageTabs activePage="files" />
                </div>
            ) : null}
            <FilesGalleryClient isHeaderOffsetEnabled={!isGlobalAdmin} />
        </div>
    );
}
