'use client';

import {
    BookIcon,
    BotIcon,
    BrainIcon,
    BriefcaseBusinessIcon,
    CalendarIcon,
    ChartLineIcon,
    CodeIcon,
    CrownIcon,
    FlaskConicalIcon,
    FolderIcon,
    GlobeIcon,
    HeartIcon,
    ImageIcon,
    MessageSquareIcon,
    PaletteIcon,
    RocketIcon,
    ShieldIcon,
    SparklesIcon,
    StarIcon,
    SunIcon,
    type LucideIcon,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { resolveFolderColor, resolveFolderIcon, type FolderIconId } from '../../utils/agentOrganization/folderAppearance';

/**
 * One available icon option for folder rendering and editing.
 */
export type FolderIconOption = {
    /**
     * Stable icon identifier persisted in database.
     */
    readonly id: FolderIconId;
    /**
     * Human-readable option label.
     */
    readonly label: string;
    /**
     * Lucide icon component used for rendering.
     */
    readonly Icon: LucideIcon;
};

/**
 * Folder icon options exposed by the folder editor.
 */
export const FOLDER_ICON_OPTIONS: ReadonlyArray<FolderIconOption> = [
    { id: 'folder', label: 'Folder', Icon: FolderIcon },
    { id: 'briefcase', label: 'Briefcase', Icon: BriefcaseBusinessIcon },
    { id: 'book', label: 'Book', Icon: BookIcon },
    { id: 'bot', label: 'Bot', Icon: BotIcon },
    { id: 'brain', label: 'Brain', Icon: BrainIcon },
    { id: 'code', label: 'Code', Icon: CodeIcon },
    { id: 'flask', label: 'Flask', Icon: FlaskConicalIcon },
    { id: 'globe', label: 'Globe', Icon: GlobeIcon },
    { id: 'image', label: 'Image', Icon: ImageIcon },
    { id: 'message-square', label: 'Message', Icon: MessageSquareIcon },
    { id: 'shield', label: 'Shield', Icon: ShieldIcon },
    { id: 'sparkles', label: 'Sparkles', Icon: SparklesIcon },
    { id: 'calendar', label: 'Calendar', Icon: CalendarIcon },
    { id: 'chart-line', label: 'Charts', Icon: ChartLineIcon },
    { id: 'crown', label: 'Crown', Icon: CrownIcon },
    { id: 'heart', label: 'Heart', Icon: HeartIcon },
    { id: 'palette', label: 'Palette', Icon: PaletteIcon },
    { id: 'rocket', label: 'Rocket', Icon: RocketIcon },
    { id: 'star', label: 'Star', Icon: StarIcon },
    { id: 'sun', label: 'Sun', Icon: SunIcon },
];

/**
 * Fast icon option lookup indexed by icon id.
 */
const FOLDER_ICON_OPTION_BY_ID = new Map<FolderIconId, FolderIconOption>(
    FOLDER_ICON_OPTIONS.map((option) => [option.id, option]),
);

/**
 * Converts a hex color string to rgba format.
 *
 * @param hexColor - HEX color in #rrggbb format.
 * @param alpha - Alpha channel in 0-1 range.
 * @returns CSS rgba color value.
 */
function hexToRgba(hexColor: string, alpha: number): string {
    const red = Number.parseInt(hexColor.slice(1, 3), 16);
    const green = Number.parseInt(hexColor.slice(3, 5), 16);
    const blue = Number.parseInt(hexColor.slice(5, 7), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/**
 * Resolves one icon option from a raw folder icon identifier.
 *
 * @param rawIcon - Raw icon identifier to resolve.
 * @returns Folder icon option for rendering.
 */
export function resolveFolderIconOption(rawIcon: string | null | undefined): FolderIconOption {
    const iconId = resolveFolderIcon(rawIcon);
    return FOLDER_ICON_OPTION_BY_ID.get(iconId) || FOLDER_ICON_OPTIONS[0];
}

/**
 * Props for rendering a folder icon badge with folder color styling.
 */
export type FolderAppearanceIconProps = {
    /**
     * Optional persisted icon identifier.
     */
    readonly icon?: string | null;
    /**
     * Optional persisted color value.
     */
    readonly color?: string | null;
    /**
     * Optional class name for the badge container.
     */
    readonly containerClassName?: string;
    /**
     * Optional class name for the icon glyph.
     */
    readonly iconClassName?: string;
    /**
     * Optional aria-hidden value for accessibility.
     */
    readonly ariaHidden?: boolean;
};

/**
 * Renders a folder icon badge with consistent color styling.
 */
export function FolderAppearanceIcon(props: FolderAppearanceIconProps) {
    const {
        icon,
        color,
        containerClassName = 'flex h-12 w-12 items-center justify-center rounded-md border',
        iconClassName = 'w-5 h-5',
        ariaHidden = true,
    } = props;
    const resolvedColor = resolveFolderColor(color);
    const { Icon } = resolveFolderIconOption(icon);
    const style: CSSProperties = {
        color: resolvedColor,
        backgroundColor: hexToRgba(resolvedColor, 0.16),
        borderColor: hexToRgba(resolvedColor, 0.35),
    };

    return (
        <span className={containerClassName} style={style}>
            <Icon className={iconClassName} aria-hidden={ariaHidden} />
        </span>
    );
}
