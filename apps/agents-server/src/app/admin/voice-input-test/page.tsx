import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { VoiceInputTestClient } from './VoiceInputTestClient';

/**
 * Handles voice input test page.
 */
export default async function VoiceInputTestPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return <VoiceInputTestClient />;
}
