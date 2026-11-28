import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { TranscriptionsClient } from './TranscriptionsClient';

/**
 * Admin-only long-running transcription testing page.
 */
export default async function AdminTranscriptionsPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    return <TranscriptionsClient />;
}

