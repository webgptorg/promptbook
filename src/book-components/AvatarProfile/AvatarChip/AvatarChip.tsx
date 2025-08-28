import type { AgentBasicInformation } from '../../../book-2.0/agent-source/parseAgentSource';
import { string_css_class } from '../../../types/typeAliases';
import { classNames } from '../../_common/react-utils/classNames';
import styles from './AvatarChip.module.css';

/**
 * Props of `AvatarChip`
 *
 * @public exported from `@promptbook/components`
 */
export type AvatarChipProps = {
    /**
     * Avatar to be shown
     */
    readonly avatarBasicInformation: AgentBasicInformation;

    /**
     * Whether this chip is a template avatar
     */
    readonly isTemplate: boolean;

    /**
     * Optional CSS class name which will be added to root <div> element
     */
    readonly className?: string_css_class;

    /**
     * Called when chip is clicked
     */
    readonly onSelect?: (avatar: AgentBasicInformation) => void;

    /**
     * Whether this chip is selected
     */
    readonly isSelected?: boolean;
};

/**
 * Shows a chip with avatar's avatar and name
 *
 * @public exported from `@promptbook/components`
 */
export function AvatarChip(props: AvatarChipProps) {
    const { avatarBasicInformation, className, onSelect, isSelected, isTemplate } = props;
    const { agentName, profileImageUrl } = avatarBasicInformation;

    return (
        <div
            className={classNames(styles.AvatarChip, className, isSelected ? styles.Selected : undefined)}
            onClick={() => onSelect?.(avatarBasicInformation)}
            style={{ cursor: onSelect ? 'pointer' : undefined }}
        >
            <img src={profileImageUrl} alt={agentName || ''} className={styles.Avatar} />
            {agentName}
            {isTemplate && <span className={styles.TemplateLabel}>Template</span>}
        </div>
    );
}
