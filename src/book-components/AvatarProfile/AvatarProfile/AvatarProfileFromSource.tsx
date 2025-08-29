// AvatarProfileFromSource.tsx
import type { AgentBasicInformation } from '../../../book-2.0/agent-source/parseAgentSource';
import type { string_css_class } from '../../../types/typeAliases';
import { AvatarProfile } from './AvatarProfile';

/**
 * Props for AvatarProfileFromSource
 */
export type AvatarProfileFromSourceProps = {
    readonly source: AgentBasicInformation;
    readonly className?: string_css_class;
    readonly onSelect?: (avatar: AgentBasicInformation) => void;
    readonly isSelected?: boolean;
};

/**
 * Shows AvatarProfile from source data
 */
export function AvatarProfileFromSource(props: AvatarProfileFromSourceProps) {
    const { source, className, onSelect, isSelected } = props;
    return (
        <AvatarProfile
            avatarBasicInformation={source}
            className={className}
            onSelect={onSelect}
            isSelected={isSelected}
        />
    );
}
