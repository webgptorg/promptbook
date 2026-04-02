import { getPublicMockedChatById } from '@/src/utils/mockedChatsStore';
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
    const searchParams = await props.searchParams;
    const mockedChatId = searchParams.chat || null;
    const mockedChat = mockedChatId ? await getPublicMockedChatById(mockedChatId) : null;
    const mockedChats = mockedChat ? [mockedChat] : [];

    return <MockedChatsViewerClient mockedChats={mockedChats} initialMockedChatId={mockedChatId} />;
}
