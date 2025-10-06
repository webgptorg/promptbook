'use client';

// ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten
// `@promptbook/components`

import type { AvatarChipProps } from '../book-components/AvatarProfile/AvatarChip/AvatarChip';
import { AvatarChip } from '../book-components/AvatarProfile/AvatarChip/AvatarChip';
import type { AvatarChipFromSourceProps } from '../book-components/AvatarProfile/AvatarChip/AvatarChipFromSource';
import { AvatarChipFromSource } from '../book-components/AvatarProfile/AvatarChip/AvatarChipFromSource';
import type { AvatarProfileProps } from '../book-components/AvatarProfile/AvatarProfile/AvatarProfile';
import { AvatarProfile } from '../book-components/AvatarProfile/AvatarProfile/AvatarProfile';
import type { AvatarProfileFromSourceProps } from '../book-components/AvatarProfile/AvatarProfile/AvatarProfileFromSource';
import { AvatarProfileFromSource } from '../book-components/AvatarProfile/AvatarProfile/AvatarProfileFromSource';
import type { BookEditorProps } from '../book-components/BookEditor/BookEditor';
import { BookEditor } from '../book-components/BookEditor/BookEditor';
import { DEFAULT_BOOK_FONT_CLASS } from '../book-components/BookEditor/config';
import { Chat } from '../book-components/Chat/Chat/Chat';
import type { ChatProps } from '../book-components/Chat/Chat/ChatProps';
import { useChatAutoScroll } from '../book-components/Chat/hooks/useChatAutoScroll';
import type { SendMessageToLlmChatFunction } from '../book-components/Chat/hooks/useSendMessageToLlmChat';
import { useSendMessageToLlmChat } from '../book-components/Chat/hooks/useSendMessageToLlmChat';
import { LlmChat } from '../book-components/Chat/LlmChat/LlmChat';
import type { LlmChatProps } from '../book-components/Chat/LlmChat/LlmChatProps';
import {
    BLOCKY_FLOW,
    FAST_FLOW,
    MOCKED_CHAT_DELAY_CONFIGS,
    NORMAL_FLOW,
    RANDOM_FLOW,
    SLOW_FLOW,
} from '../book-components/Chat/MockedChat/constants';
import type { MockedChatDelayConfig, MockedChatProps } from '../book-components/Chat/MockedChat/MockedChat';
import { MockedChat } from '../book-components/Chat/MockedChat/MockedChat';
import { CHAT_SAVE_FORMATS } from '../book-components/Chat/save';
import type { ChatSaveFormatDefinition } from '../book-components/Chat/save/_common/ChatSaveFormatDefinition';
import { getChatSaveFormatDefinitions } from '../book-components/Chat/save/_common/getChatSaveFormatDefinitions';
import type { string_chat_format_name } from '../book-components/Chat/save/_common/string_chat_format_name';
import { htmlSaveFormatDefinition } from '../book-components/Chat/save/html/htmlSaveFormatDefinition';
import { jsonSaveFormatDefinition } from '../book-components/Chat/save/json/jsonSaveFormatDefinition';
import { mdSaveFormatDefinition } from '../book-components/Chat/save/markdown/mdSaveFormatDefinition';
import { txtSaveFormatDefinition } from '../book-components/Chat/save/text/txtSaveFormatDefinition';
import type { ChatMessage } from '../book-components/Chat/types/ChatMessage';
import type { ChatParticipant } from '../book-components/Chat/types/ChatParticipant';
import type { MessageButton } from '../book-components/Chat/utils/parseMessageButtons';
import { parseMessageButtons } from '../book-components/Chat/utils/parseMessageButtons';
import { isMarkdownContent, renderMarkdown } from '../book-components/Chat/utils/renderMarkdown';
import { ArrowIcon } from '../book-components/icons/ArrowIcon';
import { AttachmentIcon } from '../book-components/icons/AttachmentIcon';
import { CloseIcon } from '../book-components/icons/CloseIcon';
import { PauseIcon } from '../book-components/icons/PauseIcon';
import { PlayIcon } from '../book-components/icons/PlayIcon';
import { ResetIcon } from '../book-components/icons/ResetIcon';
import { SendIcon } from '../book-components/icons/SendIcon';
import { TemplateIcon } from '../book-components/icons/TemplateIcon';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../version';

// Note: Exporting version from each package
export { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION };

// Note: Entities of the `@promptbook/components`
export {
    ArrowIcon,
    AttachmentIcon,
    AvatarChip,
    AvatarChipFromSource,
    AvatarProfile,
    AvatarProfileFromSource,
    BLOCKY_FLOW,
    BookEditor,
    Chat,
    CHAT_SAVE_FORMATS,
    CloseIcon,
    DEFAULT_BOOK_FONT_CLASS,
    FAST_FLOW,
    getChatSaveFormatDefinitions,
    htmlSaveFormatDefinition,
    isMarkdownContent,
    jsonSaveFormatDefinition,
    LlmChat,
    mdSaveFormatDefinition,
    MOCKED_CHAT_DELAY_CONFIGS,
    MockedChat,
    NORMAL_FLOW,
    parseMessageButtons,
    PauseIcon,
    PlayIcon,
    RANDOM_FLOW,
    renderMarkdown,
    ResetIcon,
    SendIcon,
    SLOW_FLOW,
    TemplateIcon,
    txtSaveFormatDefinition,
    useChatAutoScroll,
    useSendMessageToLlmChat,
};
export type {
    AvatarChipFromSourceProps,
    AvatarChipProps,
    AvatarProfileFromSourceProps,
    AvatarProfileProps,
    BookEditorProps,
    ChatMessage,
    ChatParticipant,
    ChatProps,
    ChatSaveFormatDefinition,
    LlmChatProps,
    MessageButton,
    MockedChatDelayConfig,
    MockedChatProps,
    SendMessageToLlmChatFunction,
    string_chat_format_name,
};
