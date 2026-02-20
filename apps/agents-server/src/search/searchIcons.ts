import {
    BookOpenText,
    FileIcon,
    FolderOpen,
    Globe2,
    ImageIcon,
    MessageSquareText,
    Search,
    Settings2,
    UserRound,
    type LucideIcon,
} from 'lucide-react';
import type { ServerSearchResultIcon } from './ServerSearchResultItem';

/**
 * Icon map used by the Agents Server search UI.
 *
 * @private Internal helper for `apps/agents-server`.
 */
export const SEARCH_RESULT_ICON_BY_TYPE: Record<ServerSearchResultIcon, LucideIcon> = {
    agent: UserRound,
    book: BookOpenText,
    'federated-agent': Globe2,
    folder: FolderOpen,
    conversation: MessageSquareText,
    documentation: BookOpenText,
    metadata: Settings2,
    user: UserRound,
    message: MessageSquareText,
    file: FileIcon,
    image: ImageIcon,
    system: Settings2,
};

/**
 * Human-friendly labels for each search icon.
 *
 * @private Internal helper for `apps/agents-server`.
 */
export const SEARCH_RESULT_ICON_LABELS: Record<ServerSearchResultIcon, string> = {
    agent: 'Agents',
    book: 'Books',
    'federated-agent': 'Federated agents',
    folder: 'Folders',
    conversation: 'Conversations',
    documentation: 'Documentation',
    metadata: 'Metadata',
    user: 'Users',
    message: 'Messages',
    file: 'Files',
    image: 'Images',
    system: 'System',
};
