'use client';

import React, { ReactNode, useState } from 'react';
import { HamburgerMenu } from '../HamburgerMenu/HamburgerMenu';
import { classNames } from '../react-utils/classNames';
import styles from './Dropdown.module.css';

type DropdownProps = {
    actions: Array<{
        icon: ReactNode;
        name: string;
        onClick: () => void;
    }>;
};

/**
 * @@@
 *
 * @private internal subcomponent used by various components
 */
export function Dropdown({ actions }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={styles.dropdown}>
            <HamburgerMenu
                className={classNames(styles.button, isOpen && styles.isOpen)}
                isOpen={isOpen}
                onClick={() => setIsOpen(!isOpen)}
            />
            {isOpen && (
                <div className={styles.menu}>
                    {actions.map(({ icon, name, onClick }) => (
                        <button
                            key={name}
                            className={classNames(styles.button, styles.menuItem)}
                            onClick={() => {
                                onClick();
                                setIsOpen(false);
                            }}
                        >
                            {icon}
                            <span>{name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
