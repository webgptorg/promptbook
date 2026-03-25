import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { resolveCurrentUserIdentity } from '@/src/utils/currentUserIdentity';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { getMockedChatsForUser } from '@/src/utils/mockedChatsStore';
import { MockedChatsEditorClient } from './MockedChatsEditorClient';

/**
 * Mocked-chat utility editor page.
 */
export default async function MockedChatsEditorPage() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return <ForbiddenPage />;
    }

    const identity = await resolveCurrentUserIdentity();
    if (!identity || !identity.sessionUser) {
        return <ForbiddenPage />;
    }

    const mockedChats = await getMockedChatsForUser(identity.userId);

    return <MockedChatsEditorClient initialMockedChats={mockedChats} />;
}
