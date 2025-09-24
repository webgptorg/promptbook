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
import type { MockedChatDelayConfig, MockedChatProps } from '../book-components/AvatarProfile/AvatarProfile/MockedChat';
import { MockedChat } from '../book-components/AvatarProfile/AvatarProfile/MockedChat';
import type { BookEditorProps } from '../book-components/BookEditor/BookEditor';
import { BookEditor } from '../book-components/BookEditor/BookEditor';
import { DEFAULT_BOOK_FONT_CLASS } from '../book-components/BookEditor/config';
import { Chat } from '../book-components/Chat/Chat/Chat';
import type { ChatProps } from '../book-components/Chat/Chat/ChatProps';
import { LlmChat } from '../book-components/Chat/LlmChat/LlmChat';
import type { LlmChatProps } from '../book-components/Chat/LlmChat/LlmChatProps';
import type { ChatMessage } from '../book-components/Chat/types/ChatMessage';
import type { ChatParticipant } from '../book-components/Chat/types/ChatParticipant';
import { isMarkdownContent, renderMarkdown } from '../book-components/Chat/utils/renderMarkdown';
import { ArrowIcon } from '../book-components/icons/ArrowIcon';
import { ResetIcon } from '../book-components/icons/ResetIcon';
import { SendIcon } from '../book-components/icons/SendIcon';
import { TemplateIcon } from '../book-components/icons/TemplateIcon';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../version';

// Note: Exporting version from each package
export { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION };

// Note: Entities of the `@promptbook/components`
export {
    ArrowIcon,
    AvatarChip,
    AvatarChipFromSource,
    AvatarProfile,
    AvatarProfileFromSource,
    BookEditor,
    Chat,
    DEFAULT_BOOK_FONT_CLASS,
    isMarkdownContent,
    LlmChat,
    MockedChat,
    renderMarkdown,
    ResetIcon,
    SendIcon,
    TemplateIcon,
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
    LlmChatProps,
    MockedChatDelayConfig,
    MockedChatProps,
};
