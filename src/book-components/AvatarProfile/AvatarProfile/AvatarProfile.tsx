// AvatarProfile.tsx
import type { AgentBasicInformation } from '../../../book-2.0/agent-source/parseAgentSource';
import type { string_css_class } from '../../../types/typeAliases';
import { classNames } from '../../_common/react-utils/classNames';
import styles from './AvatarProfile.module.css';

/**
 * Props for AvatarProfile
 */
export type AvatarProfileProps = {
    readonly avatarBasicInformation: AgentBasicInformation;
    readonly className?: string_css_class;
    readonly onSelect?: (avatar: AgentBasicInformation) => void;
    readonly isSelected?: boolean;
};

/**
 * Shows a larger box with avatar, name, and description
 */
export function AvatarProfile(props: AvatarProfileProps) {
    const { avatarBasicInformation, className, onSelect, isSelected } = props;
    const { agentName, profileImageUrl } = avatarBasicInformation;

    return (
        <div
            className={classNames(styles.AvatarProfile, className, isSelected ? styles.Selected : undefined)}
            onClick={() => onSelect?.(avatarBasicInformation)}
            style={{ cursor: onSelect ? 'pointer' : undefined }}
        >
            <img src={profileImageUrl} alt={agentName || ''} className={styles.Avatar} />
            <div className={styles.Info}>
                <div className={styles.Name}>{agentName}</div>
            </div>
        </div>
    );
}
