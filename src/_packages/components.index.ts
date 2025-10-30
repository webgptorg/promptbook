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
import { BookEditor, DEFAULT_BOOK_EDITOR_HEIGHT } from '../book-components/BookEditor/BookEditor';
import { Chat } from '../book-components/Chat/Chat/Chat';
import type { ChatProps } from '../book-components/Chat/Chat/ChatProps';
import { useChatAutoScroll } from '../book-components/Chat/hooks/useChatAutoScroll';
import type { SendMessageToLlmChatFunction } from '../book-components/Chat/hooks/useSendMessageToLlmChat';
import { useSendMessageToLlmChat } from '../book-components/Chat/hooks/useSendMessageToLlmChat';
import { LlmChat } from '../book-components/Chat/LlmChat/LlmChat';
import type { LlmChatProps } from '../book-components/Chat/LlmChat/LlmChatProps';
import { MarkdownContent } from '../book-components/Chat/MarkdownContent/MarkdownContent';
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
import type { ChatSaveFormatDefinition } from '../book-components/Chat/save/_common/ChatSaveFormatDefinition';
import { getChatSaveFormatDefinitions } from '../book-components/Chat/save/_common/getChatSaveFormatDefinitions';
import type { string_chat_format_name } from '../book-components/Chat/save/_common/string_chat_format_name';
import { htmlSaveFormatDefinition } from '../book-components/Chat/save/html/htmlSaveFormatDefinition';
import { CHAT_SAVE_FORMATS } from '../book-components/Chat/save/index';
import { jsonSaveFormatDefinition } from '../book-components/Chat/save/json/jsonSaveFormatDefinition';
import { mdSaveFormatDefinition } from '../book-components/Chat/save/markdown/mdSaveFormatDefinition';
import { pdfSaveFormatDefinition } from '../book-components/Chat/save/pdf/pdfSaveFormatDefinition';
import { reactSaveFormatDefinition } from '../book-components/Chat/save/react/reactSaveFormatDefinition';
import { txtSaveFormatDefinition } from '../book-components/Chat/save/text/txtSaveFormatDefinition';
import type { ChatMessage } from '../book-components/Chat/types/ChatMessage';
import type { ChatParticipant } from '../book-components/Chat/types/ChatParticipant';
import type { MessageButton } from '../book-components/Chat/utils/parseMessageButtons';
import { parseMessageButtons } from '../book-components/Chat/utils/parseMessageButtons';
import { ArrowIcon } from '../book-components/icons/ArrowIcon';
import { AttachmentIcon } from '../book-components/icons/AttachmentIcon';
import { CloseIcon } from '../book-components/icons/CloseIcon';
import { PauseIcon } from '../book-components/icons/PauseIcon';
import { PlayIcon } from '../book-components/icons/PlayIcon';
import { ResetIcon } from '../book-components/icons/ResetIcon';
import { SaveIcon } from '../book-components/icons/SaveIcon';
import { SendIcon } from '../book-components/icons/SendIcon';
import { TemplateIcon } from '../book-components/icons/TemplateIcon';
import { BrandedQrCode } from '../book-components/Qr/BrandedQrCode';
import { GenericQrCode } from '../book-components/Qr/GenericQrCode';
import { PromptbookQrCode } from '../book-components/Qr/PromptbookQrCode';
import { injectCssModuleIntoShadowRoot } from '../utils/misc/injectCssModuleIntoShadowRoot';
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
    BrandedQrCode,
    Chat,
    CHAT_SAVE_FORMATS,
    CloseIcon,
    DEFAULT_BOOK_EDITOR_HEIGHT,
    FAST_FLOW,
    GenericQrCode,
    getChatSaveFormatDefinitions,
    htmlSaveFormatDefinition,
    injectCssModuleIntoShadowRoot,
    jsonSaveFormatDefinition,
    LlmChat,
    MarkdownContent,
    mdSaveFormatDefinition,
    MOCKED_CHAT_DELAY_CONFIGS,
    MockedChat,
    NORMAL_FLOW,
    parseMessageButtons,
    PauseIcon,
    pdfSaveFormatDefinition,
    PlayIcon,
    PromptbookQrCode,
    RANDOM_FLOW,
    reactSaveFormatDefinition,
    ResetIcon,
    SaveIcon,
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
