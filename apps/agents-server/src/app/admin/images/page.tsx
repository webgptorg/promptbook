import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { ImagesGalleryClient } from './ImagesGalleryClient';

/**
 * Handles images gallery page.
 */
export default async function ImagesGalleryPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return <ImagesGalleryClient />;
}
