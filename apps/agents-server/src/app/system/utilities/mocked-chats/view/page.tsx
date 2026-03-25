import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { resolveCurrentUserIdentity } from '@/src/utils/currentUserIdentity';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { getMockedChatsForUser } from '@/src/utils/mockedChatsStore';
import { MockedChatsViewerClient } from './MockedChatsViewerClient';

/**
 * Query parameters accepted by mocked-chat viewer page.
 */
type MockedChatsViewerPageSearchParams = Promise<{
    chat?: string;
}>;

/**
 * Dedicated mocked-chat recording viewer route.
 */
export default async function MockedChatsViewerPage(props: { searchParams: MockedChatsViewerPageSearchParams }) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return <ForbiddenPage />;
    }

    const identity = await resolveCurrentUserIdentity();
    if (!identity || !identity.sessionUser) {
        return <ForbiddenPage />;
    }

    const searchParams = await props.searchParams;
    const mockedChats = await getMockedChatsForUser(identity.userId);

    return <MockedChatsViewerClient mockedChats={mockedChats} initialMockedChatId={searchParams.chat || null} />;
}
