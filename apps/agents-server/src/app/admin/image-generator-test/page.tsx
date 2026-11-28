import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { ImageGeneratorTestClient } from './ImageGeneratorTestClient';

/**
 * Handles image generator test page.
 */
export default async function ImageGeneratorTestPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return <ImageGeneratorTestClient />;
}
