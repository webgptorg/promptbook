import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { FilesGalleryClient } from './FilesGalleryClient';

/**
 * Handles files gallery page.
 */
export default async function FilesGalleryPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return <FilesGalleryClient />;
}
