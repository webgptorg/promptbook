import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { ImageGeneratorTestClient } from './ImageGeneratorTestClient';

export default async function ImageGeneratorTestPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return <ImageGeneratorTestClient />;
}
