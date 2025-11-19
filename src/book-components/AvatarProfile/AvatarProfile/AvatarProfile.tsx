'use client';

import { CSSProperties, useState } from 'react';
import type { AgentBasicInformation } from '../../../book-2.0/agent-source/AgentBasicInformation';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import type { string_css_class } from '../../../types/typeAliases';
import { Modal } from '../../_common/Modal/Modal';
import { classNames } from '../../_common/react-utils/classNames';
import { BookEditor } from '../../BookEditor/BookEditor';
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
     * The source of the agent, which will be displayed in the BookEditor.
     */
    readonly agentSource?: string_book;

    /**
     * Optional CSS class name which will be added to root <div> element
     */
    readonly className?: string_css_class;

    /**
     * Optional CSS style which will be added to root <div/> element
     */
    readonly style?: CSSProperties;
};

/**
 * Shows a box with user avatar, name and description
 *
 * @public exported from `@promptbook/components`
 */
export function AvatarProfile(props: AvatarProfileProps) {
    const { agent, agentSource, className, style } = props;
    const { agentName, personaDescription, meta } = agent;
    const [isBookEditorVisible, setIsBookEditorVisible] = useState(false);

    return (
        <>
            <div className={classNames(styles.AvatarProfile, className)} style={style}>
                <img src={meta.image} alt={agentName || ''} className={styles.Avatar} />
                <div className={styles.AgentInfo}>
                    <h2 className={styles.AgentName}>{agentName}</h2>
                    <p className={styles.AgentDescription}>{personaDescription}</p>
                    {agentSource !== undefined && (
                        <button
                            className={styles.viewSourceButton}
                            onClick={(event) => {
                                event.stopPropagation();
                                setIsBookEditorVisible(true);
                            }}
                        >
                            View Source
                        </button>
                    )}
                </div>
            </div>
            {isBookEditorVisible && (
                <Modal
                    onClose={() => {
                        setIsBookEditorVisible(false);
                    }}
                >
                    <BookEditor agentSource={agentSource} />
                </Modal>
            )}
        </>
    );
}

/**
 * TODO: [☁️] Export component prop types only to `@promptbook/components` (not `@promptbook/types`)
 */
