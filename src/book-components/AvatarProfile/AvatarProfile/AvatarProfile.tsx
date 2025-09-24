import type { AgentBasicInformation } from '../../../book-2.0/agent-source/AgentBasicInformation';
import type { string_css_class } from '../../../types/typeAliases';
import { classNames } from '../../_common/react-utils/classNames';
import styles from './AvatarProfile.module.css';

/**
 * Props of `AvatarProfile`
 *
 * @public exported from `@promptbook/components`
 */
export type AvatarProfileProps = {
    /**
     * Agent to be shown
     */
    readonly agent: AgentBasicInformation;

    /**
     * Optional CSS class name which will be added to root <div> element
     */
    readonly className?: string_css_class;
};

/**
 * Shows a box with user avatar, name and description
 *
 * @public exported from `@promptbook/components`
 */
export function AvatarProfile(props: AvatarProfileProps) {
    const { agent, className } = props;
    const { agentName, personaDescription, meta } = agent;

    return (
        <div className={classNames(styles.AvatarProfile, className)}>
            <img src={meta.image} alt={agentName || ''} className={styles.Avatar} />
            <div className={styles.AgentInfo}>
                <h2 className={styles.AgentName}>{agentName}</h2>
                <p className={styles.AgentDescription}>{personaDescription}</p>
            </div>
        </div>
    );
}
